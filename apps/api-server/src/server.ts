import mongoose from 'mongoose';
import { createApp } from './app';
import { config } from './config';
import { startPlacedOrderSweep } from './services/OrderService';

const startServer = async () => {
  try {
    console.log(`[Database] Connecting to MongoDB at ${config.mongoUri}...`);
    await mongoose.connect(config.mongoUri);
    console.log('[Database] Connected to MongoDB successfully.');

    const app = createApp();

    // Sweep PLACED orders that were never confirmed, so a stale request does
    // not sit in the day's plan indefinitely. No external service needed.
    startPlacedOrderSweep();

    app.listen(config.port, () => {
      console.log(`=========================================`);
      console.log(`🚀 Ovovita Farm-to-Table API Server Live`);
      console.log(`📡 Listening on: http://localhost:${config.port}`);
      console.log(`🌱 Environment: ${config.nodeEnv}`);
      console.log(`=========================================`);
    });
  } catch (error) {
    console.error('[Startup Error] Failed to start Ovovita server:', error);
    process.exit(1);
  }
};

startServer();
