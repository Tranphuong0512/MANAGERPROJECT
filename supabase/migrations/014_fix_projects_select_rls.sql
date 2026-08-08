-- Fix projects_select policy to ensure members only see projects they are assigned to
-- and admins/managers see all projects in their organization

DROP POLICY IF EXISTS projects_select ON projects;

CREATE POLICY projects_select ON projects
  FOR SELECT USING (
    deleted_at IS NULL AND
    (
      -- Condition 1: User is an org admin (owner or manager)
      is_org_admin(organization_id)
      OR
      -- Condition 2: User is explicitly a member of the project
      EXISTS (
        SELECT 1 FROM project_members 
        WHERE project_id = id AND user_id = auth.uid()
      )
    )
  );
