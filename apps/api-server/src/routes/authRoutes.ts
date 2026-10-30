import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validateBody } from '../middleware/validateMiddleware';
import { StaffLoginSchema } from '@ovovita/validation';
import { authenticateJwt } from '../middleware/authMiddleware';
import { loginRateLimiter, staffLoginSubjectLimiter } from '../middleware/rateLimitMiddleware';
import { z } from 'zod';

const router = Router();

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
