import { Router } from 'express';
import { adminProtect } from '../middleware/adminAuth.middleware';
import { upload } from '../middleware/upload.middleware';
import * as countries from '../controllers/admin/countries.controller';
import * as visaTypes from '../controllers/admin/visaTypes.controller';
import * as apps from '../controllers/admin/applications.controller';
import * as leads from '../controllers/admin/contactLeads.controller';

const router = Router();
router.use(adminProtect);

// Dashboard
router.get('/dashboard', apps.getDashboardStats);

// Countries
router.route('/countries').get(countries.getCountries).post(countries.createCountry);
router.route('/countries/:id').put(countries.updateCountry).delete(countries.deleteCountry);
router.patch('/countries/:id/toggle', countries.toggleCountryStatus);

// Visa Types
router.route('/visa-types').get(visaTypes.getVisaTypes).post(visaTypes.createVisaType);
router.route('/visa-types/:id').get(visaTypes.getVisaType).put(visaTypes.updateVisaType).delete(visaTypes.deleteVisaType);
router.patch('/visa-types/:id/toggle', visaTypes.toggleVisaTypeStatus);

// Applications
router.get('/applications', apps.getApplications);
router.get('/applications/:id', apps.getApplication);
router.put('/applications/:id/status', apps.updateStatus);
router.put('/applications/:id/document-review', apps.reviewDocument);
router.put('/applications/:id/approve-documents', apps.approveAllDocuments);
router.post('/applications/:id/visa-file', upload.single('file'), apps.uploadVisaFile);
router.put('/applications/:id/manual-payment', apps.manualPaymentOverride);

// Payments
router.get('/payments', apps.getAdminPayments);

// Users
router.get('/users', apps.getUsers);
router.get('/users/:userId/applications', apps.getUserApplications);

// Contact Leads
router.get('/leads', leads.getLeads);
router.patch('/leads/:id/read', leads.markLeadRead);

export default router;
