import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ovovita',
  jwtSecret: process.env.JWT_SECRET || 'ovovita-super-secure-jwt-secret-farm-direct-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174').split(','),
  
  // UPI
  upiMerchantVpa: process.env.UPI_MERCHANT_VPA || 'ovovita.depot@okhdfcbank',
  upiMerchantName: process.env.UPI_MERCHANT_NAME || 'Ovovita Fresh Farms',

  // Meta WhatsApp Cloud API
  metaWhatsAppToken: process.env.META_WHATSAPP_TOKEN || '',
  metaPhoneNumberId: process.env.META_PHONE_NUMBER_ID || '',
  metaWebhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || 'ovovita_meta_challenge_secret_2026',
  
  defaultDepotCode: 'KOR-DEPOT-01',
};
