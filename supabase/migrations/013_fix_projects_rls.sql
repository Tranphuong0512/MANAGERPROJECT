-- Fix projects insert RLS policy to allow any organization member to create a project
DROP POLICY IF EXISTS projects_insert ON projects;

CREATE POLICY projects_insert ON projects
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Also update projects update policy so members can update projects if they are in the org
DROP POLICY IF EXISTS projects_update ON projects;

CREATE POLICY projects_update ON projects
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );
