package com.vyapari.catalog;

import java.math.BigDecimal;

/**
 * What the Inventory page sends. Every field is optional so that a small change
 * (only stock, or only active) can be sent on its own. Adding a product needs name, category, price and stock.
 */
public record ItemInput(
        String name,
        String description,
        String category,
        BigDecimal mrp,
        BigDecimal price,
        Integer stock,
        Boolean active
) {}
