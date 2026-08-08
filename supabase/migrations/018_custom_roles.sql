-- 0. Drop policies that depend on user_roles.name
DROP POLICY IF EXISTS organizations_update ON organizations;
DROP POLICY IF EXISTS organizations_delete ON organizations;

-- 1. Drop existing unique constraint on name
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_name_key;

-- 2. Change name column to TEXT
ALTER TABLE user_roles ALTER COLUMN name TYPE TEXT USING name::text;

-- 2.1 Recreate dropped policies from 016_add_super_admin.sql
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

-- 3. Add organization_id
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 4. Create unique index for name per organization (using COALESCE to handle NULL for global roles)
DROP INDEX IF EXISTS user_roles_org_name_idx;
CREATE UNIQUE INDEX user_roles_org_name_idx ON user_roles (name, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 5. RLS Policies for user_roles

-- Allow users with edit_settings permission to create roles for their organization
DROP POLICY IF EXISTS user_roles_insert ON user_roles;
CREATE POLICY user_roles_insert ON user_roles
  FOR INSERT WITH CHECK (
    organization_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN role_permissions rp ON om.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE om.user_id = auth.uid() 
      AND om.organization_id = user_roles.organization_id
      AND p.name = 'edit_settings'
      AND om.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS user_roles_update ON user_roles;
CREATE POLICY user_roles_update ON user_roles
  FOR UPDATE USING (
    organization_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN role_permissions rp ON om.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE om.user_id = auth.uid() 
      AND om.organization_id = user_roles.organization_id
      AND p.name = 'edit_settings'
      AND om.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS user_roles_delete ON user_roles;
CREATE POLICY user_roles_delete ON user_roles
  FOR DELETE USING (
    organization_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN role_permissions rp ON om.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE om.user_id = auth.uid() 
      AND om.organization_id = user_roles.organization_id
      AND p.name = 'edit_settings'
      AND om.deleted_at IS NULL
    )
  );

-- Update role_permissions to allow inserting/deleting permissions for custom roles
DROP POLICY IF EXISTS role_permissions_insert ON role_permissions;
CREATE POLICY role_permissions_insert ON role_permissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN organization_members om ON om.organization_id = ur.organization_id
      JOIN role_permissions rp ON om.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.id = role_permissions.role_id
      AND om.user_id = auth.uid()
      AND p.name = 'edit_settings'
      AND om.deleted_at IS NULL
    ) OR EXISTS (
      -- Also allow if it's a global role and user is owner of their org
      SELECT 1 FROM organization_members om
      JOIN user_roles ur2 ON om.role_id = ur2.id
      WHERE om.user_id = auth.uid()
      AND ur2.name = 'owner'
      AND om.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS role_permissions_delete ON role_permissions;
CREATE POLICY role_permissions_delete ON role_permissions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN organization_members om ON om.organization_id = ur.organization_id
      JOIN role_permissions rp ON om.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.id = role_permissions.role_id
      AND om.user_id = auth.uid()
      AND p.name = 'edit_settings'
      AND om.deleted_at IS NULL
    ) OR EXISTS (
      SELECT 1 FROM organization_members om
      JOIN user_roles ur2 ON om.role_id = ur2.id
      WHERE om.user_id = auth.uid()
      AND ur2.name = 'owner'
      AND om.deleted_at IS NULL
    )
  );
