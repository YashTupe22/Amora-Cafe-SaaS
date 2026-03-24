# 🍽️ Restaurant Order Workflow System — Metaprompt

## SYSTEM OVERVIEW

You are building a **Restaurant SaaS Order Management System** that integrates a complete order workflow between waiters, the kitchen, and admin/dashboard. The system involves two new pages that **do not exist yet** and must be built fresh and integrated into the existing SaaS:

1. **Waiter Page** — A locked, kiosk-style interface for waiters
2. **Kitchen Page** — A real-time order display for kitchen staff

These must integrate with the **existing SaaS** which already has:
- Admin login & dashboard (main dashboard)
- Attendance section (where waiter ID codes are visible)
- Settings / Onboarding (where UPI ID is configured)
- Bill generation and print functionality

---

## PART 1: WAITER ID SYSTEM

### Rules
- Every waiter has a **unique ID code** generated **once** by the admin
- Format: **1 alphabet + 2 digits** → Example: `A12`, `B07`, `Z99`
- IDs are **visible in the Attendance section** of the existing SaaS admin dashboard
- IDs are permanent and cannot be regenerated without admin action

### What to Build
- A waiter ID generator utility (admin-side) that produces IDs in the format `[A-Z][0-9][0-9]`
- Store waiter ID alongside waiter profile in the database
- Display waiter IDs in the existing **Attendance section** table

### Integration Point
```
Existing Attendance Section → Add column: "Waiter ID"
Admin can generate ID on waiter creation (one-time action)
```

---

## PART 2: WAITER LOGIN PAGE (NEW PAGE)

### Description
A **dedicated, locked login page** specifically for waiters. This is a **separate route/URL** from the admin login. It is designed to be a kiosk — the waiter **cannot navigate away** from this page without the admin password.

### UI Requirements
- Full-screen, distraction-free layout (no nav bar, no links, no back button)
- Single input: **Waiter ID** (format: `A12`)
- On successful ID entry → redirect to **Waiter Order Page**
- **Exit Lock**: A hidden or locked "Exit" button that requires the **admin password** to leave the waiter session. Until admin password is entered, the waiter is trapped in the waiter UI.
- No keyboard shortcuts to escape (block F5, Alt+F4 if web kiosk, or handle gracefully)

### Technical Behaviour
```
Route: /waiter-login  (separate from /admin/login)
Auth: Match entered Waiter ID against DB
Session: Create waiter session token (different from admin session)
Exit: Only possible by entering admin password in an "Exit" modal
```

### Exit Modal (Admin Override)
```
Trigger: A subtle "Exit" button (bottom corner)
Modal: Prompt for Admin Password
On correct password → destroy waiter session → redirect to /waiter-login
On wrong password → show error, stay locked
```

---

## PART 3: WAITER ORDER PAGE (NEW PAGE)

### Description
The main interface waiters use to **place customer orders**. After logging in with their Waiter ID, the waiter lands here.

### UI Layout
- **Bottom Floating Button**: Large, prominent "New Order" or "Take Order" button fixed at the bottom of the screen for fast access
- **Menu Display**: Full menu browsable with categories
- **Search Bar**: Search items by name in real-time
- **Order Builder**:
  - Select item → choose quantity (+ / - controls)
  - Enter **Table Number**
  - Review order summary
  - Confirm & Place Order button

### Order Data Captured
```json
{
  "waiter_id": "A12",
  "table_number": 5,
  "items": [
    { "item_id": "...", "name": "Butter Chicken", "quantity": 2, "price": 280 }
  ],
  "timestamp": "2026-03-24T14:32:00Z",
  "status": "placed"
}
```

### On Order Placed
- Order is saved to DB with status `placed`
- **Realtime push** (WebSocket / Firebase / Supabase Realtime / Pusher) to:
  - ✅ Kitchen Page
  - ✅ Main Admin Dashboard

---

## PART 4: KITCHEN PAGE (NEW PAGE)

### Description
A **display-only page** for kitchen staff showing incoming orders in real-time. No login required or use a simple PIN — keep it simple for kitchen environment.

### UI Requirements
- Full screen, large text (readable from a distance)
- Cards per order showing:
  - Table Number (large, prominent)
  - Items + Quantities
  - Waiter ID
  - Time since order placed (live counter)
- **Status controls per card**:
  - `Preparing` → `Ready` → `Served`
  - Kitchen staff can tap to update status
- New orders appear instantly (no page refresh)
- Sound alert on new order (optional but recommended)
- Color coding:
  - 🟡 New / Pending
  - 🔵 Preparing
  - 🟢 Ready
  - ⚫ Served / Completed

### Route
```
Route: /kitchen
Auth: None or simple PIN (not full admin login)
Realtime: Subscribe to orders collection filtered by status != 'served'
```

---

## PART 5: REALTIME INTEGRATION

### Technology Options (choose one based on existing stack)
| Stack | Realtime Solution |
|---|---|
| Supabase | `supabase.channel().on('postgres_changes')` |
| Firebase | `onSnapshot()` on orders collection |
| Node + Socket.io | Emit `new_order` event on POST /orders |
| Pusher | Trigger channel on order creation |

### Events to Broadcast
```
new_order      → Kitchen Page + Main Dashboard
order_status   → Main Dashboard (status updates from kitchen)
order_complete → Waiter Page (optional notification)
bill_generated → Waiter Page
```

---

## PART 6: BILL GENERATION & COMPLETION

