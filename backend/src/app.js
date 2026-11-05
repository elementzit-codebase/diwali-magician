import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.controller.js';

export function createApp() {
  const app = express();

  // Basic security headers configured for single-origin React delivery
  app.use(
    helmet({
      contentSecurityPolicy: config.isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(config.session.secret));

  // Base API healthcheck
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'premium-voting-application',
      mode: config.env,
      timestamp: new Date().toISOString(),
    });
  });

  // Mount Feature Modules
  app.use('/api/auth', authRoutes);

  // Centralized Error Handler (must be registered after all routes)
  app.use(errorHandler);

  return app;
}
