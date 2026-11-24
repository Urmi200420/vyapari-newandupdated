package com.vyapari.catalog;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

/** GET /api/images/{file}  Public, so shoppers can see product pictures. Each file name is used once, so it can be cached for a year. */
@RestController
@RequestMapping("/api/images")
public class ImageController {

    private final ImageStorage images;

    public ImageController(ImageStorage images) {
        this.images = images;
    }

    @GetMapping("/{name}")
    public ResponseEntity<Resource> get(@PathVariable String name) {
        Path file = images.resolve(name);
        if (file == null || !Files.isRegularFile(file)) return ResponseEntity.notFound().build();

        MediaType type = name.endsWith(".png") ? MediaType.IMAGE_PNG
                : name.endsWith(".webp") ? MediaType.parseMediaType("image/webp")
                : MediaType.IMAGE_JPEG;
        return ResponseEntity.ok()
                .contentType(type)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .header("X-Content-Type-Options", "nosniff")
                .body(new FileSystemResource(file));
    }
}
