import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.controller.js';
import memberRoutes from './modules/members/members.controller.js';
import eventRoutes from './modules/events/events.controller.js';
import publicEventRoutes from './modules/events/public-events.controller.js';
import qrRoutes from './modules/qr/qr.controller.js';
import votingRoutes from './modules/voting/voting.controller.js';
import resultsRoutes from './modules/results/results.controller.js';

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

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
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
  app.use('/api/members', memberRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/public/events', publicEventRoutes);
  app.use('/api/qr', qrRoutes);
  app.use('/api/voting', votingRoutes);
  app.use('/api/results', resultsRoutes);

  // Centralized Error Handler (must be registered after all routes)
  app.use(errorHandler);

  return app;
}
