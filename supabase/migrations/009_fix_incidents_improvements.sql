-- 1. Thêm cột module cho bảng incidents nếu chưa có
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS module TEXT;

-- 2. Tạo RLS Policies cho bảng improvements
-- Allow authenticated users to view improvements in their organizations
CREATE POLICY "Users can view improvements in their organizations"
  ON improvements FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Allow authenticated users to insert improvements
CREATE POLICY "Users can create improvements"
  ON improvements FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Allow authenticated users to update improvements in their organizations
CREATE POLICY "Users can update improvements in their organizations"
  ON improvements FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );
