-- Migration 002: Seed Permanent Superadmin
-- Ensures permanent Superadmin exists in voting_app database.
-- Password: Admin123456! (Bcrypt hashed with 12 salt rounds)

INSERT INTO admins (full_name, email, password_hash)
VALUES (
    'Super Administrator',
    'admin@luxuryvoting.com',
    '$2b$12$4LqT21F7eLpE5uE6zR3N.eS9j6.D7.b2HjT9jW8mGz7KqP1l3yUeq'
)
ON CONFLICT (email) DO NOTHING;

