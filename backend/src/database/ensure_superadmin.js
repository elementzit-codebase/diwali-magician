import { pool, query } from './pool.js';
import { hashPassword } from '../utils/crypto.js';

export async function ensurePermanentSuperAdmin() {
  const email = 'admin@voting.com';
  const password = 'Admin123456!';
  const fullName = 'Super Administrator';

  try {
    const check = await query(`SELECT id FROM admins WHERE email = $1`, [email]);
    if (check.rowCount === 0) {
      const hashedPassword = await hashPassword(password);
      await query(
        `INSERT INTO admins (full_name, email, password_hash)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO NOTHING`,
        [fullName, email, hashedPassword]
      );
      console.log(`[Superadmin] Permanent Superadmin account ensured: ${email}`);
    }
  } catch (err) {
    console.error('[Superadmin Error]', err.message);
  }
}

