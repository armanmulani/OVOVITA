import { Router } from 'express';
import { OrderController } from '../controllers/orderController';
import { validateBody } from '../middleware/validateMiddleware';
import {
  CreateOrderSchema,
  AdjustBrokenEggsSchema,
  DoorstepPaymentCollectSchema,
} from '@ovovita/validation';
import { authenticateJwt, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Customer order creation & history
router.post('/', authenticateJwt, validateBody(CreateOrderSchema), OrderController.createOrder);
router.get('/my-orders', authenticateJwt, OrderController.listCustomerOrders);

// Tracking & Dynamic Doorstep UPI QR
router.get('/:id/tracking', OrderController.getOrderTracking);
router.get('/:id/upi-qr', OrderController.getDoorstepUpiQr);

// Doorstep Zero-Crack Refinements
router.post(
  '/adjust-broken',
  authenticateJwt,
  requireRole('DELIVERY_EXECUTIVE', 'SHOPKEEPER', 'SYSTEM_ADMIN'),
  validateBody(AdjustBrokenEggsSchema),
  OrderController.adjustBrokenEggs
);

router.post(
  '/collect-payment',
  authenticateJwt,
  requireRole('DELIVERY_EXECUTIVE', 'SHOPKEEPER', 'SYSTEM_ADMIN'),
  validateBody(DoorstepPaymentCollectSchema),
  OrderController.collectPaymentAndDeliver
);

export default router;
