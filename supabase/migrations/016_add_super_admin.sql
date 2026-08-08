-- Add is_super_admin column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Create function to check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update organizations RLS to allow super admins to select/delete any organization
DROP POLICY IF EXISTS organizations_select ON organizations;
CREATE POLICY organizations_select ON organizations
  FOR SELECT USING (
    is_super_admin() OR
    id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  );

DROP POLICY IF EXISTS organizations_update ON organizations;
CREATE POLICY organizations_update ON organizations
  FOR UPDATE USING (
    is_super_admin() OR
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM user_roles WHERE name = 'owner')
      AND deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS organizations_delete ON organizations;
CREATE POLICY organizations_delete ON organizations
  FOR DELETE USING (
    is_super_admin() OR
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role_id IN (SELECT id FROM user_roles WHERE name = 'owner')
      AND deleted_at IS NULL
    )
  );
