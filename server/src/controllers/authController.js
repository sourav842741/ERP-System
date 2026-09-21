import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { logAudit } from '../middlewares/auditMiddleware.js';

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role?.name },
    process.env.JWT_SECRET || 'super_secret_jwt_key_erp_2026_xyz!@#',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_jwt_erp_2026_xyz!@#',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return { accessToken, refreshToken };
};

export const register = async (req, res) => {
  try {
    const { name, email, password, phone, roleId } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, code: 'EMAIL_EXISTS', message: 'Email is already registered' });
    }

    let role = null;
    if (roleId) {
      role = await Role.findById(roleId);
    }
    if (!role) {
      // Default to Inventory Supervisor or first available role
      role = await Role.findOne({ name: 'Super Admin' }) || await Role.findOne();
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
      role: role?._id
    });

    const populatedUser = await User.findById(user._id).populate('role').select('-password');
    const tokens = generateTokens(populatedUser);

    await logAudit({
      req,
      userId: user._id,
      userName: user.name,
      action: 'USER_REGISTER',
      module: 'Auth',
      entityId: user._id,
      reason: 'New account registered'
    });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      data: { user: populatedUser, ...tokens }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).populate('role');
    if (!user || user.isDeleted) {
      return res.status(401).json({ success: false, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, code: 'ACCOUNT_SUSPENDED', message: 'Account is deactivated. Contact admin.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    user.lastLogin = new Date();
    await user.save();

    const tokens = generateTokens(user);
    const userSafe = user.toObject();
    delete userSafe.password;

    await logAudit({
      req,
      userId: user._id,
      userName: user.name,
      action: 'USER_LOGIN',
      module: 'Auth',
      entityId: user._id,
      reason: 'Successful login'
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: userSafe, ...tokens }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMe = async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user }
  });
};

export const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;

    if (email && email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email is already in use by another account' });
      }
      user.email = email.toLowerCase();
    }

    await user.save();
    const updated = await User.findById(user._id).populate('role').select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updated }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match' });
    }

    user.password = newPassword;
    await user.save();

    await logAudit({
      req,
      userId: user._id,
      action: 'PASSWORD_CHANGE',
      module: 'Auth',
      entityId: user._id,
      reason: 'User changed their password'
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
