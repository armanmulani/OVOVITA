import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import depotRoutes from './routes/depotRoutes';
import webhookRoutes from './routes/webhookRoutes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swaggerSpec';
import { config } from './config';

/**
 * Captures the raw request body for the Meta webhook.
 *
 * Meta's `X-Hub-Signature-256` is an HMAC over the exact bytes that were
 * sent. Once `express.json()` parses the body, re-serialising it can change
 * key order or whitespace and the signature will no longer match, so the
 * raw bytes are stashed here while they are still intact.
 */
const captureRawBody = (req: Request, _res: Response, buf: Buffer) => {
  (req as Request & { rawBody?: Buffer }).rawBody = buf;
};

export const createApp = () => {
  const app = express();

  // Middleware
  //
  // CORS is restricted to the configured frontend origins. The previous
  // `cors()` call reflected every origin, which would let any site on the
  // internet call this API from a victim's browser.
  app.use(
    cors({
      origin: config.corsAllowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  );

  // The Meta webhook signature is computed over the RAW request body, so the
  // body must be captured before `express.json()` parses it.
  app.use('/api/v1/webhooks', express.json({ verify: captureRawBody }));
  app.use(express.json());

  // Interactive OpenAPI / Swagger Documentation
  app.use('/api/v1/docs', ...(swaggerUi.serve as any), swaggerUi.setup(swaggerSpec) as any);

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'ovovita-api-server',
      version: '1.1.0',
      timestamp: new Date().toISOString(),
      docs: '/api/v1/docs',
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
    console.error('[API Error]', err?.message || String(err));
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
