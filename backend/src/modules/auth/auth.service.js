import { query } from '../../database/pool.js';
import { hashPassword, verifyPassword } from '../../utils/crypto.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function getAdminCount() {
  const res = await query('SELECT count(*)::int AS count FROM admins');
  return res.rows[0].count;
}

export async function createInitialAdmin({ fullName, email, password }) {
  // Atomic check: If any admin already exists, lock immediately
  const count = await getAdminCount();
  if (count > 0) {
    throw new AppError(
      'Initial administrator setup has already been completed.',
      403,
      'SETUP_LOCKED'
    );
  }

  const hashedPassword = await hashPassword(password);

  const res = await query(
    `INSERT INTO admins (full_name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, full_name, email, created_at`,
    [fullName, email, hashedPassword]
  );

  return res.rows[0];
}

export async function authenticateAdmin({ email, password }) {
  const res = await query(
    `SELECT id, full_name, email, password_hash
     FROM admins
     WHERE email = $1`,
    [email]
  );

  const admin = res.rows[0];
  if (!admin) {
    // Constant-time dummy comparison to mitigate timing attacks
    await verifyPassword(password, '$2b$12$DUMMY_HASH_PREVENTS_TIMING_ATTACK_XXXXXXXXXXXXXXXXX');
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const isValid = await verifyPassword(password, admin.password_hash);
  if (!isValid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  return {
    id: admin.id,
    fullName: admin.full_name,
    email: admin.email,
  };
}

export async function getAdminById(id) {
  const res = await query(
    `SELECT id, full_name, email, created_at, updated_at
     FROM admins
     WHERE id = $1`,
    [id]
  );

  return res.rows[0] || null;
}

