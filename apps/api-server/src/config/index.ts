import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

/**
 * Loads the environment file.
 *
 * `dotenv.config()` alone reads from the *current working directory*, and
 * that differs depending on how the server is started: `npm start` runs the
 * workspace with cwd = `apps/api-server/`, while `node apps/api-server/dist/server.js`
 * from the repo root has cwd = the repo root. The `.env` lives at the repo
 * root, so the cwd-relative lookup silently missed it and every value fell
 * back to its hardcoded default.
 *
 * Both locations are therefore tried explicitly, root first.
 */
const loadEnv = () => {
  // `__dirname` is `<repo>/apps/api-server/{src,dist}/config`, so four levels
  // up lands on the repo root where `.env` lives.
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
  const candidates = [
    path.join(repoRoot, '.env'),
    path.join(process.cwd(), '.env'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Config] Loaded environment from ${candidate}`);
      }
      return;
    }
  }

  console.warn(
    '[Config] No .env file found — falling back to built-in defaults. ' +
      'Set the variables explicitly in production.'
  );
};

loadEnv();

/**
 * Requires JWT_SECRET to be set via environment variable.
 *
 * No fallback or default secret is ever provided. The app will fail to
 * start immediately if JWT_SECRET is not configured, which is the only
 * safe behaviour. This eliminates the risk of tokens being forged with a
 * known/secret key that is committed to source control.
 */
const resolveJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      '[Config] JWT_SECRET is required and must be at least 32 characters. ' +
        'Set it in your .env file or environment.'
    );
  }
  return secret;
};

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ovovita',
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174').split(','),

  firebaseWebApiKey: process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY || '',

  // UPI
  upiMerchantVpa: process.env.UPI_MERCHANT_VPA || 'ovovita.depot@okhdfcbank',
  upiMerchantName: process.env.UPI_MERCHANT_NAME || 'Ovovita Fresh Farms',

  // Meta WhatsApp Cloud API
  metaWhatsAppToken: process.env.META_WHATSAPP_TOKEN || '',
  metaPhoneNumberId: process.env.META_PHONE_NUMBER_ID || '',
  metaWebhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || 'ovovita_meta_challenge_secret_2026',
  /** App secret used to verify Meta's `X-Hub-Signature-256` on inbound webhooks. */
  metaAppSecret: process.env.META_APP_SECRET || '',

  defaultDepotCode: 'KOR-DEPOT-01',
};
