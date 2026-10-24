import { Response } from 'express';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { PricingService } from '../services/PricingService';
import { RoutingService } from '../services/RoutingService';
import { NotificationService } from '../services/NotificationService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { OrderService, OrderConflictError } from '../services/OrderService';
import { config } from '../config';

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

    // 3. Generate unique sequential-style order number
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `EGG-${datePrefix}-${randomSuffix}`;

    // 4. Create the Order in the PLACED state.
    //
    // Stock is NOT decremented here. A PLACED order is a request the shop has
    // not accepted yet, so it holds no eggs; the stock is locked atomically
    // when the shop confirms it (POST /orders/:id/confirm). This is what
    // gives an order a window in which it can be cancelled, and it is why the
    // 2-hour sweep exists.
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
      status: 'PLACED',
      statusTimeline: [
        {
          status: 'PLACED',
          timestamp: new Date(),
          updatedByUserId: customer._id,
          note: 'Order placed by customer via mobile app; awaiting shop confirmation',
        },
      ],
    });

    // Increment customer order stats
    await User.findByIdAndUpdate(customerId, { $inc: { totalOrdersCount: 1 } });

    // 5. Asynchronous WhatsApp notification
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
   * Generate Dynamic UPI QR String for Doorstep Collection.
   *
   * Restricted to the order's own customer and to staff. This endpoint used
   * to be public, which exposed the amount owed on any order to anyone who
   * could obtain its id.
   */
  static async getDoorstepUpiQr(req: AuthenticatedRequest, res: Response) {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    const role = req.user?.role;
    const isStaff = ['DELIVERY_EXECUTIVE', 'SHOPKEEPER', 'SYSTEM_ADMIN'].includes(role || '');
    const isOwner = String(order.customerId) === String(req.user?.id);

    if (!isStaff && !isOwner) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not allowed to view this order' },
      });
    }

    // Standard NPCI Bharat UPI deep link
    // upi://pay?pa={vpa}&pn={merchant}&am={amount}&tn={note}&cu=INR
    const vpa = config.upiMerchantVpa;
    const merchantName = encodeURIComponent(config.upiMerchantName);
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
   * Track order by ID.
   *
   * Restricted to the order's own customer and to staff (driver, shopkeeper,
   * admin). This endpoint used to be public and returned the whole order
   * document, which leaked the customer's name, phone number, full address
   * and payment details to anyone who could guess or obtain an order id.
   *
   * Customers receive a trimmed projection without the internal timeline,
   * staff ids or the raw payment bookkeeping.
   */
  static async getOrderTracking(req: AuthenticatedRequest, res: Response) {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    const role = req.user?.role;
    const isStaff = ['DELIVERY_EXECUTIVE', 'SHOPKEEPER', 'SYSTEM_ADMIN'].includes(role || '');
    const isOwner = String(order.customerId) === String(req.user?.id);

    if (!isStaff && !isOwner) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not allowed to view this order' },
      });
    }

    if (isStaff) {
      return res.json({ success: true, data: order });
    }

    // Trim the customer-facing projection. `statusTimeline` is a required
    // field on the model, so it is destructured out rather than deleted.
    const {
      statusTimeline: _statusTimeline,
      podCollectedAmount: _podCollectedAmount,
      upiTransactionRef: _upiTransactionRef,
      assignedDeliveryPersonId: _assignedDeliveryPersonId,
      ...customerView
    } = order.toObject();

    return res.json({
      success: true,
      data: customerView,
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

  /**
   * List all orders (Admin / Shopkeeper Order History) with filtering and search
   */
  static async listAllOrders(req: AuthenticatedRequest, res: Response) {
    const { depotId, status, search, limit = 100, page = 1 } = req.query;

    const query: any = {};
    if (depotId) {
      query.depotId = depotId;
    }
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (search) {
      const searchRegex = new RegExp(String(search).trim(), 'i');
      query.$or = [
        { orderNumber: searchRegex },
        { customerName: searchRegex },
        { customerPhone: searchRegex },
        { 'deliveryAddress.apartmentName': searchRegex },
        { 'deliveryAddress.streetName': searchRegex },
        { 'deliveryAddress.city': searchRegex },
      ];
    }

    const pageSize = Math.min(200, Math.max(1, Number(limit) || 100));
    const pageNum = Math.max(1, Number(page) || 1);
    const skip = (pageNum - 1) * pageSize;

    const [orders, totalCount] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      Order.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: orders,
      meta: {
        total: totalCount,
        page: pageNum,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  }

  /**
   * Cancel an order.
   *
   * The order's own customer may cancel it, as may any member of shop staff.
   * Ownership is checked here, not only by the role guard, so a customer
   * cannot cancel somebody else's order.
   */
  static async cancelOrder(req: AuthenticatedRequest, res: Response) {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    const actor = { id: req.user?.id, role: req.user?.role, name: req.user?.name };

    if (!OrderService.canActOnOrder(order, actor)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You are not allowed to cancel this order',
        },
      });
    }

    try {
      const outcome = await OrderService.cancelOrder(order, actor, req.body?.reason);

      return res.json({
        success: true,
        message:
          outcome.refundOwed
            ? `Order cancelled. A refund of ₹${outcome.refundAmount} is owed to the customer — please action it manually.`
            : outcome.requiresEggReturn
            ? 'Order cancelled. The driver must return the eggs to the shop.'
            : 'Order cancelled successfully.',
        data: {
          _id: outcome.order._id,
          orderNumber: outcome.order.orderNumber,
          status: outcome.order.status,
          stockReleased: outcome.stockReleased,
          requiresEggReturn: outcome.requiresEggReturn,
          eggsToReturnCount: outcome.order.eggsToReturnCount,
          refundOwed: outcome.refundOwed,
          refundAmount: outcome.refundAmount,
          refundStatus: outcome.order.refundStatus,
          upiTransactionRef: outcome.order.refundUpiTransactionRef,
          note: outcome.note,
        },
      });
    } catch (error: any) {
      if (error instanceof OrderConflictError) {
        return res.status(409).json({
          success: false,
          error: { code: 'ORDER_CONFLICT', message: error.message },
        });
      }
      throw error;
    }
  }

  /**
   * Confirm a PLACED order, which locks its stock.
   */
  static async confirmOrder(req: AuthenticatedRequest, res: Response) {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    try {
      const confirmed = await OrderService.confirmOrder(order, {
        id: req.user?.id,
        role: req.user?.role,
      });
      return res.json({
        success: true,
        message: 'Order confirmed and stock locked.',
        data: confirmed,
      });
    } catch (error: any) {
      if (error instanceof OrderConflictError) {
        return res.status(409).json({
          success: false,
          error: { code: 'ORDER_CONFLICT', message: error.message },
        });
      }
      // Out of stock at confirmation time.
      return res.status(409).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: error?.message || 'Could not lock stock for this order',
        },
      });
    }
  }

  /**
   * Start packing a CONFIRMED order.
   */
  static async startPacking(req: AuthenticatedRequest, res: Response) {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    try {
      const updated = await OrderService.transitionPacking(
        order,
        'PACKING',
        { id: req.user?.id, role: req.user?.role }
      );
      return res.json({
        success: true,
        message: 'Packing started.',
        data: updated,
      });
    } catch (error: any) {
      if (error instanceof OrderConflictError) {
        return res.status(409).json({
          success: false,
          error: { code: 'ORDER_CONFLICT', message: error.message },
        });
      }
      throw error;
    }
  }

  /**
   * Mark a PACKING order as ready for delivery.
   */
  static async markReadyForDelivery(req: AuthenticatedRequest, res: Response) {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    try {
      const updated = await OrderService.transitionPacking(
        order,
        'READY_FOR_DELIVERY',
        { id: req.user?.id, role: req.user?.role }
      );
      return res.json({
        success: true,
        message: 'Packing complete — order is ready for delivery.',
        data: updated,
      });
    } catch (error: any) {
      if (error instanceof OrderConflictError) {
        return res.status(409).json({
          success: false,
          error: { code: 'ORDER_CONFLICT', message: error.message },
        });
      }
      throw error;
    }
  }
}
