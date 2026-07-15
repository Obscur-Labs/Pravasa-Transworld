# Pravasa Transworld — Visa Management Platform

A full-stack CRM platform for immigration service agencies to manage the complete visa application lifecycle, from submission to delivery.

---

## What It Does

Pravasa Transworld gives agencies a professional, end-to-end system for handling visa applications:

- **Applicants** submit applications online, upload documents, track their status in real-time, and download their approved visa — all without a password.
- **Admins** review documents, manage countries and visa types, process payments, and deliver visas through a dedicated console.

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | Node.js · Express · TypeScript |
| Database | MongoDB · Mongoose |
| Frontend | Next.js 15 (App Router) · Tailwind CSS |
| Auth | Passwordless OTP (users) · JWT + bcrypt (admin) |
| Email | Nodemailer · Gmail SMTP / Brevo |
| File Storage | Cloudinary (user-scoped folder structure) |
| Real-time | Socket.io |
| Shared Types | TypeScript monorepo workspace |

---

## Features

### For Applicants
- Passwordless login via 6-digit email OTP (separate register and login flows)
- **Auth redirect** — login/register pages auto-redirect to dashboard if already logged in
- Browse countries and available visa types
- **Corporate pricing** — corporate accounts see their dedicated rate with the regular price struck-through
- **Promo codes** — eligible users see a promo code field in the Review & Pay step; validates live with discount preview
- **Promo popup** — homepage shows an auto-dismissing bottom-right popup with active promo codes after 5 seconds (copy button included)
- Fill dynamic application forms (configured per visa type by admin)
- Per-field **applicant type** — form fields and doc requirements can be scoped to adults, children, or both
- Upload required documents; auto-filled from personal document vault where possible; one file per field
- Real-time 10-stage status timeline
- In-app notifications (bell dropdown with "View all" link) + email alerts at every status change
- Personal document vault with OCR data extraction
- Download payment receipt PDF (includes applicant name and application reference)
- Download approved visa PDF
- **Profile management** — edit name, phone, GST number; upload profile photo
- **Fully responsive** — left sidebar on desktop/laptop; top navbar with drawer on mobile/tablet

### For Admins
- Secure email + password console
- Dashboard with live application stats
- Full country and visa type management (including ISO country codes and corporate pricing)
- No-code dynamic form builder — define custom fields per visa type; adult/child/both applicant type per field
- OCR-only doc types (passport_front, passport_back); OCR runs server-side automatically
- Per-document review with approve/reject + reason
- Bulk document approval
- Manual payment override
- Upload final visa PDF (Cloudinary delivery)
- Contact lead management
- **Customer management** — full CRUD for customer profiles (both Individual and Corporate types) from the Customers page: create/edit via a dialog with a type selector (GST number required for corporate), delete to trash with restore, inline Promo Eligible/Blocked toggle, and a per-customer profile page showing applications, spend, and document vault
- **Promo Code management** — full CRUD with active/inactive toggle, show-on-website toggle, expiry date, usage limit; right-slide usage history drawer per code

---

## Application Reference Format

Every application gets a unique reference in the format `PRS-{COUNTRY}-{NNNN}`:

```
PRS-IND-4827   (India)
PRS-USA-2391   (United States)
PRS-GBR-7044   (United Kingdom)
```

This reference appears on the application detail page and on the PDF payment receipt.

---

## Application Status Pipeline

```
Submitted → Documents Under Review → Documents Approved
  → Payment Pending → Payment Completed → Visa Processing
    → Embassy Review → Visa Approved → Visa Delivered
                    ↘ Visa Rejected
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Cloudinary account
- Gmail account with App Password enabled (or Brevo SMTP)

### 1. Clone and Install

```bash
git clone <repo-url>
cd VisaServicePlatform
npm install
```

### 2. Configure Environment

```bash
cp backend-api/.env.example backend-api/.env
```

Fill in `backend-api/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/pravasatransworld
JWT_SECRET=your_secure_secret
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=you@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001
```

Create `.env.local` in both portals:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. Seed the Database

```bash
npm run seed
```

Creates 1 admin, 8 countries, and 3 visa types.

**Default admin credentials:**
- Email: `admin@pravasatransworld.com`
- Password: `Admin@123`

### 4. Run the Platform

Open three terminals:

```bash
npm run dev:backend   # API on http://localhost:5000
npm run dev:user      # User portal on http://localhost:3000
npm run dev:admin     # Admin portal on http://localhost:3001
```

---

## Project Structure

```
VisaServicePlatform/
├── backend-api/
│   └── src/
│       ├── controllers/      # Route handlers (auth, admin/*, user/*)
│       ├── models/           # Mongoose schemas
│       ├── routes/           # Express routers
│       ├── services/         # Email, Cloudinary, PDF, OCR services
│       ├── middleware/        # JWT auth, file upload, rate limiting
│       ├── config/           # Cloudinary + email transporter setup
│       └── app.ts            # Express app bootstrap
├── user-portal/
│   └── src/
│       ├── app/              # Next.js App Router pages
│       │   └── (dashboard)/  # Authenticated pages incl. /profile
│       ├── components/       # Sidebar, NotificationDropdown, KYCModal, StatusTimeline
│       ├── store/            # Zustand auth store (user, token, updateUser)
│       └── lib/api.ts        # Axios client + all API functions
├── admin-portal/
│   └── src/
│       └── app/              # Next.js App Router pages
└── shared/
    └── src/types/index.ts    # Shared TypeScript interfaces
```

---

## API Overview

| Prefix | Auth | Purpose |
|---|---|---|
| `/api/auth` | None | OTP login/register, admin login |
| `/api/public` | None | Public country/visa listings, contact form |
| `/api/user` | User JWT | Profile, applications, documents, vault, payments, notifications |
| `/api/admin` | Admin JWT | Full CRM operations |

See [context.md](./context.md) for the complete route reference and data model documentation.
