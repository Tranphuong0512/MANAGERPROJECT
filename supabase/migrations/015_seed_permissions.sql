-- Insert standard permissions
INSERT INTO permissions (name, description, category) VALUES
  ('view_projects', 'Xem danh sách và chi tiết dự án', 'projects'),
  ('create_projects', 'Tạo dự án mới', 'projects'),
  ('edit_projects', 'Chỉnh sửa thông tin dự án', 'projects'),
  ('delete_projects', 'Xóa dự án', 'projects'),
  ('view_tasks', 'Xem danh sách công việc', 'tasks'),
  ('create_tasks', 'Tạo công việc mới', 'tasks'),
  ('edit_tasks', 'Chỉnh sửa công việc', 'tasks'),
  ('delete_tasks', 'Xóa công việc', 'tasks'),
  ('view_staff', 'Xem danh sách nhân sự', 'staff'),
  ('manage_staff', 'Thêm, sửa, xóa nhân sự', 'staff'),
  ('manage_org', 'Quản lý thông tin và cấu trúc tổ chức', 'organization'),
  ('manage_roles', 'Phân quyền và quản lý vai trò', 'settings')
ON CONFLICT (name) DO NOTHING;

-- Map permissions to roles
DO $$
DECLARE
  owner_role UUID;
  manager_role UUID;
  team_lead_role UUID;
  member_role UUID;
  guest_role UUID;
BEGIN
  SELECT id INTO owner_role FROM user_roles WHERE name = 'owner';
  SELECT id INTO manager_role FROM user_roles WHERE name = 'manager';
  SELECT id INTO team_lead_role FROM user_roles WHERE name = 'team_lead';
  SELECT id INTO member_role FROM user_roles WHERE name = 'member';
  SELECT id INTO guest_role FROM user_roles WHERE name = 'guest';

  -- Owner gets all permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT owner_role, id FROM permissions
  ON CONFLICT DO NOTHING;

  -- Manager gets most permissions except manage_roles
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT manager_role, id FROM permissions WHERE name != 'manage_roles'
  ON CONFLICT DO NOTHING;

  -- Team Lead gets specific permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT team_lead_role, id FROM permissions 
  WHERE name IN ('view_projects', 'view_tasks', 'create_tasks', 'edit_tasks', 'view_staff')
  ON CONFLICT DO NOTHING;

  -- Member gets basic permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT member_role, id FROM permissions 
  WHERE name IN ('view_projects', 'view_tasks', 'view_staff')
  ON CONFLICT DO NOTHING;

  -- Guest gets read-only permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT guest_role, id FROM permissions 
  WHERE name IN ('view_projects', 'view_tasks')
  ON CONFLICT DO NOTHING;
END $$;
