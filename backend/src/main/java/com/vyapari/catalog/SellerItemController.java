package com.vyapari.catalog;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * The seller's own products (SecurityConfig already limits /api/seller/** to logged-in sellers).
 *
 *   GET    /api/seller/items          my products, newest first
 *   POST   /api/seller/items          add a product      (multipart: "data" = JSON, "image" = optional picture)
 *   PUT    /api/seller/items/{id}     edit with a picture (multipart, same two parts)
 *   PATCH  /api/seller/items/{id}     small change, JSON only (stock, hide / show, edit without a new picture)
 *   DELETE /api/seller/items/{id}     remove
 */
@RestController
@RequestMapping("/api/seller/items")
public class SellerItemController {

    private final ItemService service;

    public SellerItemController(ItemService service) {
        this.service = service;
    }

    @GetMapping
    public List<ItemDto> list(Authentication auth) {
        return service.list(auth.getName());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ItemDto create(@RequestPart("data") ItemInput data,
                          @RequestPart(value = "image", required = false) MultipartFile image,
                          Authentication auth) {
        return service.create(auth.getName(), data, image);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ItemDto replace(@PathVariable Long id,
                           @RequestPart("data") ItemInput data,
                           @RequestPart(value = "image", required = false) MultipartFile image,
                           Authentication auth) {
        return service.update(auth.getName(), id, data, image);
    }

    @PatchMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ItemDto patch(@PathVariable Long id, @RequestBody ItemInput data, Authentication auth) {
        return service.update(auth.getName(), id, data, null);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication auth) {
        service.delete(auth.getName(), id);
    }
}
