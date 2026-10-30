import { Router } from 'express';
import { DepotController } from '../controllers/depotController';
import { validateBody } from '../middleware/validateMiddleware';
import { CloseShiftReconciliationSchema } from '@ovovita/validation';
import { authenticateJwt, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Public / Client Depot discovery & coverage check
router.get('/', DepotController.getAllDepots);
router.get('/coverage', DepotController.checkCoverage);

// Depot hub management – static routes first
router.get(
  '/dashboard',
  authenticateJwt,
  requireRole('SHOPKEEPER', 'SYSTEM_ADMIN'),
  DepotController.getDepotDashboard
);

// Param routes after static ones
router.get('/:id', DepotController.getDepot);

// Admin depot management
router.patch(
  '/:id',
  authenticateJwt,
  requireRole('SYSTEM_ADMIN', 'SHOPKEEPER'),
  DepotController.updateDepot
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
