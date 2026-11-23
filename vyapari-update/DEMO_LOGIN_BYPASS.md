# Temporary local login bypass

For local development, `.env.local` is set to `VITE_REAL_AUTH=false`. This disables backend authentication checks and lets the app open customer, seller, delivery, and admin dashboards without credentials. Login buttons also route directly to the relevant dashboard. Delivery partner registration remains accessible through `/login?role=delivery&mode=signup`.

To restore real backend authentication, change the value to `VITE_REAL_AUTH=true` and restart the Vite dev server. This bypass is for local development only and must never be enabled in production.

The delivery residential-address input now uses a dedicated field name and autocomplete suppression. If Chrome still inserts a saved address, disable address autofill in Chrome settings or clear the saved address profile; browser-level autofill is controlled by Chrome, not React state.
