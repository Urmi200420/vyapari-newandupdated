# Vyapari — Shared Cart and Product Complaints

This update extends the supplied `vyapari-newandupdated-main (2).zip`. It retains the uploaded version's login bypass, address/location features, existing product dataset, filtering, COD checkout, seller portal and delivery portal.

## Run

Use Node.js 22+ and npm.

```bash
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Open the local URL printed by Vite. The customer dashboard is at `/customer`; complaints are at `/customer/complaints`. Production builds are in `dist/`. A static host must route application URLs to `index.html` for BrowserRouter refreshes.

## Files created

- `src/customer/CustomerContext.jsx`: shared customer state provider, synchronous persistence, cross-tab storage listener, shared add action, existing demo prompt and notification presentation.
- `src/customer/complaintService.js`: complaint validation, unique IDs, customer/order/product association, idempotent creation, attachment limits and image reading/decoding.
- `src/customer/Complaints.jsx`: complaint form, image previews/removal, history and read-only detail pages.
- `tests/features.test.mjs`: migration, cart/checkout rules, complaints, duplicate submission and file-validation tests.
- `tests/filters.test.mjs`: regression tests for the existing catalogue filters.
- `README.md`: these run instructions, implementation notes and verification record.

## Files modified

- `src/main.jsx`: mounts one `CustomerProvider` above the existing application.
- `src/pages/Home.jsx`: reads the existing enriched product catalogue; adds the shared cart count/link. Existing sections and search remain.
- `src/components/ProductCard.jsx`: calls the shared add action directly instead of navigating to Shop; respects existing stock limits.
- `src/customer/Customer.jsx`: consumes the provider instead of owning an independent customer state; adds My Complaints navigation and two routes.
- `src/customer/store.js`: migrates existing saved state with a stable demo customer ID and an empty complaint collection, while retaining existing carts, profiles, addresses and orders.
- `src/customer/Shopping.jsx`: displays seller information from the existing seller dataset.
- `src/customer/customer.css`: adds scoped complaint image/text/file-control styles using existing tokens, plus narrow-screen header wrapping for the new cart link.
- `package.json`: adds the test command. No dependencies were added.
- `vite.config.js`: allows the development preview host `terminal.local`; the existing API proxy is unchanged.

The archive also required five case-sensitive filename corrections: `Glassbutton.jsx` → `GlassButton.jsx`, `Glassdefs.jsx` → `GlassDefs.jsx`, `Smoothscroll.js` → `smoothScroll.js`, `Itemform.jsx` → `ItemForm.jsx`, and `Location.js` → `location.js`. Their contents were not changed.

## How the shared cart works

Both the homepage and customer dashboard live under one React Context provider. There is one customer state and one cart array containing canonical product IDs and quantities. Product details (name, price, image and seller) resolve from the existing enriched catalogue, which is derived from the original product dataset.

All additions call the existing `addItem` operation. Duplicate products increase quantity; unavailable products and excessive quantities are rejected. The existing cart page still controls quantity, removal, subtotals, delivery and checkout. Provider updates use the most recent state reference, save to the existing `vyapari_customer_v1` localStorage key and update every mounted consumer. Browser storage events synchronize other tabs on the same origin. Navigating or refreshing does not clear the cart. Successful COD checkout clears the same cart everywhere.

No separate landing-page product records, second cart, new backend or database was introduced.

## How complaints work

My Complaints lets the customer choose an item from an existing order, automatically linking the exact order and product. Category and a trimmed description of 20–2,000 characters are required. The product image and order ID are shown before submission.

Supporting JPEG, PNG and WebP images are optional: up to three, at most 512 KB each and 1 MB combined. File type, size, basic file signature and actual browser image decoding are validated before preview. Images can be removed before submission. A new file selection replaces the current attachments.

Complaint creation stores a unique `CMP-…` ID, stable customer ID, order ID, purchased-product snapshot, category, description, supporting images, submission timestamp and initial Submitted status. A submission lock and idempotency token prevent accidental duplicate records. Complaint storage uses the same customer state/key as the existing cart and orders. A save failure leaves the form open and reports the error instead of showing a false success.

History shows every complaint for the demo customer. Details include the image attachments, current status and any supplied resolution remarks/responses. Submitted, Under Review, Resolved and Rejected are supported as record statuses. Complaints are read-only in this frontend, including closed complaints. There are no fabricated responses, seeded complaints or automatic resolutions.

The pure `createComplaint` operation and centralized persistence boundary can later be connected to a real service. Actual authentication, customer isolation and server-side upload validation would then belong on that backend.

## Verification performed

- `npm test`: all 12 tests passed, including filtering regressions.
- `npm run build`: production build passed on Linux.
- Homepage: added Broccoli twice; customer cart showed one canonical product line with quantity 2, image, seller, ₹158 subtotal and ₹207 payable total.
- Shared state: increased quantity to 3; another open homepage tab showed Cart (3). Decreased to 2 and removed it; the cart became empty and the homepage showed Cart (0).
- Dashboard: added Carrots; the homepage immediately showed Cart (1), including after refresh.
- COD checkout: existing address selection, review and placement completed at ₹104 for Carrots plus delivery. The order survived refresh and both cart displays reset to zero.
- Complaints: missing mandatory fields blocked submission. An unsupported text attachment was rejected. A valid JPEG previewed, submitted successfully, appeared in history and remained in details with its preview after refresh.
- Complaint records stayed Submitted, without invented support remarks or responses.
- Mobile: inspected homepage cart/search and complaint history/form at 390px. Complaint content width equalled available width (351px), with no horizontal overflow.
- Seller overview, seller landing and delivery dashboard loaded with their existing demo content.
- Byte comparison confirmed existing seller/delivery/API/login, address/location, catalogue/filtering, orders, overview and main theme files were unchanged (apart from the filename casing fixes).

## Remaining limitations

This remains a single-customer frontend demonstration. Data and images persist only in the browser on the same origin; clearing site data removes them. Storage capacity varies by browser, so image size limits are deliberately modest. Multiple tabs synchronize normal sequential changes; simultaneous writes use localStorage's last-write-wins behavior.

No seller receives a complaint and no support workflow changes its status. The details page displays status updates/responses only when supplied in the stored record by a future integration. No real authentication, backend, complaint delivery service or new payment mechanism was added. The existing location integration was preserved and was not invoked during testing because it requests location access.
