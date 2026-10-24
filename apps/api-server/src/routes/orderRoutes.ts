import { Router } from 'express';
import { OrderController } from '../controllers/orderController';
import { validateBody } from '../middleware/validateMiddleware';
import {
  CreateOrderSchema,
  AdjustBrokenEggsSchema,
  DoorstepPaymentCollectSchema,
  CancelOrderSchema,
  ConfirmOrderSchema,
  PackingTransitionSchema,
} from '@ovovita/validation';
import { authenticateJwt, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Admin / Shopkeeper Order History
router.get(
  '/',
  authenticateJwt,
  requireRole('SHOPKEEPER', 'SYSTEM_ADMIN'),
  OrderController.listAllOrders
);

// Customer order creation & history
router.post('/', authenticateJwt, validateBody(CreateOrderSchema), OrderController.createOrder);
router.get('/my-orders', authenticateJwt, OrderController.listCustomerOrders);

// Tracking & Dynamic Doorstep UPI QR
//
// Both are restricted to the order's own customer and to staff: the payload
// carries the customer's address and the amount owed.
router.get('/:id/tracking', authenticateJwt, OrderController.getOrderTracking);
router.get('/:id/upi-qr', authenticateJwt, OrderController.getDoorstepUpiQr);

// Order lifecycle
//
// Cancelling is open to the order's own customer and to shop staff. The
// controller additionally checks that a customer only cancels their OWN
// order — the role guard alone would not stop that.
router.post(
  '/:id/cancel',
  authenticateJwt,
  validateBody(CancelOrderSchema),
  OrderController.cancelOrder
);

// Confirming a PLACED order locks its stock. This is a shop action.
router.post(
  '/:id/confirm',
  authenticateJwt,
  requireRole('SHOPKEEPER', 'SYSTEM_ADMIN'),
  validateBody(ConfirmOrderSchema),
  OrderController.confirmOrder
);

// Packing workflow: CONFIRMED -> PACKING -> READY_FOR_DELIVERY.
router.post(
  '/:id/packing',
  authenticateJwt,
  requireRole('SHOPKEEPER', 'SYSTEM_ADMIN'),
  validateBody(PackingTransitionSchema),
  OrderController.startPacking
);

router.post(
  '/:id/ready',
  authenticateJwt,
  requireRole('SHOPKEEPER', 'SYSTEM_ADMIN'),
  validateBody(PackingTransitionSchema),
  OrderController.markReadyForDelivery
);

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
