-- ============================================================
-- 027_sync_all_permissions.sql
-- Đồng bộ tất cả permissions theo cấu trúc tính năng hiện tại
-- ============================================================

-- 1. Thêm tất cả permissions còn thiếu (theo đúng pattern: action_module)
INSERT INTO permissions (name, description, category) VALUES
  -- === MODULE: Sự cố (incidents) ===
  ('view_incidents', 'Xem danh sách và chi tiết sự cố', 'incidents'),
  ('create_incidents', 'Tạo sự cố mới', 'incidents'),
  ('edit_incidents', 'Chỉnh sửa sự cố', 'incidents'),
  ('delete_incidents', 'Xóa sự cố', 'incidents'),

  -- === MODULE: Cải tiến (improvements) ===
  ('view_improvements', 'Xem danh sách và chi tiết cải tiến', 'improvements'),
  ('create_improvements', 'Tạo đề xuất cải tiến mới', 'improvements'),
  ('edit_improvements', 'Chỉnh sửa cải tiến', 'improvements'),
  ('delete_improvements', 'Xóa cải tiến', 'improvements'),

  -- === MODULE: Tổ chức (organization) ===
  ('view_organization', 'Xem thông tin tổ chức', 'organization'),
  ('create_organization', 'Tạo tổ chức mới', 'organization'),
  ('edit_organization', 'Chỉnh sửa thông tin tổ chức', 'organization'),
  ('delete_organization', 'Xóa tổ chức', 'organization'),

  -- === MODULE: Nhân sự (staff) - bổ sung CRUD đầy đủ ===
  ('create_staff', 'Tạo tài khoản nhân sự mới', 'staff'),
  ('edit_staff', 'Chỉnh sửa thông tin nhân sự', 'staff'),
  ('delete_staff', 'Xóa tài khoản nhân sự', 'staff'),

  -- === MODULE: Hệ thống / Cài đặt (settings) ===
  ('view_settings', 'Xem trang cài đặt hệ thống', 'settings'),

  -- === MODULE: Báo cáo (reports) ===
  ('view_reports', 'Xem báo cáo và phân tích', 'reports'),
  ('export_reports', 'Xuất báo cáo', 'reports'),

  -- === MODULE: Dự án - bổ sung export ===
  ('export_projects', 'Xuất dữ liệu dự án', 'projects'),
  ('import_projects', 'Nhập dữ liệu dự án', 'projects')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- Fix category cho permission view_reports cũ (nếu category cũ là 'reporting')
UPDATE permissions SET category = 'reports' WHERE name = 'view_reports' AND category = 'reporting';
UPDATE permissions SET category = 'reports' WHERE name = 'export_data' AND category = 'reporting';

-- 2. Gán toàn bộ permissions cho Owner role
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

  -- Owner: toàn quyền
  IF owner_role IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT owner_role, id FROM permissions
    ON CONFLICT DO NOTHING;
  END IF;

  -- Manager: tất cả trừ manage_roles
  IF manager_role IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT manager_role, id FROM permissions WHERE name NOT IN ('manage_roles')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Team Lead: xem + tạo + sửa (không xóa, không quản lý tổ chức)
  IF team_lead_role IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT team_lead_role, id FROM permissions
    WHERE name IN (
      'view_projects', 'create_projects', 'edit_projects',
      'view_tasks', 'create_tasks', 'edit_tasks',
      'view_incidents', 'create_incidents', 'edit_incidents',
      'view_improvements', 'create_improvements', 'edit_improvements',
      'view_staff',
      'view_organization',
      'view_reports',
      'view_settings'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Member: chỉ xem và tạo
  IF member_role IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT member_role, id FROM permissions
    WHERE name IN (
      'view_projects',
      'view_tasks', 'create_tasks', 'edit_tasks',
      'view_incidents', 'create_incidents',
      'view_improvements', 'create_improvements',
      'view_staff',
      'view_organization',
      'view_reports',
      'view_settings'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Guest: chỉ xem
  IF guest_role IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT guest_role, id FROM permissions
    WHERE name IN (
      'view_projects',
      'view_tasks',
      'view_incidents',
      'view_improvements',
      'view_staff',
      'view_reports'
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 3. Đảm bảo tranphuong0512@gmail.com luôn là super admin
UPDATE profiles
SET is_super_admin = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'tranphuong0512@gmail.com'
);

-- 4. Tạo trigger đảm bảo email chủ sở hữu luôn là super admin
CREATE OR REPLACE FUNCTION ensure_owner_super_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Khi profile được tạo hoặc cập nhật, kiểm tra email chủ sở hữu
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.id AND email = 'tranphuong0512@gmail.com') THEN
    NEW.is_super_admin := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_owner_super_admin_trigger ON profiles;
CREATE TRIGGER ensure_owner_super_admin_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_owner_super_admin();
