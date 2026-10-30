import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { config } from '../config';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
const toNationalNumber = (phoneNumber: string): string => {
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith('091')) return digits.slice(3);
  return digits;
};

export class AuthController {
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

}
