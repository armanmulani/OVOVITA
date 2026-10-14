import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from './config';
import { Depot } from './models/Depot';
import { User } from './models/User';
import { Product } from './models/Product';
import { Order } from './models/Order';

export const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);

    console.log('[Seed] Cleaning old demo collections...');
    await Promise.all([
      Depot.deleteMany({}),
      User.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
    ]);

    // 1. Create Koramangala Central Depot
    console.log('[Seed] Creating Koramangala Central Depot...');
    const depot = await Depot.create({
      code: 'KOR-DEPOT-01',
      name: 'Depot Hub • Koramangala',
      contactPerson: 'Amit Patel',
      contactPhone: '+91 98765 00001',
      address: 'Plot 18, 5th Block Industrial Area, Koramangala, Bengaluru - 560034',
      servicedPincodes: ['560034', '560095', '560068', '560038', '560076', '560102'],
      location: {
        type: 'Point',
        coordinates: [77.6245, 12.9352], // Koramangala
      },
      isActive: true,
      openingTime: '05:30',
      closingTime: '21:00',
    });

    // 2. Create Staff & Customer Accounts
    console.log('[Seed] Creating demo users...');
    const defaultPinHash = await bcrypt.hash('1234', 10);

    // Customer
    const customer = await User.create({
      name: 'Rahul Sharma',
      phoneNumber: '9876543210',
      email: 'rahul.sharma@gmail.com',
      role: 'CUSTOMER',
      totalOrdersCount: 28,
      zeroCrackRating: 5.0,
      savedAddresses: [
        {
          id: 'addr_kor_1',
          tag: 'HOME',
          recipientName: 'Rahul Sharma',
          phoneNumber: '9876543210',
          flatPlotNumber: 'Flat 402',
          apartmentName: 'Silver Oak Heights',
          streetName: '5th Main, 4th Block, Koramangala',
          landmark: 'Near Wipro Park',
          pincode: '560034',
          city: 'Bengaluru',
          gateSecurityInstructions: 'Leave with security guard if not answering bell',
          latitude: 12.9342,
          longitude: 77.6255,
          isDefault: true,
        },
      ],
    });

    // Depot Shopkeeper Lead
    const shopkeeper = await User.create({
      name: 'Amit Patel',
      phoneNumber: '9876500001',
      role: 'SHOPKEEPER',
      pinHash: defaultPinHash,
      depotId: depot._id,
    });

    // Delivery Executive (Ramesh Kumar)
    const driver = await User.create({
      name: 'Ramesh Kumar',
      phoneNumber: '9876500002',
      role: 'DELIVERY_EXECUTIVE',
      pinHash: defaultPinHash,
      depotId: depot._id,
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCiVJHmHFBcwwdaSPnHs7D2D75fr_Ag_QVY7qTEbLWl257zlvb1-RWr65s79p2A8wb_o4jG_3zd0pWY7Q1BKNF3z-3rVMfJB2T4-ID2tZDP-oYYhhPJYiz5aOnslx1HNaj_3zebTrlxz24TVcAWBDrFvQSoqTKuOjQYQ49UHho-09wY2-vqiU1zqxspoqWFOZQYDwlturhGc0b5vcavMOUeZHZYgxMp1qsXjeqiRdqejas-j1MQx_RWQQ',
    });

    // System Admin
    await User.create({
      name: 'Ovovita Core Admin',
      phoneNumber: '9876500000',
      role: 'SYSTEM_ADMIN',
      pinHash: defaultPinHash,
    });

    // 3. Create Products matching UI mockups
    console.log('[Seed] Seeding fresh egg products...');
    const desiProduct = await Product.create({
      name: 'Free-Range Desi Eggs',
      type: 'DESI',
      description: 'Pasture-raised native Desi hen eggs with rich golden yolks. Antibiotic-free & high lutein.',
      heroImageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=600&q=80',
      farmOriginName: 'Mandya Organic Pasture Farm',
      laidTimestampText: 'Laid sunrise today (06:15 AM)',
      isCandlingPassed: true,
      currentStock: 45, // Critical low stock (triggers UI banner in Admin mockup)
      lowStockThreshold: 100,
      isLowStockAlertSent: true,
      status: 'ACTIVE',
      tags: ['Free-Range', 'Rich Yolk', 'No Antibiotics'],
      unitPricing: [
        { unit: 'SINGLE', unitQty: 1, label: 'Single Egg', price: 12.0 },
        { unit: 'DOZEN', unitQty: 12, label: '12-Egg Dozen', price: 138.0, savingsPercent: 4 },
        { unit: 'TRAY_30', unitQty: 30, label: '30-Egg Farm Tray', price: 330.0, savingsPercent: 8, isPopular: true },
      ],
    });

    const whiteProduct = await Product.create({
      name: 'Classic Farm White Eggs',
      type: 'WHITE',
      description: 'Farm-fresh table eggs cleaned, candled, and packed in shock-absorbing pulp trays.',
      heroImageUrl: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=600&q=80',
      farmOriginName: 'Chikkaballapur Direct Hatchery',
      laidTimestampText: 'Laid 6 hrs ago',
      isCandlingPassed: true,
      currentStock: 520,
      lowStockThreshold: 100,
      status: 'ACTIVE',
      tags: ['Zero-Crack', 'Daily Harvest'],
      unitPricing: [
        { unit: 'SINGLE', unitQty: 1, label: 'Single Egg', price: 7.0 },
        { unit: 'DOZEN', unitQty: 12, label: '12-Egg Dozen', price: 78.0, savingsPercent: 7 },
        { unit: 'TRAY_30', unitQty: 30, label: '30-Egg Molded Pulp Tray', price: 195.0, savingsPercent: 7, isPopular: true },
      ],
    });

    const brownProduct = await Product.create({
      name: 'Farm Brown Heritage Eggs',
      type: 'BROWN',
      description: 'Thick-shelled brown eggs with dense whites, ideal for poaching and high-heat morning baking.',
      heroImageUrl: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=600&q=80',
      farmOriginName: 'Hosur Valley Poultry Estate',
      laidTimestampText: 'Laid sunrise today',
      isCandlingPassed: true,
      currentStock: 380,
      lowStockThreshold: 100,
      status: 'ACTIVE',
      tags: ['Thick Shell', 'Zero Hormone'],
      unitPricing: [
        { unit: 'SINGLE', unitQty: 1, label: 'Single Egg', price: 8.5 },
        { unit: 'DOZEN', unitQty: 12, label: '12-Egg Dozen', price: 96.0, savingsPercent: 6 },
        { unit: 'TRAY_30', unitQty: 30, label: '30-Egg Farm Tray', price: 235.0, savingsPercent: 8, isPopular: true },
      ],
    });

    const omegaProduct = await Product.create({
      name: 'Organic Omega-3 Enriched Eggs',
      type: 'ORGANIC',
      description: 'Fed on organic flaxseed, marine algae, and herbal mash. High in DHA and natural Vitamin E.',
      heroImageUrl: 'https://images.unsplash.com/photo-1598965675045-45c5e72c7d05?auto=format&fit=crop&w=600&q=80',
      farmOriginName: 'Kolar Organic Farms',
      laidTimestampText: 'Laid sunrise today',
      isCandlingPassed: true,
      currentStock: 180,
      lowStockThreshold: 80,
      status: 'ACTIVE',
      tags: ['DHA Rich', 'Flaxseed Diet'],
      unitPricing: [
        { unit: 'SINGLE', unitQty: 1, label: 'Single Egg', price: 14.0 },
        { unit: 'DOZEN', unitQty: 12, label: '12-Egg Dozen', price: 160.0, savingsPercent: 5 },
        { unit: 'TRAY_30', unitQty: 30, label: '30-Egg Farm Tray', price: 390.0, savingsPercent: 7, isPopular: true },
      ],
    });

    // 4. Create Demo Active Out-For-Delivery Order matching Tracker screen (#EGG-20260829-0001)
    console.log('[Seed] Creating demo live tracking order...');
    await Order.create({
      orderNumber: 'EGG-20260829-0001',
      customerId: customer._id,
      customerName: 'Rahul Sharma',
      customerPhone: '9876543210',
      depotId: depot._id,
      items: [
        {
          productId: whiteProduct._id,
          productName: whiteProduct.name,
          eggType: whiteProduct.type,
          unit: 'TRAY_30',
          unitQty: 30,
          quantity: 1,
          totalEggsCount: 30,
          priceAtPurchase: 195.0,
          lineTotal: 195.0,
        },
      ],
      subtotal: 195.0,
      deliveryCharge: 0,
      packagingCharge: 0,
      totalAmount: 195.0,
      brokenEggsAdjusted: 0,
      brokenEggsDeductionAmount: 0,
      finalPayableAmount: 195.0,
      deliveryAddress: customer.savedAddresses[0],
      deliverySlot: 'MORNING_RUSH',
      scheduledDeliveryDate: new Date().toISOString().slice(0, 10),
      paymentMethod: 'UPI_ON_DELIVERY',
      paymentStatus: 'PENDING',
      status: 'OUT_FOR_DELIVERY',
      assignedDeliveryPersonId: driver._id,
      assignedDeliveryPersonName: driver.name,
      assignedDeliveryPersonPhone: driver.phoneNumber,
      vehiclePlateNumber: 'KA-01-EQ-9872',
      estimatedDeliveryTime: '14 mins',
      statusTimeline: [
        { status: 'PLACED', timestamp: new Date(Date.now() - 45 * 60000), note: 'Placed Today, 6:45 AM' },
        { status: 'CONFIRMED', timestamp: new Date(Date.now() - 40 * 60000), note: 'Candling & molded tray assigned' },
        { status: 'PACKING', timestamp: new Date(Date.now() - 30 * 60000), note: 'Quality seal applied at Koramangala Depot' },
        { status: 'OUT_FOR_DELIVERY', timestamp: new Date(Date.now() - 15 * 60000), note: 'Handed to Ramesh Kumar (KA-01-EQ-9872)' },
      ],
    });

    console.log('[Seed] Database seeded successfully!');
    console.log('--- Demo Logins ---');
    console.log('Customer Phone: 9876543210 (OTP: 123456)');
    console.log('Shopkeeper Phone: 9876500001 (PIN: 1234)');
    console.log('Delivery Executive Phone: 9876500002 (PIN: 1234)');
    console.log('Admin Phone: 9876500000 (PIN: 1234)');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}
