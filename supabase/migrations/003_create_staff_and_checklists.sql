-- =============================================
-- Migration 003: Staff, Project Checklists, Checklist Items
-- Nhân sự & Phòng ban tạo sẵn, Checklist công việc trong dự án
-- =============================================

-- Bảng Nhân sự (tạo sẵn, không phải auth user)
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT staff_name_not_empty CHECK (full_name != '')
);

-- Indexes for staff
CREATE INDEX idx_staff_organization_id ON staff(organization_id);
CREATE INDEX idx_staff_department_id ON staff(department_id);
CREATE INDEX idx_staff_deleted_at ON staff(deleted_at);

-- RLS for staff
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view staff in their organizations"
  ON staff FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  ));

CREATE POLICY "Users can create staff"
  ON staff FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  ));

CREATE POLICY "Users can update staff"
  ON staff FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  ));

CREATE POLICY "Users can delete staff"
  ON staff FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deleted_at IS NULL
  ));

-- =============================================
-- Bảng Checklist trong dự án
-- =============================================
CREATE TABLE IF NOT EXISTS project_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT checklist_title_not_empty CHECK (title != '')
);

CREATE INDEX idx_project_checklists_project_id ON project_checklists(project_id);
CREATE INDEX idx_project_checklists_deleted_at ON project_checklists(deleted_at);

-- RLS for project_checklists
ALTER TABLE project_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklists in their projects"
  ON project_checklists FOR SELECT
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE om.user_id = auth.uid() AND om.deleted_at IS NULL AND p.deleted_at IS NULL
  ));

CREATE POLICY "Users can create checklists"
  ON project_checklists FOR INSERT
  WITH CHECK (project_id IN (
    SELECT p.id FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE om.user_id = auth.uid() AND om.deleted_at IS NULL AND p.deleted_at IS NULL
  ));

CREATE POLICY "Users can update checklists"
  ON project_checklists FOR UPDATE
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE om.user_id = auth.uid() AND om.deleted_at IS NULL AND p.deleted_at IS NULL
  ));

CREATE POLICY "Users can delete checklists"
  ON project_checklists FOR DELETE
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE om.user_id = auth.uid() AND om.deleted_at IS NULL AND p.deleted_at IS NULL
  ));

-- =============================================
-- Bảng mục công việc trong checklist
-- =============================================
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID NOT NULL REFERENCES project_checklists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  assigned_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  sort_order INT DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT item_title_not_empty CHECK (title != '')
);

CREATE INDEX idx_checklist_items_checklist_id ON checklist_items(checklist_id);
CREATE INDEX idx_checklist_items_assigned_staff_id ON checklist_items(assigned_staff_id);
CREATE INDEX idx_checklist_items_deleted_at ON checklist_items(deleted_at);

-- RLS for checklist_items
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklist items"
  ON checklist_items FOR SELECT
  USING (checklist_id IN (
    SELECT pc.id FROM project_checklists pc
    JOIN projects p ON p.id = pc.project_id
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE om.user_id = auth.uid() AND om.deleted_at IS NULL AND p.deleted_at IS NULL AND pc.deleted_at IS NULL
  ));

CREATE POLICY "Users can create checklist items"
  ON checklist_items FOR INSERT
  WITH CHECK (checklist_id IN (
    SELECT pc.id FROM project_checklists pc
    JOIN projects p ON p.id = pc.project_id
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE om.user_id = auth.uid() AND om.deleted_at IS NULL AND p.deleted_at IS NULL AND pc.deleted_at IS NULL
  ));

CREATE POLICY "Users can update checklist items"
  ON checklist_items FOR UPDATE
  USING (checklist_id IN (
    SELECT pc.id FROM project_checklists pc
    JOIN projects p ON p.id = pc.project_id
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE om.user_id = auth.uid() AND om.deleted_at IS NULL AND p.deleted_at IS NULL AND pc.deleted_at IS NULL
  ));

CREATE POLICY "Users can delete checklist items"
  ON checklist_items FOR DELETE
  USING (checklist_id IN (
    SELECT pc.id FROM project_checklists pc
    JOIN projects p ON p.id = pc.project_id
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE om.user_id = auth.uid() AND om.deleted_at IS NULL AND p.deleted_at IS NULL AND pc.deleted_at IS NULL
  ));

-- =============================================
-- Cập nhật bảng incidents: thêm cột liên kết checklist_item
-- =============================================
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS checklist_item_id UUID REFERENCES checklist_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_checklist_item_id ON incidents(checklist_item_id);
