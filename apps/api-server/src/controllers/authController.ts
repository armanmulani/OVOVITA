import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { config } from '../config';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { getFirebaseAuth, isFirebaseAdminConfigured } from '../config/firebase-admin';

export class AuthController {
  /**
   * Request OTP for Customer login
   */
  static async requestCustomerOtp(req: Request, res: Response) {
    const { phoneNumber } = req.body;

    let user = await User.findOne({ phoneNumber });
    if (!user) {
      // First-time customer sign up
      user = await User.create({
        name: `Customer ${phoneNumber.slice(-4)}`,
        phoneNumber,
        role: 'CUSTOMER',
        savedAddresses: [],
      });
    }

    // In production, triggers SMS gateway/WhatsApp OTP
    // For development, OTP is 123456
    console.log(`[OTP Engine] 📱 Generated OTP 123456 for ${phoneNumber}`);

    return res.json({
      success: true,
      message: 'OTP sent to mobile number via WhatsApp/SMS',
      data: {
        phoneNumber,
        devOtpHint: '123456',
      },
    });
  }

  /**
   * Verify OTP and return JWT session
   */
  static async verifyCustomerOtp(req: Request, res: Response) {
    const { phoneNumber, otpCode } = req.body;

    if (!isFirebaseAdminConfigured()) {
      console.log('[OTP Engine] 🔐 DEMO MODE: Accepting OTP 123456 (Firebase Admin not configured)');
      if (otpCode !== '123456') {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_OTP', message: 'The entered OTP code is incorrect' },
        });
      }
    } else {
      try {
        const decodedToken = await getFirebaseAuth().verifyIdToken(otpCode);
        const tokenPhoneNumber = decodedToken.phone_number;
        if (tokenPhoneNumber !== phoneNumber) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_OTP', message: 'Phone number mismatch' },
          });
        }
      } catch (error) {
        console.error('[Firebase OTP] ❌ Verification failed:', error);
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_OTP', message: 'Invalid or expired OTP code' },
        });
      }
    }

    let user = await User.findOne({ phoneNumber });
    if (!user) {
      user = await User.create({
        name: `Customer ${phoneNumber.slice(-4)}`,
        phoneNumber,
        role: 'CUSTOMER',
        savedAddresses: [],
        totalOrdersCount: 0,
        zeroCrackRating: 5.0,
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
      { expiresIn: '30d' }
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
          savedAddresses: user.savedAddresses,
          zeroCrackRating: user.zeroCrackRating,
          totalOrdersCount: user.totalOrdersCount,
        },
      },
    });
  }

  /**
   * Staff PIN Login (Admin, Depot Shopkeeper, Delivery Executive)
   */
  static async staffLogin(req: Request, res: Response) {
    const { phoneNumber, pin, role } = req.body;

    const user = await User.findOne({ phoneNumber, role });
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
