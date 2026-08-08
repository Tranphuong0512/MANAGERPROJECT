-- Migration 024: Add delete policy for improvements
CREATE POLICY improvements_delete ON improvements
  FOR DELETE USING (
    is_org_admin(organization_id) OR
    reporter_id = auth.uid() OR
    (SELECT 1 FROM permissions p 
     JOIN role_permissions rp ON p.id = rp.permission_id 
     JOIN user_roles ur ON rp.role_id = ur.role_id 
     WHERE p.name = 'delete_improvements' AND ur.user_id = auth.uid() AND ur.organization_id = improvements.organization_id
     LIMIT 1) IS NOT NULL
  );
