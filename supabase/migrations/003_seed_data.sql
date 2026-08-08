-- Insert default user roles
INSERT INTO user_roles (name, description) VALUES
  ('owner', 'Organization owner with full access'),
  ('manager', 'Manager with administrative permissions'),
  ('team_lead', 'Team lead with team management permissions'),
  ('member', 'Regular member with read/write on assigned items'),
  ('guest', 'Guest with read-only access')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (name, description, category) VALUES
  ('manage_organization', 'Can manage organization settings', 'organization'),
  ('manage_departments', 'Can manage departments', 'organization'),
  ('manage_teams', 'Can manage teams', 'organization'),
  ('manage_members', 'Can manage members', 'organization'),
  ('view_members', 'Can view members', 'organization'),
  
  ('create_project', 'Can create projects', 'project'),
  ('edit_project', 'Can edit projects', 'project'),
  ('delete_project', 'Can delete projects', 'project'),
  ('manage_project_members', 'Can manage project members', 'project'),
  
  ('create_task', 'Can create tasks', 'task'),
  ('edit_task', 'Can edit tasks', 'task'),
  ('delete_task', 'Can delete tasks', 'task'),
  ('assign_task', 'Can assign tasks', 'task'),
  
  ('view_reports', 'Can view reports', 'reporting'),
  ('export_data', 'Can export data', 'reporting')
ON CONFLICT (name) DO NOTHING;

-- Map roles to permissions
INSERT INTO role_permissions (role_id, permission_id) 
SELECT ur.id, p.id FROM user_roles ur, permissions p
WHERE ur.name = 'owner'
ON CONFLICT DO NOTHING;

-- Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT ur.id, p.id FROM user_roles ur, permissions p
WHERE ur.name = 'manager' AND p.name IN (
  'view_members', 'manage_teams', 'create_project', 'edit_project',
  'manage_project_members', 'create_task', 'edit_task', 'assign_task',
  'view_reports', 'export_data'
)
ON CONFLICT DO NOTHING;

-- Team Lead permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT ur.id, p.id FROM user_roles ur, permissions p
WHERE ur.name = 'team_lead' AND p.name IN (
  'view_members', 'create_task', 'edit_task', 'assign_task', 'view_reports'
)
ON CONFLICT DO NOTHING;

-- Member permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT ur.id, p.id FROM user_roles ur, permissions p
WHERE ur.name = 'member' AND p.name IN (
  'view_members', 'create_task', 'edit_task', 'view_reports'
)
ON CONFLICT DO NOTHING;

-- Guest permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT ur.id, p.id FROM user_roles ur, permissions p
WHERE ur.name = 'guest' AND p.name IN (
  'view_members', 'view_reports'
)
ON CONFLICT DO NOTHING;
