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

const isProduction = (process.env.NODE_ENV || '').trim() === 'production';

/**
 * Refuses to boot in production without a real JWT secret.
 *
 * The development fallback below is committed to the repository, so a
 * production host that forgets `JWT_SECRET` would otherwise mint tokens that
 * anyone could forge — including tokens claiming `SYSTEM_ADMIN`. Failing
 * loudly at startup is the only safe behaviour.
 */
const resolveJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim().length >= 32) return secret;
  if (isProduction) {
    throw new Error(
      '[Config] JWT_SECRET is missing or too short. ' +
        'Set a random secret of at least 32 characters before starting in production.'
    );
  }
  return 'ovovita-super-secure-jwt-secret-farm-direct-2026';
};

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ovovita',
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174').split(','),

  /**
   * Opt-in switch for the fixed demo OTP code (`123456`).
   *
   * This is OFF unless explicitly enabled, so a production host that forgets
   * `NODE_ENV=production` cannot fall back to accepting a publicly known OTP
   * for every customer account. Demo mode is turned on by setting
   * `ALLOW_DEMO_OTP=true` (the seeded local environment does this).
   */
  allowDemoOtp: (process.env.ALLOW_DEMO_OTP || '').trim().toLowerCase() === 'true',

  // UPI
  upiMerchantVpa: process.env.UPI_MERCHANT_VPA || 'ovovita.depot@okhdfcbank',
  upiMerchantName: process.env.UPI_MERCHANT_NAME || 'Ovovita Fresh Farms',

  // Meta WhatsApp Cloud API
  metaWhatsAppToken: process.env.META_WHATSAPP_TOKEN || '',
  metaPhoneNumberId: process.env.META_PHONE_NUMBER_ID || '',
  metaWebhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || 'ovovita_meta_challenge_secret_2026',
  /** App secret used to verify Meta's `X-Hub-Signature-256` on inbound webhooks. */
  metaAppSecret: process.env.META_APP_SECRET || '',

  // Email SMTP
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  emailFrom: process.env.EMAIL_FROM || '',

  defaultDepotCode: 'KOR-DEPOT-01',
};
