-- Migration 002: Seed Permanent Superadmin
-- Ensures permanent Superadmin exists in voting_app database.
-- Password: Admin123456! (Bcrypt hashed with 12 salt rounds)

INSERT INTO admins (full_name, email, password_hash)
VALUES (
    'Super Administrator',
    'admin@voting.com',
    '$2b$12$fAx7EZUEjV99Vc3KjIIFT.xDtHiq2SP.VWwBHqVuS9AHe40KR.GYe'
)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

