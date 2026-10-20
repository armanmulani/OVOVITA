import { Request, Response } from 'express';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { PricingService } from '../services/PricingService';
import { InventoryService } from '../services/InventoryService';
import { RoutingService } from '../services/RoutingService';
import { NotificationService } from '../services/NotificationService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class OrderController {
  /**
   * Place a new Pay-on-Delivery Order with Atomic Inventory Decrement
   */
  static async createOrder(req: AuthenticatedRequest, res: Response) {
    const customerId = req.user?.id;
    const {
      deliveryAddress,
      deliverySlot,
      scheduledDeliveryDate,
      paymentMethod,
      items,
      morningHarvestNotes,
    } = req.body;

    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer account not found' },
      });
    }

    // 1. Resolve servicing depot by delivery coordinates or pincode
    const { depot, distanceKm, estimatedMinutes } = await RoutingService.resolveDepot({
      pincode: deliveryAddress.pincode,
      longitude: deliveryAddress.longitude,
      latitude: deliveryAddress.latitude,
    });

    // 2. Compute prices and frozen snapshots
    const bill = await PricingService.computeOrderBill(items);

    // 3. Atomically decrement inventory to lock stock
    await InventoryService.atomicDecrementStock(
      bill.items.map((i) => ({
        productId: i.productId,
        totalEggsCount: i.totalEggsCount,
        productName: i.productName,
      })),
      depot.name
    );

    // 4. Generate unique sequential-style order number
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `EGG-${datePrefix}-${randomSuffix}`;

    // 5. Create Order document
    const order = await Order.create({
      orderNumber,
      customerId: customer._id,
      customerName: deliveryAddress.recipientName || customer.name,
      customerPhone: deliveryAddress.phoneNumber || customer.phoneNumber,
      depotId: depot._id,
      estimatedDeliveryTime: `${estimatedMinutes} mins`,
      items: bill.items,
      subtotal: bill.subtotal,
      deliveryCharge: bill.deliveryCharge,
      packagingCharge: bill.packagingCharge,
      totalAmount: bill.totalAmount,
      finalPayableAmount: bill.finalPayableAmount,
      deliveryAddress,
      deliverySlot,
      scheduledDeliveryDate,
      paymentMethod,
      paymentStatus: 'PENDING',
      status: 'CONFIRMED',
      statusTimeline: [
        {
          status: 'PLACED',
          timestamp: new Date(),
          updatedByUserId: customer._id,
          note: 'Order placed by customer via mobile app',
        },
        {
          status: 'CONFIRMED',
          timestamp: new Date(),
          updatedByUserId: customer._id,
          note: `Inventory atomically locked at ${depot.name}`,
        },
      ],
    });

    // Increment customer order stats
    await User.findByIdAndUpdate(customerId, { $inc: { totalOrdersCount: 1 } });

    // 6. Asynchronous WhatsApp notification
    NotificationService.sendOrderPlacedWhatsApp({
      orderNumber: order.orderNumber,
      customerPhone: order.customerPhone,
      customerName: order.customerName,
      finalPayableAmount: order.finalPayableAmount,
      paymentMethod: order.paymentMethod,
      deliverySlot: order.deliverySlot,
    }).catch(console.error);

    return res.status(201).json({
      success: true,
      message: 'Fresh eggs order confirmed! Molded pulp packaging assigned.',
      data: order,
    });
  }

  /**
   * Generate Dynamic UPI QR String for Doorstep Collection
   */
  static async getDoorstepUpiQr(req: Request, res: Response) {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    // Standard NPCI Bharat UPI deep link
    // upi://pay?pa={vpa}&pn={merchant}&am={amount}&tn={note}&cu=INR
    const vpa = 'ovovita.depot@okhdfcbank';
    const merchantName = encodeURIComponent('Ovovita Fresh Farms');
    const note = encodeURIComponent(`Ovovita Egg Order ${order.orderNumber}`);
    const amount = order.finalPayableAmount.toFixed(2);

    const upiDeepLink = `upi://pay?pa=${vpa}&pn=${merchantName}&am=${amount}&tn=${note}&cu=INR`;

    return res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        finalPayableAmount: order.finalPayableAmount,
        upiDeepLink,
        qrCodeContent: upiDeepLink,
      },
    });
  }

  /**
   * Doorstep Zero-Crack Inspection & Broken Egg Adjustment
   */
  static async adjustBrokenEggs(req: AuthenticatedRequest, res: Response) {
    const { orderId, brokenEggsCount, resolutionType, note } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    if (resolutionType === 'BUFFER_REPLACED') {
      order.brokenEggsAdjusted = brokenEggsCount;
      order.statusTimeline.push({
        status: order.status,
        timestamp: new Date(),
        updatedByUserId: req.user?.id as any,
        note: `Doorstep inspection: ${brokenEggsCount} damaged eggs replaced instantly from driver buffer crate.`,
      });
    } else {
      // Dynamic line-item price markdown
      const totalEggs = order.items.reduce((sum, item) => sum + item.totalEggsCount, 0);
      const deduction = PricingService.computeBrokenEggDeduction(
        totalEggs,
        brokenEggsCount,
        order.totalAmount
      );

      order.brokenEggsAdjusted = brokenEggsCount;
      order.brokenEggsDeductionAmount = deduction;
      order.finalPayableAmount = Math.max(0, order.totalAmount - deduction);

      order.statusTimeline.push({
        status: order.status,
        timestamp: new Date(),
        updatedByUserId: req.user?.id as any,
        note: `Doorstep inspection: ${brokenEggsCount} eggs damaged. Deducted ₹${deduction}. Adjusted payable: ₹${order.finalPayableAmount}`,
      });
    }

    await order.save();

    return res.json({
      success: true,
      message: 'Zero-crack inspection adjustment recorded',
      data: {
        orderId: order._id,
        brokenEggsAdjusted: order.brokenEggsAdjusted,
        brokenEggsDeductionAmount: order.brokenEggsDeductionAmount,
        finalPayableAmount: order.finalPayableAmount,
      },
    });
  }

  /**
   * Collect Doorstep Payment & Mark Delivered
   */
  static async collectPaymentAndDeliver(req: AuthenticatedRequest, res: Response) {
    const { orderId, paymentMethod, amountCollected, upiTransactionRef } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    order.paymentMethod = paymentMethod;
    order.podCollectedAmount = amountCollected;
    order.upiTransactionRef = upiTransactionRef;
    order.paymentStatus = 'COLLECTED';
    order.status = 'DELIVERED';

    order.statusTimeline.push({
      status: 'DELIVERED',
      timestamp: new Date(),
      updatedByUserId: req.user?.id as any,
      note: `Zero-crack inspection passed. Collected ₹${amountCollected} via ${paymentMethod}.`,
    });

    await order.save();

    console.log(
      `[Delivery Ledger] 🛵 Order ${order.orderNumber} DELIVERED & PAID: ₹${amountCollected} (${paymentMethod})`
    );

    return res.json({
      success: true,
      message: 'Order marked delivered and payment collected',
      data: order,
    });
  }

  /**
   * Track order by ID
   */
  static async getOrderTracking(req: Request, res: Response) {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    return res.json({
      success: true,
      data: order,
    });
  }

  /**
   * List customer's past orders
   */
  static async listCustomerOrders(req: AuthenticatedRequest, res: Response) {
    const customerId = req.user?.id;
    const orders = await Order.find({ customerId }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: orders,
    });
  }
}
