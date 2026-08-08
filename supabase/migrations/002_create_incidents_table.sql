-- =============================================
-- Migration 002: Create Incidents Table
-- Bảng ghi nhận sự cố / lỗi phát sinh trong dự án
-- =============================================

-- Enums cho sự cố
CREATE TYPE incident_severity AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE incident_status AS ENUM ('new', 'investigating', 'fixing', 'resolved', 'closed');

-- Bảng sự cố
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  severity incident_severity DEFAULT 'medium',
  status incident_status DEFAULT 'new',
  reported_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT incident_title_not_empty CHECK (title != '')
);

-- Indexes
CREATE INDEX idx_incidents_project_id ON incidents(project_id);
CREATE INDEX idx_incidents_organization_id ON incidents(organization_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_reported_by ON incidents(reported_by);
CREATE INDEX idx_incidents_deleted_at ON incidents(deleted_at);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);

-- RLS Policies
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read incidents in their organizations
CREATE POLICY "Users can view incidents in their organizations"
  ON incidents FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Allow authenticated users to insert incidents
CREATE POLICY "Users can create incidents"
  ON incidents FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Allow authenticated users to update incidents in their organizations
CREATE POLICY "Users can update incidents in their organizations"
  ON incidents FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Allow authenticated users to delete incidents in their organizations
CREATE POLICY "Users can delete incidents in their organizations"
  ON incidents FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );
