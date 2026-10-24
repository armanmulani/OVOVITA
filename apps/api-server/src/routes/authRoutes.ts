import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validateBody } from '../middleware/validateMiddleware';
import {
  CustomerOtpRequestSchema,
  CustomerOtpVerifySchema,
  StaffLoginSchema,
} from '@ovovita/validation';
import { authenticateJwt } from '../middleware/authMiddleware';
import {
  otpRateLimiter,
  loginRateLimiter,
  otpVerifySubjectLimiter,
  staffLoginSubjectLimiter,
} from '../middleware/rateLimitMiddleware';
import { z } from 'zod';

const router = Router();

// Phone OTP (Better Auth) - existing
router.post(
  '/customer/otp-request',
  otpRateLimiter,
  validateBody(CustomerOtpRequestSchema),
  AuthController.requestCustomerOtp
);

router.post(
  '/customer/otp-verify',
  otpRateLimiter,
  otpVerifySubjectLimiter,
  validateBody(CustomerOtpVerifySchema),
  AuthController.verifyCustomerOtp
);

// Email OTP (Free Gmail SMTP) - new
const EmailOtpRequestSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

const EmailOtpVerifySchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    otpCode: z.string().length(6, 'OTP must be 6 digits'),
  }),
});

router.post(
  '/customer/email-otp-request',
  otpRateLimiter,
  validateBody(EmailOtpRequestSchema),
  AuthController.requestCustomerEmailOtp
);

router.post(
  '/customer/email-otp-verify',
  otpRateLimiter,
  otpVerifySubjectLimiter,
  validateBody(EmailOtpVerifySchema),
  AuthController.verifyCustomerEmailOtp
);

const GoogleLoginSchema = z.object({
  idToken: z.string().min(1),
});

router.post(
  '/customer/google',
  loginRateLimiter,
  validateBody(GoogleLoginSchema),
  AuthController.googleLogin
);

router.post(
  '/staff/login',
  loginRateLimiter,
  staffLoginSubjectLimiter,
  validateBody(StaffLoginSchema),
  AuthController.staffLogin
);

router.get('/profile', authenticateJwt, AuthController.getProfile);

// Address Management
router.post('/addresses', authenticateJwt, AuthController.addAddress);
router.put('/addresses/:addressId', authenticateJwt, AuthController.updateAddress);
router.delete('/addresses/:addressId', authenticateJwt, AuthController.deleteAddress);

export default router;
