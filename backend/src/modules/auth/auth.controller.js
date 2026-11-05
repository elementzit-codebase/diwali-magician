import { Router } from 'express';
import {
  getAdminCount,
  createInitialAdmin,
  authenticateAdmin,
  getAdminById,
} from './auth.service.js';
import {
  signAdminToken,
  setAdminCookie,
  clearAdminCookie,
  requireAdminAuth,
} from '../../middleware/adminAuth.js';
import { validate } from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { setupAdminSchema, loginSchema } from './auth.schema.js';
import { AppError } from '../../middleware/errorHandler.js';

const router = Router();

// 1. Check whether initial setup is required
router.get('/setup-status', async (req, res, next) => {
  try {
    const adminCount = await getAdminCount();
    res.json({
      setupRequired: adminCount === 0,
      adminCount,
    });
  } catch (err) {
    next(err);
  }
});

// 2. Perform one-time initial administrator setup
router.post('/setup', validate(setupAdminSchema), async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;
    const admin = await createInitialAdmin({ fullName, email, password });
    
    // Automatically log in newly created first admin
    const token = signAdminToken(admin);
    setAdminCookie(res, token);

    res.status(201).json({
      message: 'Initial administrator account created successfully.',
      admin: {
        id: admin.id,
        fullName: admin.full_name,
        email: admin.email,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 3. Administrator login with rate-limiting
router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = await authenticateAdmin({ email, password });

    const token = signAdminToken(admin);
    setAdminCookie(res, token);

    res.json({
      message: 'Login successful.',
      admin,
    });
  } catch (err) {
    next(err);
  }
});

// 4. Logout
router.post('/logout', (req, res) => {
  clearAdminCookie(res);
  res.json({ message: 'Logged out successfully.' });
});

// 5. Authenticated Admin Profile
router.get('/me', requireAdminAuth, async (req, res, next) => {
  try {
    const admin = await getAdminById(req.admin.id);
    if (!admin) {
      throw new AppError('Admin account not found', 404, 'ADMIN_NOT_FOUND');
    }

    res.json({
      admin: {
        id: admin.id,
        fullName: admin.full_name,
        email: admin.email,
        createdAt: admin.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

