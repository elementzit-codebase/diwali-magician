import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.isProduction ? 30 : 100,
  validate: { xForwardedForHeader: false },
  skip: () => !config.isProduction,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: config.isProduction ? 500 : 5000,
  validate: { xForwardedForHeader: false },
  skip: () => !config.isProduction,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please slow down.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});


