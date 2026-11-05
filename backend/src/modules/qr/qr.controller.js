import { Router } from 'express';
import {
  getEventByToken,
  getOrCreateEventToken,
  regenerateEventToken,
  revokeEventToken,
  generateQrDataUrl,
} from './qr.service.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import { config } from '../../config/index.js';

const router = Router();

// 1. PUBLIC: Validate QR token when voter scans event QR code
router.get('/access/:token', apiLimiter, async (req, res, next) => {
  try {
    const data = await getEventByToken(req.params.token);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// 2. ADMIN ONLY: Get or load permanent Event QR code without changing/invalidating it
router.get('/event/:eventId', requireAdminAuth, async (req, res, next) => {
  try {
    const { rawToken, title, event, isExisting } = await getOrCreateEventToken(req.params.eventId);
    const accessUrl = `${req.protocol}://${req.get('host')}/vote?token=${rawToken}`;
    const qrDataUrl = await generateQrDataUrl(accessUrl);

    res.json({
      message: isExisting ? 'Event QR code loaded successfully' : 'Event QR code generated successfully',
      rawToken,
      accessUrl,
      qrDataUrl,
      event,
    });
  } catch (err) {
    next(err);
  }
});

// 3. ADMIN ONLY: Regenerate event QR token (only if explicitly requested)
router.post('/regenerate/:eventId', requireAdminAuth, async (req, res, next) => {
  try {
    const { rawToken } = await regenerateEventToken(req.params.eventId);
    const accessUrl = `${req.protocol}://${req.get('host')}/vote?token=${rawToken}`;
    const qrDataUrl = await generateQrDataUrl(accessUrl);

    res.json({
      message: 'Event QR code regenerated successfully',
      rawToken,
      accessUrl,
      qrDataUrl,
    });
  } catch (err) {
    next(err);
  }
});

// 3. ADMIN ONLY: Revoke QR code
router.post('/revoke/:eventId', requireAdminAuth, async (req, res, next) => {
  try {
    const result = await revokeEventToken(req.params.eventId);
    res.json({ message: 'Event QR access token revoked successfully', ...result });
  } catch (err) {
    next(err);
  }
});

// 4. ADMIN ONLY: Render QR data URL on demand
router.get('/render', requireAdminAuth, async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    const accessUrl = `${req.protocol}://${req.get('host')}/vote?token=${token}`;
    const qrDataUrl = await generateQrDataUrl(accessUrl);
    res.json({ accessUrl, qrDataUrl });
  } catch (err) {
    next(err);
  }
});

export default router;

