import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { config } from '../config';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { auth, toE164, toNationalNumber } from '../config/better-auth';
import { sendEmailOtp, verifyEmailOtp } from '../services/EmailOtpService';

export class AuthController {
  /**
   * Request OTP for Customer login.
   *
   * Delegates to Better Auth's `sendPhoneNumberOTP`, which generates the code,
   * stores it in the `verification` collection and calls the `sendOTP` hook
   * configured in `config/better-auth.ts`.
   */
  static async requestCustomerOtp(req: Request, res: Response) {
    const { phoneNumber } = req.body;
    const e164 = toE164(phoneNumber);

    if (!/^\+91[6-9]\d{9}$/.test(e164)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PHONE_NUMBER', message: 'Invalid Indian mobile number' },
      });
    }

    try {
      await auth.api.sendPhoneNumberOTP({
        body: { phoneNumber: e164 },
        headers: new Headers(),
      });
    } catch (error: any) {
      console.error('[Better Auth] ❌ sendPhoneNumberOTP failed:', error?.message || error);
      return res.status(400).json({
        success: false,
        error: {
          code: error?.body?.code || 'OTP_SEND_FAILED',
          message: 'Failed to send OTP. Please try again.',
        },
      });
    }

    return res.json({
      success: true,
      message: config.allowDemoOtp && !config.isProduction
        ? 'Development OTP is ready. Use the demo code shown.'
        : 'OTP request accepted.',
      data: {
        phoneNumber: e164,
        ...(config.allowDemoOtp && !config.isProduction ? { demoOtp: '123456' } : {}),
      },
    });
  }

  /**
   * Verify OTP and return JWT session.
   *
   * Delegates to Better Auth's `verifyPhoneNumber`, which validates the code,
   * marks the phone number as verified, creates the user on first login and
   * returns a Better Auth session token.
   */
  static async verifyCustomerOtp(req: Request, res: Response) {
    const { phoneNumber, otpCode } = req.body;
    const e164 = toE164(phoneNumber);

    if (!otpCode) {
      return res.status(400).json({
        success: false,
        error: { code: 'OTP_REQUIRED', message: 'OTP code is required' },
      });
    }

    let result: any;
    try {
      result = await auth.api.verifyPhoneNumber({
        body: { phoneNumber: e164, code: String(otpCode) },
        headers: new Headers(),
      });
    } catch (error: any) {
      console.error('[Better Auth] ❌ verifyPhoneNumber failed:', error?.message || error);
      return res.status(400).json({
        success: false,
        error: {
          code: error?.body?.code || 'INVALID_OTP',
          message: 'The entered OTP code is incorrect or has expired',
        },
      });
    }

    const betterAuthUserId = result?.user?.id;
    if (!betterAuthUserId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_OTP', message: 'The entered OTP code is incorrect or has expired' },
      });
    }

    // Keep the existing Ovovita `User` document as the source of truth for
    // the app profile (role, saved addresses, ratings). Better Auth owns the
    // identity record; the link is the shared phone number.
    //
    // The two systems store that phone number in different shapes: the seed
    // and the staff login use the bare 10-digit national form
    // (`9876543210`), while Better Auth keys on E.164 (`+919876543210`).
    // The canonical national form is looked up first so the seeded customer
    // is found rather than a second profile being created for the same
    // person; the E.164 shapes are kept as fallbacks for records written
    // before this normalisation existed.
    const nationalNumber = toNationalNumber(e164);
    const existingUser =
      (await User.findOne({ phoneNumber: nationalNumber })) ||
      (await User.findOne({ phoneNumber: e164 })) ||
      (await User.findOne({ phoneNumber: e164.replace('+', '') })) ||
      // Last resort: match the national form with any optional country-code
      // prefix (`9876543210`, `919876543210`, `+919876543210`). The `+` is
      // escaped because an unescaped one is an invalid MongoDB regex
      // quantifier and would fail the query.
      (await User.findOne({ phoneNumber: { $regex: `^(\\+?91)?${nationalNumber}$` } }));

    let appUser = existingUser;
    if (!appUser) {
      appUser = await User.create({
        name: result?.user?.name || `Customer ${e164.slice(-4)}`,
        // Store the canonical national form so every future lookup — OTP or
        // staff PIN — resolves to this same record.
        phoneNumber: nationalNumber,
        role: 'CUSTOMER',
        savedAddresses: [],
        totalOrdersCount: 0,
        zeroCrackRating: 5.0,
        phoneNumberVerified: true,
        betterAuthUserId,
      });
    } else {
      // Track verification state on the app-side user for parity with
      // Better Auth's `user.phoneNumberVerified` flag.
      appUser.phoneNumberVerified = true;
      appUser.betterAuthUserId = betterAuthUserId;
      await appUser.save();
    }

    const token = jwt.sign(
      {
        id: appUser._id,
        phoneNumber: appUser.phoneNumber,
        role: appUser.role,
        name: appUser.name,
        depotId: appUser.depotId,
        betterAuthUserId,
      },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: appUser._id,
          name: appUser.name,
          phoneNumber: appUser.phoneNumber,
          role: appUser.role,
          savedAddresses: appUser.savedAddresses,
          zeroCrackRating: appUser.zeroCrackRating,
          totalOrdersCount: appUser.totalOrdersCount,
        },
      },
    });
  }

  /**
   * Staff PIN Login (Admin, Depot Shopkeeper, Delivery Executive)
   */
  static async staffLogin(req: Request, res: Response) {
    const { phoneNumber, pin, role } = req.body;

    // Normalise to the canonical national form so a staff member can sign in
    // whether their number was stored bare (`9876500001`), with a country
    // code (`91987650001`) or in E.164 (`+91987650001`).
    const nationalNumber = toNationalNumber(phoneNumber);
    const user =
      (await User.findOne({ phoneNumber: nationalNumber, role })) ||
      (await User.findOne({ phoneNumber, role })) ||
      (await User.findOne({
        phoneNumber: { $regex: `^(\\+?91)?${nationalNumber}$` },
        role,
      }));

    if (!user || !user.pinHash) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid phone number or staff role' },
      });
    }

    const isMatch = await bcrypt.compare(pin, user.pinHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect PIN code' },
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        name: user.name,
        depotId: user.depotId,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          phoneNumber: user.phoneNumber,
          role: user.role,
          depotId: user.depotId,
        },
      },
    });
  }

  /**
   * Exchanges a Firebase ID token for the API's own customer session token.
   * Firebase Identity Toolkit validates the token against the configured
   * Firebase project before the app profile is created or returned.
   */
  static async googleLogin(req: Request, res: Response) {
    const { idToken } = req.body;
    if (!config.firebaseWebApiKey) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'GOOGLE_AUTH_NOT_CONFIGURED',
          message: 'Google sign-in is not configured on this server.',
        },
      });
    }

    let identityResponse: globalThis.Response;
    try {
      identityResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(config.firebaseWebApiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
          signal: AbortSignal.timeout(5000),
        }
      );
    } catch (error) {
      console.error('[Firebase Auth] Identity verification request failed:', error);
      return res.status(502).json({
        success: false,
        error: { code: 'GOOGLE_AUTH_UNAVAILABLE', message: 'Google sign-in is temporarily unavailable.' },
      });
    }

    if (!identityResponse.ok) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_GOOGLE_TOKEN', message: 'Google sign-in could not be verified.' },
      });
    }

    const identity = (await identityResponse.json()) as {
      users?: Array<{
        localId?: string;
        email?: string;
        emailVerified?: boolean;
        displayName?: string;
        photoUrl?: string;
      }>;
    };
    const googleUser = identity.users?.[0];
    const email = googleUser?.email?.trim().toLowerCase();
    if (!googleUser?.localId || !email || !googleUser.emailVerified) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_GOOGLE_ACCOUNT', message: 'A verified Google email is required.' },
      });
    }

    let appUser =
      (await User.findOne({ email })) ||
      (await User.findOne({ phoneNumber: email }));

    if (appUser && appUser.role !== 'CUSTOMER') {
      return res.status(403).json({
        success: false,
        error: { code: 'GOOGLE_ACCOUNT_NOT_ALLOWED', message: 'This Google account is not registered as a customer.' },
      });
    }

    if (!appUser) {
      appUser = await User.create({
        name: googleUser.displayName || email.split('@')[0],
        email,
        phoneNumber: email,
        avatarUrl: googleUser.photoUrl,
        role: 'CUSTOMER',
        savedAddresses: [],
        totalOrdersCount: 0,
        zeroCrackRating: 5.0,
        emailVerified: true,
      });
    } else {
      appUser.email = email;
      appUser.emailVerified = true;
      if (googleUser.displayName) appUser.name = googleUser.displayName;
      if (googleUser.photoUrl) appUser.avatarUrl = googleUser.photoUrl;
      await appUser.save();
    }

    const token = jwt.sign(
      {
        id: appUser._id,
        phoneNumber: appUser.phoneNumber,
        email: appUser.email,
        role: appUser.role,
        name: appUser.name,
        depotId: appUser.depotId,
        firebaseUid: googleUser.localId,
      },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: appUser._id,
          name: appUser.name,
          email: appUser.email,
          phoneNumber: appUser.phoneNumber,
          role: appUser.role,
          savedAddresses: appUser.savedAddresses,
          zeroCrackRating: appUser.zeroCrackRating,
          totalOrdersCount: appUser.totalOrdersCount,
        },
      },
    });
  }

  /**
   * Get Current Authenticated Profile
   */
  static async getProfile(req: AuthenticatedRequest, res: Response) {
    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    return res.json({
      success: true,
      data: user,
    });
  }

  /**
   * Add a new delivery address
   */
  static async addAddress(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    const addressData = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    const newAddressId = `addr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const isFirstAddress = user.savedAddresses.length === 0;

    const newAddress = {
      id: newAddressId,
      tag: addressData.tag || 'HOME',
      recipientName: addressData.recipientName || user.name,
      phoneNumber: addressData.phoneNumber || user.phoneNumber,
      flatPlotNumber: addressData.flatPlotNumber,
      apartmentName: addressData.apartmentName || '',
      streetName: addressData.streetName,
      landmark: addressData.landmark || '',
      pincode: addressData.pincode,
      city: addressData.city || 'Bengaluru',
      gateSecurityInstructions: addressData.gateSecurityInstructions || '',
      latitude: addressData.latitude || 12.9342,
      longitude: addressData.longitude || 77.6255,
      isDefault: addressData.isDefault || isFirstAddress,
    };

    if (newAddress.isDefault) {
      user.savedAddresses.forEach((a) => (a.isDefault = false));
    }

    user.savedAddresses.push(newAddress as any);
    await user.save();

    return res.json({
      success: true,
      message: 'Address saved successfully',
      data: user.savedAddresses,
      address: newAddress,
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        savedAddresses: user.savedAddresses,
      },
    });
  }

  /**
   * Update an existing delivery address
   */
  static async updateAddress(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    const { addressId } = req.params;
    const updateData = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    const addrIndex = user.savedAddresses.findIndex(
      (a) => a.id === addressId || (a as any)._id?.toString() === addressId
    );
    if (addrIndex === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'ADDRESS_NOT_FOUND', message: 'Address not found' },
      });
    }

    if (updateData.isDefault) {
      user.savedAddresses.forEach((a) => (a.isDefault = false));
    }

    Object.assign(user.savedAddresses[addrIndex], updateData);
    user.markModified('savedAddresses');
    await user.save();

    return res.json({
      success: true,
      message: 'Address updated successfully',
      data: user.savedAddresses,
      address: user.savedAddresses[addrIndex],
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        savedAddresses: user.savedAddresses,
      },
    });
  }

  /**
   * Delete a delivery address
   */
  static async deleteAddress(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id;
    const { addressId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    user.savedAddresses = user.savedAddresses.filter(
      (a) => a.id !== addressId && (a as any)._id?.toString() !== addressId
    );
    if (user.savedAddresses.length > 0 && !user.savedAddresses.some((a) => a.isDefault)) {
      user.savedAddresses[0].isDefault = true;
    }

    user.markModified('savedAddresses');
    await user.save();

    return res.json({
      success: true,
      message: 'Address removed successfully',
      data: user.savedAddresses,
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        savedAddresses: user.savedAddresses,
      },
    });
  }

  /**
   * Request Email OTP for Customer login.
   *
   * Generates a 6-digit code, stores it temporarily, and sends via Gmail SMTP.
   */
  static async requestCustomerEmailOtp(req: Request, res: Response) {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'Please enter a valid email address' },
      });
    }

    const result = await sendEmailOtp(email.toLowerCase().trim());

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'OTP_SEND_FAILED', message: result.message },
      });
    }

    return res.json({
      success: true,
      message: result.message,
      data: { email: email.toLowerCase().trim() },
    });
  }

  /**
   * Verify Email OTP and return JWT session.
   *
   * Validates the code, creates/updates the customer user, and issues a JWT.
   */
  static async verifyCustomerEmailOtp(req: Request, res: Response) {
    const { email, otpCode } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail || !otpCode) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Email and OTP code are required' },
      });
    }

    const result = verifyEmailOtp(normalizedEmail, String(otpCode));

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_OTP', message: result.message },
      });
    }

    // Find or create the customer user by email
    let appUser = await User.findOne({ email: normalizedEmail });

    if (!appUser) {
      // Check if a user exists with this email as phoneNumber (legacy)
      appUser = await User.findOne({ phoneNumber: normalizedEmail });
    }

    if (!appUser) {
      // Create new customer with email as primary identifier
      appUser = await User.create({
        name: normalizedEmail.split('@')[0],
        email: normalizedEmail,
        phoneNumber: normalizedEmail, // Store email in phoneNumber field for backward compat
        role: 'CUSTOMER',
        savedAddresses: [],
        totalOrdersCount: 0,
        zeroCrackRating: 5.0,
        emailVerified: true,
      });
    } else {
      // Update verification status
      appUser.emailVerified = true;
      if (!appUser.email) {
        appUser.email = normalizedEmail;
      }
      await appUser.save();
    }

    const token = jwt.sign(
      {
        id: appUser._id,
        phoneNumber: appUser.phoneNumber,
        email: appUser.email,
        role: appUser.role,
        name: appUser.name,
        depotId: appUser.depotId,
      },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: appUser._id,
          name: appUser.name,
          email: appUser.email,
          phoneNumber: appUser.phoneNumber,
          role: appUser.role,
          savedAddresses: appUser.savedAddresses,
          zeroCrackRating: appUser.zeroCrackRating,
          totalOrdersCount: appUser.totalOrdersCount,
        },
      },
    });
  }
}
