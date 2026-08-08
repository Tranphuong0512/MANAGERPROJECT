-- =============================================
-- Migration 007: Improvements Table and Checklist Items Tracking
-- =============================================

-- 1. Create Improvements Table
CREATE TABLE IF NOT EXISTS improvements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES checklist_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  module TEXT,
  impact_level TEXT DEFAULT 'medium' CHECK (impact_level IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'implemented', 'rejected')),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_improvements_project_id ON improvements(project_id);
CREATE INDEX IF NOT EXISTS idx_improvements_checklist_item_id ON improvements(checklist_item_id);

-- Enable RLS
ALTER TABLE improvements ENABLE ROW LEVEL SECURITY;

-- 2. Link existing incidents to checklist items
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS checklist_item_id UUID REFERENCES checklist_items(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_incidents_checklist_item_id ON incidents(checklist_item_id);
