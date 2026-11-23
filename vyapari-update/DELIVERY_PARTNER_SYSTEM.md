# Delivery Partner Registration, Admin Verification and Login

React (Vite) + Spring Boot + MySQL. This replaces the earlier phase notes (`DELIVERY_ONBOARDING_*.md`) as the reference for this feature.

## 1. Audit (state of the uploaded project, before this update)

| Requirement | Found | Notes |
|---|---|---|
| Four-step React wizard | **Broken** | `Login.jsx` used `<DocumentCapture>` without importing it: the wizard crashed on step 2, so no application could ever be submitted from the UI. |
| Personal, contact, address, PIN details | Partial | Fields present; no 18+ check, emergency contact could equal own number. |
| Government ID + "Other ID" fields | Partial | UI + server check present; number length could overflow the encrypted DB column (see below). |
| Vehicle type, registration, licence, RC | Partial | Server required licence/RC only for three vehicle types, "Other vehicle" description not checked. |
| Serviceable PIN codes and preferences | Partial | Saved without format checks; step 4 of the wizard was never validated. |
| Saved in MySQL as `PENDING` | Partial | Worked via multipart endpoint, **but** `POST /api/auth/register` also accepted `role=delivery` with client-supplied document paths (could point at another applicant's file) and contradicted the existing `AuthFlowTest`. |
| Duplicate email / mobile | Partial | Checked only after all four steps and after files were written; a DB overflow error was reported as "email already registered". |
| Device uploads JPG/JPEG/PNG/PDF ≤ 5 MB | Partial | Validated, but **after** writing to disk (orphan ID documents left on every failed application); extension not checked; 5 MB limit returned no readable message. |
| Live camera (getUserMedia, switch, capture, preview, retake, use photo) | Partial | Capture saved immediately: no preview / retake / use-photo step. "Switch camera" left a blank video. |
| Private storage + admin-only access | Mostly done | Outside public folders, admin-only route. Files were world-readable on disk; upload folder not git-ignored. |
| Admin review, documents, approve / reject + reason | Partial | Pending list only; no full application view; reason optional on the server; document opened as a blob in a new tab. |
| Delivery login only for `ACTIVE` | Backend done | Frontend: `/delivery/dashboard` was **not guarded** (anyone could open it), no logout. |
| Integration with Delivery Dashboard | Missing | Dashboard always showed the demo courier ("Amit Kumar"); no backend profile endpoint. |
| Build | **Broken on Linux** | 7 imports differed in letter case from file names (works on Windows/macOS only). |
| Error handling | Partial | Two `@RestControllerAdvice` classes handled validation errors differently (`message` vs `error`). |

## 2. What was changed

### Backend (`backend/src/main/java/com/vyapari`)
| File | Change |
|---|---|
| `auth/AuthService.java` | JSON sign-up is customers/sellers only again. New `registerDelivery(...)`, `validateDeliveryApplication(...)` (all wizard rules: 18+, PIN codes, ID types, "Other" ID/vehicle names, vehicle/licence formats, licence + RC for every motorised vehicle, preferences, working days), `assertDeliveryContactAvailable(...)`. |
| `delivery/DeliveryRegistrationController.java` | Validate → duplicate check → validate files → store → save; stored files are deleted if saving fails. New `POST /check` for the wizard's first step. |
| `delivery/PrivateDocumentStorage.java` | Declared type **and** extension **and** file signature must agree; owner-only file permissions; `check()` and `delete()`; storage keys validated. |
| `delivery/DeliveryProfileController.java` (new) | `GET/PUT /api/delivery/profile` for the logged-in, approved partner. |
| `admin/AdminDeliveryController.java` | Rejection reason required (5–500 chars). Response no longer exposes private storage keys (`has…Document` flags instead). |
| `admin/AdminDeliveryDocumentController.java` | `nosniff`, `no-store`, filename with extension. |
| `config/ApiExceptionHandler.java` | Readable JSON for >5 MB (413), missing parts, bad multipart, wrong content type. |
| `config/SecurityConfig.java` | Permits `/api/auth/register/delivery/check` (one line). |
| `controller/GlobalExceptionHandler.java` | Removed (duplicate of `ApiExceptionHandler`, returned a different JSON shape). |
| `user/UserStatus.java` | Comment only. |

### Frontend (`src`)
| File | Change |
|---|---|
| `pages/Login.jsx` | Missing `DocumentCapture` import added. Per-step validation with specific messages (incl. step 4), duplicate email/mobile check on step 1, identity number max 40, sensitive fields cleared after submission, "I want to deliver" opens the wizard. |
| `components/DocumentCapture.jsx` | Capture → preview → **Retake / Use photo**; camera switching cycles real devices (falls back to front/back) and re-attaches the stream; clear permission/no-camera messages; type checked by MIME **and** extension; size shown. |
| `api/auth.js` | `checkDeliveryContact()`, 413 message, logout calls the server when delivery/admin auth is real. |
| `api/adminDeliver.js` | Reason always sent; document fetch returns URL + type with clear 401/403/404 messages. |
| `api/deliveryAccount.js` (new) | Real `/api/delivery/profile` calls. |
| `admin/sections/DeliveryManagement.jsx` | Applications tab only: Pending / Approved / Rejected / Blocked filter, full application modal, in-dashboard document viewer (image/PDF), confirm dialogs, required rejection reason, block/unblock. "Delivery team" and "Assign orders" tabs untouched (demo data). |
| `components/RequireRole.jsx` | Delivery dashboard checks the real session when `VITE_REAL_DELIVERY_AUTH=true`. |
| `pages/DeliveryDashboard.jsx` | Real account (name, email, phone, vehicle, PIN codes, approval) layered over the demo trips/wallet; logout; redirect to login when the session ends (e.g. blocked). |
| `d-dashboard/DeliveryProfile.jsx` | Admin-verified fields (login email, vehicle, licence) read-only when real; PIN codes/name/phone save to MySQL. |
| `styles.css` | Two additive rules (captured-photo preview uses the video's existing look; disabled secondary button). |

File-name case fixes (contents unchanged): `GlassButton.jsx`, `GlassDefs.jsx`, `smoothScroll.js`, `ItemForm.jsx`, `location.js`, `support.css`, `adminSellers.js`.

Other: `backend/.gitignore` ignores `private-uploads/`; `backend/database/users_delivery_schema.sql` documents the table; `backend/src/test/java/com/vyapari/DeliveryOnboardingFlowTest.java` added.

Not touched: customer and admin login, seller/customer dashboards, all demo/mock data for unfinished modules (trips, wallet, delivery team, order assignment, bank details), theme and layouts. `backend/database/src/...` is an older copy of the backend that Maven does not compile; it was left as is.

## 3. Database

No new tables and no new columns. Everything stays on the existing `users` table (`role='DELIVERY'`). `ddl-auto=update` keeps working.

- `identity_document_number` / `driving_license_number`: AES-GCM ciphertext (`ENC:…`). Identity numbers are limited to 40 characters so the ciphertext (max 96 chars) fits the existing `VARCHAR(100)`.
- `*_path`: random private keys such as `3f2c…e1.pdf` inside `VYAPARI_DOCUMENTS_DIR`.
- `serviceable_pincodes`: normalised `700001,700002`; `working_days`: `Monday,Wednesday`.
- Reference DDL: `backend/database/users_delivery_schema.sql`.

## 4. API

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/api/auth/register/delivery/check` | public | `{email, phone}` → 200 or 409 with message |
| POST | `/api/auth/register/delivery` | public | multipart: `application` (JSON part), `identity`, `licence`, `vehicleRc` → 201, status `PENDING` |
| POST | `/api/auth/login` | public | `{email, password, role:"delivery"}`; 403 with message for pending / rejected (with reason) / blocked |
| GET | `/api/auth/me` | logged in | current user |
| POST | `/api/auth/logout` | logged in | ends session |
| GET | `/api/admin/delivery-partners?status=PENDING\|ACTIVE\|REJECTED\|BLOCKED` | admin | applications, ID/licence masked |
| GET | `/api/admin/delivery-partners/{id}/documents/{identity\|licence\|vehicle-rc}` | admin | stream document, `no-store` |
| POST | `/api/admin/delivery-partners/{id}/approve` | admin | PENDING/REJECTED → ACTIVE |
| POST | `/api/admin/delivery-partners/{id}/reject` | admin | `{reason}` (required) PENDING → REJECTED |
| POST | `/api/admin/delivery-partners/{id}/block` · `/unblock` | admin | ACTIVE ↔ BLOCKED (open session ended at once) |
| GET / PUT | `/api/delivery/profile` | approved delivery partner | own account; PUT `{name, phone, pincodes[]}` |

`POST /api/auth/register` (JSON) now refuses `role=delivery` with "Only customers and sellers can sign up here."

## 5. Run

```bash
# backend
cd backend
export DB_USER=... DB_PASSWORD=... VYAPARI_DATA_KEY='a-long-random-secret'   # keep the key stable
mvn test            # AuthFlowTest + DeliveryOnboardingFlowTest (H2, does not touch MySQL)
mvn spring-boot:run

# frontend (project root), .env.local unchanged:
#   VITE_REAL_AUTH=false  VITE_REAL_DELIVERY_AUTH=true  VITE_REAL_ADMIN_AUTH=true
npm ci && npm run dev
```

Workflow: `/login?role=delivery&mode=signup` → apply → `/login?role=admin` (admin@vyapari.com) → Delivery personnel → Applications → approve → `/login?role=delivery` → dashboard.

## 6. Testing done for this update

Maven Central was not reachable from the environment used, so **Spring Boot itself was not started and `mvn test` was not run**. Run `mvn test` locally first.

| Test | Result |
|---|---|
| `npm run build` | passes (failed before the file-name case fixes) |
| `npm test` (existing 19 tests) | 19/19 pass |
| Changed backend sources type-checked with `javac --release 17` against Spring/JPA API stand-ins | compiles |
| Real backend classes (`AuthService`, controllers, storage, cipher) exercised with an in-memory repository | 63/63 checks pass |
| Browser test, real Chrome + React app + fake camera, against a test bridge that calls the real backend classes | 51/51 checks pass: full registration incl. camera capture/switch/retake/use, multipart parts, duplicate checks, server file rejection, admin list/viewer/details/approve/reject/block, delivery login, dashboard profile load + save, logout, existing customer/seller doors |
| MySQL 8.0.46: reference schema, encrypted values fit, old 60-char limit overflowed, email unique | confirmed |
| `DeliveryOnboardingFlowTest` (JUnit, Spring + H2) | written, **not run here** |

## 7. Remaining limitations

- Spring wiring (security chain, Jackson, Hibernate, multipart limits) is covered by `DeliveryOnboardingFlowTest` but has not been executed. Run `mvn test`.
- The rest of the delivery dashboard (trips, pool, wallet, duty status, bank details, photo) and the admin "Delivery team" / "Assign orders" tabs are still demo data by design.
- No malware scanning of uploads; file-signature checks only. Add scanning before production.
- CSRF is still disabled in `SecurityConfig` (pre-existing). Enable it before production, together with HTTPS.
- `VYAPARI_DATA_KEY` must be set to a long random secret and kept stable; changing it makes stored ID/licence numbers unreadable.
- The duplicate-contact check can be used to test whether an email/phone is registered (as any sign-up form can); add rate limiting in production.
- Phone uniqueness is enforced in code for delivery partners, not by a DB unique index (existing customer rows may share numbers).
- Documents are kept for rejected applicants; define a retention/deletion policy.
- The admin dashboard page decides access from the role stored at login (existing behaviour, unchanged); every delivery-review API call is checked for the admin role on the server.

## 8. Email OTP (added 22 Nov 2026)

Delivery partners (wizard step 1) and customers (sign-up form) must confirm their email address with a 6-digit code before the account is created. Sellers and admins are unchanged.

**Flow:** Send verification code → code emailed → enter code → Verify → the account is created only with the resulting one-time token, for that exact address.

**Rules:** code valid 10 minutes; 5 wrong attempts per code; resend after 60 s; max 5 codes per email per hour; codes and tokens stored only as SHA-256 hashes (`email_otps` table); token valid 30 minutes and usable once; an already-registered email cannot request a code.

**API**
| Method | Path | Body |
|---|---|---|
| POST | `/api/auth/otp/send` | `{ email, purpose }`, where purpose is `DELIVERY_REGISTRATION` or `CUSTOMER_REGISTRATION` |
| POST | `/api/auth/otp/verify` | `{ email, purpose, code }` → `{ verificationToken }` |
| POST | `/api/auth/register/delivery` | multipart, plus text field `emailVerificationToken` |
| POST | `/api/auth/register` | JSON, plus `emailVerificationToken` (customers) |

**Mail setup** (environment variables for the backend):
```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your.address@gmail.com
MAIL_PASSWORD=<16-character Google App Password>   # not your normal Gmail password
MAIL_FROM=your.address@gmail.com                    # optional, defaults to MAIL_USERNAME
```
Gmail needs 2-Step Verification on, then Google Account → Security → App passwords. Outlook/Office 365: `smtp.office365.com`, port 587. Port 465 servers: also set `MAIL_SSL=true`.
Without these settings, "Send verification code" shows "E-mail is not set up on the server yet". `MAIL_MODE=log` prints emails to the backend console instead of sending them (development only).

**Switches** (`application.properties`): `vyapari.otp.require-for-delivery-registration`, `vyapari.otp.require-for-customer-registration` (both `true`).

**Code:** `mail/Mailer.java`, `otp/EmailOtp.java`, `otp/EmailOtpRepository.java`, `otp/OtpService.java`, `otp/OtpController.java`; changes in `AuthService`, `RegisterRequest` (+`emailVerificationToken`), `DeliveryRegistrationController`, `SecurityConfig`, `pom.xml` (`spring-boot-starter-mail`); frontend `components/EmailVerification.jsx`, `pages/Login.jsx`, `api/auth.js`, `styles.css`. Tests: `CustomerSignupOtpTest` (new), `DeliveryOnboardingFlowTest` (+ OTP test), `AuthFlowTest` (customer OTP switched off there because it tests login rules).
