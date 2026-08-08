-- Create member_departments junction table
CREATE TABLE IF NOT EXISTS member_departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_member_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(org_member_id, department_id)
);

-- Enable RLS on member_departments
ALTER TABLE member_departments ENABLE ROW LEVEL SECURITY;

-- Super Admin full access policies for member_departments
CREATE POLICY super_admin_select ON member_departments FOR SELECT USING (is_super_admin());
CREATE POLICY super_admin_insert ON member_departments FOR INSERT WITH CHECK (is_super_admin());
CREATE POLICY super_admin_update ON member_departments FOR UPDATE USING (is_super_admin());
CREATE POLICY super_admin_delete ON member_departments FOR DELETE USING (is_super_admin());

-- Regular RLS policies for member_departments
CREATE POLICY member_departments_select ON member_departments
  FOR SELECT USING (
    org_member_id IN (
      SELECT id FROM organization_members 
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND deleted_at IS NULL
      )
    )
  );

CREATE POLICY member_departments_insert ON member_departments
  FOR INSERT WITH CHECK (
    org_member_id IN (
      SELECT id FROM organization_members 
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() 
        AND role_id IN (SELECT id FROM user_roles WHERE name = 'owner' OR name = 'manager')
        AND deleted_at IS NULL
      )
    )
  );

CREATE POLICY member_departments_delete ON member_departments
  FOR DELETE USING (
    org_member_id IN (
      SELECT id FROM organization_members 
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() 
        AND role_id IN (SELECT id FROM user_roles WHERE name = 'owner' OR name = 'manager')
        AND deleted_at IS NULL
      )
    )
  );

-- Migrate existing data
INSERT INTO member_departments (org_member_id, department_id)
SELECT id, department_id 
FROM organization_members 
WHERE department_id IS NOT NULL 
ON CONFLICT DO NOTHING;

-- Drop department_id from organization_members
ALTER TABLE organization_members DROP COLUMN IF EXISTS department_id;
