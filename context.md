# VisaFlow Platform — Deep Technical Context

## Overview

VisaFlow is a full-stack, multi-tenant Visa CRM (Customer Relationship Management) platform designed for immigration service agencies. It manages the complete lifecycle of a visa application — from initial submission through embassy review to final delivery — with separate surfaces for applicants and administrators.

---

## Monorepo Structure

```
VisaServicePlatform/
├── package.json              # npm workspaces root
├── backend-api/              # Express + TypeScript REST API  (port 5000)
├── user-portal/              # Next.js 15 — public site + applicant dashboard (port 3000)
├── admin-portal/             # Next.js 15 — admin console (port 3001)
└── shared/                   # Shared TypeScript types (consumed by both portals)
```

Workspaces are managed via `npm workspaces`. The root `package.json` exposes convenience scripts:

| Script | Action |
|---|---|
| `npm run dev:backend` | Start API on :5000 with nodemon |
| `npm run dev:user` | Start user portal on :3000 |
| `npm run dev:admin` | Start admin portal on :3001 |
| `npm run seed` | Seed DB: 1 admin + 8 countries + 3 visa types |

---

## Backend API (`backend-api/`)

### Tech Stack
- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** MongoDB via Mongoose
- **Auth:** JWT (jsonwebtoken), bcryptjs for admin passwords
- **Email:** Nodemailer (SMTP / Gmail)
- **File Storage:** Cloudinary (documents, visa PDFs)
- **File Upload:** Multer (in-memory buffer → Cloudinary)

### Entry Points

`src/app.ts` bootstraps Express with:
- CORS restricted to `FRONTEND_URL` (`:3000`) and `ADMIN_URL` (`:3001`)
- JSON body parser with 10 MB limit
- Health check at `GET /health`
- Route mounts: `/api/auth`, `/api/admin`, `/api/user`, `/api/public`

### Route Map

#### Auth Routes (`/api/auth`)
| Method | Path | Description |
|---|---|---|
| POST | `/send-otp` | Create/update user, generate 6-digit OTP, send email |
| POST | `/verify-otp` | Validate OTP, return JWT + user object |
| POST | `/admin/login` | Email + password login for admins, return JWT |

#### Admin Routes (`/api/admin`) — requires `adminProtect` middleware
| Method | Path | Description |
|---|---|---|
| GET | `/dashboard` | Aggregate stats: active, pending, approved, rejected, total |
| GET/POST | `/countries` | List all / create country |
| PUT/DELETE | `/countries/:id` | Update / delete country |
| PATCH | `/countries/:id/toggle` | Toggle active status |
| GET/POST | `/visa-types` | List all / create visa type |
| GET/PUT/DELETE | `/visa-types/:id` | Detail / update / delete visa type |
| PATCH | `/visa-types/:id/toggle` | Toggle active status |
| GET | `/applications` | Paginated list with filters |
| GET | `/applications/:id` | Full application detail |
| PUT | `/applications/:id/status` | Update application status |
| PUT | `/applications/:id/document-review` | Approve/reject individual document |
| PUT | `/applications/:id/approve-documents` | Bulk approve all documents |
| POST | `/applications/:id/visa-file` | Upload visa PDF (Multer → Cloudinary) |
| PUT | `/applications/:id/manual-payment` | Override payment manually |
| GET | `/payments` | Payment list across all applications |
| GET | `/users` | All registered applicants |
| GET | `/users/:userId/applications` | Applications for a specific user |
| GET | `/leads` | Contact form leads |
| PATCH | `/leads/:id/read` | Mark lead as read |

#### User Routes (`/api/user`) — requires `protect` middleware
| Method | Path | Description |
|---|---|---|
| GET | `/dashboard` | User-specific stats |
| GET/POST | `/applications` | List / create application |
| GET | `/applications/:id` | Application detail with timeline |
| POST | `/applications/:id/documents` | Upload document file (Multer → Cloudinary) |
| PUT | `/applications/:id/payment` | Submit payment for application |
| GET/POST | `/vault` | Document vault: list / upload |
| DELETE | `/vault/:id` | Delete vault document |
| GET | `/payments` | Payment history |
| GET | `/payments/:id/receipt` | Download payment receipt |
| GET | `/notifications` | Notification list |
| PUT | `/notifications/:id/read` | Mark single notification read |
| PUT | `/notifications/read-all` | Mark all notifications read |

