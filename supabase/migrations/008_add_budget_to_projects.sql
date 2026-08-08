-- =============================================
-- Migration 008: Add budget and code to projects
-- =============================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS budget BIGINT DEFAULT 0;
