import { Request, Response } from 'express';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { ShiftReconciliation } from '../models/ShiftReconciliation';
import { NotificationService } from '../services/NotificationService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class DepotController {
  /**
   * Get Depot Live Hub Metrics & Order Queues
   */
  static async getDepotDashboard(req: AuthenticatedRequest, res: Response) {
    const depotId = req.user?.depotId || req.query.depotId;

    const query: any = {};
    if (depotId) query.depotId = depotId;

    const totalOrdersToday = await Order.countDocuments(query);
    const packingOrders = await Order.find({ ...query, status: { $in: ['CONFIRMED', 'PACKING'] } }).limit(20);
    const outForDeliveryOrders = await Order.find({ ...query, status: 'OUT_FOR_DELIVERY' });
    const deliveredToday = await Order.find({ ...query, status: 'DELIVERED' });

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
          totalCodCash: totalCodCollected,
          totalUpiDigital: totalUpiCollected,
          totalRevenue: totalCodCollected + totalUpiCollected,
        },
        packingQueue: packingOrders,
        activeRuns: outForDeliveryOrders,
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

    order.assignedDeliveryPersonId = driver._id;
    order.assignedDeliveryPersonName = driver.name;
    order.assignedDeliveryPersonPhone = driver.phoneNumber;
    order.vehiclePlateNumber = vehiclePlateNumber || 'KA-01-EQ-9872';
    order.estimatedDeliveryTime = `${estimatedMinutes || 15} mins`;
    order.status = 'OUT_FOR_DELIVERY';

    order.statusTimeline.push({
      status: 'OUT_FOR_DELIVERY',
      timestamp: new Date(),
      updatedByUserId: req.user?.id as any,
      note: `Dispatched with ${driver.name} (${order.vehiclePlateNumber}). ETA: ${order.estimatedDeliveryTime}`,
    });

    await order.save();

    // Trigger Out for Delivery WhatsApp notification to customer
    NotificationService.sendDispatchWhatsApp({
      orderNumber: order.orderNumber,
      customerPhone: order.customerPhone,
      customerName: order.customerName,
      riderName: driver.name,
      riderPhone: driver.phoneNumber,
      amountDue: order.finalPayableAmount,
    }).catch(console.error);

    return res.json({
      success: true,
      message: `Order assigned to ${driver.name} and marked Out for Delivery`,
      data: order,
    });
  }

  /**
   * Delivery Executive Run-Sheet Tasks
   */
  static async getDriverRunSheet(req: AuthenticatedRequest, res: Response) {
    const driverId = req.user?.id;
    const runs = await Order.find({
      assignedDeliveryPersonId: driverId,
      status: { $in: ['OUT_FOR_DELIVERY', 'DELIVERED'] },
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

    // Query all orders delivered by this driver on shiftDate
    const deliveredOrders = await Order.find({
      assignedDeliveryPersonId: deliveryPersonId,
      status: 'DELIVERED',
      scheduledDeliveryDate: shiftDate,
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
