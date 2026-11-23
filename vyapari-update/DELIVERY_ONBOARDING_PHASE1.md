> **Superseded:** see `DELIVERY_PARTNER_SYSTEM.md` in the project root for the current implementation. Some details below are out of date.

# Vyapari – Delivery Partner Onboarding (Phase 1)

## Included in this phase
- A four-step delivery partner registration wizard under the existing delivery portal's **Apply to deliver** flow (`/login?role=delivery&mode=signup`).
- Personal information, identity information, vehicle information, and delivery preferences.
- Dropdowns for identity document type, vehicle type, availability, experience, and preferred working hours.
- Conditional fields for **Other Government ID** (ID name and number) and **Other vehicle type** (vehicle description).
- Working-day selection, PIN-code validation, and basic required-field validation.
- Review summary at the end of the form.
- Styling follows the existing auth card, colour variables, input treatment, and glass-button styling. Existing customer and seller login/registration flows are not intentionally changed.

## Not included yet
- This phase does not upload documents, access the camera, or submit the delivery application to Spring Boot/MySQL.
- The final screen is a frontend milestone only. Document upload and actual API persistence are subsequent phases.

## Next phases
- Phase 2: document upload controls (device file picker, preview, replace/remove, 5 MB per file).
- Phase 3: live camera capture.
- Phase 4: Spring Boot multipart upload, secure storage, and admin-only document retrieval.
- Then connect the complete registration payload to the delivery application and admin approval workflow.
