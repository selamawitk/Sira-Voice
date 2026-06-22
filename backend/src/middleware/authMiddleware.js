import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        message: 'Not authorized, no token',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      return res.status(401).json({
        message: 'Invalid token payload',
      });
    }

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        message: 'User no longer exists',
      });
    }

    req.user = user;
    req.userId = decoded.id; 
    req.userRole = decoded.role;

    next();
  } catch (error) {
    if (error && error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'token_expired',
      });
    }

    return res.status(401).json({
      message: 'Not authorized, token failed',
    });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Not authorized',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied: requires one of [${roles.join(', ')}]`,
      });
    }

    next();
  };
};

export const workerOnly = authorizeRoles('worker');
export const employerOnly = authorizeRoles('employer');
export const adminOnly = authorizeRoles('admin');