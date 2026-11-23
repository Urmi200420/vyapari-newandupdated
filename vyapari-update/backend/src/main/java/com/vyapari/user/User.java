package com.vyapari.user;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;   // BCrypt hash, never sent to the browser

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status = UserStatus.ACTIVE;

    @Column(length = 15)
    private String phone;

    // Delivery-partner onboarding details are kept on the user record to avoid a separate profile table.
    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(length = 255)
    private String address;

    @Column(length = 80)
    private String city;

    @Column(length = 10)
    private String pincode;

    @Column(name = "identity_document_type", length = 40)
    private String identityDocumentType;

    // Sensitive: encrypt at rest before production deployment; never expose this value in general user APIs.
    @Column(name = "identity_document_number", length = 100)
    private String identityDocumentNumber;

    @Column(name = "identity_document_path", length = 500)
    private String identityDocumentPath;

    @Column(name = "vehicle_type", length = 40)
    private String vehicleType;

    @Column(name = "vehicle_number", length = 30)
    private String vehicleNumber;

    @Column(name = "driving_license_number", length = 100)
    private String drivingLicenseNumber;

    @Column(name = "driving_license_path", length = 500)
    private String drivingLicensePath;

    @Column(name = "vehicle_rc_path", length = 500)
    private String vehicleRcPath;

    @Column(name = "emergency_contact", length = 15)
    private String emergencyContact;

    @Column(name = "serviceable_pincodes", length = 500)
    private String serviceablePincodes;

    @Column(name = "availability_preference", length = 30)
    private String availabilityPreference;

    @Column(name = "identity_document_name", length = 80)
    private String identityDocumentName;
    @Column(name = "vehicle_other_name", length = 50)
    private String vehicleOtherName;
    @Column(name = "delivery_experience", length = 30)
    private String deliveryExperience;
    @Column(name = "working_days", length = 120)
    private String workingDays;
    @Column(name = "working_hours", length = 30)
    private String workingHours;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    // soft delete: a user with a date here can no longer log in
    @Column(name = "deleted_at")
    private Instant deletedAt;

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate value) { this.dateOfBirth = value; }
    public String getAddress() { return address; }
    public void setAddress(String value) { this.address = value; }
    public String getCity() { return city; }
    public void setCity(String value) { this.city = value; }
    public String getPincode() { return pincode; }
    public void setPincode(String value) { this.pincode = value; }
    public String getIdentityDocumentType() { return identityDocumentType; }
    public void setIdentityDocumentType(String value) { this.identityDocumentType = value; }
    public String getIdentityDocumentNumber() { return identityDocumentNumber; }
    public void setIdentityDocumentNumber(String value) { this.identityDocumentNumber = value; }
    public String getIdentityDocumentPath() { return identityDocumentPath; }
    public void setIdentityDocumentPath(String value) { this.identityDocumentPath = value; }
    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String value) { this.vehicleType = value; }
    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String value) { this.vehicleNumber = value; }
    public String getDrivingLicenseNumber() { return drivingLicenseNumber; }
    public void setDrivingLicenseNumber(String value) { this.drivingLicenseNumber = value; }
    public String getDrivingLicensePath() { return drivingLicensePath; }
    public void setDrivingLicensePath(String value) { this.drivingLicensePath = value; }
    public String getVehicleRcPath() { return vehicleRcPath; }
    public void setVehicleRcPath(String value) { this.vehicleRcPath = value; }
    public String getEmergencyContact() { return emergencyContact; }
    public void setEmergencyContact(String value) { this.emergencyContact = value; }
    public String getServiceablePincodes() { return serviceablePincodes; }
    public void setServiceablePincodes(String value) { this.serviceablePincodes = value; }
    public String getAvailabilityPreference() { return availabilityPreference; }
    public void setAvailabilityPreference(String value) { this.availabilityPreference = value; }
    public String getIdentityDocumentName() { return identityDocumentName; }
    public void setIdentityDocumentName(String v) { identityDocumentName = v; }
    public String getVehicleOtherName() { return vehicleOtherName; }
    public void setVehicleOtherName(String v) { vehicleOtherName = v; }
    public String getDeliveryExperience() { return deliveryExperience; }
    public void setDeliveryExperience(String v) { deliveryExperience = v; }
    public String getWorkingDays() { return workingDays; }
    public void setWorkingDays(String v) { workingDays = v; }
    public String getWorkingHours() { return workingHours; }
    public void setWorkingHours(String v) { workingHours = v; }
    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String value) { this.rejectionReason = value; }
    public Instant getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(Instant value) { this.reviewedAt = value; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getDeletedAt() { return deletedAt; }
    public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }
}
