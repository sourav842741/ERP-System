import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Access denied. No authentication token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_erp_2026_xyz!@#');
    const user = await User.findById(decoded.id).populate('role');

    if (!user || user.isDeleted || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        code: 'ACCOUNT_DISABLED',
        message: 'User account not found or deactivated.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Token expired or invalid. Please log in again.'
    });
  }
};
