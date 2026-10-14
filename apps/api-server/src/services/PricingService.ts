import { Product } from '../models/Product';

export interface CalculatedBill {
  items: Array<{
    productId: string;
    productName: string;
    eggType: string;
    unit: 'SINGLE' | 'DOZEN' | 'TRAY_30';
    unitQty: number;
    quantity: number;
    totalEggsCount: number;
    priceAtPurchase: number;
    lineTotal: number;
  }>;
  subtotal: number;
  deliveryCharge: number;
  packagingCharge: number;
  totalAmount: number;
  finalPayableAmount: number;
}

export class PricingService {
  /**
   * Free delivery threshold in INR
   */
  private static readonly FREE_DELIVERY_THRESHOLD = 250;
  private static readonly STANDARD_DELIVERY_FEE = 30;

  /**
   * Compute comprehensive line items and subtotal snapshot
   */
  static async computeOrderBill(
    rawItems: Array<{ productId: string; unit: 'SINGLE' | 'DOZEN' | 'TRAY_30'; quantity: number }>
  ): Promise<CalculatedBill> {
    const computedItems: CalculatedBill['items'] = [];
    let subtotal = 0;

    for (const item of rawItems) {
      const product = await Product.findById(item.productId);
      if (!product || product.status !== 'ACTIVE') {
        throw new Error(`Product not found or inactive: ${item.productId}`);
      }

      const unitConfig = product.unitPricing.find((u) => u.unit === item.unit);
      if (!unitConfig) {
        throw new Error(`Unit ${item.unit} not available for product ${product.name}`);
      }

      const lineTotal = unitConfig.price * item.quantity;
      const totalEggs = unitConfig.unitQty * item.quantity;
      subtotal += lineTotal;

      computedItems.push({
        productId: product._id.toString(),
        productName: product.name,
        eggType: product.type,
        unit: item.unit,
        unitQty: unitConfig.unitQty,
        quantity: item.quantity,
        totalEggsCount: totalEggs,
        priceAtPurchase: unitConfig.price,
        lineTotal,
      });
    }

    // Delivery fee waiver logic
    const deliveryCharge = subtotal >= this.FREE_DELIVERY_THRESHOLD ? 0 : this.STANDARD_DELIVERY_FEE;
    const packagingCharge = 0; // Molded pulp packaging is 100% free as part of Zero-Crack guarantee
    const totalAmount = subtotal + deliveryCharge + packagingCharge;

    return {
      items: computedItems,
      subtotal,
      deliveryCharge,
      packagingCharge,
      totalAmount,
      finalPayableAmount: totalAmount,
    };
  }

  /**
   * Calculate broken egg discount deduction at doorstep
   */
  static computeBrokenEggDeduction(totalEggsInOrder: number, brokenCount: number, totalOrderAmount: number): number {
    if (brokenCount <= 0 || totalEggsInOrder <= 0) return 0;
    const avgRatePerEgg = totalOrderAmount / totalEggsInOrder;
    const deduction = Math.round(avgRatePerEgg * brokenCount);
    return Math.min(deduction, totalOrderAmount);
  }
}
