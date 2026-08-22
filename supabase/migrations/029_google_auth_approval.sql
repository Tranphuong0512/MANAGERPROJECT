-- =====================================================
-- 029: Google-Only Authentication + Approval Workflow
-- =====================================================
-- Chuyển đổi hệ thống xác thực sang chỉ Google OAuth
-- với cơ chế phê duyệt bởi Super Admin

-- 1. Thêm cột approval vào profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending'
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_avatar_url TEXT;

-- 2. Auto-approve TẤT CẢ user hiện tại (không gián đoạn hoạt động)
UPDATE profiles SET approval_status = 'approved'
WHERE approval_status IS NULL OR approval_status = 'pending';

-- 3. Đảm bảo Super Admin (tranphuong0512@gmail.com) luôn approved + is_super_admin
UPDATE profiles SET approval_status = 'approved', is_super_admin = true
WHERE id IN (SELECT id FROM auth.users WHERE email = 'tranphuong0512@gmail.com');

-- 4. Sửa trigger tạo user mới: Chỉ tạo profile cơ bản, KHÔNG tạo org
--    User mới phải chờ Super Admin duyệt trước khi được gán org
CREATE OR REPLACE FUNCTION public.handle_new_user_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Tạo profile cơ bản với trạng thái pending
  INSERT INTO public.profiles (
    id, full_name, avatar_url, google_email, google_avatar_url, approval_status
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    'pending'
  )
  ON CONFLICT (id) DO UPDATE SET
    google_email = EXCLUDED.google_email,
    google_avatar_url = EXCLUDED.google_avatar_url,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url);

  -- KHÔNG tự tạo organization → chờ Super Admin duyệt và gán
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Index cho query approval nhanh chóng
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_profiles_google_email ON profiles(google_email);
