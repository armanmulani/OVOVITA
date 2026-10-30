/**
 * Regression suite for order cancellation and the order state machine.
 *
 * This file was written BEFORE the fix (Gap 8 in DOMAIN-GAP-ANALYSIS.md) and
 * initially failed because:
 *   - there was no cancel endpoint at all,
 *   - `InventoryService.restoreStock()` had no call site,
 *   - `Order.status` never reached PLACED, PACKING or READY_FOR_DELIVERY.
 *
 * Seams under test (public interfaces only):
 *   1. POST /api/v1/orders/:id/cancel   — cancellation policy + atomicity
 *   2. POST /api/v1/orders/:id/confirm  — PLACED -> CONFIRMED (stock lock)
 *   3. POST /api/v1/orders/:id/packing  — CONFIRMED -> PACKING
 *   4. POST /api/v1/orders/:id/ready    — PACKING -> READY_FOR_DELIVERY
 *   5. OrderService.sweepStalePlacedOrders() — 2-hour auto-cancel sweep
 *
 * Expected values are literal, never recomputed the way the code does.
 */
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { OrderService } from '../services/OrderService';

const API_BASE = `http://localhost:${process.env.PORT || 4000}/api/v1`;

let passCount = 0;
let failCount = 0;

const assert = (condition: boolean, message: string) => {
  if (condition) {
    console.log(`  PASS  ${message}`);
    passCount++;
  } else {
    console.error(`  FAIL  ${message}`);
    failCount++;
  }
};

const post = async (
  endpoint: string,
  body: any,
  token?: string
): Promise<{ status: number; body: any }> => {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};

const loginAs = async (phone: string, pin: string, role: string): Promise<string> => {
  const res = await post('/auth/staff/login', { phoneNumber: phone, pin, role });
  return res.body?.data?.token;
};

const tokenFor = (user: any): string =>
  jwt.sign(
    {
      id: user._id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      name: user.name,
      depotId: user.depotId,
    },
    config.jwtSecret,
    { expiresIn: '30d' }
  );

/**
 * Creates a product with a known stock level and returns it.
 * The product is created directly in Mongo so the test controls the exact
 * starting number of eggs.
 */
const createProductWithStock = async (name: string, stock: number) => {
  const product = await Product.create({
    name,
    type: 'WHITE',
    description: 'Cancellation regression test product',
    heroImageUrl: 'http://example.com/egg.jpg',
    farmOriginName: 'Test Farm',
    laidTimestampText: 'Laid today',
    currentStock: stock,
    lowStockThreshold: 5,
    status: 'ACTIVE',
    unitPricing: [
      { unit: 'DOZEN', unitQty: 12, label: '12-Egg Dozen', price: 120 },
    ],
  });
  return product;
};

/**
 * Every order the test creates is tracked here so cleanup can delete exactly
 * those documents and nothing else — never a pattern match that could touch
 * records the test did not create.
 */
const createdOrderIds: mongoose.Types.ObjectId[] = [];

