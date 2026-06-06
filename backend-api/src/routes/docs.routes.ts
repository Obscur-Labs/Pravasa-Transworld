import { Router, Request, Response } from 'express';
import { generateDocsHTML, EndpointGroup } from '../utils/apiDocs';

const router = Router();

const groups: EndpointGroup[] = [
  {
    title: 'Health',
    endpoints: [
      { method: 'GET', path: '/health', description: 'Service health check', auth: 'public' },
    ],
  },
  {
    title: 'Auth',
    endpoints: [
      { method: 'POST', path: '/api/auth/send-otp', description: 'Send OTP to email for registration or re-authentication', auth: 'public', notes: 'Rate limited: 3 req/min per IP' },
      { method: 'POST', path: '/api/auth/send-login-otp', description: 'Send OTP to existing user email for login', auth: 'public', notes: 'Rate limited: 3 req/min per IP' },
      { method: 'POST', path: '/api/auth/verify-otp', description: 'Verify OTP and receive a signed JWT', auth: 'public' },
      { method: 'POST', path: '/api/auth/admin/login', description: 'Admin login with email and password — returns JWT', auth: 'public' },
    ],
  },
  {
    title: 'Public',
    endpoints: [
      { method: 'GET', path: '/api/public/countries', description: 'List all active countries', auth: 'public' },
      { method: 'GET', path: '/api/public/visa-types', description: 'List all active visa types', auth: 'public' },
      { method: 'POST', path: '/api/public/contact', description: 'Submit a contact / lead inquiry form', auth: 'public' },
    ],
  },
  {
    title: 'User — Dashboard',
    endpoints: [
      { method: 'GET', path: '/api/user/dashboard', description: 'Dashboard summary: application counts, recent activity', auth: 'user' },
    ],
  },
  {
    title: 'User — Applications',
    endpoints: [
      { method: 'GET', path: '/api/user/applications', description: 'List all applications for the authenticated user', auth: 'user' },
      { method: 'POST', path: '/api/user/applications', description: 'Create a new visa application', auth: 'user' },
      { method: 'GET', path: '/api/user/applications/:id', description: 'Get full details of a specific application', auth: 'user' },
      { method: 'POST', path: '/api/user/applications/:id/documents', description: 'Upload a document for an application', auth: 'user', notes: 'Multipart/form-data. Accepts JPEG, PNG, PDF ≤ 10 MB' },
      { method: 'POST', path: '/api/user/applications/:id/documents/from-vault', description: 'Attach an existing vault document to an application', auth: 'user' },
      { method: 'PUT', path: '/api/user/applications/:id/payment', description: 'Submit or update payment details for an application', auth: 'user' },
    ],
  },
  {
    title: 'User — Document Vault',
    endpoints: [
      { method: 'GET', path: '/api/user/vault', description: 'List all documents in the user\'s vault', auth: 'user' },
      { method: 'POST', path: '/api/user/vault', description: 'Upload a new document to the vault', auth: 'user', notes: 'Multipart/form-data. Accepts JPEG, PNG, PDF ≤ 10 MB' },
      { method: 'GET', path: '/api/user/vault/:id/url', description: 'Get a signed, time-limited URL to view a vault document', auth: 'user' },
      { method: 'DELETE', path: '/api/user/vault/:id', description: 'Delete a document from the vault', auth: 'user' },
    ],
  },
  {
    title: 'User — Payments',
    endpoints: [
      { method: 'GET', path: '/api/user/payments', description: 'Get full payment history for the authenticated user', auth: 'user' },
      { method: 'GET', path: '/api/user/payments/:id/receipt', description: 'Download PDF receipt for a specific payment', auth: 'user' },
    ],
  },
  {
    title: 'User — Notifications',
    endpoints: [
      { method: 'GET', path: '/api/user/notifications', description: 'Get all notifications for the authenticated user', auth: 'user' },
      { method: 'PUT', path: '/api/user/notifications/read-all', description: 'Mark every notification as read', auth: 'user' },
      { method: 'PUT', path: '/api/user/notifications/:id/read', description: 'Mark a single notification as read', auth: 'user' },
      { method: 'DELETE', path: '/api/user/notifications/all', description: 'Delete all notifications', auth: 'user' },
      { method: 'DELETE', path: '/api/user/notifications/:id', description: 'Delete a specific notification', auth: 'user' },
    ],
  },
  {
    title: 'Admin — Dashboard',
    endpoints: [
      { method: 'GET', path: '/api/admin/dashboard', description: 'Admin dashboard stats: counts, revenue, recent applications', auth: 'admin' },
    ],
  },
  {
    title: 'Admin — Countries',
    endpoints: [
      { method: 'GET', path: '/api/admin/countries', description: 'List all countries', auth: 'admin' },
      { method: 'POST', path: '/api/admin/countries', description: 'Create a new country', auth: 'admin' },
      { method: 'PUT', path: '/api/admin/countries/:id', description: 'Update country details', auth: 'admin' },
      { method: 'DELETE', path: '/api/admin/countries/:id', description: 'Delete a country', auth: 'admin' },
      { method: 'PATCH', path: '/api/admin/countries/:id/toggle', description: 'Toggle country active/inactive status', auth: 'admin' },
    ],
  },
  {
    title: 'Admin — Visa Types',
    endpoints: [
      { method: 'GET', path: '/api/admin/visa-types', description: 'List all visa types', auth: 'admin' },
      { method: 'POST', path: '/api/admin/visa-types', description: 'Create a new visa type', auth: 'admin' },
      { method: 'GET', path: '/api/admin/visa-types/:id', description: 'Get details of a specific visa type', auth: 'admin' },
      { method: 'PUT', path: '/api/admin/visa-types/:id', description: 'Update a visa type', auth: 'admin' },
      { method: 'DELETE', path: '/api/admin/visa-types/:id', description: 'Delete a visa type', auth: 'admin' },
      { method: 'PATCH', path: '/api/admin/visa-types/:id/toggle', description: 'Toggle visa type active/inactive status', auth: 'admin' },
      { method: 'PATCH', path: '/api/admin/visa-types/:id/corporate-price', description: 'Update corporate pricing for a visa type', auth: 'admin' },
    ],
  },
  {
    title: 'Admin — Applications',
    endpoints: [
      { method: 'GET', path: '/api/admin/applications', description: 'List all applications — supports filtering by status, country, pagination', auth: 'admin' },
      { method: 'GET', path: '/api/admin/applications/:id', description: 'Get full application details', auth: 'admin' },
      { method: 'PUT', path: '/api/admin/applications/:id/status', description: 'Update the status of an application', auth: 'admin' },
      { method: 'PUT', path: '/api/admin/applications/:id/document-review', description: 'Review and accept/reject an individual document', auth: 'admin' },
      { method: 'PUT', path: '/api/admin/applications/:id/approve-documents', description: 'Approve all documents for an application in one action', auth: 'admin' },
      { method: 'POST', path: '/api/admin/applications/:id/visa-file', description: 'Upload the processed visa file for an approved application', auth: 'admin', notes: 'Multipart/form-data. Accepts JPEG, PNG, PDF ≤ 10 MB' },
      { method: 'PUT', path: '/api/admin/applications/:id/manual-payment', description: 'Override or manually record payment for an application', auth: 'admin' },
      { method: 'GET', path: '/api/admin/applications/:id/documents/zip', description: 'Download all application documents as a ZIP archive', auth: 'admin' },
    ],
  },
  {
    title: 'Admin — Payments',
    endpoints: [
      { method: 'GET', path: '/api/admin/payments', description: 'Get all payment records across all users', auth: 'admin' },
    ],
  },
  {
    title: 'Admin — Users',
    endpoints: [
      { method: 'GET', path: '/api/admin/users', description: 'List all registered users', auth: 'admin' },
      { method: 'GET', path: '/api/admin/users/:userId/applications', description: 'Get all applications belonging to a specific user', auth: 'admin' },
      { method: 'GET', path: '/api/admin/users/:userId/vault', description: 'View a user\'s document vault', auth: 'admin' },
      { method: 'GET', path: '/api/admin/users/:userId/vault/zip', description: 'Download a user\'s entire vault as a ZIP archive', auth: 'admin' },
    ],
  },
  {
    title: 'Admin — Contact Leads',
    endpoints: [
      { method: 'GET', path: '/api/admin/leads', description: 'List all contact form submissions / leads', auth: 'admin' },
      { method: 'PATCH', path: '/api/admin/leads/:id/read', description: 'Mark a lead as read', auth: 'admin' },
      { method: 'DELETE', path: '/api/admin/leads/:id', description: 'Delete a contact lead', auth: 'admin' },
    ],
  },
  {
    title: 'Admin — Notifications',
    endpoints: [
      { method: 'GET', path: '/api/admin/notifications', description: 'Get all admin notifications', auth: 'admin' },
      { method: 'PUT', path: '/api/admin/notifications/read-all', description: 'Mark all admin notifications as read', auth: 'admin' },
      { method: 'PUT', path: '/api/admin/notifications/:id/read', description: 'Mark a single admin notification as read', auth: 'admin' },
      { method: 'DELETE', path: '/api/admin/notifications/all', description: 'Delete all admin notifications', auth: 'admin' },
      { method: 'DELETE', path: '/api/admin/notifications/:id', description: 'Delete a specific admin notification', auth: 'admin' },
    ],
  },
];

router.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(generateDocsHTML('Pravasa Transworld API', groups));
});

export default router;
