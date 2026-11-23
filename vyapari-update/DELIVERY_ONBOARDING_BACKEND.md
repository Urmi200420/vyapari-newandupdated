> **Superseded:** see `DELIVERY_PARTNER_SYSTEM.md` in the project root for the current implementation. Some details below are out of date.

# Delivery partner onboarding backend

The delivery onboarding fields are stored directly on the existing `users` table. No `DeliveryProfile` table/entity is introduced. The React UI has intentionally not been restyled or changed in this update.

## Registration

Use the existing endpoint `POST /api/auth/register` with `role: "delivery"` and the existing basic fields (`name`, `email`, `phone`, `password`) plus:

- `dateOfBirth` (`YYYY-MM-DD`)
- `address`, `city`, `pincode`
- `identityDocumentType`, `identityDocumentNumber`
- `identityDocumentPath` (private uploaded-document reference; actual upload/storage endpoint is not part of this change)
- `vehicleType`, `vehicleNumber`
- `drivingLicenseNumber`, `drivingLicensePath`, `vehicleRcPath`
- `emergencyContact`, `serviceablePincodes`, `availabilityPreference`

A successful application is created with `role=DELIVERY` and `status=PENDING`. Pending and rejected delivery accounts cannot log in. Customers and sellers keep their existing registration behavior.

Example request body:

```json
{
  "name": "Rahul Sharma",
  "email": "rahul@example.com",
  "phone": "9876543210",
  "password": "StrongPassword123",
  "role": "delivery",
  "dateOfBirth": "1999-04-15",
  "address": "12 Example Road",
  "city": "Kolkata",
  "pincode": "700001",
  "identityDocumentType": "VOTER_ID",
  "identityDocumentNumber": "IDENTITY_NUMBER",
  "identityDocumentPath": "private-documents/application-123/identity.pdf",
  "vehicleType": "Motorcycle",
  "vehicleNumber": "WB01AB1234",
  "drivingLicenseNumber": "LICENCE_NUMBER",
  "drivingLicensePath": "private-documents/application-123/licence.pdf",
  "vehicleRcPath": "private-documents/application-123/vehicle-rc.pdf",
  "emergencyContact": "9876500000",
  "serviceablePincodes": "700001,700002",
  "availabilityPreference": "FULL_TIME"
}
```

## Admin review

`GET /api/admin/delivery-partners` and `GET /api/admin/delivery-partners?status=PENDING` now return the additional delivery application fields along with the existing user fields. Identity and driving-licence numbers are masked in this response; document references are returned for use by an authenticated, permission-checked document viewer.

- `POST /api/admin/delivery-partners/{id}/approve` changes PENDING to ACTIVE.
- `POST /api/admin/delivery-partners/{id}/reject` changes PENDING to REJECTED. Optional body: `{"reason":"Please provide a clearer identity document."}`.
- Existing block/unblock endpoints remain available.

Approval/rejection timestamps are stored in `reviewed_at`; the rejection explanation is stored in `rejection_reason`.

## Database

The backend has `spring.jpa.hibernate.ddl-auto=update`, so Hibernate will add the new nullable columns to the existing `users` table when the updated backend starts. Back up the database before running the updated application.

## Security / production follow-up

Identity numbers are sensitive personal data. This development change stores the submitted number in the database but masks it in the admin list response. Before production, encrypt identity and licence numbers at rest, keep uploaded documents in private object/file storage (not a public static directory), enforce admin-only document access, define retention/deletion rules, and avoid collecting full Aadhaar numbers where a masked Aadhaar or another accepted ID is sufficient. The `*Path` values are references only; secure upload/download handling still needs to be implemented.
