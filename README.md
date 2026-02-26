# Synplix — Business Management Platform

> A modern, offline-first SaaS platform for café and restaurant management, built by **Applix Infotech**.

---

## 1. 🧩 Product Overview

| Field | Details |
|---|---|
| **What it does** | Synplix is an all-in-one business management dashboard for cafés and small restaurants. It handles billing, invoicing, employee management, attendance tracking, inventory, expenses, and financial reporting. |
| **Target audience** | Small café/restaurant owners and their managers in India, particularly those needing GST-compliant invoicing. |
| **Problem solved** | Replaces manual notebooks, spreadsheets and disconnected tools with a single offline-capable web app that syncs to the cloud when internet is available. |
| **Core value proposition** | Works offline (IndexedDB-powered), syncs automatically to Firebase, supports GST invoicing in INR, installs as a PWA, and supports Hindi + English — all in a dark, modern UI. |

---

## 2. ⚙️ Features & Functionality

### Major Features
- **Dashboard** — Real-time revenue/expense summary, net profit, pending payments, line chart (monthly revenue vs expenses), pie chart (expense breakdown)
- **Bills / Invoicing** — Create, edit, and delete GST-aware bills with table number, order type, payment mode, client details, and line items
- **Attendance** — Monthly attendance calendar per employee (present/absent/overtime), workday calculations
- **Employee Management** — Add/edit/delete staff with salary, joining date, Aadhaar, contact details, salary deduction rules
- **Inventory** — Track stock items with quantities and status
- **Catalogue (Menu)** — Manage menu items across categories (Chinese, Continental, Mocktail, Biryani, Dessert) with pricing and availability toggle
- **Transactions** — Log income and expense transactions with categories, dates, and notes
- **Expenses** — Filtered expense overview by month and category
- **Settings** — Business profile, notification preferences, language, currency, 2FA toggle, data export, account reset/delete

### Minor / Supporting Features
- **Onboarding wizard** — 3-step setup (business name → contact → tax/address)
- **Support page** — In-app contact form that writes to Firestore `support_requests` collection
- **PDF export** — Dashboard export to PDF via jsPDF
- **Excel export** — Full data export (employees, invoices, transactions, inventory) via xlsx
- **Demo mode** — `loginDemo()` available in the app store for sandbox access
- **Welcome toast** — Animated notification after first login
- **Dark mode** — Persistent dark theme (toggle in settings)
- **Language switching** — English ↔ Hindi (stored in localStorage)

### AI / Automation Capabilities
- Not detected (no AI/ML integrations present)

### Third-party Integrations
| Service | Purpose |
|---|---|
| Firebase Auth | User authentication (email/password) |
| Firebase Firestore | Cloud persistence and real-time sync |
| PostHog | Product analytics, session tracking, funnel analysis |
| Resend (dependency) | Email notifications (configured, not fully wired) |
| Recharts | Dashboard charts |
| jsPDF | PDF export |
| xlsx (SheetJS) | Excel export |

---

## 3. 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend framework** | Next.js 16 (App Router), React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4, inline styles (dark glassmorphism theme) |
| **UI components** | Lucide React (icons), Recharts (charts), custom `StatCard`, `Badge` components |
| **State management** | React Context (`AppStoreContext`) — single global store |
| **Offline storage** | Dexie (IndexedDB wrapper) — offline-first with sync queue |
| **Backend / BaaS** | Firebase Firestore (sole backend) |
| **Auth** | Firebase Authentication — email/password; fallback local auth in IndexedDB (bcrypt-hashed) |
| **API type** | No custom REST/GraphQL API — direct BaaS SDK calls |
| **Analytics** | PostHog (`posthog-js`) — pageviews, user identification, 8 named events |
| **Password hashing** | `bcryptjs` (SALT_ROUNDS=10, browser-safe, no Node.js bindings) |
| **Email** | Resend SDK (configured as dependency) |
| **PWA** | Service Worker (`/public/sw.js`), Web App Manifest (`/public/manifest.json`) |
| **Hosting** | Not specified — Next.js compatible (Vercel recommended) |
| **CI/CD** | Not detected |

---

## 4. 📦 Modules / Components

