# Delivery onboarding update

## Service PIN locations
- Enter a six-digit PIN code in Delivery Dashboard > Courier Profile > Logistics & Service Pincodes.
- The form looks up matching post offices/localities from the India Post PIN lookup endpoint and presents selectable suggestions.
- Select a suggestion, or type any locality/area manually in the Area / Locality field.
- Click **+ Add Area** to add the PIN and area label. Existing PIN-only profile data remains compatible.
- The lookup requires internet access. If the service is unavailable, manual area entry remains available.

## Registration page
Open `http://localhost:5173/login?role=delivery&mode=signup` directly.
Alternatively, open `http://localhost:5173/login?role=delivery` and select **Apply to deliver**.

## Document camera capture
The identity, driving licence and vehicle RC upload controls now allow a device file or live camera capture. Camera access requires browser permission and a secure context (localhost is supported). Files are limited to JPG, PNG or PDF and 5 MB each.

This is frontend capture only. The captured file data is held in the registration form state; it is not yet persisted to MySQL or uploaded to Spring Boot. That requires the separate multipart upload endpoint and secure document storage phase.

## Verification
`npm test`: 19 passed, 0 failed.
A production Vite build was not verified because dependency installation timed out in this environment.
