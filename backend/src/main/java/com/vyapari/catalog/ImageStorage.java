package com.vyapari.catalog;

import com.vyapari.auth.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Keeps product pictures on disk (folder vyapari.upload.dir, default "uploads") instead of in the database.
 *  - the real file type is read from the first bytes, so a renamed file cannot sneak in
 *  - the stored name is a random id, never the name the seller chose
 *  - at most 5 MB per picture
 */
@Component
public class ImageStorage {

    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final Pattern SAFE_NAME =
            Pattern.compile("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)");

    private final Path root;

    public ImageStorage(@Value("${vyapari.upload.dir:uploads}") String dir) {
        this.root = Path.of(dir, "items").toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot create the upload folder " + root, e);
        }
    }

    /** Saves the picture and returns its stored file name, or null when no picture was sent. */
    public String save(MultipartFile file) {
        if (file == null || file.isEmpty()) return null;
        if (file.getSize() > MAX_BYTES) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "That picture is over 5 MB. Please choose a smaller one.");
        }
        try (InputStream in = new BufferedInputStream(file.getInputStream())) {
            in.mark(16);
            byte[] head = in.readNBytes(12);
            in.reset();

            String ext = detect(head);
            if (ext == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Please choose a JPG, PNG or WebP picture.");
            }
            String name = UUID.randomUUID() + "." + ext;
            Files.copy(in, root.resolve(name));   // fails if the name already exists, never overwrites
            deleteIfRolledBack(name);
            return name;
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save the picture. Please try again.");
        }
    }

    /** The file for a stored name, or null if the name is not one we created (blocks ../ tricks). */
    public Path resolve(String name) {
        if (name == null || !SAFE_NAME.matcher(name).matches()) return null;
        Path p = root.resolve(name).normalize();
        return p.startsWith(root) ? p : null;
    }

    /** Removes an old picture, but only once the database change that replaced it has really been saved. */
    public void deleteAfterCommit(String name) {
        if (name == null) return;
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    deleteQuietly(name);
                }
            });
        } else {
            deleteQuietly(name);
        }
    }

    /** If saving the product fails after the picture was written, the new picture is removed again. */
    private void deleteIfRolledBack(String name) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) deleteQuietly(name);
            }
        });
    }

    private void deleteQuietly(String name) {
        Path p = resolve(name);
        if (p == null) return;
        try {
            Files.deleteIfExists(p);
        } catch (IOException ignored) {
            // a leftover file is harmless
        }
    }

    private static String detect(byte[] h) {
        if (h.length >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) return "jpg";
        if (h.length >= 8 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G'
                && h[4] == 0x0D && h[5] == 0x0A && h[6] == 0x1A && h[7] == 0x0A) return "png";
        if (h.length >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') return "webp";
        return null;
    }
}
