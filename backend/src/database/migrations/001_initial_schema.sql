-- Migration 001: Initial Schema for Premium QR Code Voting Application
-- Creates all tables, constraints, indexes, and relationships.
-- Strictly NO SEED DATA.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- 2. Members Table
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_members_member_code ON members(member_code);
CREATE INDEX IF NOT EXISTS idx_members_is_active ON members(is_active);

-- 3. Events Table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'closed')),
    access_token_hash VARCHAR(64) NOT NULL UNIQUE,
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_event_schedule CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_access_token_hash ON events(access_token_hash);
CREATE INDEX IF NOT EXISTS idx_events_schedule ON events(start_at, end_at);

-- 4. Event Members Table (Registration and Eligibility per Event)
CREATE TABLE IF NOT EXISTS event_members (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    is_eligible BOOLEAN NOT NULL DEFAULT TRUE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_event_members_member ON event_members(member_id);

-- 5. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_event_category_name UNIQUE (event_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_event ON categories(event_id);

-- 6. Category Candidates Table
-- All eligible event members are candidates for categories in that event
CREATE TABLE IF NOT EXISTS category_candidates (
    event_id UUID NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    PRIMARY KEY (category_id, member_id),
    CONSTRAINT fk_category_candidate_event_member FOREIGN KEY (event_id, member_id) 
        REFERENCES event_members(event_id, member_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cat_candidates_event ON category_candidates(event_id);
CREATE INDEX IF NOT EXISTS idx_cat_candidates_member ON category_candidates(member_id);

-- 7. Voter Participation Table
-- Enforces: Each member can submit at most ONE ballot per event.
-- Decoupled from the ballot choices to maintain confidential voting.
CREATE TABLE IF NOT EXISTS voter_participation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_event_member_participation UNIQUE (event_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_voter_participation_event ON voter_participation(event_id);
CREATE INDEX IF NOT EXISTS idx_voter_participation_member ON voter_participation(member_id);

-- 8. Ballots Table (Confidential Ballot Container)
-- Does NOT contain voter_member_id.
CREATE TABLE IF NOT EXISTS ballots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ballots_event ON ballots(event_id);

-- 9. Ballot Choices Table
-- Stores candidate selections per category for each ballot.
-- Composite foreign key guarantees that candidate belongs to the category.
CREATE TABLE IF NOT EXISTS ballot_choices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ballot_id UUID NOT NULL REFERENCES ballots(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category_id UUID NOT NULL,
    candidate_member_id UUID NOT NULL,
    CONSTRAINT uq_ballot_category UNIQUE (ballot_id, category_id),
    CONSTRAINT fk_ballot_choice_candidate FOREIGN KEY (category_id, candidate_member_id) 
        REFERENCES category_candidates(category_id, member_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ballot_choices_ballot ON ballot_choices(ballot_id);
CREATE INDEX IF NOT EXISTS idx_ballot_choices_tally ON ballot_choices(event_id, category_id, candidate_member_id);

