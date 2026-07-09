import { Router } from 'express';
import { getPublicCountries, getPublicVisaTypes, getPublicCountryBySlug } from '../controllers/user/applications.controller';
import { submitContactLead } from '../controllers/admin/contactLeads.controller';
import { getWebsitePromos } from '../controllers/public/promoCodes.controller';
import { getPublicVisaConfig } from '../controllers/public/visaConfig.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/countries', getPublicCountries as any);
router.get('/countries/:slug', optionalAuth as any, getPublicCountryBySlug as any);
router.get('/visa-types', optionalAuth as any, getPublicVisaTypes as any);
router.post('/contact', submitContactLead);
router.get('/promos', getWebsitePromos);
router.get('/visa-config', getPublicVisaConfig);

export default router;
