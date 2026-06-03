import { Router } from 'express';
import { sendOtp, verifyOtp, adminLogin } from '../controllers/auth.controller';
import { otpRateLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/send-otp', otpRateLimiter, sendOtp);
router.post('/verify-otp', otpRateLimiter, verifyOtp);
router.post('/admin/login', otpRateLimiter, adminLogin);

export default router;
