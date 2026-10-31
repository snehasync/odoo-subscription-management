# ⚡ Brightloop Subscription Management System

Brightloop is an enterprise-grade platform running the full lifecycle of a subscription business: product catalog & pricing with variants, plans, quotations from templates, subscription state machines, automated idempotent invoicing, taxes, promotional discounts, payment settlements, and executive revenue reporting.

---

## 🏗️ Architecture & Technology Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM, SQLite (`dev.db` configured in WAL mode with foreign keys enabled)
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React icons
- **Authentication**: JWT authentication with HTTP cookies & Bearer tokens, bcryptjs password hashing (cost factor 10)
- **Financial Precision**: `Decimal.js` (`Money` utility with consistent `ROUND_HALF_UP` rounding to 2 decimal places)
- **Background Jobs**: `node-cron` with atomic transactions per invoice and unique compound constraints for strict idempotency
- **Testing**: `Vitest` with Supertest integration suites

---

## 🔐 Default Logins & RBAC Roles

Role-based access control is enforced on the server for all routes:

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@brightloop.io` | `Admin@12345!` | Full system control: staff accounts, products, variants, plans, tax rules, discounts, templates, and immutable audit logs. |
| **Internal Staff** | `staff1@brightloop.io` | `Staff@12345!` | Day-to-day operations: customers, quotes, subscriptions, invoice confirmation, payments, and billing execution. |
| **Customer Portal** | `billing@acme.com` | `Customer@12345!` | Customer self-service: only sees personal subscriptions and invoices, online bill payment, invoice printing, and password updates. |

> *Tip: The web app also provides a 1-click role switcher pill in the top header and login page to easily test the application across roles.*

---

## 🚀 Setup & Installation

### 1. Prerequisites
- Node.js (v18+ or v20+)
- npm (v9+)

### 2. Backend Setup
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:push
npm run seed
npm run dev
```
The backend server runs on `http://localhost:5000`.

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
The frontend dev server runs on `http://localhost:5173` (with proxy to backend on `/api`).

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=brightloop_ultra_secure_jwt_secret_key_2026_998877
JWT_EXPIRES_IN=7d
DATABASE_URL="file:./dev.db"
CORS_ORIGIN=http://localhost:5173
BILLING_CRON_SCHEDULE="0 0 * * *"
```

---

## 🔄 Automated Invoicing & Idempotency

### Recurring Invoicing Job
The billing engine automatically queries all `ACTIVE` subscriptions due for billing (`nextBillingDate <= targetDate`).
- **Idempotency Guarantee**: Invoices enforce a unique compound constraint:
  ```prisma
  @@unique([subscriptionId, billingPeriod])
  ```
  Each invoice runs in an isolated database transaction. If the billing engine is run multiple times for the same cycle, it detects existing records and safely skips without creating duplicate invoices.
- **Tax Snapshots**: At the moment of invoicing, a snapshot of the active tax rule (rate percentage and rule ID) is captured in the invoice line item so future tax rule updates do not alter historical records.
- **Discounts**: Evaluated atomically with usage count increments.
- **Contract Auto-Close**: If the plan has `autoCloseAtEndDate: true` and the advanced billing date reaches `expiryDate`, the subscription is automatically transitioned to `CLOSED` and recorded in the status audit timeline.

### How to Trigger the Billing Job Manually

#### Option A: Via the Web UI
1. Log in as **Admin** or **Staff**.
2. Go to the **Dashboard** or **Invoices & Billing** page.
3. Click the **"Run Automated Invoicing Now"** button. The page updates immediately with the count of generated invoices and skipped cycles.

#### Option B: Via REST API
```bash
curl -X POST http://localhost:5000/api/invoices/generate-due \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"targetDate": "2026-10-31"}'
```

---

## 🧪 Automated Testing Suite

Run the full test suite in `backend/`:
```bash
npm test
```

The test suite covers:
1. **Password Complexity Rules** (`tests/password.test.ts`): Rejection of <=8 characters, missing uppercase, missing lowercase, missing special character; acceptance of valid passwords.
2. **Subscription Lifecycle & Transitions** (`tests/status-transitions.test.ts`): Enforcing `Draft → Quotation → Confirmed → Active → Closed`, rejecting illegal state hops, and preventing closed renewals when disabled on plan.
3. **Financial Precision & Discounts** (`tests/tax-discount.test.ts`): `ROUND_HALF_UP` decimal calculations, percentage and fixed discounts, minimum spend thresholds, and tax snapshots.
4. **Billing Engine Idempotency** (`tests/billing-idempotency.test.ts`): Verifies that running the billing engine twice (and three times) produces exactly 1 invoice for a subscription with zero duplicates.

---

## 📊 Database Seed Data

Running `npm run seed` generates:
- 1 Admin (`admin@brightloop.io`)
- 2 Staff members (`staff1@brightloop.io`, `staff2@brightloop.io`)
- 20 Enterprise Customers with linked customer user accounts
- 5 Subscription Plans (Starter Monthly, Professional Monthly, Enterprise Annual, Weekly Sprint, Daily Trial)
- 4 Product lines with variants (including Odoo Enterprise connector price adjustment `+$560`)
- Tax rules (Standard VAT 15%, Sales Tax 8.25%, Digital Services Tax 5%)
- Promotional discount codes (`WELCOME20`, `FLAT50`)
- Quotation templates
- **2,100 Subscriptions** with lines and chronological history records
- **350 Invoices** and **246 Payments** for immediate performance testing