/** Builds an Order document directly so the test can place it in any state. */
const createOrderInState = async (opts: {
  customer: any;
  product: any;
  status: string;
  quantity: number;
  eggs: number;
  driver?: any;
  paymentMethod?: 'CASH_ON_DELIVERY' | 'UPI_ON_DELIVERY';
  podCollectedAmount?: number;
  upiTransactionRef?: string;
  createdAt?: Date;
}) => {
  const order = await Order.create({
    orderNumber: `EGG-TEST-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    customerId: opts.customer._id,
    customerName: opts.customer.name,
    customerPhone: opts.customer.phoneNumber,
    depotId: new mongoose.Types.ObjectId(),
    items: [
      {
        productId: opts.product._id,
        productName: opts.product.name,
        eggType: opts.product.type,
        unit: 'DOZEN',
        unitQty: 12,
        quantity: opts.quantity,
        totalEggsCount: opts.eggs,
        priceAtPurchase: 120,
        lineTotal: 120 * opts.quantity,
      },
    ],
    subtotal: 120 * opts.quantity,
    deliveryCharge: 15,
    packagingCharge: 0,
    totalAmount: 120 * opts.quantity + 15,
    brokenEggsAdjusted: 0,
    brokenEggsDeductionAmount: 0,
    finalPayableAmount: 120 * opts.quantity + 15,
    deliveryAddress: {
      recipientName: opts.customer.name,
      phoneNumber: opts.customer.phoneNumber,
      flatPlotNumber: 'Flat 402',
      streetName: '5th Main',
      pincode: '560034',
      city: 'Bengaluru',
    },
    deliverySlot: 'MORNING_RUSH',
    scheduledDeliveryDate: new Date().toISOString().slice(0, 10),
    paymentMethod: opts.paymentMethod || 'CASH_ON_DELIVERY',
    paymentStatus: opts.podCollectedAmount ? 'COLLECTED' : 'PENDING',
    podCollectedAmount: opts.podCollectedAmount,
    upiTransactionRef: opts.upiTransactionRef,
    status: opts.status,
    assignedDeliveryPersonId: opts.driver?._id,
    assignedDeliveryPersonName: opts.driver?.name,
    assignedDeliveryPersonPhone: opts.driver?.phoneNumber,
    statusTimeline: [{ status: opts.status, timestamp: new Date() }],
    ...(opts.createdAt ? { createdAt: opts.createdAt, updatedAt: opts.createdAt } : {}),
  });
  createdOrderIds.push(order._id);
  return order;
};

const stockOf = async (productId: mongoose.Types.ObjectId) => {
  const p = await Product.findById(productId);
  return p?.currentStock ?? -1;
};

const run = async () => {
  console.log('===============================================');
  console.log('Order Cancellation & State Machine Regression');
  console.log('===============================================');

  await mongoose.connect(config.mongoUri);
  console.log(`[db] Connected to ${config.mongoUri}`);

  // --- Fixtures -------------------------------------------------------
  const customer = await User.findOne({ phoneNumber: '9876543210' });

  // Clean up any existing test user first
  await User.deleteOne({ phoneNumber: '9876549999' });
  const otherCustomer = await User.create({
    name: 'Other Customer',
    phoneNumber: '9876549999',
    role: 'CUSTOMER',
    savedAddresses: [],
    totalOrdersCount: 0,
    zeroCrackRating: 5,
  });
  const driver = await User.findOne({ phoneNumber: '9876500002' });
  const shopkeeperToken = await loginAs('9876500001', '1234', 'SHOPKEEPER');
  const driverToken = await loginAs('9876500002', '1234', 'DELIVERY_EXECUTIVE');

  assert(!!customer, 'seeded customer exists');
  assert(!!shopkeeperToken, 'shopkeeper can sign in');
  assert(!!driverToken, 'driver can sign in');

  const product = await createProductWithStock('Cancel Test White Eggs', 500);

  try {
    // ================================================================
    // TEST 1: Cancelling a CONFIRMED order restores exactly the right
    //          egg count to the right product.
    // ================================================================
    console.log('\nTest 1: Cancelling a CONFIRMED order releases stock...');
    const beforeConfirm = await stockOf(product._id);
    const confirmedOrder = await createOrderInState({
      customer,
      product,
      status: 'CONFIRMED',
      quantity: 2,
      eggs: 24,
    });
    // Simulate the confirmed lock: stock was decremented at confirm time.
    await Product.updateOne(
      { _id: product._id },
      { $inc: { currentStock: -24 }, $set: { isLowStockAlertSent: false } }
    );
    const stockAfterLock = await stockOf(product._id);
    assert(stockAfterLock === beforeConfirm - 24, 'stock reflects the confirmed lock (500 -> 476)');

    const cancelRes = await post(
      `/orders/${confirmedOrder._id}/cancel`,
      { reason: 'Changed my mind' },
      shopkeeperToken
    );
    assert(cancelRes.status === 200, 'cancel of a CONFIRMED order succeeds');
    assert(
      cancelRes.body?.data?.status === 'CANCELLED',
      'the order is now CANCELLED'
    );

    const stockAfterCancel = await stockOf(product._id);
    assert(
      stockAfterCancel === beforeConfirm,
      `stock is fully released back (${stockAfterLock} -> ${stockAfterCancel}, expected ${beforeConfirm})`
    );
    assert(
      cancelRes.body?.data?.stockReleased === true,
      'the response reports that stock was released'
    );

    // ================================================================
    // TEST 2: Cancelling a PACKING order restores stock.
    // ================================================================
    console.log('\nTest 2: Cancelling a PACKING order releases stock...');
    const packingOrder = await createOrderInState({
      customer,
      product,
      status: 'PACKING',
      quantity: 3,
      eggs: 36,
    });
    await Product.updateOne(
      { _id: product._id },
      { $inc: { currentStock: -36 }, $set: { isLowStockAlertSent: false } }
    );
    const stockBeforePackingCancel = await stockOf(product._id);

    const packingCancel = await post(
      `/orders/${packingOrder._id}/cancel`,
      { reason: 'Shop could not pack in time' },
      shopkeeperToken
    );
    assert(packingCancel.status === 200, 'cancel of a PACKING order succeeds');
    const stockAfterPackingCancel = await stockOf(product._id);
    assert(
      stockAfterPackingCancel === stockBeforePackingCancel + 36,
      `stock is released for a packed order (${stockBeforePackingCancel} -> ${stockAfterPackingCancel})`
    );
    assert(
      typeof packingCancel.body?.data?.note === 'string' &&
        packingCancel.body.data.note.toLowerCase().includes('packed'),
      'a note records that the packed eggs returned to the shelf'
    );

    // ================================================================
    // TEST 3: Cancelling an OUT_FOR_DELIVERY order releases stock AND
    //          flags the order for egg return on the driver run sheet.
    // ================================================================
    console.log('\nTest 3: Cancelling an OUT_FOR_DELIVERY order releases stock and flags egg return...');
    const ofdOrder = await createOrderInState({
      customer,
      product,
      status: 'OUT_FOR_DELIVERY',
      quantity: 1,
      eggs: 12,
      driver,
    });
    await Product.updateOne(
      { _id: product._id },
      { $inc: { currentStock: -12 }, $set: { isLowStockAlertSent: false } }
    );
    const stockBeforeOfdCancel = await stockOf(product._id);

    const ofdCancel = await post(
      `/orders/${ofdOrder._id}/cancel`,
      { reason: 'Customer unreachable' },
      shopkeeperToken
    );
    assert(ofdCancel.status === 200, 'cancel of an OUT_FOR_DELIVERY order succeeds');
    const stockAfterOfdCancel = await stockOf(product._id);
    assert(
      stockAfterOfdCancel === stockBeforeOfdCancel + 12,
      `stock is released for an out-for-delivery order (${stockBeforeOfdCancel} -> ${stockAfterOfdCancel})`
    );
    assert(
      ofdCancel.body?.data?.requiresEggReturn === true,
      'the order is flagged as requiring the driver to return the eggs'
    );

    // The driver's run sheet must show it as cancelled-with-eggs-to-return.
    const runSheet = await fetch(`${API_BASE}/depots/driver/run-sheet`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    const runSheetBody = await runSheet.json();
    const flagged = (runSheetBody.data || []).find(
      (o: any) => String(o._id) === String(ofdOrder._id)
    );
    assert(!!flagged, 'the cancelled order still appears on the driver run sheet');
    assert(
      flagged?.status === 'CANCELLED',
      'the run sheet shows it as CANCELLED'
    );
    assert(
      flagged?.requiresEggReturn === true,
      'the run sheet flags it as eggs-to-return'
    );

    // ================================================================
    // TEST 4: Cancelling a DELIVERED order does NOT restore stock and
    //          DOES record a refund owed.
    // ================================================================
    console.log('\nTest 4: Cancelling a DELIVERED order records a refund owed without restoring stock...');
    const deliveredOrder = await createOrderInState({
      customer,
      product,
      status: 'DELIVERED',
      quantity: 1,
      eggs: 12,
      driver,
      paymentMethod: 'UPI_ON_DELIVERY',
      podCollectedAmount: 135,
      upiTransactionRef: 'UPI_TEST_REV_001',
    });
    await Product.updateOne(
      { _id: product._id },
      { $inc: { currentStock: -12 }, $set: { isLowStockAlertSent: false } }
    );
    const stockBeforeDeliveredCancel = await stockOf(product._id);

    const deliveredCancel = await post(
      `/orders/${deliveredOrder._id}/cancel`,
      { reason: 'Customer reported spoilage' },
      shopkeeperToken
    );
    assert(deliveredCancel.status === 200, 'cancel of a DELIVERED order succeeds');
    const stockAfterDeliveredCancel = await stockOf(product._id);
    assert(
      stockAfterDeliveredCancel === stockBeforeDeliveredCancel,
      `stock is NOT restored for a delivered order (${stockBeforeDeliveredCancel} -> ${stockAfterDeliveredCancel})`
    );
    assert(
      deliveredCancel.body?.data?.refundOwed === true,
      'the order records that a refund is owed'
    );
    assert(
      deliveredCancel.body?.data?.refundAmount === 135,
      'the refund amount is the amount collected (135)'
    );
    assert(
      deliveredCancel.body?.data?.upiTransactionRef === 'UPI_TEST_REV_001',
      'the UPI transaction reference is recorded so the owner can reverse it'
    );

    // The owner must be able to see refunds owed.
    const history = await fetch(`${API_BASE}/orders?status=ALL`, {
      headers: { Authorization: `Bearer ${shopkeeperToken}` },
    });
    const historyBody = await history.json();
    const refundRow = (historyBody.data || []).find(
      (o: any) => String(o._id) === String(deliveredOrder._id)
    );
    assert(!!refundRow, 'the refunded order appears in the admin order history');
    assert(
      refundRow?.refundOwed === true,
      'the admin order history shows the refund-owed flag'
    );

    // ================================================================
    // TEST 5: A random customer cannot cancel someone else's order.
    // ================================================================
    console.log('\nTest 5: A customer cannot cancel another customer\'s order...');
    const victimOrder = await createOrderInState({
      customer,
      product,
      status: 'CONFIRMED',
      quantity: 1,
      eggs: 12,
    });
    await Product.updateOne(
      { _id: product._id },
      { $inc: { currentStock: -12 }, $set: { isLowStockAlertSent: false } }
    );
    const stockBeforeIntruder = await stockOf(product._id);

    const intruderToken = tokenFor(otherCustomer);
    assert(!!intruderToken, 'the other customer has an authenticated session');

    const intruderCancel = await post(
      `/orders/${victimOrder._id}/cancel`,
      { reason: 'not my order' },
      intruderToken
    );
    assert(
      intruderCancel.status === 403 || intruderCancel.status === 401,
      `cancelling someone else's order is refused (got ${intruderCancel.status})`
    );
    const stockAfterIntruder = await stockOf(product._id);
    assert(
      stockAfterIntruder === stockBeforeIntruder,
      'the refused cancellation did not touch stock'
    );
    const victim = await Order.findById(victimOrder._id);
    assert(
      victim?.status === 'CONFIRMED',
      'the victim order is still CONFIRMED'
    );

    // The order's OWN customer may cancel it.
    const ownerToken = tokenFor(customer);
    assert(!!ownerToken, 'the order owner has an authenticated session');
    const selfCancel = await post(
      `/orders/${victimOrder._id}/cancel`,
      { reason: 'mine, I cancel' },
      ownerToken
    );
    assert(selfCancel.status === 200, "the order's own customer CAN cancel it");

    // ================================================================
    // TEST 6: Cancelling twice must NOT restore stock twice.
    // ================================================================
    console.log('\nTest 6: A second cancel is rejected and does not double-release stock...');
    const twiceOrder = await createOrderInState({
      customer,
      product,
      status: 'CONFIRMED',
      quantity: 2,
      eggs: 24,
    });
    await Product.updateOne(
      { _id: product._id },
      { $inc: { currentStock: -24 }, $set: { isLowStockAlertSent: false } }
    );
    const stockBeforeTwice = await stockOf(product._id);

    const firstCancel = await post(
      `/orders/${twiceOrder._id}/cancel`,
      { reason: 'first' },
      shopkeeperToken
    );
    assert(firstCancel.status === 200, 'the first cancel succeeds');
    const stockAfterFirst = await stockOf(product._id);

    const secondCancel = await post(
      `/orders/${twiceOrder._id}/cancel`,
      { reason: 'second' },
      shopkeeperToken
    );
    assert(
      secondCancel.status === 409 || secondCancel.status === 400,
      `the second cancel is rejected (got ${secondCancel.status})`
    );
    const stockAfterSecond = await stockOf(product._id);
    assert(
      stockAfterSecond === stockAfterFirst,
      `stock is not released twice (${stockAfterFirst} -> ${stockAfterSecond})`
    );

    // ================================================================
    // TEST 7: A PLACED order older than 2 hours is auto-cancelled.
    // ================================================================
    console.log('\nTest 7: The 2-hour auto-cancel sweep releases stale PLACED orders...');
    const stalePlaced = await createOrderInState({
      customer,
      product,
      status: 'PLACED',
      quantity: 1,
      eggs: 12,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours old
    });
    const freshPlaced = await createOrderInState({
      customer,
      product,
      status: 'PLACED',
      quantity: 1,
      eggs: 12,
      createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes old
    });

    const swept = await OrderService.sweepStalePlacedOrders();
    assert(
      swept.cancelledCount >= 1,
      `the sweep cancelled at least one stale order (cancelled ${swept.cancelledCount})`
    );

    const sweptOrder = await Order.findById(stalePlaced._id);
    assert(
      sweptOrder?.status === 'CANCELLED',
      'the 3-hour-old PLACED order is now CANCELLED'
    );
    const freshOrder = await Order.findById(freshPlaced._id);
    assert(
      freshOrder?.status === 'PLACED',
      'the 5-minute-old PLACED order is untouched'
    );

    // ================================================================
    // TEST 8: The state machine transitions exist.
    // ================================================================
    console.log('\nTest 8: PLACED -> CONFIRMED -> PACKING -> READY_FOR_DELIVERY transitions...');
    const machineOrder = await createOrderInState({
      customer,
      product,
      status: 'PLACED',
      quantity: 1,
      eggs: 12,
    });

    const confirmRes = await post(
      `/orders/${machineOrder._id}/confirm`,
      {},
      shopkeeperToken
    );
    assert(confirmRes.status === 200, 'PLACED -> CONFIRMED succeeds');
    const afterConfirm = await Order.findById(machineOrder._id);
    assert(afterConfirm?.status === 'CONFIRMED', 'the order is CONFIRMED');

    const packingRes = await post(
      `/orders/${machineOrder._id}/packing`,
      {},
      shopkeeperToken
    );
    assert(packingRes.status === 200, 'CONFIRMED -> PACKING succeeds');
    const afterPacking = await Order.findById(machineOrder._id);
    assert(afterPacking?.status === 'PACKING', 'the order is PACKING');

    const readyRes = await post(
      `/orders/${machineOrder._id}/ready`,
      {},
      shopkeeperToken
    );
    assert(readyRes.status === 200, 'PACKING -> READY_FOR_DELIVERY succeeds');
    const afterReady = await Order.findById(machineOrder._id);
    assert(
      afterReady?.status === 'READY_FOR_DELIVERY',
      'the order is READY_FOR_DELIVERY'
    );

    // An invalid transition must be refused.
    const badTransition = await post(
      `/orders/${machineOrder._id}/packing`,
      {},
      shopkeeperToken
    );
    assert(
      badTransition.status === 409 || badTransition.status === 400,
      `an invalid transition is refused (got ${badTransition.status})`
    );

    // A customer must not be able to drive the shop's packing transitions.
    const customerPacking = await post(
      `/orders/${machineOrder._id}/packing`,
      {},
      ownerToken
    );
    assert(
      customerPacking.status === 403,
      `a customer cannot start packing (got ${customerPacking.status})`
    );
  } finally {
    // Cleanup — only the exact documents this run created.
    if (createdOrderIds.length > 0) {
      await Order.deleteMany({ _id: { $in: createdOrderIds } });
    }
    await Product.deleteOne({ _id: product._id });
    await User.deleteOne({ _id: otherCustomer._id });
    await mongoose.disconnect();
  }

  console.log('\n===============================================');
  console.log(`RESULT: ${passCount} passed, ${failCount} failed`);
  console.log('===============================================');
  if (failCount > 0) process.exitCode = 1;
};

run().catch((error) => {
  console.error('Cancellation test failure:', error);
  process.exit(1);
});
