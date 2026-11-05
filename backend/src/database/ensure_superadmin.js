import { pool, query } from './pool.js';
import { hashPassword } from '../utils/crypto.js';

export async function ensurePermanentSuperAdmin() {
  const email = 'admin@voting.com';
  const password = 'Admin123456!';
  const fullName = 'Super Administrator';

  try {
    const hashedPassword = await hashPassword(password);
    const check = await query(`SELECT id FROM admins WHERE email = $1`, [email]);
    if (check.rowCount === 0) {
      await query(
        `INSERT INTO admins (full_name, email, password_hash)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO NOTHING`,
        [fullName, email, hashedPassword]
      );
      console.log(`[Superadmin] Permanent Superadmin account created: ${email}`);
    } else {
      // Force update password_hash to ensure Admin123456! works regardless of previous invalid hash
      await query(
        `UPDATE admins SET password_hash = $1 WHERE email = $2`,
        [hashedPassword, email]
      );
      console.log(`[Superadmin] Permanent Superadmin password verified & updated: ${email}`);
    }
  } catch (err) {
    console.error('[Superadmin Error]', err.message);
  }
}

