import { Router } from 'express';
import { getEventResults } from './results.service.js';
import { requireAdminAuth } from '../../middleware/adminAuth.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

// 1. ADMIN RESULTS: Protected by admin session
router.get('/admin/:eventId', requireAdminAuth, async (req, res, next) => {
  try {
    const data = await getEventResults(req.params.eventId, { isAdmin: true });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// 2. PUBLIC MEMBER RESULTS: Available after voting concludes via valid QR token
router.get('/public/:eventId', apiLimiter, async (req, res, next) => {
  try {
    const { token } = req.query;
    const data = await getEventResults(req.params.eventId, {
      isAdmin: false,
      rawToken: token,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;

