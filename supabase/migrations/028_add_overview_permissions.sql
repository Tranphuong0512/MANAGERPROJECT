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

-- 2. Gán quyền cho Vai trò: Owner & Manager (Toàn quyền Overview)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM user_roles r
CROSS JOIN permissions p
WHERE p.category = 'overview'
  AND r.name IN ('owner', 'manager')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. Gán quyền cho Vai trò: Team Lead (Xem, Duyệt & Xuất báo cáo)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM user_roles r
CROSS JOIN permissions p
WHERE p.name IN ('view_overview', 'approve_overview', 'export_overview')
  AND r.name = 'team_lead'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. Gán quyền cho Vai trò: Member & Guest (Xem phân hệ tổng quan)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM user_roles r
CROSS JOIN permissions p
WHERE p.name = 'view_overview'
  AND r.name IN ('member', 'guest')
ON CONFLICT (role_id, permission_id) DO NOTHING;
