import { config } from '../config';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// In-memory OTP store (replace with Redis in production if needed)
// Key: email, Value: { code, expiresAt, attempts }
const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

/**
 * Creates a Nodemailer transporter using Gmail SMTP.
 * Requires: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env
 */
function createTransporter() {
  const { smtpHost, smtpPort, smtpUser, smtpPass } = config;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    throw new Error('SMTP configuration missing. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env');
  }

  const port = typeof smtpPort === 'string' ? parseInt(smtpPort, 10) : smtpPort;

  return nodemailer.createTransport({
    host: smtpHost,
    port,
    secure: port === 465, // true for 465, false for 587
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

/**
 * Generates a random numeric OTP code.
 */
function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Sends OTP email to the customer.
 */
export async function sendEmailOtp(email: string): Promise<{ success: boolean; message: string }> {
  const code = generateOtp();
  const expiresAt = Date.now() + OTP_EXPIRY_MS;

  otpStore.set(email, { code, expiresAt, attempts: 0 });

  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: config.emailFrom || `Ovovita <${config.smtpUser}>`,
      to: email,
      subject: 'Your Ovovita Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #fef3c7; border-radius: 12px; padding: 24px; text-align: center;">
            <h1 style="color: #92400e; margin: 0 0 16px;">Ovovita</h1>
            <p style="color: #78350f; margin: 0 0 24px;">Farm-Direct Morning Harvest Eggs</p>
            <div style="background: #fff; border: 2px dashed #f59e0b; border-radius: 8px; padding: 16px;">
              <p style="color: #92400e; margin: 0 0 8px; font-size: 14px;">Your Verification Code</p>
              <p style="color: #111827; font-size: 32px; font-weight: 800; letter-spacing: 8px; margin: 0; font-family: monospace;">${code}</p>
            </div>
            <p style="color: #78350f; margin: 16px 0 0; font-size: 14px;">This code expires in 5 minutes. Do not share it with anyone.</p>
          </div>
          <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 16px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
      text: `Your Ovovita verification code is: ${code}. Valid for 5 minutes. Do not share.`,
    };

    await transporter.sendMail(mailOptions);

    if (config.nodeEnv !== 'production') {
      console.log(`[Email OTP] 📧 Code sent to ${email}: ${code} (dev mode - also logged)`);
    }

    return { success: true, message: 'OTP sent to your email' };
  } catch (error: any) {
    console.error('[Email OTP] Failed to send:', error?.message || error);
    otpStore.delete(email);
    return { success: false, message: 'Failed to send OTP. Please try again.' };
  }
}

/**
 * Verifies the OTP code for an email.
 */
export function verifyEmailOtp(email: string, inputCode: string): { success: boolean; message: string; user?: any } {
  const record = otpStore.get(email);

  if (!record) {
    return { success: false, message: 'OTP expired or not requested. Please request a new one.' };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(email);
    return { success: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
  }

  if (record.code !== inputCode) {
    record.attempts++;
    otpStore.set(email, record);
    return { success: false, message: 'Incorrect OTP. Please try again.' };
  }

  // Success - consume the OTP
  otpStore.delete(email);

  return {
    success: true,
    message: 'Email verified successfully',
    user: { email, emailVerified: true }
  };
}

/**
 * Clears expired OTPs periodically (call on startup or via cron).
 */
export function cleanupExpiredOtps(): void {
  const now = Date.now();
  for (const [email, record] of otpStore.entries()) {
    if (now > record.expiresAt) {
      otpStore.delete(email);
    }
  }
}

// Cleanup every 10 minutes
setInterval(cleanupExpiredOtps, 10 * 60 * 1000).unref();