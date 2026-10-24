import { Request, Response } from 'express';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { ShiftReconciliation } from '../models/ShiftReconciliation';
import { Depot } from '../models/Depot';
import { RoutingService } from '../services/RoutingService';
import { NotificationService } from '../services/NotificationService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class DepotController {
  /**
   * List all distribution depot hubs
   */
  static async getAllDepots(req: Request, res: Response) {
    const depots = await Depot.find({ isActive: true }).sort({ name: 1 });
    return res.json({
      success: true,
      data: depots,
    });
  }

  /**
   * Check delivery coverage and ETA by pincode or coordinates
   */
  static async checkCoverage(req: Request, res: Response) {
    const { pincode, lng, lat } = req.query;
    const coverage = await RoutingService.checkCoverage({
      pincode: pincode as string,
      longitude: lng ? parseFloat(lng as string) : undefined,
      latitude: lat ? parseFloat(lat as string) : undefined,
    });

    return res.json({
      success: true,
      data: coverage,
    });
  }
  /**
   * Get Depot Live Hub Metrics & Order Queues
   */
  static async getDepotDashboard(req: AuthenticatedRequest, res: Response) {
    const depotId = req.user?.depotId || req.query.depotId;

    const query: any = {};
    if (depotId) query.depotId = depotId;

    const totalOrdersToday = await Order.countDocuments(query);
    // The Packing Queue board now shows real work: orders awaiting
    // confirmation, orders being packed, and orders packed and waiting for
    // a driver. Each has a different next action in the admin portal.
    const packingOrders = await Order.find({
      ...query,
      status: { $in: ['PLACED', 'CONFIRMED', 'PACKING', 'READY_FOR_DELIVERY'] },
    }).limit(20);
    const outForDeliveryOrders = await Order.find({ ...query, status: 'OUT_FOR_DELIVERY' });
    const deliveredToday = await Order.find({ ...query, status: 'DELIVERED' });

    // Refunds the owner must action by hand — a DELIVERED order that was
    // cancelled after the customer already paid.
    const refundsOwed = await Order.find({ ...query, refundOwed: true, refundStatus: 'PENDING' });

    const totalCodCollected = deliveredToday
      .filter((o) => o.paymentMethod === 'CASH_ON_DELIVERY')
      .reduce((sum, o) => sum + (o.podCollectedAmount || 0), 0);

    const totalUpiCollected = deliveredToday
      .filter((o) => o.paymentMethod === 'UPI_ON_DELIVERY')
      .reduce((sum, o) => sum + (o.podCollectedAmount || 0), 0);

    const criticalProducts = await Product.find({
      $expr: { $lte: ['$currentStock', '$lowStockThreshold'] },
      status: 'ACTIVE',
    });

    const activeDrivers = await User.find({ role: 'DELIVERY_EXECUTIVE' }).select('name phoneNumber avatarUrl');

    return res.json({
      success: true,
      data: {
        metrics: {
          totalOrdersCount: totalOrdersToday,
          packingQueueCount: packingOrders.length,
          activeRunsCount: outForDeliveryOrders.length,
          deliveredCount: deliveredToday.length,
          refundsOwedCount: refundsOwed.length,
          refundsOwedAmount: refundsOwed.reduce(
            (sum, o) => sum + (o.refundAmount || 0),
            0
          ),
          totalCodCash: totalCodCollected,
          totalUpiDigital: totalUpiCollected,
          totalRevenue: totalCodCollected + totalUpiCollected,
        },
        packingQueue: packingOrders,
        activeRuns: outForDeliveryOrders,
        refundsOwed: refundsOwed,
        criticalStockAlerts: criticalProducts,
        availableDrivers: activeDrivers,
      },
    });
  }

  /**
   * Assign Order to Delivery Partner & Dispatch
   */
  static async assignRider(req: AuthenticatedRequest, res: Response) {
    const { orderId, driverId, vehiclePlateNumber, estimatedMinutes } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'DELIVERY_EXECUTIVE') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DRIVER', message: 'Valid delivery executive account required' },
      });
    }

    // Dispatch only happens once the eggs are packed and waiting. The claim
    // is a conditional update so two dispatchers cannot both move the same
    // order onto the road.
    const dispatched = await Order.findOneAndUpdate(
      { _id: order._id, status: 'READY_FOR_DELIVERY' },
      {
        $set: {
          assignedDeliveryPersonId: driver._id,
          assignedDeliveryPersonName: driver.name,
          assignedDeliveryPersonPhone: driver.phoneNumber,
          vehiclePlateNumber: vehiclePlateNumber || 'KA-01-EQ-9872',
          estimatedDeliveryTime: `${estimatedMinutes || 15} mins`,
          status: 'OUT_FOR_DELIVERY',
        },
        $push: {
          statusTimeline: {
            status: 'OUT_FOR_DELIVERY',
            timestamp: new Date(),
            updatedByUserId: req.user?.id as any,
            note: `Dispatched with ${driver.name} (${vehiclePlateNumber || 'KA-01-EQ-9872'}). ETA: ${estimatedMinutes || 15} mins`,
          },
        },
      },
      { new: true }
    );

    if (!dispatched) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ORDER_CONFLICT',
          message: `Order is ${order.status} and cannot be dispatched. Pack it first (READY_FOR_DELIVERY).`,
        },
      });
    }

    // Trigger Out for Delivery WhatsApp notification to customer
    NotificationService.sendDispatchWhatsApp({
      orderNumber: dispatched.orderNumber,
      customerPhone: dispatched.customerPhone,
      customerName: dispatched.customerName,
      riderName: driver.name,
      riderPhone: driver.phoneNumber,
      amountDue: dispatched.finalPayableAmount,
    }).catch(console.error);

    return res.json({
      success: true,
      message: `Order assigned to ${driver.name} and marked Out for Delivery`,
      data: dispatched,
    });
  }

  /**
   * Delivery Executive Run-Sheet Tasks
   *
   * Includes orders that were cancelled while the driver still held the eggs
   * — the driver physically has to bring them back to the shop, so they must
   * stay on the run sheet flagged for egg return. Without this the stock
   * count and the van contents disagree.
   */
  static async getDriverRunSheet(req: AuthenticatedRequest, res: Response) {
    const driverId = req.user?.id;
    const runs = await Order.find({
      assignedDeliveryPersonId: driverId,
      $or: [
        { status: { $in: ['OUT_FOR_DELIVERY', 'DELIVERED'] } },
        { status: 'CANCELLED', requiresEggReturn: true },
      ],
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: runs,
    });
  }

  /**
   * End-of-Shift Cash & UPI Drawer Close Handshake
   */
  static async closeShiftReconciliation(req: AuthenticatedRequest, res: Response) {
    const managerId = req.user?.id;
    const { depotId, deliveryPersonId, shiftDate, physicalCashDeposited, managerNotes } = req.body;

    const driver = await User.findById(deliveryPersonId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: { code: 'DRIVER_NOT_FOUND', message: 'Delivery person not found' },
      });
    }

    // Query all orders delivered by this driver on shiftDate.
    //
    // A DELIVERED order that was cancelled afterwards (refund owed) is
    // included too: the driver still physically collected that cash and
    // hands it over at the shift close. The owner pays the refund from the
    // shop till, not from the driver's drawer, so excluding it would make
    // the drawer look short by exactly the refund amount and blame the
    // driver for the owner's refund.
    const deliveredOrders = await Order.find({
      assignedDeliveryPersonId: deliveryPersonId,
      scheduledDeliveryDate: shiftDate,
      $or: [
        { status: 'DELIVERED' },
        { status: 'CANCELLED', refundOwed: true },
      ],
    });

    const expectedCash = deliveredOrders
      .filter((o) => o.paymentMethod === 'CASH_ON_DELIVERY')
      .reduce((sum, o) => sum + (o.podCollectedAmount || 0), 0);

    const totalUpi = deliveredOrders
      .filter((o) => o.paymentMethod === 'UPI_ON_DELIVERY')
      .reduce((sum, o) => sum + (o.podCollectedAmount || 0), 0);

    const totalDamageDeduction = deliveredOrders.reduce(
      (sum, o) => sum + (o.brokenEggsDeductionAmount || 0),
      0
    );

    const variance = expectedCash - physicalCashDeposited;
    const status = Math.abs(variance) < 0.01 ? 'BALANCED' : 'DISCREPANCY';

    const reconciliation = await ShiftReconciliation.create({
      depotId,
      deliveryPersonId,
      deliveryPersonName: driver.name,
      shiftDate,
      ordersDeliveredCount: deliveredOrders.length,
      expectedCashAmount: expectedCash,
      physicalCashDeposited,
      upiTotalAmount: totalUpi,
      brokenEggsTotalDeduction: totalDamageDeduction,
      varianceAmount: variance,
      managerApprovalId: managerId,
      managerNotes,
      status,
    });

    console.log(
      `[Shift Cash Desk] 💰 Shift close for ${driver.name}: Expected Cash ₹${expectedCash}, Physical Deposited ₹${physicalCashDeposited}, Variance: ₹${variance} (${status})`
    );

    return res.json({
      success: true,
      message:
        status === 'BALANCED'
          ? 'Shift drawer closed and balanced perfectly!'
          : `Discrepancy noted of ₹${variance}. Supervisor signoff logged.`,
      data: reconciliation,
    });
  }
}
