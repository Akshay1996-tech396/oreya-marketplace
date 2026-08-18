# OREYA Admin Restaurant Parity Patch

This patch makes the Admin Restaurant experience follow the existing Vendor Restaurant experience while preserving Admin-only controls.

## Included
- Same Vendor Restaurant card/list structure on Admin.
- Admin Add/Edit uses the existing Vendor `RestaurantForm` UI.
- Admin Menu, Operating Hours and Tables use the existing Vendor managers.
- Admin Reservations links to `/admin/restaurant-reservations`.
- Admin View Public Page uses `/restaurants/[slug]`.
- Approve / Reject / Suspend / Activate / Inactive controls remain available.
- New Admin APIs enforce `ADMIN` authorization.
- Vendor manager components default to Vendor APIs, preserving Vendor behavior.

## Required route structure
```text
src/app/(dashboard)/admin/restaurants/
├── page.tsx
├── add/page.tsx
└── [id]/
    ├── edit/page.tsx
    ├── menu/page.tsx
    ├── hours/page.tsx
    └── tables/page.tsx
```

Do NOT create another `src/app/admin/restaurants` tree and do NOT create `restaurants/restaurants`, `add/add`, or `[id]/[id]` folders.

## Apply
```powershell
powershell -ExecutionPolicy Bypass -File .\apply.ps1 -ProjectRoot "C:\Users\Admin\Desktop\marketplace"
```
The script backs up existing target files before copying and does not move/delete route folders.

## Verify
```powershell
Get-ChildItem -LiteralPath ".\src\app\(dashboard)\admin\restaurants" -Recurse -File | Select-Object FullName
Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
npm run build
```

Restaurants remain TABLE RESERVATION ONLY. No food ordering/delivery behavior is added.
