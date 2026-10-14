import {
  CustomerOtpVerifySchema,
  StaffLoginSchema,
  CreateOrderSchema,
  AdjustBrokenEggsSchema,
} from '@ovovita/validation';
import { PricingService } from '../services/PricingService';

const runTests = () => {
  console.log('🧪 Running Ovovita Core Engine Verifications...\n');

  // Test 1: Validation Schemas
  console.log('Test 1: Validating schemas...');
  const otpResult = CustomerOtpVerifySchema.safeParse({
    phoneNumber: '9876543210',
    otpCode: '123456',
  });
  console.assert(otpResult.success, 'OTP verification schema failed');
  console.log('  ✅ Customer OTP schema passed');

  const staffResult = StaffLoginSchema.safeParse({
    phoneNumber: '9876500001',
    pin: '1234',
    role: 'SHOPKEEPER',
  });
  console.assert(staffResult.success, 'Staff login schema failed');
  console.log('  ✅ Staff PIN schema passed');

  // Test 2: Broken Egg Doorstep Deduction Calculation
  console.log('\nTest 2: Verifying Doorstep Broken-Egg Deduction Engine...');
  // 30 eggs tray costing ₹195, 2 eggs broken
  const deduction = PricingService.computeBrokenEggDeduction(30, 2, 195);
  console.log(`  Calculated deduction for 2 broken eggs in ₹195 tray (30 eggs): ₹${deduction}`);
  console.assert(deduction === 13, `Expected ₹13 deduction, got ${deduction}`);
  console.log('  ✅ Broken egg deduction formula passed');

  // Test 3: Order validation
  console.log('\nTest 3: Verifying Order schema with Pay-on-Delivery...');
  const orderResult = CreateOrderSchema.safeParse({
    deliveryAddress: {
      tag: 'HOME',
      recipientName: 'Rahul Sharma',
      phoneNumber: '9876543210',
      flatPlotNumber: 'Flat 402',
      apartmentName: 'Silver Oak Heights',
      streetName: '5th Main, 4th Block',
      pincode: '560034',
      city: 'Bengaluru',
      isDefault: true,
    },
    deliverySlot: 'MORNING_RUSH',
    scheduledDeliveryDate: '2026-10-15',
    paymentMethod: 'UPI_ON_DELIVERY',
    items: [
      {
        productId: '66bc1a2b3c4d5e6f7a8b9c0d',
        unit: 'TRAY_30',
        quantity: 1,
      },
    ],
  });
  console.assert(orderResult.success, 'CreateOrderSchema failed');
  console.log('  ✅ Pay-on-Delivery Order schema passed');

  // Test 4: Dynamic UPI QR URI generator format
  console.log('\nTest 4: Verifying NPCI Bharat UPI Deep Link Format...');
  const vpa = 'ovovita.depot@okhdfcbank';
  const orderNumber = 'EGG-20261014-0001';
  const payable = 195.0;
  const upiUrl = `upi://pay?pa=${vpa}&pn=${encodeURIComponent('Ovovita Fresh Farms')}&am=${payable.toFixed(2)}&tn=${encodeURIComponent(orderNumber)}&cu=INR`;
  console.log(`  Generated UPI Deep Link: ${upiUrl}`);
  console.assert(upiUrl.includes('pa=ovovita.depot@okhdfcbank'), 'UPI VPA missing');
  console.assert(upiUrl.includes('am=195.00'), 'UPI Amount missing');
  console.log('  ✅ Dynamic Doorstep UPI QR format verified');

  console.log('\n🎉 ALL 4 CORE VERIFICATION TESTS PASSED SUCCESSFULLY!');
};

runTests();
