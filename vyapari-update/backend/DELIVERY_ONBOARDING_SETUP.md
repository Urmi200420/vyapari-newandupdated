> **Superseded:** see `DELIVERY_PARTNER_SYSTEM.md` in the project root for the current implementation. Some details below are out of date.

# Vyapari delivery onboarding backend

## Implemented in this update

- `POST /api/auth/register/delivery` accepts multipart form data with JSON part `application` and files `identity`, optional `licence`, optional `vehicleRc`.
- Delivery application data is saved to the existing `users` table with role `DELIVERY` and status `PENDING`.
- Government ID and driving licence numbers are encrypted using AES-GCM before persistence. Set `VYAPARI_DATA_KEY` (or `vyapari.security.data-key`) to a long, random secret and keep it stable; changing it makes existing encrypted values unreadable. The built-in development fallback must be replaced before production.
- Documents are stored outside public frontend folders in `./private-uploads` by default. Set `VYAPARI_DOCUMENTS_DIR` to a protected persistent directory for deployment.
- Upload limits: 5 MB per file; JPG/JPEG, PNG and PDF MIME types. Spring multipart request maximum is 16 MB.
- Admin list: `GET /api/admin/delivery-partners?status=PENDING` (also supports ACTIVE, REJECTED, BLOCKED and no filter).
- Admin actions: `POST /api/admin/delivery-partners/{id}/approve`, `/reject` with `{ "reason": "..." }`, `/block`, `/unblock`.
- Admin-only document retrieval: `GET /api/admin/delivery-partners/{id}/documents/identity`, `/licence`, `/vehicle-rc`.
- Delivery login continues through `POST /api/auth/login` with `{email,password,role:"delivery"}`. Existing `AuthService` denies PENDING, REJECTED and BLOCKED accounts.

## Frontend configuration

`.env.local` keeps the global mock mode for unfinished dashboards while enabling real delivery auth:

```env
VITE_REAL_AUTH=false
VITE_REAL_DELIVERY_AUTH=true
VITE_REAL_ADMIN_AUTH=true
```

Restart Vite after changing environment variables. The delivery registration wizard now posts its application and selected/captured files to the multipart endpoint. Customer and seller remain in mock mode. Admin login is real so the admin can authenticate to the protected delivery-application review APIs; the rest of the admin dashboard demo data remains unchanged.

## Run locally

1. Start MySQL and ensure the configured `vyapari` database/user is available.
2. In `backend`, configure `DB_USER`, `DB_PASSWORD`, `VYAPARI_DATA_KEY`, and optionally `VYAPARI_DOCUMENTS_DIR`.
3. Run `mvn spring-boot:run` from `backend`.
4. In the project root, run `npm install` then `npm run dev`.
5. Open `/login?role=delivery&mode=signup` to apply. Admin must be logged in using the existing admin account to review applications.

## Important verification notes

- `ddl-auto=update` adds the new delivery columns to the existing `users` table; it does not drop existing tables. Back up the database before running schema updates.
- Camera capture remains browser-side and creates an image file; that file is sent through the same multipart upload and server validation as a device-selected image.
- Server validation checks the reported MIME type and file size. For production, add file-signature/magic-byte inspection and malware scanning before accepting identity documents.
- Identity document files are private; only admin-authenticated routes can retrieve them. Configure HTTPS in deployment.
- Build/tests could not be executed in this environment because Maven and Node dependencies are unavailable. Run `mvn test` and `npm run build` locally before relying on this update.