| Module / File | Description |
|---|---|
| `lib/analytics.ts` | PostHog analytics — `initAnalytics()`, `identifyUser()`, `resetAnalytics()`, 8 named `capture()` helpers |
| `components/PostHogProvider.tsx` | Client component wrapping the app — initialises PostHog and captures `$pageview` on App Router route changes |
| `lib/crypto.ts` | Browser-safe password hashing via `bcryptjs` — `hashPassword()`, `comparePassword()`, `isHashed()` migration guard |
| `lib/appStore.tsx` | Central React context store — manages all app state, auth, CRUD operations, and computed dashboard metrics (~986 lines) |
| `lib/syncEngine.ts` | Three-phase offline sync: load from IndexedDB → fetch from Firestore → push pending writes back (~312 lines) |
| `lib/localDb.ts` | Dexie (IndexedDB) schema — mirrors Firestore collections with `_syncStatus` and `_uid` fields for offline queuing |
| `lib/firebase.ts` | Firebase app initialisation — safe browser-only guard for SSR compatibility |
| `lib/supabase.ts` | Supabase client setup — alternative backend |
| `lib/i18n.tsx` | Internationalisation — English + Hindi translation strings via React Context |
| `lib/exportDashboardPdf.ts` | Exports the dashboard view to a PDF using jsPDF |
| `lib/exportExcel.ts` | Exports all business data to a multi-sheet Excel workbook using SheetJS |
| `lib/mockData.ts` | Type definitions + seed data — employees, catalogue (23 menu items), invoice item types |
| `lib/utils.ts` | Utility helpers (e.g., `localDate()`) |
| `components/layout/AppLayout.tsx` | Root authenticated layout wrapper |
| `components/layout/Sidebar.tsx` | Navigation sidebar |
| `components/layout/TopBar.tsx` | Top navigation bar |
| `components/ui/StatCard.tsx` | Reusable KPI card component |
| `components/ui/Badge.tsx` | Status badge component |
| `components/SwRegister.tsx` | Service worker registration |
| `middleware.ts` | Next.js middleware — passthrough (Firebase handles auth client-side) |

**Architecture:** Monolithic Next.js app (no microservices).

---

## 5. 🔗 Integrations & APIs

