import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validateBody } from '../middleware/validateMiddleware';
import {
  CustomerOtpRequestSchema,
  CustomerOtpVerifySchema,
  StaffLoginSchema,
} from '@ovovita/validation';
import { authenticateJwt } from '../middleware/authMiddleware';
import { otpRateLimiter, loginRateLimiter } from '../middleware/rateLimitMiddleware';

const router = Router();

router.post(
  '/customer/otp-request',
  otpRateLimiter,
  validateBody(CustomerOtpRequestSchema),
  AuthController.requestCustomerOtp
);

router.post(
  '/customer/otp-verify',
  otpRateLimiter,
  validateBody(CustomerOtpVerifySchema),
  AuthController.verifyCustomerOtp
);

router.post(
  '/staff/login',
  loginRateLimiter,
  validateBody(StaffLoginSchema),
  AuthController.staffLogin
);

router.get('/profile', authenticateJwt, AuthController.getProfile);

// Address Management
router.post('/addresses', authenticateJwt, AuthController.addAddress);
router.put('/addresses/:addressId', authenticateJwt, AuthController.updateAddress);
router.delete('/addresses/:addressId', authenticateJwt, AuthController.deleteAddress);

export default router;
