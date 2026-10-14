import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { NotificationService } from './NotificationService';

export class InventoryService {
  /**
   * Atomically decrement stock for an order's items.
   * Uses MongoDB transaction if replica set is enabled; otherwise uses atomic conditional $inc.
   */
  static async atomicDecrementStock(
    items: Array<{ productId: string; totalEggsCount: number; productName: string }>,
    depotName: string = 'Koramangala Central Depot'
  ) {
    let session: mongoose.ClientSession | null = null;
    let useTransaction = false;

    try {
      session = await mongoose.startSession();
      // Check if MongoDB deployment supports transactions (replica set)
      session.startTransaction();
      useTransaction = true;
    } catch {
      // Standalone MongoDB (e.g. standard local dev); proceed with atomic conditional update
      useTransaction = false;
    }

    try {
      const decrementedItems: Array<{ productId: string; qty: number }> = [];

      for (const item of items) {
        // Atomic conditional decrement: currentStock >= totalEggsCount
        const query = {
          _id: item.productId,
          currentStock: { $gte: item.totalEggsCount },
          status: 'ACTIVE',
        };

        const update = {
          $inc: { currentStock: -item.totalEggsCount },
        };

        const updatedProduct = useTransaction && session
          ? await Product.findOneAndUpdate(query, update, { new: true, session })
          : await Product.findOneAndUpdate(query, update, { new: true });

        if (!updatedProduct) {
          throw new Error(
            `Insufficient stock for "${item.productName}". The batch was just claimed by another morning customer!`
          );
        }

        decrementedItems.push({ productId: item.productId, qty: item.totalEggsCount });

        // Check low-stock threshold trigger
        if (
          updatedProduct.currentStock <= updatedProduct.lowStockThreshold &&
          !updatedProduct.isLowStockAlertSent
        ) {
          updatedProduct.isLowStockAlertSent = true;
          await updatedProduct.save({ session: session || undefined });
          NotificationService.sendLowStockAlert({
            name: updatedProduct.name,
            currentStock: updatedProduct.currentStock,
            lowStockThreshold: updatedProduct.lowStockThreshold,
            depotName,
          });
        }
      }

      if (useTransaction && session) {
        await session.commitTransaction();
      }

      return { success: true, decrementedItems };
    } catch (error) {
      if (useTransaction && session) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  /**
   * Rollback inventory upon order cancellation
   */
  static async restoreStock(items: Array<{ productId: string; totalEggsCount: number }>) {
    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { currentStock: item.totalEggsCount },
        $set: { isLowStockAlertSent: false },
      });
    }
  }

  /**
   * Inward new farm batch to depot
   */
  static async inwardBatch(productId: string, inwardEggCount: number) {
    const product = await Product.findByIdAndUpdate(
      productId,
      {
        $inc: { currentStock: inwardEggCount },
        $set: { isLowStockAlertSent: false },
      },
      { new: true }
    );

    if (!product) {
      throw new Error('Product not found for batch inward');
    }

    return product;
  }
}
