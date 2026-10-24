import { betterAuth } from 'better-auth';
import { phoneNumber } from 'better-auth/plugins';
import { mongooseAdapter } from './better-auth-adapter';
import { createOtpVerifier } from './otpVerifier';
import { config } from './index';
import type { BetterAuthOptions } from 'better-auth';

/**
 * Normalises a phone number to the E.164 format Better Auth expects.
 *
 * The mobile app sends a bare 10-digit Indian number; Better Auth's
 * `phoneNumber` plugin stores and compares the exact string it is given, so
 * the same canonical form must be used for both `sendPhoneNumberOTP` and
 * `verifyPhoneNumber` or verification will never match.
 */
export const toE164 = (phoneNumber: string, defaultCountryCode = '+91'): string => {
  if (!phoneNumber) return '';
  const cleaned = phoneNumber.trim().replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length === 10) return `${defaultCountryCode}${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `${defaultCountryCode}${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `${defaultCountryCode}${digits}`;
};

/**
 * Reduces a phone number to its bare 10-digit Indian national form.
 *
 * This is the canonical form the Ovovita `User` collection stores (the seed
 * writes `9876543210`, and staff log in with `9876500001`). Better Auth, by
 * contrast, keys on the E.164 form `+919876543210`. Any lookup that has to
 * bridge the two identity systems has to compare them on this shared
 * national form, otherwise a customer seeded as `9876543210` is invisible to
 * an OTP login that arrives as `+919876543210`.
 */
export const toNationalNumber = (phoneNumber: string): string => {
  if (!phoneNumber) return '';
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith('091')) return digits.slice(3);
  return digits;
};

/**
 * Better Auth configuration.
 *
 * The `phoneNumber` plugin is the seam where the OTP delivery provider is
 * plugged in: its `sendOTP` hook is the only place an SMS is dispatched.
 *
 * `satisfies` (rather than a type annotation) is deliberate: it validates the
 * options against `BetterAuthOptions` while preserving the literal types of
 * the `plugins` array, so `auth.api.sendPhoneNumberOTP` and
 * `auth.api.verifyPhoneNumber` stay type-safe at the call site.
 */
export const betterAuthOptions = {
  database: mongooseAdapter(),

  /**
   * Secret used to sign Better Auth session tokens and cookies.
   * Falls back to the API server's JWT secret so a single secret is used
   * across the stack in development.
   */
  secret: process.env.BETTER_AUTH_SECRET || config.jwtSecret,

  baseURL: process.env.BETTER_AUTH_URL || `http://localhost:${config.port}`,

  /**
   * Better Auth expects the app origin for its origin/CSRF checks. The mobile
   * app and admin portal run on separate ports, so all of them are listed.
   */
  trustedOrigins: config.corsAllowedOrigins,

  emailAndPassword: {
    enabled: false,
  },

  user: {
    modelName: 'user',
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'CUSTOMER',
        input: false,
      },
    },
  },

  session: {
    modelName: 'session',
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },

  account: {
    modelName: 'account',
  },

  verification: {
    modelName: 'verification',
  },

  rateLimit: {
    modelName: 'rateLimit',
    enabled: false,
  },

  advanced: {
    /**
     * The mobile app and admin portal talk to this API over plain HTTP in
     * local development, where the Origin header does not match the API
     * origin. Disabling the default cookie/CSRF hardening keeps the phone OTP
     * flow usable in development; re-enable it behind HTTPS in production.
     */
    disableCSRFCheck: config.nodeEnv !== 'production',
    useSecureCookies: config.nodeEnv === 'production',
  },

  plugins: [
    phoneNumber({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 5,
      requireVerification: true,

      /**
       * Validates the number before an OTP is generated. Indian mobile
       * numbers are 10 digits and start with 6-9.
       */
      phoneNumberValidator: (phoneNumber: string) => /^\+91[6-9]\d{9}$/.test(phoneNumber),

      /**
       * Verifies the OTP code.
       *
       * Better Auth replaces its own verification logic entirely when a
       * `verifyOTP` hook is registered, so `createOtpVerifier` reimplements
       * it: it accepts the real SMS-delivered code, enforces expiry and
       * attempt limits, and consumes the row so an OTP is single-use.
       *
       * Outside production it additionally accepts the fixed demo code
       * (`123456`) documented in the README, so a client demo or an
       * automated test works without a live SMS provider.
       */
      verifyOTP: createOtpVerifier(config.allowDemoOtp),

      /**
       * Creates the Better Auth user the first time a number is verified.
       *
       * Better Auth's core user model requires an email, but this flow is
       * phone-only. A deterministic placeholder email is derived from the
       * number so it stays unique per phone number, and the real number is
       * stored on `phoneNumber` — which is what the app actually keys on.
       */
      signUpOnVerification: {
        getTempEmail: (phoneNumber: string) =>
          `${phoneNumber.replace('+', '').replace(/\D/g, '')}@phone.ovovita.local`,
        getTempName: (phoneNumber: string) => `Customer ${phoneNumber.slice(-4)}`,
      },

      /**
       * Delivers the OTP to the customer via MSG91.
       *
       * Uses real SMS when MSG91 credentials are configured (even in development).
       * Falls back to console logging only when credentials are missing.
       *
       * The OTP code is NEVER logged in production.
       */
      sendOTP: async ({ phoneNumber, code }) => {
        const hasMsg91Credentials =
          process.env.MSG91_AUTH_KEY &&
          process.env.MSG91_TEMPLATE_ID &&
          process.env.MSG91_SENDER_ID;

        if (hasMsg91Credentials) {
          // Deliver the real code through MSG91 transactional SMS API.
          // Failure is rethrown so Better Auth reports the delivery error
          // instead of silently swallowing it.
          const response = await fetch('https://control.msg91.com/api/v5/flow/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              auth: `username:${process.env.MSG91_AUTH_KEY}`,
            },
            body: JSON.stringify({
              template_id: process.env.MSG91_TEMPLATE_ID,
              sender: process.env.MSG91_SENDER_ID,
              short_url: '0',
              recipients: [
                {
                  mobiles: phoneNumber.replace('+', ''),
                  VAR1: code,
                  VAR2: 'Ovovita',
                },
              ],
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `[Better Auth] MSG91 delivery failed: ${response.status} ${errorText}`
            );
          }

          if (config.nodeEnv !== 'production') {
            console.log(`[Better Auth] ✅ Real SMS sent via MSG91 to ${phoneNumber}`);
          }
          return;
        }

        if (config.isProduction) {
          throw new Error('[Better Auth] MSG91 is not configured; refusing to drop a production OTP.');
        }

        console.log(
          `[Better Auth] 📱 OTP for ${phoneNumber}: ${code} ` +
            `(DEV MODE — configure MSG91_* env vars for real SMS)`
        );
      },
    }),
  ],
} satisfies BetterAuthOptions;

export const auth = betterAuth(betterAuthOptions);

export type Auth = typeof auth;