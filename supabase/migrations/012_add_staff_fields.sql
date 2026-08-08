-- =============================================
-- Migration 012: Add staff fields to profiles and organization_members
-- =============================================

-- Add phone to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add job_title and department_id to organization_members
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_org_members_dept_id ON organization_members(department_id);