| Integration | Type | Details |
|---|---|---|
| **Firebase Auth** | External API | `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `onAuthStateChanged` |
| **Firebase Firestore** | External API | User sub-collections: `employees`, `invoices`, `transactions`, `inventory`; top-level: `support_requests` |
| **PostHog** | External API | Product analytics — pageviews, user identity (`posthog.identify`), 8 named events, GDPR-aware (`identified_only` profiles) |
| **Resend** | External API | Email delivery (dependency installed, not fully integrated in UI flows) |
| **Webhooks** | — | Not detected |
| **SDKs / client libs** | — | `firebase`, `posthog-js`, `bcryptjs`, `resend`, `dexie`, `xlsx`, `jspdf`, `recharts`, `lucide-react` |

---

## 6. 💰 Pricing / Plans

Not detected — no pricing logic, plan tiers, or payment gateway present in the codebase. This appears to be a white-label / client-deployed SaaS product by Applix Infotech.

---

## 7. 🔐 Security & Compliance

| Area | Details |
|---|---|
| **Authentication** | Firebase Auth — email/password. Fallback local auth stored in IndexedDB (passwords hashed with `bcryptjs`, SALT_ROUNDS=10). Migration path automatically re-hashes any legacy plain-text passwords on next successful login. |
| **Session management** | Firebase `onAuthStateChanged` listener; no server-side session cookies |
| **RBAC** | Not detected — single admin role per account |
| **Row-level security** | Firestore rules enforce `request.auth.uid == uid` on all user sub-collections; field-level validation on amounts, statuses, and required fields; 500 KB document size cap |
| **Two-Factor Auth** | UI toggle present in Settings, but backend enforcement not detected |
| **GDPR / SOC2 / HIPAA** | Not detected |
| **Data residency** | Dependent on Firebase project region chosen by deployer |

---

## 8. 📊 Analytics & Reporting

| Feature | Details |
|---|---|
| **Dashboard KPIs** | Total Revenue, Total Expenses, Net Profit, Pending Payments |
| **Revenue vs Expenses chart** | Monthly line chart (Recharts `LineChart`) |
| **Expense breakdown** | Pie chart by category (Recharts `PieChart`) |
| **Attendance reports** | Per-employee monthly attendance calendar with present/absent/overtime counts and workday percentage |
| **Expense reports** | Monthly-filtered expense list with running total |
| **PDF export** | Dashboard snapshot via jsPDF |
| **Excel export** | Full data dump (employees, invoices, transactions, inventory) via SheetJS |
| **PostHog event tracking** | 8 named events: `bill_created`, `invoice_exported_pdf`, `data_exported_excel`, `employee_added`, `onboarding_completed`, `demo_mode_entered`, `settings_2fa_toggled`, `language_switched` |

---

## 9. 🚀 Onboarding & UX Flow

1. **Signup** (`/signup`) — Name, email, password → creates Firebase account
2. **Onboarding wizard** (`/onboarding`) — 3-step form:
   - Step 1: Business name
   - Step 2: Phone number
   - Step 3: GST number + address
3. **Dashboard** (`/dashboard`) — Welcome toast displayed on first entry; full feature access available immediately
4. **Demo mode** — `loginDemo()` method in the store allows instant sandbox access without credentials

**PWA install:** Users can install Synplix as a standalone app on mobile/desktop via the Web App Manifest. Runs in `standalone` display mode, starts at `/dashboard`.

---

## 10. 🐛 Known Limitations / TODOs

| Area | Issue |
|---|---|
| **Resend email** | Resend SDK is installed as a dependency but email sending (e.g., invoice delivery, notification alerts) is not fully wired into UI flows |
| **2FA** | Two-Factor Auth toggle exists in Settings UI but server-side enforcement is absent |
| **RBAC** | No multi-user role system — only a single owner/admin per workspace |
| **CI/CD** | No pipeline configuration detected |
| **Test coverage** | No test files detected |
| **Catalogue sync** | Catalogue (menu items) uses `INITIAL_CATALOGUE` seed data from `mockData.ts`; full Firestore sync for catalogue changes may not be persistent across devices |
| **Aadhaar at rest** | Sensitive field (Aadhaar number) stored in IndexedDB and Firestore — no encryption at rest in client code |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Firebase project (Auth + Firestore enabled)
- (Optional) A PostHog project for analytics

### Installation

```bash
git clone <repo-url>
cd amora-cafe
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Optional: PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Run

```bash
npm run dev        # Development server on http://localhost:3001
npm run build      # Production build
npm run start      # Production server
```

### Firebase Setup

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for step-by-step instructions to create your Firebase project, enable authentication, and deploy security rules.

---

## Project Structure

```
app/                  # Next.js App Router pages
  dashboard/          # Main dashboard with KPI cards and charts
  attendance/         # Employee attendance tracking
  bills/              # Bill creation and management
  catalogue/          # Menu / catalogue management
  expenses/           # Expense tracking
  inventory/          # Inventory management
  invoices/           # Invoice management
  transactions/       # Transaction log
  settings/           # App and business settings
  onboarding/         # First-time setup wizard
  support/            # Help/contact form
components/
  layout/             # AppLayout, Sidebar, TopBar
  ui/                 # Reusable UI components
lib/
  appStore.tsx        # Global state management
  syncEngine.ts       # Offline-first sync logic
  localDb.ts          # IndexedDB schema (Dexie)
  firebase.ts         # Firebase initialisation
  analytics.ts        # PostHog analytics helpers
  crypto.ts           # bcryptjs password hashing
  i18n.tsx            # Internationalisation (EN/HI)
  exportExcel.ts      # Excel export
  exportDashboardPdf.ts # PDF export
components/
  PostHogProvider.tsx # Pageview tracking + PostHog init
  layout/             # AppLayout, Sidebar, TopBar
  ui/                 # Reusable UI components
firestore.rules           # Production security rules
firestore.indexes.json    # Composite index definitions
archive/
  deprecated-supabase-schema.sql  # Archived (no longer in use)
```

---

*Built by [Applix Infotech](https://applix.in) — Synplix v0.1.0*

