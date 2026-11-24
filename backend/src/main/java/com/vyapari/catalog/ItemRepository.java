package com.vyapari.catalog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Every query here includes the seller id, so one seller can never reach another seller's products. */
public interface ItemRepository extends JpaRepository<Item, Long> {
    List<Item> findBySellerIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long sellerId);

    Optional<Item> findByIdAndSellerIdAndDeletedAtIsNull(Long id, Long sellerId);

    long countBySellerIdAndDeletedAtIsNull(Long sellerId);
}
