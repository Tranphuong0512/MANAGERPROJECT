-- =============================================
-- Migration 028: Align Incidents & Improvements with Project Tasks
-- =============================================

-- Thêm các cột cho bảng incidents
ALTER TABLE incidents 
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_checklist_id UUID REFERENCES project_checklists(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_incidents_department_id ON incidents(department_id);
CREATE INDEX IF NOT EXISTS idx_incidents_related_checklist_id ON incidents(related_checklist_id);

-- Thêm các cột cho bảng improvements
ALTER TABLE improvements
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_checklist_id UUID REFERENCES project_checklists(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_improvements_department_id ON improvements(department_id);
CREATE INDEX IF NOT EXISTS idx_improvements_related_checklist_id ON improvements(related_checklist_id);
CREATE INDEX IF NOT EXISTS idx_improvements_assigned_to ON improvements(assigned_to);

-- Cập nhật schema cache để UI có thể load các trường mới này thông qua supabase-js
NOTIFY pgrst, 'reload schema';
