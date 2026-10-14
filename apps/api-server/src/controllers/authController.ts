import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { config } from '../config';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

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

    if (otpCode !== '123456') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_OTP', message: 'The entered OTP code is incorrect' },
      });
    }

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User record not found' },
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
}
