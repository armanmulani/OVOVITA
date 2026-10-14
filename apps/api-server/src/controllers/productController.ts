import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { InventoryService } from '../services/InventoryService';

export class ProductController {
  /**
   * List products in catalog with live availability and pricing
   */
  static async listCatalog(req: Request, res: Response) {
    const { type } = req.query;
    const filter: any = { status: 'ACTIVE' };
    if (type && type !== 'ALL') {
      filter.type = type;
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: products,
    });
  }

  /**
   * Get product detail by ID
   */
  static async getProductById(req: Request, res: Response) {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
    }

    return res.json({
      success: true,
      data: product,
    });
  }

  /**
   * Update live pricing tiers (Admin / Shopkeeper)
   */
  static async updatePricing(req: Request, res: Response) {
    const { productId, unitPricing } = req.body;

    const product = await Product.findByIdAndUpdate(
      productId,
      { $set: { unitPricing } },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
    }

    console.log(`[Price Master] 🏷️ Updated live unit rates for ${product.name}`);

    return res.json({
      success: true,
      message: 'Product pricing updated successfully',
      data: product,
    });
  }

  /**
   * Inward fresh batch to depot (Admin / Shopkeeper)
   */
  static async inwardStockBatch(req: Request, res: Response) {
    const { productId, adjustmentQty, batchNote } = req.body;

    const updatedProduct = await InventoryService.inwardBatch(productId, adjustmentQty);

    console.log(
      `[Depot Stock Inward] 📦 Added +${adjustmentQty} eggs to ${updatedProduct.name}. New Total: ${updatedProduct.currentStock}`
    );

    return res.json({
      success: true,
      message: `Batch inward of +${adjustmentQty} eggs recorded`,
      data: updatedProduct,
    });
  }
}
