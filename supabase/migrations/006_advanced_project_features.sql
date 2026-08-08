-- =============================================
-- Migration 006: Advanced Project Features (Priority, Progress, Activities)
-- =============================================

-- 1. Bổ sung các trường vào bảng projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES staff(id) ON DELETE SET NULL;

-- 2. Bổ sung các trường vào bảng checklist_items
ALTER TABLE checklist_items
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

-- 3. Cập nhật dữ liệu cũ nếu cần
UPDATE checklist_items SET progress = 100 WHERE status = 'done' OR is_completed = true;
UPDATE checklist_items SET progress = 0 WHERE status = 'todo' AND progress = 0;

-- 4. Bảng Project Activities
CREATE TABLE IF NOT EXISTS project_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'status_change', 'task_completed', 'comment_added', 'bug_fixed', etc.
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_project_activities_project_id ON project_activities(project_id);
CREATE INDEX idx_project_activities_created_at ON project_activities(created_at DESC);

-- RLS cho Project Activities
ALTER TABLE project_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activities in their projects"
  ON project_activities FOR SELECT
  USING (project_id IN (
    SELECT p.id FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE om.user_id = auth.uid() AND om.deleted_at IS NULL AND p.deleted_at IS NULL
  ));

CREATE POLICY "Users can insert activities in their projects"
  ON project_activities FOR INSERT
  WITH CHECK (project_id IN (
    SELECT p.id FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE om.user_id = auth.uid() AND om.deleted_at IS NULL AND p.deleted_at IS NULL
  ) AND user_id = auth.uid());
