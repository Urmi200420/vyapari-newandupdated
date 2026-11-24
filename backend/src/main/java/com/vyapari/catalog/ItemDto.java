package com.vyapari.catalog;

import java.time.Instant;

/** What the Inventory page receives for one product. */
public record ItemDto(Long id, String name, String description, String category,
                      double mrp, double price, int stock, boolean active,
                      String imageUrl, Instant createdAt) {

    public static ItemDto of(Item i) {
        return new ItemDto(i.getId(), i.getName(), i.getDescription() == null ? "" : i.getDescription(),
                i.getCategory(), i.getMrp().doubleValue(), i.getPrice().doubleValue(), i.getStock(), i.isActive(),
                i.getImageFile() == null ? null : "/api/images/" + i.getImageFile(), i.getCreatedAt());
    }
}