#### Public Routes (`/api/public`)
Unauthenticated routes for the landing page (countries list, visa types, contact form).

---

## Data Models

### User
```typescript
{
  name: string          // required
  email: string         // unique, lowercase
  phone: string
  isActive: boolean     // default true
  createdAt: Date
  updatedAt: Date
}
```

### Admin
```typescript
{
  name: string
  email: string         // unique
  phone: string
  password: string      // bcrypt hashed, select: false
  isActive: boolean
}
// Instance method: comparePassword(candidate): Promise<boolean>
```

### OTP
```typescript
{
  email: string         // lowercase
  otp: string           // 6-digit string
  expiresAt: Date       // 10 minutes from creation
  verified: boolean     // default false
}
```

### Country
```typescript
{
  name: string          // unique
  flag: string          // emoji or URL
  description: string
  isActive: boolean
}
```

### VisaType
```typescript
{
  country: ObjectId     // ref: Country
  name: string
  description: string
  price: number         // in platform currency
  processingDays: number
  formFields: FormField[]
  documentRequirements: DocumentRequirement[]
  isActive: boolean
}
```

**FormField** (embedded sub-document):
```typescript
{
  label: string
  fieldName: string
  type: 'text' | 'number' | 'email' | 'date' | 'select' | 'radio' | 'textarea' | 'file'
  required: boolean
  options: string[]     // for select / radio types
  placeholder: string
  order: number
}
```

**DocumentRequirement** (embedded sub-document):
```typescript
{
  name: string
  description: string
  required: boolean
}
```

### Application
```typescript
{
  user: ObjectId        // ref: User
  visaType: ObjectId    // ref: VisaType
  country: ObjectId     // ref: Country
  status: ApplicationStatus
  formResponses: Map<string, string>   // fieldName → value
  rejectionReason: string
  adminNotes: string
  paymentAmount: number
  referenceId: string   // auto-generated: VF-{timestamp}-{5-char random}
  createdAt: Date
  updatedAt: Date
}
```

### Document
```typescript
{
  application: ObjectId  // ref: Application
  requirementName: string
  url: string            // Cloudinary URL
  publicId: string       // Cloudinary public ID
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason: string
  reviewedAt: Date | null
}
```

### Notification
```typescript
{
  user: ObjectId
  title: string
  message: string
  type: 'otp' | 'document_approved' | 'document_rejected' | 'payment_request' |
        'status_update' | 'visa_approved' | 'visa_delivered' | 'general'
  application: ObjectId | null
  read: boolean
}
```

### VisaFile
```typescript
{
  application: ObjectId  // ref: Application
  url: string            // Cloudinary URL of delivered visa PDF
  publicId: string
}
```

---

## Application Status Flow

Linear pipeline with one branching terminal state:

```
submitted
  → documents_under_review
    → documents_approved
      → payment_pending
        → payment_completed
          → visa_processing
            → embassy_review
              → visa_approved
                → visa_delivered
              → visa_rejected   (terminal — no further transitions)
```

All 10 statuses are represented by the `ApplicationStatus` union type, shared across the monorepo via `shared/src/types/index.ts`.

**Business rules:**
- Payment UI is only unlocked after status reaches `documents_approved`
- Visa file upload by admin moves status to `visa_delivered`
- `visa_rejected` is a terminal dead-end; no recovery path in V1

---

## Authentication Architecture

### User Auth (Passwordless OTP)
1. User submits name + email + phone → `POST /api/auth/send-otp`
2. Backend upserts User document (creates on first visit, updates name/phone on repeat)
3. OTP: 6-digit numeric, stored hashed in OTP collection, expires in 10 min
4. OTP emailed via Nodemailer (dev fallback: logs to console)
5. User submits email + OTP → `POST /api/auth/verify-otp`
6. On success: OTP marked verified, JWT issued (`role: 'user'`, 7-day expiry)

### Admin Auth (Password)
1. Admin submits email + password → `POST /api/auth/admin/login`
2. Admin document fetched with `+password` projection
3. bcryptjs `comparePassword` validates
4. JWT issued (`role: 'admin'`, 7-day expiry)

