-- =============================================
-- Migration 010: Add assigned_to to Improvements
-- =============================================

ALTER TABLE improvements
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_improvements_assigned_to ON improvements(assigned_to);
