-- Vyapari: users table matching com.vyapari.user.User (MySQL 8). Hibernate 6 may create role/status as native
-- ENUM columns instead of VARCHAR(20); the application works with either.
--
-- You normally do NOT need to run this: application.properties uses spring.jpa.hibernate.ddl-auto=update,
-- which creates the table and adds missing columns on start-up. Use it for a fresh database set up by hand,
-- or to compare against an existing schema. Back up your database before changing it.
--
-- Delivery-partner onboarding uses this one table (no separate delivery table):
--   role = 'DELIVERY', status = 'PENDING' after registration -> 'ACTIVE' (approved) / 'REJECTED' / 'BLOCKED'.
-- identity_document_number and driving_license_number hold AES-GCM ciphertext ("ENC:..."), never the plain number.
-- The *_path columns hold random private storage keys (UUID + extension) inside VYAPARI_DOCUMENTS_DIR, never a URL.

CREATE TABLE IF NOT EXISTS users (
  id                       BIGINT       NOT NULL AUTO_INCREMENT,
  name                     VARCHAR(80)  NOT NULL,
  email                    VARCHAR(150) NOT NULL,
  password_hash            VARCHAR(255) NOT NULL,
  role                     VARCHAR(20)  NOT NULL,
  status                   VARCHAR(20)  NOT NULL,
  phone                    VARCHAR(15)  NULL,
  date_of_birth            DATE         NULL,
  address                  VARCHAR(255) NULL,
  city                     VARCHAR(80)  NULL,
  pincode                  VARCHAR(10)  NULL,
  identity_document_type   VARCHAR(40)  NULL,
  identity_document_name   VARCHAR(80)  NULL,
  identity_document_number VARCHAR(100) NULL,
  identity_document_path   VARCHAR(500) NULL,
  vehicle_type             VARCHAR(40)  NULL,
  vehicle_other_name       VARCHAR(50)  NULL,
  vehicle_number           VARCHAR(30)  NULL,
  driving_license_number   VARCHAR(100) NULL,
  driving_license_path     VARCHAR(500) NULL,
  vehicle_rc_path          VARCHAR(500) NULL,
  emergency_contact        VARCHAR(15)  NULL,
  serviceable_pincodes     VARCHAR(500) NULL,
  availability_preference  VARCHAR(30)  NULL,
  delivery_experience      VARCHAR(30)  NULL,
  working_days             VARCHAR(120) NULL,
  working_hours            VARCHAR(30)  NULL,
  rejection_reason         VARCHAR(500) NULL,
  reviewed_at              DATETIME(6)  NULL,
  created_at               DATETIME(6)  NOT NULL,
  deleted_at               DATETIME(6)  NULL,
  PRIMARY KEY (id),
  CONSTRAINT uk_users_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Speeds up the duplicate-mobile check and the admin "delivery partners by status" list. Optional; safe to run once.
-- CREATE INDEX idx_users_phone ON users (phone);
-- CREATE INDEX idx_users_role_status ON users (role, status);

-- E-mail verification codes (delivery-partner and customer sign-up). Created automatically by ddl-auto=update.
-- Only SHA-256 hashes of the 6-digit code and of the follow-up token are stored.
CREATE TABLE IF NOT EXISTS email_otps (
  id               BIGINT       NOT NULL AUTO_INCREMENT,
  email            VARCHAR(150) NOT NULL,
  purpose          VARCHAR(40)  NOT NULL,   -- DELIVERY_REGISTRATION | CUSTOMER_REGISTRATION
  code_hash        VARCHAR(100) NOT NULL,
  expires_at       DATETIME(6)  NOT NULL,
  attempts         INT          NOT NULL,
  verified_at      DATETIME(6)  NULL,
  token_hash       VARCHAR(100) NULL,
  token_expires_at DATETIME(6)  NULL,
  consumed_at      DATETIME(6)  NULL,
  created_at       DATETIME(6)  NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- Optional, speeds up look-ups: CREATE INDEX idx_email_otps_lookup ON email_otps (email, purpose, created_at);
