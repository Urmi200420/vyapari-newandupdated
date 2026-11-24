package com.vyapari.catalog;

import com.vyapari.auth.ApiException;
import com.vyapari.user.Role;
import com.vyapari.user.User;
import com.vyapari.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * All product rules in one place. Every method starts from the logged-in seller
 * and only ever touches that seller's own products.
 */
@Service
public class ItemService {

    private static final Set<String> CATEGORIES =
            Set.of("veggies", "electronics", "clothing", "footwear", "home", "books", "beauty", "sports", "toys");
    private static final BigDecimal MAX_PRICE = new BigDecimal("10000000");
    private static final int MAX_STOCK = 1_000_000;

    private final ItemRepository items;
    private final UserRepository users;
    private final ImageStorage images;
    private final int maxItems;

    public ItemService(ItemRepository items, UserRepository users, ImageStorage images,
                       @Value("${vyapari.seller.max-items:2000}") int maxItems) {
        this.items = items;
        this.users = users;
        this.images = images;
        this.maxItems = maxItems;
    }

    @Transactional(readOnly = true)
    public List<ItemDto> list(String email) {
        User seller = seller(email);
        return items.findBySellerIdAndDeletedAtIsNullOrderByCreatedAtDesc(seller.getId()).stream().map(ItemDto::of).toList();
    }

    @Transactional
    public ItemDto create(String email, ItemInput in, MultipartFile image) {
        User seller = seller(email);
        if (in == null) throw bad("Please fill in the product details.");
        if (items.countBySellerIdAndDeletedAtIsNull(seller.getId()) >= maxItems) {
            throw new ApiException(HttpStatus.CONFLICT, "You have reached the limit of " + maxItems + " products.");
        }

        // check everything first, so a bad form never leaves a picture behind
        String name = name(in.name());
        String description = description(in.description());
        String category = category(in.category());
        BigDecimal price = money(in.price(), "Selling price");
        BigDecimal mrp = in.mrp() == null || in.mrp().signum() <= 0 ? price : money(in.mrp(), "MRP");
        checkPrices(mrp, price);
        if (in.stock() == null) throw bad("Please enter the stock.");
        int stock = stock(in.stock());

        Item it = new Item();
        it.setSeller(seller);
        it.setName(name);
        it.setDescription(description);
        it.setCategory(category);
        it.setPrice(price);
        it.setMrp(mrp);
        it.setStock(stock);
        it.setActive(in.active() == null || in.active());
        it.setImageFile(images.save(image));
        return ItemDto.of(items.save(it));
    }

    /** Changes only what was sent. Used for the Edit form, the stock box and the Hide button. */
    @Transactional
    public ItemDto update(String email, Long id, ItemInput in, MultipartFile image) {
        User seller = seller(email);
        Item it = items.findByIdAndSellerIdAndDeletedAtIsNull(id, seller.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found."));
        ItemInput d = in == null ? new ItemInput(null, null, null, null, null, null, null) : in;

        if (d.name() != null) it.setName(name(d.name()));
        if (d.description() != null) it.setDescription(description(d.description()));
        if (d.category() != null) it.setCategory(category(d.category()));

        BigDecimal price = d.price() != null ? money(d.price(), "Selling price") : it.getPrice();
        BigDecimal mrp = d.mrp() != null
                ? (d.mrp().signum() <= 0 ? price : money(d.mrp(), "MRP"))
                : it.getMrp();
        checkPrices(mrp, price);
        it.setPrice(price);
        it.setMrp(mrp);

        if (d.stock() != null) it.setStock(stock(d.stock()));
        if (d.active() != null) it.setActive(d.active());

        String old = it.getImageFile();
        String fresh = images.save(image);
        if (fresh != null) {
            it.setImageFile(fresh);
            images.deleteAfterCommit(old);
        }
        return ItemDto.of(items.save(it));
    }

    @Transactional
    public void delete(String email, Long id) {
        User seller = seller(email);
        Item it = items.findByIdAndSellerIdAndDeletedAtIsNull(id, seller.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found."));
        it.setActive(false);
        it.setDeletedAt(Instant.now());
        items.save(it);
    }

    // ---------- helpers ----------

    private User seller(String email) {
        return users.findByEmail(email)
                .filter(u -> u.getRole() == Role.SELLER && u.getDeletedAt() == null)
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Only sellers can manage products."));
    }

    private static String name(String v) {
        String t = v == null ? "" : v.trim();
        if (t.length() < 2 || t.length() > 80) throw bad("Product title must be 2 to 80 characters.");
        return t;
    }

    private static String description(String v) {
        String t = v == null ? "" : v.trim();
        if (t.length() > 500) throw bad("Description is too long (maximum 500 characters).");
        return t;
    }

    private static String category(String v) {
        String t = v == null ? "" : v.trim().toLowerCase(Locale.ROOT);
        if (!CATEGORIES.contains(t)) throw bad("Please choose a valid category.");
        return t;
    }

    private static BigDecimal money(BigDecimal v, String label) {
        if (v == null) throw bad(label + " is required.");
        BigDecimal r = v.setScale(2, RoundingMode.HALF_UP);
        if (r.signum() <= 0) throw bad(label + " must be more than 0.");
        if (r.compareTo(MAX_PRICE) > 0) throw bad(label + " is too large.");
        return r;
    }

    private static void checkPrices(BigDecimal mrp, BigDecimal price) {
        if (price.compareTo(mrp) > 0) throw bad("Selling price cannot exceed the MRP. Raise the MRP or lower the price.");
    }

    private static int stock(Integer v) {
        if (v < 0 || v > MAX_STOCK) throw bad("Stock must be a whole number from 0 to 1,000,000.");
        return v;
    }

    private static ApiException bad(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }
}
