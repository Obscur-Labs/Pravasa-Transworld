# VisaFlow — Project Summary

## What Is It?

VisaFlow is a full-stack Visa CRM platform built for immigration service agencies. It digitizes the entire visa application process — from a applicant's first form submission to final visa delivery — replacing manual, email-based workflows with a structured, trackable pipeline.

---

## Three Parts, One Platform

| Part | Who Uses It | What It Does |
|---|---|---|
| **Backend API** (port 5000) | Internal | Express + MongoDB REST API powering both portals |
| **User Portal** (port 3000) | Applicants | Apply, upload documents, pay, track status, download visa |
| **Admin Portal** (port 3001) | Agency staff | Review applications, manage countries/visa types, deliver visas |

---

## Core Flow

1. Applicant logs in without a password — receives a 6-digit OTP via email
2. Selects country + visa type, fills a dynamic form, uploads required documents
3. Admin reviews documents, requests revisions if needed, then approves
4. Applicant pays; admin processes the application through embassy review
5. Admin uploads the approved visa PDF; applicant downloads it from their dashboard

The application moves through **10 tracked statuses**, with email notifications and in-app alerts at each step.

---

## Tech at a Glance

- **Stack:** Node.js / Express / TypeScript · MongoDB · Next.js 15 · Tailwind CSS
- **Auth:** Passwordless OTP for users · JWT + bcrypt for admins
- **Files:** Cloudinary (documents + visa PDFs)
- **Email:** Nodemailer (Gmail SMTP)
- **Monorepo:** npm workspaces with shared TypeScript types

---

## Current State

Phase 2 complete. The platform has a fully working backend API, both frontend portals scaffolded with auth and core UI, a 10-stage application status pipeline, email notifications, Cloudinary file delivery, and an admin dynamic form builder. Ready for integration of a payment gateway (Stripe / Razorpay) as the next milestone.
