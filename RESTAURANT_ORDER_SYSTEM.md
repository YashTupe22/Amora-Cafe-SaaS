# 🍽️ Restaurant Order System - Implementation Guide

## Overview

This document describes the restaurant order management system integrated into the Amora Cafe SaaS platform. The system enables complete order workflow from waiter order-taking to kitchen preparation to bill generation with UPI payment.

## System Components

### 1. Waiter ID System
- **Format**: `[A-Z][0-9]{2}` (e.g., A12, B07, Z99)
- **Generation**: Automatic unique code generator
- **Location**: Attendance page → "Generate Code" button for waiter roles
- **Storage**: `employees.waiterCode` field in Firestore
- **Validation**: `isValidWaiterCode()` in `lib/waiterUtils.ts`

### 2. Waiter Login Page (`/waiter-login`)
- **Purpose**: Kiosk-style locked login for waiters
- **Features**:
  - Waiter code input (3 characters, auto-uppercase)
  - Admin password-protected exit
  - No back navigation or escape shortcuts
  - Session stored in sessionStorage
- **Security**: Cannot exit without admin password

### 3. Waiter Order Page (`/waiter`)
- **Purpose**: Main interface for taking customer orders
- **Features**:
  - Menu browser with category filters
  - Search items by name
  - Add/remove items with quantity controls
  - Table number input (required)
  - Running total display
  - Place order button
  - Admin password-protected logout
- **Order Flow**:
  1. Select menu items + quantities
  2. Enter table number
  3. Review order
  4. Place order → saves to Firestore
  5. Success message + reset form

