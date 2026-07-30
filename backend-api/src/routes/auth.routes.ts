import { Router } from 'express';
import { asyncRouter } from '../utils/asyncRouter';
import { sendOtp, sendLoginOtp, verifyOtp, sendAdminOtp, verifyAdminOtp } from '../controllers/auth.controller';
import { otpRateLimiter } from '../middleware/rateLimiter';

const router = asyncRouter();

router.post('/send-otp', otpRateLimiter, sendOtp);
router.post('/send-login-otp', otpRateLimiter, sendLoginOtp);
router.post('/verify-otp', otpRateLimiter, verifyOtp);
router.post('/admin/send-otp', otpRateLimiter, sendAdminOtp);
router.post('/admin/verify-otp', otpRateLimiter, verifyAdminOtp);

export default router;
