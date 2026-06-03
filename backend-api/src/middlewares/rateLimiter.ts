import rateLimit from 'express-rate-limit';

// Rate limiter for OTP sending to prevent abuse and API exhaustion
export const otpRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 3, // Limit each IP to 3 requests per windowMs
  message: {
    message: 'Too many OTP requests from this IP, please try again after a minute',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
