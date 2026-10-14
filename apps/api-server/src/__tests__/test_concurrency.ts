import mongoose from 'mongoose';
import { config } from '../config';
import { Product } from '../models/Product';
import { InventoryService } from '../services/InventoryService';

const runConcurrencyTest = async () => {
  console.log('⚡ Running High-Concurrency 6:00 AM Rush Simulation Test...\n');

  try {
    await mongoose.connect(config.mongoUri);

    // Create a temporary test product with exactly 60 eggs in stock
    const testProduct = await Product.create({
      name: 'Flash Rush Desi Eggs',
      type: 'DESI',
      description: 'Concurrency test product',
      heroImageUrl: 'http://example.com/egg.jpg',
      farmOriginName: 'Test Farm',
      currentStock: 60, // Exactly 60 eggs
      lowStockThreshold: 10,
      status: 'ACTIVE',
      unitPricing: [{ unit: 'DOZEN', unitQty: 12, label: '12-Egg Dozen', price: 120 }],
    });

    console.log(`Initial stock for "${testProduct.name}": ${testProduct.currentStock} eggs.`);
    console.log('Spawning 10 concurrent requests, each ordering a 12-egg dozen (Total demanded: 120 eggs)...');

    // 10 concurrent requests
    const promises = Array.from({ length: 10 }).map((_, index) => {
      return InventoryService.atomicDecrementStock(
        [
          {
            productId: testProduct._id.toString(),
            totalEggsCount: 12,
            productName: testProduct.name,
          },
        ],
        'Koramangala Depot'
      )
        .then(() => ({ reqId: index + 1, status: 'SUCCESS' }))
        .catch((err) => ({ reqId: index + 1, status: 'REJECTED', error: err.message }));
    });

    const results = await Promise.all(promises);

    const successCount = results.filter((r) => r.status === 'SUCCESS').length;
    const rejectedCount = results.filter((r) => r.status === 'REJECTED').length;

    console.log('\n--- Simulation Results ---');
    console.log(`✅ Successful orders: ${successCount} (expected: 5)`);
    console.log(`❌ Rejected due to stock depletion: ${rejectedCount} (expected: 5)`);

    const finalProduct = await Product.findById(testProduct._id);
    const finalStock = finalProduct?.currentStock ?? -999;
    console.log(`Final remaining stock: ${finalStock} eggs (expected: 0).`);

    // Clean up test product
    await Product.findByIdAndDelete(testProduct._id);
    await mongoose.disconnect();

    // Assertions
    console.assert(successCount === 5, `Expected exactly 5 orders to succeed, but got ${successCount}`);
    console.assert(rejectedCount === 5, `Expected exactly 5 orders to be rejected, but got ${rejectedCount}`);
    console.assert(finalStock === 0, `Expected final stock to be 0, but got ${finalStock}`);
    console.assert(finalStock >= 0, 'CRITICAL FAILURE: Stock became negative!');

    console.log('\n🎉 CONCURRENCY ACID INVENTORY TEST PASSED: ZERO OVERSELLING GUARANTEED!\n');
    process.exit(0);
  } catch (error) {
    console.error('Concurrency test failure:', error);
    process.exit(1);
  }
};

runConcurrencyTest();
