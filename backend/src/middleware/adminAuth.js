import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from './errorHandler.js';

export function signAdminToken(admin) {
  return jwt.sign(
    {
      sub: admin.id,
      email: admin.email,
      fullName: admin.full_name,
      role: 'admin',
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

export function setAdminCookie(res, token) {
  res.cookie('admin_token', token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    path: '/',
  });
}

export function clearAdminCookie(res) {
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  });
}

export function requireAdminAuth(req, res, next) {
  const token =
    req.cookies?.admin_token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  if (!token) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.admin = {
      id: decoded.sub,
      email: decoded.email,
      fullName: decoded.fullName,
    };
    next();
  } catch (err) {
    return next(new AppError('Invalid or expired authentication session', 401, 'INVALID_TOKEN'));
  }
}

