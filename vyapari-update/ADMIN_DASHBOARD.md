# Vyapari — Admin Dashboard

Frontend-only admin console. Open **`/admin`** (also `/admin/dashboard` and `/admin-dashboard`).
With demo data (the default, `VITE_USE_MOCK` not set to `false`) it opens straight away, like the seller dashboard.
With the real backend it requires `localStorage.vyapari_role === "admin"`, otherwise it redirects to `/login?role=admin`.

Sections are linkable: `/admin?tab=sellers&view=requests`, `?tab=delivery&view=assign`, `?tab=users&view=delivery`, `?tab=tickets&view=seller`, and so on.

## What changed in existing files

Only `src/App.jsx`: three routes plus a lazy import, so the admin code loads only when `/admin` is opened.
The other pages ship the same bundle as before — the main CSS file is byte-identical to the original build.
No other existing file was edited.

## New files

```
src/admin/
  AdminDashboard.jsx      page shell, sidebar groups, top bar, ?tab= routing
  AdminSidebar.jsx        glass sidebar (same classes as seller/delivery dashboards)
  AdminContext.jsx        data provider: run(action), toasts, sync of live tickets
  ui.jsx                  shared pieces: badges, stat cards, confirm dialog, search, pager, sortable tables
  admin.css               all rules use "ad-" classes, so nothing leaks into other dashboards
  data/seed.js            deterministic demo data (sellers, customers, couriers, orders, tickets, refunds, admins)
  data/finance.js         money maths shared by Overview and Revenue & earnings
  data/store.js           every admin action as a pure function + localStorage persistence
  sections/
    AdminOverview.jsx  SellerManagement.jsx  DeliveryManagement.jsx  CatalogManagement.jsx
    OrderManagement.jsx  RefundManagement.jsx  AdminAnalytics.jsx  AdminManagement.jsx
    users/     UserManagement.jsx  CustomerList.jsx  SellerList.jsx  DeliveryList.jsx
    tickets/   TicketManagement.jsx  TicketBoard.jsx  CustomerTickets.jsx  SellerTickets.jsx  DeliveryTickets.jsx
tests/admin.test.mjs      data-model and action tests (run with npm test)
```

Reused without changes: `GlassButton`, `Modal`/`fmtDate` from `s-dashboard/parts.jsx`, `LineChart`/`HBars` from `s-dashboard/charts.jsx`, `dashboard.css`, `scrollToElement`.

## Money model (all figures are platform-wide)

- **Gross sales** = value of all non-cancelled orders
- **Refunds** = approved or completed return/refund requests
- **Platform commission** = 10% × (gross − refunds) — the same 10% the seller wallet uses
- **Seller earnings** = gross − refunds − commission
- **Courier payouts** = ₹40 × delivered orders — the same rate the delivery wallet uses
- **Net platform revenue** = commission − courier payouts
- **Pending settlements** = seller earnings on orders delivered in the last 7 days (T+7)

The order ledger holds the last 45 days in full. Older history is stored as one settled summary row per day, so the weekly, monthly and yearly graphs have three years of data. The Revenue breakdown shows the check `seller earnings + commission = net sales`.

## Demo data and persistence

- Saved in `localStorage["vyapari_admin_v1"]`. Reset from the sidebar ("Reset demo data"). Dates move forward automatically, so a demo saved days ago still looks current.
- **Live tickets:** tickets raised on the same browser in the Seller dashboard ("Contact admin"), the Delivery dashboard (Support) and Customer complaints appear in the matching ticket tab with a **Live** badge. They are read from those dashboards' storage and never written back.
- "Online / last seen" states are demo values from sample data, not real session tracking.
- Catalogue edits are kept in the admin demo and do not change the storefront's category menu.

## Note on filename casing

Five existing files differ in case from how they are imported (for example `Glassbutton.jsx` is imported as `GlassButton.jsx`). This works on Windows and macOS, but `npm run build` fails on Linux (and on most CI and hosting services). The original upload has the same problem; these files were left untouched. To fix it, rename `Glassbutton.jsx → GlassButton.jsx`, `Glassdefs.jsx → GlassDefs.jsx`, `Smoothscroll.js → smoothScroll.js`, `Itemform.jsx → ItemForm.jsx` and `Location.js → location.js`.
