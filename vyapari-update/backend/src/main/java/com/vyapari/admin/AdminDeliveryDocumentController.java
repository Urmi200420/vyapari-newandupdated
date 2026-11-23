package com.vyapari.admin;

import com.vyapari.auth.ApiException;
import com.vyapari.delivery.PrivateDocumentStorage;
import com.vyapari.user.*;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

/**
 * GET /api/admin/delivery-partners/{id}/documents/{identity|licence|vehicle-rc}
 * Admin-only: SecurityConfig limits /api/admin/** to ROLE_ADMIN, so customers, sellers, delivery partners and
 * anonymous visitors get 403 / 401. Documents are streamed inline and never cached.
 */
@RestController
@RequestMapping("/api/admin/delivery-partners")
public class AdminDeliveryDocumentController {
    private final UserRepository users;
    private final PrivateDocumentStorage storage;

    public AdminDeliveryDocumentController(UserRepository users, PrivateDocumentStorage storage) {
        this.users = users;
        this.storage = storage;
    }

    @GetMapping("/{id}/documents/{kind}")
    public ResponseEntity<FileSystemResource> document(@PathVariable Long id, @PathVariable String kind) {
        User u = users.findById(id).filter(x -> x.getRole() == Role.DELIVERY && x.getDeletedAt() == null)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Delivery application not found."));
        String key = switch (kind) {
            case "identity" -> u.getIdentityDocumentPath();
            case "licence" -> u.getDrivingLicensePath();
            case "vehicle-rc" -> u.getVehicleRcPath();
            default -> throw new ApiException(HttpStatus.NOT_FOUND, "Document not found.");
        };
        if (key == null || key.isBlank()) throw new ApiException(HttpStatus.NOT_FOUND, "Document not found.");
        var path = storage.resolve(key);
        String ext = key.substring(key.lastIndexOf('.'));
        MediaType type = ext.equals(".pdf") ? MediaType.APPLICATION_PDF : ext.equals(".png") ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG;
        return ResponseEntity.ok()
                .contentType(type)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"application-" + id + "-" + kind + ext + "\"")
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.noStore())
                .body(new FileSystemResource(path));
    }
}