### Flow
1. Customer finishes eating
2. Waiter taps **"Complete Order"** on their Waiter Page (or from a table view)
3. System generates a **printable bill** that appears:
   - On the **Waiter Page** (for the waiter to show/print)
   - On the **Main Dashboard** (for admin visibility)
4. Bill includes:
   - Itemized list with quantities and prices
   - Table number, Waiter ID, timestamp
   - **QR Code** for UPI payment (using `bhim-upi` / `upi://` scheme)
   - Total amount

### QR Code Rules
```
If SaaS account has UPI ID configured → Show UPI QR code on bill
If NO UPI ID configured → Bill prints WITHOUT QR code
UPI ID can be set during onboarding OR in Settings
UPI ID once saved → LOCKED (cannot be changed unless admin enters password)
```

### UPI QR Generation
```javascript
// UPI payment URL format
const upiUrl = `upi://pay?pa=${upiId}&pn=${businessName}&am=${totalAmount}&cu=INR`
// Generate QR from this URL using: qrcode.js / react-qr-code / qrcode npm package
```

### UPI ID Lock Rule
```
On save UPI ID:
  - Store in DB with flag: upi_locked = true
  - UI: Show field as read-only with a lock icon
  - "Change UPI" button → triggers Admin Password modal
  - On correct password → unlock field for editing → re-lock on save
```

---

## PART 7: MAIN DASHBOARD INTEGRATION (EXISTING PAGE — EXTEND IT)

### What to Add
- **Live Orders Panel**: A section/widget on the existing dashboard showing all active orders in real-time
  - Table number, items, status, waiter
  - Filter by status (Pending / Preparing / Ready / Billed)
- **Bill Ready notification**: Visual indicator when a bill is generated and ready to print
- **Print Bill button**: Opens print-friendly bill view

---

## PART 8: DATABASE SCHEMA

### New Tables / Collections

```sql
-- Waiters
waiters (
  id UUID PRIMARY KEY,
  name VARCHAR,
  waiter_code CHAR(3) UNIQUE,  -- e.g. A12
  created_at TIMESTAMP
)

-- Orders
orders (
  id UUID PRIMARY KEY,
  waiter_id UUID REFERENCES waiters(id),
  table_number INT,
  status ENUM('placed', 'preparing', 'ready', 'completed', 'billed'),
  created_at TIMESTAMP,
  completed_at TIMESTAMP
)

-- Order Items
order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  item_name VARCHAR,
  quantity INT,
  unit_price DECIMAL,
  total_price DECIMAL
)

-- Bills
bills (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  total_amount DECIMAL,
  upi_id VARCHAR,
  qr_generated BOOLEAN,
  created_at TIMESTAMP
)

-- SaaS Settings (extend existing)
settings (
  ...existing fields...,
  upi_id VARCHAR,
  upi_locked BOOLEAN DEFAULT false
)
```

---

## PART 9: PAGES & ROUTES SUMMARY

| Route | Page | Who Uses It | Auth |
|---|---|---|---|
| `/waiter-login` | Waiter Login | Waiter | Waiter ID |
| `/waiter` | Waiter Order Page | Waiter | Waiter session |
| `/kitchen` | Kitchen Display | Kitchen Staff | None / PIN |
| `/dashboard` | Main Dashboard | Admin | Admin session (existing) |
| `/settings` | Settings | Admin | Admin session (existing) |

---

## PART 10: STEP-BY-STEP BUILD ORDER

Build in this sequence to avoid blockers:

1. **Database** → Create `waiters`, `orders`, `order_items`, `bills` tables
2. **Waiter ID Generator** → Add to admin panel + Attendance section
3. **Waiter Login Page** → `/waiter-login` with lock mechanism
4. **Menu API** → Endpoint to fetch full menu (if not existing)
5. **Order API** → `POST /orders` endpoint
6. **Waiter Order Page** → UI to browse menu, build & place order
7. **Realtime Setup** → WebSocket/Supabase/Firebase channel for orders
8. **Kitchen Page** → `/kitchen` realtime order display
9. **Dashboard Integration** → Add live orders widget to existing dashboard
10. **Bill Generation** → Complete order → generate bill with QR
11. **UPI Lock** → Implement UPI ID lock in Settings
12. **Testing** → End-to-end order flow test

---

## DESIGN GUIDELINES FOR NEW PAGES

### Waiter Page
- **Tone**: Clean, utilitarian, fast. A waiter is on their feet — every tap must count.
- Large touch targets (min 48px)
- High contrast (dark background or bright accent)
- Bottom sheet / floating button pattern for quick access
- Minimal text, icon-forward

### Kitchen Page
- **Tone**: Industrial, functional, high-visibility
- Dark background (reduces glare in kitchen)
- Large bold text readable from 2 meters away
- Card-based layout, color-coded by status
- Auto-scrolling if many orders

---

## KEY CONSTRAINTS TO ALWAYS REMEMBER

- ⚠️ Waiter cannot exit the waiter UI without admin password
- ⚠️ UPI ID cannot be changed without admin password
- ⚠️ Waiter ID format is strictly `[A-Z][0-9][0-9]` (1 letter + 2 digits)
- ⚠️ Waiter ID is generated once per waiter, never regenerated
- ⚠️ If no UPI ID is set, QR code is omitted from bill silently
- ⚠️ Orders must appear on BOTH kitchen page and main dashboard in real-time
- ⚠️ Bill appears on both waiter page and main dashboard when generated
