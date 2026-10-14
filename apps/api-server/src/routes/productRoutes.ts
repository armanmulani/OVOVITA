import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { validateBody } from '../middleware/validateMiddleware';
import {
  UpdateProductPriceSchema,
  UpdateProductStockSchema,
} from '@ovovita/validation';
import { authenticateJwt, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', ProductController.listCatalog);
router.get('/:id', ProductController.getProductById);

// Protected Admin / Shopkeeper Routes
router.patch(
  '/price',
  authenticateJwt,
  requireRole('SHOPKEEPER', 'SYSTEM_ADMIN'),
  validateBody(UpdateProductPriceSchema),
  ProductController.updatePricing
);

router.post(
  '/batch-inward',
  authenticateJwt,
  requireRole('SHOPKEEPER', 'SYSTEM_ADMIN'),
  validateBody(UpdateProductStockSchema),
  ProductController.inwardStockBatch
);

export default router;
