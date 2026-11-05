-- Migration 004: Allow draft events to have flexible or nullable start/end schedule
ALTER TABLE events ALTER COLUMN start_at DROP NOT NULL;
ALTER TABLE events ALTER COLUMN end_at DROP NOT NULL;
ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_event_schedule;
ALTER TABLE events ADD CONSTRAINT chk_event_schedule CHECK (
    (start_at IS NULL AND end_at IS NULL) OR 
    (start_at IS NOT NULL AND end_at IS NOT NULL AND end_at > start_at)
);