### Middleware
- `protect` — validates JWT, attaches `req.user`, rejects non-user roles
- `adminProtect` — validates JWT, attaches `req.admin`, rejects non-admin roles

---

## Email Service (Nodemailer)

Four email templates, all styled with inline CSS (blue brand: `#1d4ed8`):

| Function | Trigger | Subject |
|---|---|---|
| `sendOTPEmail` | OTP request | "Your VisaFlow Login OTP" |
| `sendDocumentStatusEmail` | Doc approve/reject | "Documents Approved" / "Document Revision Required" |
| `sendStatusUpdateEmail` | Any status change | "Application Update: {status label}" |
| `sendVisaDeliveredEmail` | Visa file uploaded | "Your Visa is Ready for Download!" |

All templates share a header (blue banner, VisaFlow logo) and footer (copyright, do-not-reply).

---

## File Storage (Cloudinary)

- Configured via `src/config/cloudinary.ts`
- Upload service in `src/services/cloudinary.service.ts`
- Multer middleware: in-memory storage, 10 MB limit
- Two use cases:
  1. **Application documents** — uploaded by users, stored under a per-application folder
  2. **Visa PDFs** — uploaded by admin after approval, delivered via Cloudinary URL

---

## Shared Types (`shared/`)

`shared/src/types/index.ts` exports all interfaces consumed by both portals:
- `ApplicationStatus` union + `STATUS_LABELS` map + `TIMELINE_STATUSES` array
- `FormField`, `DocumentRequirement`, `Country`, `VisaType`
- `Application`, `Document`, `Notification`, `User`, `VisaFile`
- `ApiResponse<T>` generic wrapper: `{ success, message, data }`
- `DashboardStats`: `{ active, pending, approved, rejected, total }`

---

## Frontend Portals

### User Portal (`user-portal/`) — Next.js 15 App Router, port 3000

**Route groups:**
- `(auth)` — `/login` (passwordless OTP flow)
- `(public)` — `/privacy`, `/terms`
- `(dashboard)` — `/notifications`, applications, document vault

**Key components:**
- `StatusTimeline.tsx` — visual step tracker rendering the 10-stage pipeline
- Shared UI primitives: `Button`, `Input`, `Card`, `Badge`, `Label`, `Select`, Toast system

**Env:** `NEXT_PUBLIC_API_URL=http://localhost:5000/api`

### Admin Portal (`admin-portal/`) — Next.js 15 App Router, port 3001

**Routes:**
- `/login` — email + password form
- Dashboard, country management, visa type builder, applications management, leads

**Key capabilities:**
- No-code dynamic form builder — admin configures `formFields` per visa type
- Document review with per-document approve/reject + reason
- Manual payment override
- Visa file upload (PDF → Cloudinary)

**Env:** `NEXT_PUBLIC_API_URL=http://localhost:5000/api`

---

## Environment Variables

```env
# Backend (backend-api/.env)
PORT=5000
MONGODB_URI=mongodb://localhost:27017/visaflow
JWT_SECRET=<secret>
JWT_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=<name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<gmail>
EMAIL_PASS=<app-password>
EMAIL_FROM=VisaFlow <noreply@visaflow.com>

ADMIN_EMAIL=admin@visaflow.com
ADMIN_PASSWORD=Admin@123
ADMIN_NAME=Super Admin
ADMIN_PHONE=9999999999

FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001
```

---

## Default Seed Data

Running `npm run seed` creates:
- **1 Super Admin** — `admin@visaflow.com` / `Admin@123`
- **8 Countries** — with flags and descriptions
- **3 Visa Types** — across different countries, with sample form fields and document requirements

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Passwordless OTP for users | Reduces friction for one-time / infrequent applicants |
| Separate admin portal (port 3001) | Hard separation of concerns; admin never touches user portal code |
| Shared `types/` package | Single source of truth for API contracts across portals |
| Dynamic form builder | Agencies can configure visa-specific fields without code changes |
| Cloudinary for files | Managed CDN with signed URLs; avoids self-hosted file storage complexity |
| 10-stage linear status flow | Mirrors real-world embassy processing pipeline; easy to audit |
| Payment gated on doc approval | Prevents payment before admin validates documents — reduces refund risk |
