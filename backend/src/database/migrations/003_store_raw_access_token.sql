-- Migration 003: Store raw_access_token in events table for direct admin link access
ALTER TABLE events ADD COLUMN IF NOT EXISTS raw_access_token VARCHAR(255);

