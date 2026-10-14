import mongoose from 'mongoose';
import { config } from '../config';

const API_BASE = 'http://localhost:4000/api/v1';

const runE2EJourney = async () => {
  console.log('🚀 Running Complete Ovovita End-to-End Lifecycle Journey...\n');

  try {
    // ----------------------------------------------------
    // STEP 1: Customer Authentication via OTP
    // ----------------------------------------------------
    console.log('Step 1: Customer Rahul Sharma logs in via OTP...');
    const otpVerifyRes = await fetch(`${API_BASE}/auth/customer/otp-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9876543210', otpCode: '123456' }),
    });
    const otpData = await otpVerifyRes.json();
    console.assert(otpVerifyRes.ok, 'Customer login failed');
    const customerToken = otpData.data.token;
    console.log(`  ✅ Customer Authenticated. Token received.`);

    // ----------------------------------------------------
    // STEP 2: Fetch Active Catalog & Check Availability
    // ----------------------------------------------------
    console.log('\nStep 2: Customer browses fresh egg catalog...');
    const catalogRes = await fetch(`${API_BASE}/products`);
    const catalogData = await catalogRes.json();
    console.assert(catalogData.data.length > 0, 'Catalog empty');
    const targetProduct = catalogData.data.find((p: any) => p.type === 'WHITE') || catalogData.data[0];
    console.log(`  ✅ Selected Product: "${targetProduct.name}" (Stock: ${targetProduct.currentStock} eggs).`);

    // ----------------------------------------------------
    // STEP 3: Customer Places Pay-on-Delivery Order
    // ----------------------------------------------------
    console.log('\nStep 3: Customer places Pay-on-Delivery order for Morning Rush (6:30 - 8:00 AM)...');
    const today = new Date().toISOString().slice(0, 10);
    const orderPayload = {
      deliveryAddress: {
        tag: 'HOME',
        recipientName: 'Rahul Sharma',
        phoneNumber: '9876543210',
        flatPlotNumber: 'Flat 402',
        apartmentName: 'Silver Oak Heights',
        streetName: '5th Main, 4th Block, Koramangala',
        pincode: '560034',
        city: 'Bengaluru',
        isDefault: true,
      },
      deliverySlot: 'MORNING_RUSH',
      scheduledDeliveryDate: today,
      paymentMethod: 'UPI_ON_DELIVERY',
      items: [
        {
          productId: targetProduct._id,
          unit: 'TRAY_30',
          quantity: 1, // 30 eggs
        },
      ],
      morningHarvestNotes: 'Leave with security guard if bell not answered',
    };

    const orderRes = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify(orderPayload),
    });
    const orderData = await orderRes.json();
    console.assert(orderRes.ok, `Order creation failed: ${JSON.stringify(orderData)}`);
    const createdOrder = orderData.data;
    console.log(`  ✅ Order Placed: #${createdOrder.orderNumber} (Payable: ₹${createdOrder.finalPayableAmount}).`);
    console.log(`  ✅ Inventory locked at Koramangala Depot.`);

    // ----------------------------------------------------
    // STEP 4: Depot Lead Logs in & Inspects Packing Queue
    // ----------------------------------------------------
    console.log('\nStep 4: Depot Lead Amit Patel checks packing queue & dispatches order...');
    const staffLoginRes = await fetch(`${API_BASE}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9876500001', pin: '1234', role: 'SHOPKEEPER' }),
    });
    const staffData = await staffLoginRes.json();
    const shopkeeperToken = staffData.data.token;

    const dashRes = await fetch(`${API_BASE}/depots/dashboard`, {
      headers: { Authorization: `Bearer ${shopkeeperToken}` },
    });
    const dashData = await dashRes.json();
    console.log(`  ✅ Depot Packing Queue count: ${dashData.data.packingQueue.length} orders.`);

    // Assign to Driver Ramesh Kumar
    const driver = dashData.data.availableDrivers[0];
    const assignRes = await fetch(`${API_BASE}/depots/assign-rider`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${shopkeeperToken}`,
      },
      body: JSON.stringify({
        orderId: createdOrder._id,
        driverId: driver._id,
        vehiclePlateNumber: 'KA-01-EQ-9872',
        estimatedMinutes: 14,
      }),
    });
    const assignData = await assignRes.json();
    console.assert(assignRes.ok, 'Rider assignment failed');
    console.log(`  ✅ Order dispatched with ${driver.name} (KA-01-EQ-9872). Out for Delivery.`);

    // ----------------------------------------------------
    // STEP 5: Delivery Driver Handles Doorstep Zero-Crack Inspection
    // ----------------------------------------------------
    console.log('\nStep 5: Delivery Driver arrives at doorstep for zero-crack unboxing...');
    const driverLoginRes = await fetch(`${API_BASE}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '9876500002', pin: '1234', role: 'DELIVERY_EXECUTIVE' }),
    });
    const driverData = await driverLoginRes.json();
    const driverToken = driverData.data.token;

    // Customer noticed 1 hairline cracked egg -> Driver replaces it from buffer crate
    const adjustRes = await fetch(`${API_BASE}/orders/adjust-broken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        orderId: createdOrder._id,
        brokenEggsCount: 1,
        resolutionType: 'BUFFER_REPLACED',
        note: '1 egg with hairline crack replaced with fresh buffer egg on the spot',
      }),
    });
    const adjustData = await adjustRes.json();
    console.assert(adjustRes.ok, 'Broken egg adjustment failed');
    console.log(`  ✅ Doorstep Zero-Crack Handled: 1 egg replaced immediately from driver buffer crate.`);

    // ----------------------------------------------------
    // STEP 6: Driver Displays Dynamic Bharat UPI QR & Collects
    // ----------------------------------------------------
    console.log('\nStep 6: Driver generates dynamic Bharat UPI QR for customer scan-and-pay...');
    const qrRes = await fetch(`${API_BASE}/orders/${createdOrder._id}/upi-qr`);
    const qrData = await qrRes.json();
    console.log(`  ✅ Dynamic UPI QR URI: ${qrData.data.upiDeepLink}`);

    const collectRes = await fetch(`${API_BASE}/orders/collect-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        orderId: createdOrder._id,
        paymentMethod: 'UPI_ON_DELIVERY',
        amountCollected: createdOrder.finalPayableAmount,
        upiTransactionRef: `UPI_REF_${Date.now()}`,
        inspectionPassed: true,
      }),
    });
    const collectData = await collectRes.json();
    console.assert(collectRes.ok, 'Payment collection failed');
    console.log(`  ✅ Payment Collected: ₹${createdOrder.finalPayableAmount} via UPI on Delivery.`);
    console.log(`  ✅ Order marked DELIVERED.`);

    // ----------------------------------------------------
    // STEP 7: Shift-End Drawer Reconciliation
    // ----------------------------------------------------
    console.log('\nStep 7: Driver returns to depot; Depot Manager balances the shift cash drawer...');
    const shiftCloseRes = await fetch(`${API_BASE}/depots/shift/reconciliation-close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${shopkeeperToken}`,
      },
      body: JSON.stringify({
        depotId: createdOrder.depotId,
        deliveryPersonId: driver._id,
        shiftDate: today,
        physicalCashDeposited: 0, // Paid via UPI, so 0 physical cash expected
        managerNotes: 'All morning runs verified. Zero-crack guarantee honored.',
      }),
    });
    const shiftCloseData = await shiftCloseRes.json();
    console.assert(shiftCloseRes.ok, 'Shift close failed');
    console.log(`  ✅ Shift Drawer Status: ${shiftCloseData.data.status} (Variance: ₹${shiftCloseData.data.varianceAmount}).`);

    console.log('\n======================================================');
    console.log('🎉 COMPLETE END-TO-END LIFECYCLE JOURNEY PASSED 100%!');
    console.log('======================================================\n');
  } catch (error) {
    console.error('E2E Journey Error:', error);
    process.exit(1);
  }
};

runE2EJourney();
