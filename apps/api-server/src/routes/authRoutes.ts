import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validateBody } from '../middleware/validateMiddleware';
import {
  CustomerOtpRequestSchema,
  CustomerOtpVerifySchema,
  StaffLoginSchema,
} from '@ovovita/validation';
import { authenticateJwt } from '../middleware/authMiddleware';

const router = Router();

router.post('/customer/otp-request', validateBody(CustomerOtpRequestSchema), AuthController.requestCustomerOtp);
router.post('/customer/otp-verify', validateBody(CustomerOtpVerifySchema), AuthController.verifyCustomerOtp);
router.post('/staff/login', validateBody(StaffLoginSchema), AuthController.staffLogin);
router.get('/profile', authenticateJwt, AuthController.getProfile);

export default router;
