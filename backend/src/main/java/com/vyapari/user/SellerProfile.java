package com.vyapari.user;

import jakarta.persistence.*;

/** Shop details for users whose role is SELLER. Table: seller_profiles */
@Entity
@Table(name = "seller_profiles")
public class SellerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "shop_name", nullable = false, length = 80)
    private String shopName;

    @Column(length = 60)
    private String city;

    @Column(length = 400)
    private String description;

    @Column(name = "owner_name", length = 80)
    private String ownerName;

    @Column(length = 15)
    private String gstin;

    @Column(name = "bank_name", length = 80)
    private String bankName;

    @Column(name = "bank_account_number", length = 20)
    private String bankAccountNumber;

    @Column(name = "bank_ifsc", length = 11)
    private String bankIfsc;

    @Column(name = "pickup_contact_person", length = 80)
    private String contactPerson;

    @Column(name = "pickup_contact_phone", length = 15)
    private String contactPhone;

    @Column(name = "pickup_line1", length = 150)
    private String line1;

    @Column(name = "pickup_line2", length = 150)
    private String line2;

    @Column(name = "pickup_landmark", length = 100)
    private String landmark;

    @Column(name = "pickup_state", length = 60)
    private String state;

    @Column(name = "pickup_pincode", length = 10)
    private String pincode;

    @Column(name = "pickup_hours", length = 100)
    private String hours;

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getShopName() { return shopName; }
    public void setShopName(String shopName) { this.shopName = shopName; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }
    public String getGstin() { return gstin; }
    public void setGstin(String gstin) { this.gstin = gstin; }
    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }
    public String getBankAccountNumber() { return bankAccountNumber; }
    public void setBankAccountNumber(String bankAccountNumber) { this.bankAccountNumber = bankAccountNumber; }
    public String getBankIfsc() { return bankIfsc; }
    public void setBankIfsc(String bankIfsc) { this.bankIfsc = bankIfsc; }
    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }
    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
    public String getLine1() { return line1; }
    public void setLine1(String line1) { this.line1 = line1; }
    public String getLine2() { return line2; }
    public void setLine2(String line2) { this.line2 = line2; }
    public String getLandmark() { return landmark; }
    public void setLandmark(String landmark) { this.landmark = landmark; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getPincode() { return pincode; }
    public void setPincode(String pincode) { this.pincode = pincode; }
    public String getHours() { return hours; }
    public void setHours(String hours) { this.hours = hours; }
}
