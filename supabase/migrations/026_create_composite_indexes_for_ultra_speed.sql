-- ============================================================================
-- 026_create_composite_indexes_for_ultra_speed.sql
-- COMPOSITE INDEXES CHO TỐC ĐỘ TRUY VẤN SIÊU NHANH (< 1ms)
-- ============================================================================
-- Tối ưu hóa các bảng core: projects, tasks, checklist_items, staff, incidents
-- Chỉ tạo index trên các bản ghi chưa bị xóa mềm (deleted_at IS NULL)
-- ============================================================================

-- 1. Indexes trên bảng projects
CREATE INDEX IF NOT EXISTS idx_projects_org_active 
  ON projects (organization_id, deleted_at) 
  WHERE deleted_at IS NULL;

-- 2. Indexes trên bảng tasks (cho Thống kê & Quản lý dự án)
CREATE INDEX IF NOT EXISTS idx_tasks_org_active 
  ON tasks (organization_id, deleted_at) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_project_active 
  ON tasks (project_id, deleted_at) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_active 
  ON tasks (assigned_to, deleted_at) 
  WHERE deleted_at IS NULL;

-- 3. Indexes trên bảng checklist_items (Cho tiến độ dự án & workload nhân sự)
CREATE INDEX IF NOT EXISTS idx_cl_items_org_active 
  ON checklist_items (organization_id, deleted_at) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cl_items_assignee_active 
  ON checklist_items (assigned_staff_id, deleted_at) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cl_items_checklist_active 
  ON checklist_items (checklist_id, deleted_at) 
  WHERE deleted_at IS NULL;

-- 4. Indexes trên bảng staff
CREATE INDEX IF NOT EXISTS idx_staff_org_active 
  ON staff (organization_id, deleted_at) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_staff_dept_active 
  ON staff (department_id, deleted_at) 
  WHERE deleted_at IS NULL;

-- 5. Indexes trên bảng incidents
CREATE INDEX IF NOT EXISTS idx_incidents_project_active 
  ON incidents (project_id, deleted_at) 
  WHERE deleted_at IS NULL;
