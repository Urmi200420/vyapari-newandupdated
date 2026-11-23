
## Admin review UI

Open Admin Dashboard → Delivery personnel → Applications. This tab loads live PENDING applications from the Spring Boot admin endpoint, offers secure document-view actions, and submits approve/reject actions. The existing Delivery Team and Assign Orders tabs remain on their existing demo data for now.

## Authentication mode used in this development ZIP

- Customer and seller authentication remains in mock mode.
- Delivery authentication and registration use Spring Boot (`VITE_REAL_DELIVERY_AUTH=true`).
- Admin login uses the existing Spring Boot admin authentication (`VITE_REAL_ADMIN_AUTH=true`) so the protected Applications API can be used.
- Other dashboard datasets remain mock/demo data (`VITE_REAL_AUTH=false`).
