import { pool, query } from './pool.js';
import { hashPassword } from '../utils/crypto.js';

async function seedAdmin() {
  const email = process.argv[2] || 'admin@luxuryvoting.com';
  const password = process.argv[3] || 'Admin123456!';
  const fullName = process.argv[4] || 'Event Administrator';

  // Check if admin already exists
  const check = await query(`SELECT id, email FROM admins WHERE email = $1`, [email]);
  if (check.rowCount > 0) {
    console.log(`[Admin Setup] Admin with email '${email}' already exists.`);
    await pool.end();
    return;
  }

  const hashedPassword = await hashPassword(password);
  const res = await query(
    `INSERT INTO admins (full_name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, full_name, email, created_at`,
    [fullName, email, hashedPassword]
  );

  console.log('[Admin Setup] Administrator created successfully:');
  console.log('--------------------------------------------------');
  console.log(`Full Name : ${res.rows[0].full_name}`);
  console.log(`Email     : ${res.rows[0].email}`);
  console.log(`Password  : ${password}`);
  console.log('--------------------------------------------------');
  await pool.end();
}

seedAdmin().catch(console.error);

