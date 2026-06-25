import { Router } from 'express';
import { getPublicCountries, getPublicVisaTypes, getPublicCountryBySlug } from '../controllers/user/applications.controller';
import { submitContactLead } from '../controllers/admin/contactLeads.controller';

const router = Router();

router.get('/countries', getPublicCountries as any);
router.get('/countries/:slug', getPublicCountryBySlug as any);
router.get('/visa-types', getPublicVisaTypes as any);
router.post('/contact', submitContactLead);

export default router;
