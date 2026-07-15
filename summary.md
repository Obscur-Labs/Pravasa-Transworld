# Pravasa Transworld — Project Summary

## What Is It?

Pravasa Transworld is a full-stack Visa CRM platform built for immigration service agencies. It digitizes the entire visa application process — from an applicant's first form submission to final visa delivery — replacing manual, email-based workflows with a structured, trackable pipeline.

---

## Three Parts, One Platform

| Part | Who Uses It | What It Does |
|---|---|---|
| **Backend API** (port 5000) | Internal | Express + MongoDB REST API powering both portals |
| **User Portal** (port 3000) | Applicants | Apply, upload documents, pay, track status, download visa |
| **Admin Portal** (port 3001) | Agency staff | Review applications, manage countries/visa types, deliver visas |

---

## Core Flow

1. Applicant registers or logs in without a password — receives a 6-digit OTP via email
2. Selects country + visa type, fills a dynamic form, uploads required documents
3. Admin reviews documents, requests revisions if needed, then approves
4. Applicant pays; admin processes the application through embassy review
5. Admin uploads the approved visa PDF; applicant downloads it from their dashboard

The application moves through **10 tracked statuses**, with email notifications and in-app alerts at each step.

---

## Tech at a Glance

- **Stack:** Node.js / Express / TypeScript · MongoDB · Next.js 15 · Tailwind CSS
- **Auth:** Passwordless OTP for users (register + login OTP flows) · JWT + bcrypt for admins
- **Files:** Cloudinary — user-specific folder structure (`users/{id}/documents`, `vault`, `profile`)
- **Email:** Nodemailer (Gmail SMTP / Brevo SMTP)
- **Real-time:** Socket.io for live notifications
- **Monorepo:** npm workspaces with shared TypeScript types

---

## Account Types

Users register as either **individual** or **corporate**. Corporate accounts:
- See a separate `corporatePrice` on each visa type (set by admin)
- Are charged the corporate rate when submitting an application
- Have the corporate rate clearly shown in the apply flow with the regular price struck-through
- Require a GST number (shown on receipts)

Admins can also create, edit, and delete customer profiles of both types directly from the admin portal's Customers page — deleted customers go to the trash and can be restored with their applications and vault documents intact.

---

## Current State

Phase 3 complete. The platform has a fully working backend API, responsive user and admin portals, a 10-stage application status pipeline, real-time Socket.io notifications, Cloudinary file delivery with user-scoped folder organisation, profile management with photo upload, corporate pricing, admin-side customer profile CRUD (individual + corporate), and a payment receipt system with application reference numbers in `PRS-{COUNTRY}-{4-digit}` format. Ready for integration of a live payment gateway (Stripe / Razorpay) as the next milestone.
