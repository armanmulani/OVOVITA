import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import depotRoutes from './routes/depotRoutes';
import webhookRoutes from './routes/webhookRoutes';

export const createApp = () => {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'ovovita-api-server',
      version: '1.1.0',
      timestamp: new Date().toISOString(),
    });
  });

  // API V1 Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/depots', depotRoutes);
  app.use('/api/v1/webhooks', webhookRoutes);

  // 404 Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
    });
  });

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[API Error]', err);
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected server error occurred',
      },
    });
  });

  return app;
};
