package com.vyapari.delivery;

import com.vyapari.auth.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Delivery verification documents (ID, licence, RC). Files live in a private directory outside the frontend's
 * public folders, are named by random UUID (never by the uploaded name) and are only served through the
 * admin-only AdminDeliveryDocumentController.
 *
 * Accepted: JPG/JPEG, PNG, PDF, at most 5 MB each. The declared type, the file extension AND the file's
 * first bytes (magic number) must all agree.
 */
@Service
public class PrivateDocumentStorage {
    static final long MAX = 5L * 1024 * 1024;

    /** declared MIME type -> the format it claims */
    private static final Map<String, String> DECLARED = Map.of(
            "image/jpeg", "jpg", "image/jpg", "jpg", "image/pjpeg", "jpg",
            "image/png", "png", "application/pdf", "pdf");
    private static final Map<String, String> EXTENSIONS = Map.of(
            "jpg", "jpg", "jpeg", "jpg", "png", "png", "pdf", "pdf");
    private static final Set<String> KEY_EXT = Set.of(".jpg", ".png", ".pdf");

    private final Path root;

    public PrivateDocumentStorage(@Value("${vyapari.documents.directory:./private-uploads}") String directory) {
        this.root = Paths.get(directory).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
            restrict(root, "rwx------");
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create private document directory", e);
        }
    }

    /** Validates a document without storing it. Returns "jpg", "png" or "pdf". */
    public String check(MultipartFile file) {
        if (file == null || file.isEmpty()) throw bad("All required supporting documents must be uploaded.");
        if (file.getSize() > MAX) throw bad("Each document must be 5 MB or smaller.");

        String declared = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT).split(";")[0].trim();
        String claimed = DECLARED.get(declared);
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        int dot = name.lastIndexOf('.');
        String byExtension = dot < 0 ? null : EXTENSIONS.get(name.substring(dot + 1).toLowerCase(Locale.ROOT));
        if (claimed == null || (dot >= 0 && byExtension == null)) throw bad("Only JPG, JPEG, PNG or PDF documents are accepted.");

        String actual;
        try (InputStream in = file.getInputStream()) {
            actual = sniff(in.readNBytes(8));
        } catch (IOException e) {
            throw bad("The uploaded document could not be read.");
        }
        if (actual == null || !actual.equals(claimed) || (byExtension != null && !byExtension.equals(actual))) {
            throw bad("The uploaded file content does not match an accepted document format.");
        }
        return actual;
    }

    /** Validates and stores the document; returns the private storage key (e.g. "3f2c…e1.pdf"). */
    public String store(MultipartFile file) {
        String ext = check(file);
        String key = UUID.randomUUID() + "." + ext;
        Path target = root.resolve(key).normalize();
        if (!target.startsWith(root)) throw bad("Invalid document name.");
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target);
            restrict(target, "rw-------");
            return key;
        } catch (FileAlreadyExistsException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not securely store the uploaded document.");
        } catch (IOException e) {
            delete(key);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not securely store the uploaded document.");
        }
    }

    public Path resolve(String key) {
        if (!validKey(key)) throw new ApiException(HttpStatus.NOT_FOUND, "Document not found.");
        Path p = root.resolve(key).normalize();
        if (!p.startsWith(root) || !Files.isRegularFile(p)) throw new ApiException(HttpStatus.NOT_FOUND, "Document not found.");
        return p;
    }

    /** Best-effort removal (used to clean up after a failed application). */
    public void delete(String key) {
        if (!validKey(key)) return;
        Path p = root.resolve(key).normalize();
        if (!p.startsWith(root)) return;
        try { Files.deleteIfExists(p); } catch (IOException ignored) { /* nothing else to do */ }
    }

    private static boolean validKey(String key) {
        if (key == null || key.length() < 5 || key.contains("/") || key.contains("\\") || key.contains("..")) return false;
        return KEY_EXT.contains(key.substring(key.length() - 4));
    }

    private static String sniff(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xff) == 0xff && (b[1] & 0xff) == 0xd8 && (b[2] & 0xff) == 0xff) return "jpg";
        if (b.length >= 8 && (b[0] & 0xff) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                && b[4] == 0x0d && b[5] == 0x0a && b[6] == 0x1a && b[7] == 0x0a) return "png";
        if (b.length >= 5 && new String(b, 0, 5, StandardCharsets.US_ASCII).equals("%PDF-")) return "pdf";
        return null;
    }

    private static void restrict(Path p, String perms) {
        try {
            Files.setPosixFilePermissions(p, PosixFilePermissions.fromString(perms));
        } catch (UnsupportedOperationException | IOException ignored) {
            // Windows / non-POSIX file systems: rely on the directory's own access control
        }
    }

    private static ApiException bad(String message) { return new ApiException(HttpStatus.BAD_REQUEST, message); }
}
