import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'voting_app',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };

  // Step 1: Check / create database if necessary using default postgres database connection
  const rootClient = new Client({
    ...dbConfig,
    database: 'postgres',
  });

  try {
    await rootClient.connect();
    const checkDb = await rootClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbConfig.database]
    );
    if (checkDb.rowCount === 0) {
      console.log(`[Database Migrator] Creating database '${dbConfig.database}'...`);
      await rootClient.query(`CREATE DATABASE "${dbConfig.database}"`);
      console.log(`[Database Migrator] Database '${dbConfig.database}' created.`);
    }
  } catch (err) {
    console.warn(`[Database Migrator] Notice checking root DB: ${err.message}`);
  } finally {
    try {
      await rootClient.end();
    } catch (_) {}
  }

  // Step 2: Connect to target database
  const client = new Client(dbConfig);
  try {
    await client.connect();
    console.log(`[Database Migrator] Connected to '${dbConfig.database}' at ${dbConfig.host}:${dbConfig.port}`);

    // Create migrations tracker table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const appliedRes = await client.query(`SELECT filename FROM schema_migrations`);
    const appliedFiles = new Set(appliedRes.rows.map((r) => r.filename));

    const migrationsDir = path.resolve(__dirname, 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (!appliedFiles.has(file)) {
        console.log(`[Database Migrator] Applying migration: ${file}...`);
        const sql = fs.readFileSync(path.resolve(migrationsDir, file), 'utf-8');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          `INSERT INTO schema_migrations (filename) VALUES ($1)`,
          [file]
        );
        await client.query('COMMIT');
        console.log(`[Database Migrator] Successfully applied: ${file}`);
      } else {
        console.log(`[Database Migrator] Skipping already applied: ${file}`);
      }
    }

    console.log(`[Database Migrator] All migrations complete.`);
  } catch (err) {
    console.error(`[Database Migrator] Error during migration:`, err);
    throw err;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { runMigrations };

