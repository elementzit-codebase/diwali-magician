import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT, 10) || 5000,
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'voting_app',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret_must_change_in_production',
    expiresIn: '8h',
  },
  session: {
    secret: process.env.SESSION_SECRET || 'fallback_session_secret_must_change',
    cookieName: 'voting_session',
    maxAge: 30 * 60 * 1000, // 30 minutes for member temporary voting
  },
};

