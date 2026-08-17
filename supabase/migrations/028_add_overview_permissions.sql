-- ============================================================
-- 028_add_overview_permissions.sql
-- Bổ sung phân quyền cho Phân Hệ Tổng Quan (Overview Module)
-- ============================================================

-- 1. Thêm permissions cho Module Tổng quan (overview)
INSERT INTO permissions (name, description, category) VALUES
  ('view_overview', 'Xem phân hệ tổng quan và bảng giám sát công việc', 'overview'),
  ('approve_overview', 'Duyệt và yêu cầu sửa lại công việc trên bảng giám sát', 'overview'),
  ('export_overview', 'Xuất báo cáo và dữ liệu tổng quan', 'overview')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- 2. Gán permissions cho các Vai trò chuẩn
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

  -- Owner: Toàn quyền module Tổng quan
  IF owner_role IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT owner_role, id FROM permissions WHERE category = 'overview'
    ON CONFLICT DO NOTHING;
  END IF;

  -- Manager: Toàn quyền module Tổng quan
  IF manager_role IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT manager_role, id FROM permissions WHERE category = 'overview'
    ON CONFLICT DO NOTHING;
  END IF;

  -- Team Lead: Xem & Duyệt công việc
  IF team_lead_role IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT team_lead_role, id FROM permissions WHERE name IN ('view_overview', 'approve_overview', 'export_overview')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Member: Xem phân hệ tổng quan
  IF member_role IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT member_role, id FROM permissions WHERE name IN ('view_overview')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Guest: Xem phân hệ tổng quan
  IF guest_role IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT guest_role, id FROM permissions WHERE name IN ('view_overview')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
