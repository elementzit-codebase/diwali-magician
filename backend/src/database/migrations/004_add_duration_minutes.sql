-- Migration 004: Add duration_minutes to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 5;

