# VisaFlow — Visa Management Platform

A full-stack CRM platform for immigration service agencies to manage the complete visa application lifecycle, from submission to delivery.

---

## What It Does

VisaFlow gives agencies a professional, end-to-end system for handling visa applications:

- **Applicants** submit applications online, upload documents, track their status in real-time, and download their approved visa — all without creating a password.
- **Admins** review documents, manage countries and visa types, process payments, and deliver visas through a dedicated console.

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | Node.js · Express · TypeScript |
| Database | MongoDB · Mongoose |
| Frontend | Next.js 15 (App Router) · Tailwind CSS |
| Auth | Passwordless OTP (users) · JWT + bcrypt (admin) |
| Email | Nodemailer · Gmail SMTP |
| File Storage | Cloudinary |
| Shared Types | TypeScript monorepo workspace |

---

## Features

### For Applicants
- Passwordless login via 6-digit email OTP
- Browse countries and available visa types
- Fill dynamic application forms (configured per visa type by admin)
- Upload required documents directly in the browser
- Real-time 10-stage status timeline
- In-app notifications + email alerts at every status change
- Document vault for reusable file storage
- Download approved visa PDF

### For Admins
- Secure email + password console
- Dashboard with live application stats
- Full country and visa type management
- No-code dynamic form builder — define custom fields per visa type
- Per-document review with approve/reject + reason
- Bulk document approval
- Manual payment override
- Upload final visa PDF (Cloudinary delivery)
- Contact lead management
- User management

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
- Gmail account with App Password enabled

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
MONGODB_URI=mongodb://localhost:27017/visaflow
JWT_SECRET=your_secure_secret
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=you@gmail.com
EMAIL_PASS=your_app_password
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
- Email: `admin@visaflow.com`
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
│       ├── services/         # Email + Cloudinary services
│       ├── middleware/        # JWT auth, file upload
│       ├── config/           # Cloudinary + email transporter setup
│       └── app.ts            # Express app bootstrap
├── user-portal/
│   └── src/
│       ├── app/              # Next.js App Router pages
│       └── components/       # UI components + StatusTimeline
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
| `/api/auth` | None | OTP login, admin login |
| `/api/public` | None | Public country/visa listings, contact form |
| `/api/user` | User JWT | Application management, documents, payments, notifications |
| `/api/admin` | Admin JWT | Full CRM operations |

See [context.md](./context.md) for the full route reference.
