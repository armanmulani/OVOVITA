import { Router } from 'express';
import { DepotController } from '../controllers/depotController';
import { validateBody } from '../middleware/validateMiddleware';
import { CloseShiftReconciliationSchema } from '@ovovita/validation';
import { authenticateJwt, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Depot hub management
router.get(
  '/dashboard',
  authenticateJwt,
  requireRole('SHOPKEEPER', 'SYSTEM_ADMIN'),
  DepotController.getDepotDashboard
);

router.post(
  '/assign-rider',
  authenticateJwt,
  requireRole('SHOPKEEPER', 'SYSTEM_ADMIN'),
  DepotController.assignRider
);

// Delivery partner run-sheet
router.get(
  '/driver/run-sheet',
  authenticateJwt,
  requireRole('DELIVERY_EXECUTIVE'),
  DepotController.getDriverRunSheet
);

// End-of-shift drawer reconciliation
router.post(
  '/shift/reconciliation-close',
  authenticateJwt,
  requireRole('SHOPKEEPER', 'SYSTEM_ADMIN'),
  validateBody(CloseShiftReconciliationSchema),
  DepotController.closeShiftReconciliation
);

export default router;