### 4. Kitchen Display Page (`/kitchen`)
- **Purpose**: Real-time order display for kitchen staff
- **Features**:
  - Large, readable text (distance viewing)
  - Real-time updates (Firestore onSnapshot)
  - Order cards show:
    - Order number (large)
    - Table number (very large)
    - Waiter code/name
    - Items list with quantities
    - Live time counter ("X min ago")
  - Status controls (tap to update)
  - Color-coded by status:
    - 🟡 Placed/Pending (#f59e0b)
    - 🔵 Preparing (#3b82f6)
    - 🟢 Ready (#22c55e)
  - Sound alert on new orders (optional)
- **Auth**: No login required (or simple PIN)

### 5. Dashboard Integration
- **Live Orders Widget**: Shows active orders in real-time
- **Features**:
  - Order count badge
  - Status filters (All / Placed / Preparing / Ready)
  - Click to view details
  - Link to full kitchen display
- **Visibility**: Only shown in restaurant interface mode

### 6. Settings - UPI Configuration
- **UPI ID Input**: Merchant UPI ID (e.g., merchant@paytm)
- **Lock Mechanism**:
  - First save: UPI ID becomes locked
  - "Change UPI ID" button requires admin password
  - Prevents unauthorized changes
- **Storage**: `profile.upiId` and `profile.upiLocked`

### 7. Bill Generation
- **Trigger**: Complete order (mark as "Served")
- **Features**:
  - Itemized bill with quantities and prices
  - Subtotal, tax, total
  - Table number, waiter ID, timestamp
  - **UPI QR Code**: Generated if UPI ID configured
  - Printable format
- **QR Code**: Uses `upi://` scheme with `qrcode` library
- **Display**: Shows on both waiter page and dashboard

## Data Models

### Employee (Extended)
```typescript
interface Employee {
  // ... existing fields
  waiterCode?: string;      // Format: A12
  isWaiter?: boolean;       // Flag for waiter role
}
```

### Order
```typescript
interface Order {
  id: string;
  orderNo: string;          // ORD-001, ORD-002, etc.
  waiterId: string;
  waiterName: string;
  waiterCode: string;
  tableNumber: string;
  items: OrderItem[];
  status: 'placed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  createdAt: Date | string;
  updatedAt: Date | string;
  completedAt?: Date | string;
  notes?: string;
}
```

### OrderItem
```typescript
interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
  category?: MenuCategory;
}
```

### Bill
```typescript
interface Bill {
  id: string;
  billNo: string;           // BILL-001, BILL-002, etc.
  orderId: string;
  tableNumber: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMode?: 'Cash' | 'Card' | 'UPI';
  upiQrCode?: string;       // QR code data URL
  createdAt: Date | string;
  paidAt?: Date | string;
}
```

### Profile (Extended)
```typescript
interface Profile {
  // ... existing fields
  upiId?: string;
  upiLocked?: boolean;
  adminPassword?: string;   // Hashed password for waiter exit/UPI changes
}
```

## Firestore Structure

```
users/
  {uid}/
    employees/              ← Staff records with waiterCode
    orders/                 ← Restaurant orders (NEW)
      {orderId}/
        - orderNo
        - waiterId
        - waiterCode
        - tableNumber
        - items[]
        - status
        - createdAt
        - updatedAt
    bills/                  ← Generated bills (NEW)
      {billId}/
        - billNo
        - orderId
        - items[]
        - total
        - upiQrCode
        - createdAt
    invoices/               ← Existing invoices
    transactions/           ← Existing transactions
    catalogue/              ← Menu items (or localStorage)
```

## API Routes

### Orders API
- **POST /api/orders** - Create new order
- **GET /api/orders** - List orders (with filters)
- **PATCH /api/orders/[id]** - Update order status
- **POST /api/orders/[id]/complete** - Complete order & generate bill

### Authentication
All APIs require Firebase ID token in Authorization header:
```
Authorization: Bearer {firebaseIdToken}
```

## Real-time Sync

### Kitchen Display
```typescript
useEffect(() => {
  const ordersRef = collection(db, 'users', uid, 'orders');
  const q = query(
    ordersRef,
    where('status', 'in', ['placed', 'preparing', 'ready']),
    orderBy('createdAt', 'desc')
  );
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    // Update orders state
    // Play sound if new order
  });
  
  return () => unsubscribe();
}, [uid]);
```

### Dashboard Widget
```typescript
// Similar pattern but with limit
const q = query(ordersRef, where('status', '!=', 'served'), limit(20));
```

## Utility Functions

### lib/waiterUtils.ts
- `generateWaiterCode(existingCodes: string[]): string`
- `isValidWaiterCode(code: string): boolean`
- `generateOrderNumber(orderCount: number): string`
- `generateBillNumber(billCount: number): string`
- `generateUpiUrl(upiId, businessName, amount, orderId?): string`

## Security Features

1. **Waiter Session Lock**: Cannot exit without admin password
2. **UPI ID Lock**: Cannot change without admin password
3. **Back Navigation Block**: Prevents accidental exits
4. **Keyboard Shortcut Block**: Disables F5, Ctrl+R, Ctrl+W, Alt+F4
5. **Firebase Auth**: All API calls require valid token

## Testing Workflow

### End-to-End Test
1. **Admin Setup**:
   - Go to Attendance
   - Add employee with "Waiter" role
   - Click "Generate Code" → assigns waiter code (e.g., A12)
   - Go to Settings → Payment Settings
   - Enter UPI ID → save (gets locked)

2. **Waiter Login**:
   - Navigate to `/waiter-login`
   - Enter waiter code (A12)
   - Login → redirects to `/waiter`

3. **Place Order**:
   - Browse menu, add items (e.g., 2x Chicken Biryani, 1x Mojito)
   - Enter table number (e.g., T-5)
   - Click "Place Order"
   - Success message appears

4. **Kitchen Display**:
   - Navigate to `/kitchen`
   - See new order card appear in real-time
   - Card shows: ORD-001, Table T-5, items, waiter A12
   - Status: Placed (yellow background)
   - Click "Start Cooking" → status changes to Preparing (blue)
   - Click "Ready" → status changes to Ready (green)

5. **Dashboard View**:
   - Navigate to `/dashboard`
   - See "Active Orders" widget
   - Shows same order in real-time
   - Filter by status

6. **Complete Order**:
   - Click "Mark Served" (from dashboard or kitchen)
   - Order marked as Served
   - Bill generated automatically
   - Bill shows:
     - Items with prices
     - Total amount
     - UPI QR code (if UPI ID configured)
   - Order disappears from kitchen display

7. **Bill View**:
   - View generated bill
   - Scan QR code to test UPI payment (opens payment app)
   - Print bill (browser print dialog)

## Configuration

### Admin Password (for demo)
- Default: `admin123`
- Used for:
  - Exiting waiter mode
  - Changing UPI ID
- **Production**: Should be stored hashed in profile

### UPI ID Format
- Example: `merchant@paytm`, `user@oksbi`, `business@payu`
- Validation: `username@provider` pattern
- QR Format: `upi://pay?pa={upiId}&pn={name}&am={amount}&cu=INR`

## Troubleshooting

### Waiter cannot login
- Check if waiter code exists in attendance
- Verify code format (1 letter + 2 digits)
- Check browser console for errors

### Orders not appearing in kitchen
- Verify Firestore connection
- Check Firebase rules allow read/write
- Ensure onSnapshot listener is active
- Check browser console for errors

### UPI QR not generating
- Verify UPI ID is saved in profile
- Check `generateUpiUrl()` function
- Ensure `qrcode` library is installed
- Check bill generation logic

### Real-time not working
- Check Firestore imports (onSnapshot)
- Verify cleanup function in useEffect
- Check Firebase project quota/limits
- Ensure proper collection path

## Future Enhancements

1. **Order Modifications**: Edit order before serving
2. **Split Bills**: Divide order across multiple bills
3. **Order History**: View past orders and analytics
4. **Kitchen Printer Integration**: Auto-print KOT (Kitchen Order Ticket)
5. **Waiter Performance**: Track orders per waiter
6. **Table Management**: Visual table layout with status
7. **Customer App**: QR code menu ordering
8. **Multi-branch**: Support for multiple locations

## Dependencies

- `qrcode` - ^1.5.4 (QR code generation)
- `firebase` - ^12.9.0 (Backend & real-time)
- `lucide-react` - ^0.575.0 (Icons)
- Existing: `react`, `next`, `typescript`

## File Structure

```
app/
  waiter-login/
    page.tsx              ← Waiter login page
  waiter/
    page.tsx              ← Waiter order page
  kitchen/
    page.tsx              ← Kitchen display
  dashboard/
    page.tsx              ← Enhanced with orders widget
  settings/
    page.tsx              ← Enhanced with UPI settings
  attendance/
    page.tsx              ← Enhanced with waiter code generator
  api/
    orders/
      route.ts            ← Orders CRUD
      [id]/
        route.ts          ← Update order
        complete/
          route.ts        ← Complete & generate bill

lib/
  waiterUtils.ts          ← Waiter code & UPI utilities
  mockData.ts             ← Extended with Order, Bill types
  appStore.tsx            ← Extended Profile type

components/
  layout/
    Sidebar.tsx           ← Added kitchen link
```

## Status

✅ Types defined (Order, OrderItem, Bill)
✅ Waiter ID generator (lib/waiterUtils.ts)
✅ Waiter login page (/waiter-login)
✅ Waiter order page (/waiter)
✅ Kitchen display page (/kitchen)
✅ Dashboard integration (LiveOrdersWidget)
✅ API routes (/api/orders/*)
✅ Bill generation (with UPI QR)
✅ Real-time sync (Firestore onSnapshot)
✅ Build passes successfully

---

**Built by**: GitHub Copilot CLI
**Date**: March 24, 2026
**Version**: 2.0
