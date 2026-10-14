import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ovovita',
  jwtSecret: process.env.JWT_SECRET || 'ovovita-super-secure-jwt-secret-farm-direct-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  metaWhatsAppToken: process.env.META_WHATSAPP_TOKEN || 'mock_meta_wa_token',
  metaPhoneNumberId: process.env.META_PHONE_NUMBER_ID || 'mock_phone_id',
  defaultDepotCode: 'KOR-DEPOT-01',
};
