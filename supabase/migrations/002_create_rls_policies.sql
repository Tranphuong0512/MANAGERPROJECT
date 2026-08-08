-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_history ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization IDs
CREATE OR REPLACE FUNCTION get_user_org_ids() RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(organization_id) FROM organization_members
  WHERE user_id = auth.uid() AND deleted_at IS NULL
$$ LANGUAGE SQL STABLE;

-- Helper function to check if user is org owner/manager
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM organization_members om
    JOIN user_roles ur ON om.role_id = ur.id
    WHERE om.organization_id = org_id
      AND om.user_id = auth.uid()
      AND om.deleted_at IS NULL
      AND ur.name IN ('owner', 'manager')
  )
$$ LANGUAGE SQL STABLE;

-- Helper function to check if user is project member
CREATE OR REPLACE FUNCTION is_project_member(project_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM project_members
    WHERE project_id = project_id AND user_id = auth.uid()
  ) OR EXISTS(
    SELECT 1 FROM projects p
    JOIN organization_members om ON p.organization_id = om.organization_id
    WHERE p.id = project_id AND om.user_id = auth.uid() AND om.deleted_at IS NULL
  )
$$ LANGUAGE SQL STABLE;

-- Organizations: Users can see orgs they're a member of
CREATE POLICY org_select ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
    OR auth.uid() IS NULL
  );

CREATE POLICY org_insert ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY org_update ON organizations
  FOR UPDATE USING (
    is_org_admin(id)
  );

CREATE POLICY org_delete ON organizations
  FOR DELETE USING (
    is_org_admin(id)
  );

-- Departments: Users can see departments of orgs they're in
CREATE POLICY dept_select ON departments
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY dept_insert ON departments
  FOR INSERT WITH CHECK (
    is_org_admin(organization_id)
  );

CREATE POLICY dept_update ON departments
  FOR UPDATE USING (
    is_org_admin(organization_id)
  );

CREATE POLICY dept_delete ON departments
  FOR DELETE USING (
    is_org_admin(organization_id)
  );

-- Teams: Users can see teams in their orgs
CREATE POLICY teams_select ON teams
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY teams_insert ON teams
  FOR INSERT WITH CHECK (
    is_org_admin(organization_id)
  );

CREATE POLICY teams_update ON teams
  FOR UPDATE USING (
    is_org_admin(organization_id)
  );

CREATE POLICY teams_delete ON teams
  FOR DELETE USING (
    is_org_admin(organization_id)
  );

-- Profiles: Users can read their own profile and org members' profiles
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (
    id = auth.uid() OR
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY profiles_insert ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (id = auth.uid());

-- User Roles: Everyone can see (for UI dropdowns)
CREATE POLICY user_roles_select ON user_roles
  FOR SELECT USING (TRUE);

-- Permissions: Everyone can see (for UI)
CREATE POLICY permissions_select ON permissions
  FOR SELECT USING (TRUE);

-- Role Permissions: Everyone can see
CREATE POLICY role_permissions_select ON role_permissions
  FOR SELECT USING (TRUE);

-- Organization Members: Users can see members of their orgs
CREATE POLICY org_members_select ON organization_members
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND deleted_at IS NULL)
  );

CREATE POLICY org_members_insert ON organization_members
  FOR INSERT WITH CHECK (
    is_org_admin(organization_id)
  );

CREATE POLICY org_members_update ON organization_members
  FOR UPDATE USING (
    is_org_admin(organization_id)
  );

CREATE POLICY org_members_delete ON organization_members
  FOR DELETE USING (
    is_org_admin(organization_id)
  );

-- Projects: Users can see projects of orgs they're in
CREATE POLICY projects_select ON projects
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND deleted_at IS NULL) AND
    deleted_at IS NULL
  );

CREATE POLICY projects_insert ON projects
  FOR INSERT WITH CHECK (
    is_org_admin(organization_id)
  );

CREATE POLICY projects_update ON projects
  FOR UPDATE USING (
    is_project_member(id) AND (
      SELECT COUNT(*) FROM project_members WHERE project_id = id AND user_id = auth.uid()
    ) > 0 OR is_org_admin(organization_id)
  );

CREATE POLICY projects_delete ON projects
  FOR DELETE USING (
    is_org_admin(organization_id)
  );

-- Project Members: Users can see project members they have access to
CREATE POLICY project_members_select ON project_members
  FOR SELECT USING (
    is_project_member(project_id)
  );

CREATE POLICY project_members_insert ON project_members
  FOR INSERT WITH CHECK (
    is_project_member(project_id) AND (
      SELECT COUNT(*) FROM project_members WHERE project_id = project_id AND user_id = auth.uid()
    ) > 0 OR (
      SELECT is_org_admin((SELECT organization_id FROM projects WHERE id = project_id))
    )
  );

CREATE POLICY project_members_delete ON project_members
  FOR DELETE USING (
    is_project_member(project_id)
  );

-- Tasks: Users can see tasks in projects they have access to
CREATE POLICY tasks_select ON tasks
  FOR SELECT USING (
    is_project_member(project_id) AND deleted_at IS NULL
  );

CREATE POLICY tasks_insert ON tasks
  FOR INSERT WITH CHECK (
    is_project_member(project_id)
  );

CREATE POLICY tasks_update ON tasks
  FOR UPDATE USING (
    is_project_member(project_id)
  );

CREATE POLICY tasks_delete ON tasks
  FOR DELETE USING (
    is_project_member(project_id)
  );

-- Task History: Users can see history for tasks they have access to
CREATE POLICY task_history_select ON task_history
  FOR SELECT USING (
    is_project_member((SELECT project_id FROM tasks WHERE id = task_id))
  );

-- Project History: Users can see history for projects they have access to
CREATE POLICY project_history_select ON project_history
  FOR SELECT USING (
    is_project_member((SELECT id FROM projects WHERE id = project_id))
  );
