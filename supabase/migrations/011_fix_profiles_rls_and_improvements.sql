-- =============================================
-- Migration 011: Khắc phục lỗi RLS của Profiles và Cập nhật Improvements
-- =============================================

-- 1. Sửa lỗi RLS của bảng profiles
-- (Chính sách cũ yêu cầu profiles.organization_id phải có, dẫn đến việc không xem được thông tin thành viên khác)
DROP POLICY IF EXISTS profiles_select ON profiles;

CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 
      FROM organization_members m1
      JOIN organization_members m2 ON m1.organization_id = m2.organization_id
      WHERE m1.user_id = profiles.id 
        AND m1.deleted_at IS NULL
        AND m2.user_id = auth.uid()
        AND m2.deleted_at IS NULL
    )
  );

-- 2. Thêm cột assigned_to cho bảng improvements (nếu chưa có)
-- Đoạn này để đảm bảo rằng bảng improvements có thể gán được người thực hiện
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'improvements' AND column_name = 'assigned_to') THEN
    ALTER TABLE improvements ADD COLUMN assigned_to UUID REFERENCES auth.users(id);
  END IF;
END $$;
