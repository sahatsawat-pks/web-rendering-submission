-- Migration: 024_add_alternate_subject_ids.sql
-- Adds alternate_subject_ids column to subjects to store comma-separated aliases
-- Run with: psql "$DATABASE_URL" -f migrations/024_add_alternate_subject_ids.sql

ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS alternate_subject_ids TEXT;

-- Optionally normalize existing values (example):
-- UPDATE subjects SET alternate_subject_ids = upper(alternate_subject_ids) WHERE alternate_subject_ids IS NOT NULL;

-- No-op if column already exists.
