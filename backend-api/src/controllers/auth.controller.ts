import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import OTP from '../models/OTP';
import { sendOTPEmail } from '../services/email.service';
import { sendSuccess, sendError } from '../utils/response';

const generateOTP = (): string => String(Math.floor(100000 + Math.random() * 900000));

const signToken = (id: string): string =>
  jwt.sign({ id, role: 'user' }, process.env.JWT_SECRET || 'secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);

export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  const { name, email, phone } = req.body;

  if (!name || !email || !phone) {
    sendError(res, 'Name, email, and phone are required');
    return;
  }

  let user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    user = await User.create({ name, email: email.toLowerCase(), phone });
  } else {
    // Update name/phone if user revisits
    user.name = name;
    user.phone = phone;
    await user.save();
  }

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await OTP.deleteMany({ email: email.toLowerCase() });
  await OTP.create({ email: email.toLowerCase(), otp, expiresAt });

  try {
    await sendOTPEmail(email, name, otp);
  } catch (err: any) {
    console.error('[EMAIL ERROR] Failed to send OTP to', email, '—', err?.message ?? err);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] OTP for ${email}: ${otp}`);
    } else {
      sendError(res, 'Failed to send OTP email. Please try again.', 500);
      return;
    }
  }

  sendSuccess(res, { email }, 'OTP sent to your email');
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    sendError(res, 'Email and OTP are required');
    return;
  }

  const record = await OTP.findOne({
    email: email.toLowerCase(),
    verified: false,
    expiresAt: { $gt: new Date() },
  });

  if (!record || record.otp !== otp) {
    sendError(res, 'Invalid or expired OTP', 400);
    return;
  }

  record.verified = true;
  await record.save();

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    sendError(res, 'User not found', 404);
    return;
  }

  const token = signToken(String(user._id));
  sendSuccess(res, { token, user: { _id: user._id, name: user.name, email: user.email, phone: user.phone } }, 'Login successful');
};

export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    sendError(res, 'Email and password are required');
    return;
  }

  const Admin = (await import('../models/Admin')).default;
  const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
  if (!admin || !(await admin.comparePassword(password))) {
    sendError(res, 'Invalid credentials', 401);
    return;
  }

  const token = jwt.sign(
    { id: admin._id, role: 'admin' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  );

  sendSuccess(res, {
    token,
    admin: { _id: admin._id, name: admin.name, email: admin.email, phone: admin.phone },
  }, 'Admin login successful');
};
