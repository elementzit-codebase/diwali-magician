import { query, getClient } from '../../database/pool.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function listMembers({ search, isActive, limit = 100, offset = 0 } = {}) {
  let sql = `
    SELECT id, member_code, full_name, is_active, created_at, updated_at
    FROM members
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (full_name ILIKE $${params.length} OR member_code ILIKE $${params.length})`;
  }

  if (isActive !== undefined && isActive !== null) {
    params.push(isActive === true || isActive === 'true');
    sql += ` AND is_active = $${params.length}`;
  }

  sql += ` ORDER BY full_name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  const countRes = await query(`SELECT count(*)::int AS total FROM members`);
  const res = await query(sql, params);

  return {
    members: res.rows,
    total: countRes.rows[0].total,
  };
}

export async function getMemberById(id) {
  const res = await query(
    `SELECT id, member_code, full_name, is_active, created_at, updated_at
     FROM members
     WHERE id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

export async function createMember({ memberCode, fullName, isActive = true }) {
  // Check duplicate member_code
  const existing = await query(`SELECT id FROM members WHERE member_code = $1`, [memberCode]);
  if (existing.rowCount > 0) {
    throw new AppError(`Member code '${memberCode}' is already registered`, 409, 'DUPLICATE_MEMBER_CODE');
  }

  const res = await query(
    `INSERT INTO members (member_code, full_name, is_active)
     VALUES ($1, $2, $3)
     RETURNING id, member_code, full_name, is_active, created_at, updated_at`,
    [memberCode, fullName, isActive]
  );

  return res.rows[0];
}

export async function updateMember(id, { memberCode, fullName, isActive }) {
  const existing = await getMemberById(id);
  if (!existing) {
    throw new AppError('Member not found', 404, 'MEMBER_NOT_FOUND');
  }

  if (memberCode && memberCode !== existing.member_code) {
    const codeCheck = await query(
      `SELECT id FROM members WHERE member_code = $1 AND id != $2`,
      [memberCode, id]
    );
    if (codeCheck.rowCount > 0) {
      throw new AppError(`Member code '${memberCode}' is already in use by another member`, 409, 'DUPLICATE_MEMBER_CODE');
    }
  }

  const newCode = memberCode !== undefined ? memberCode : existing.member_code;
  const newName = fullName !== undefined ? fullName : existing.full_name;
  const newActive = isActive !== undefined ? isActive : existing.is_active;

  const res = await query(
    `UPDATE members
     SET member_code = $1, full_name = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING id, member_code, full_name, is_active, created_at, updated_at`,
    [newCode, newName, newActive, id]
  );

  return res.rows[0];
}

export async function deactivateMember(id) {
  return updateMember(id, { isActive: false });
}

export async function importMembersFromCsv(csvContent) {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new AppError('CSV content is empty', 400, 'EMPTY_CSV');
  }

  // Determine if first row is header
  let startIndex = 0;
  const firstLine = lines[0].toLowerCase();
  if (firstLine.includes('code') || firstLine.includes('name')) {
    startIndex = 1;
  }

  const client = await getClient();
  const imported = [];
  const errors = [];

  try {
    await client.query('BEGIN');

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      // Format: memberCode, fullName or "memberCode","fullName"
      const parts = line.split(',').map((p) => p.replace(/^["']|["']$/g, '').trim());
      if (parts.length < 2) {
        errors.push({ line: i + 1, error: 'Invalid CSV column count (expected memberCode, fullName)' });
        continue;
      }

      const [memberCode, fullName] = parts;
      if (!memberCode || !fullName) {
        errors.push({ line: i + 1, error: 'Member code and full name cannot be blank' });
        continue;
      }

      // Check if already in DB
      const existing = await client.query(
        `SELECT id FROM members WHERE member_code = $1`,
        [memberCode]
      );

      if (existing.rowCount > 0) {
        errors.push({ line: i + 1, error: `Member code '${memberCode}' already exists` });
        continue;
      }

      const insertRes = await client.query(
        `INSERT INTO members (member_code, full_name, is_active)
         VALUES ($1, $2, true)
         RETURNING id, member_code, full_name, is_active`,
        [memberCode, fullName]
      );
      imported.push(insertRes.rows[0]);
    }

    await client.query('COMMIT');
    return {
      importedCount: imported.length,
      imported,
      errors,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

