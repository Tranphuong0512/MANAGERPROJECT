-- =============================================
-- Migration 004: Thêm Timeline và Status cho Checklist Items
-- =============================================

-- 1. Bổ sung ENUM cho trạng thái của checklist item nếu chưa có (không dùng enum để dễ mở rộng, dùng TEXT check constraint)
ALTER TABLE checklist_items 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;

-- 2. Chuyển đổi dữ liệu cũ (nếu có) từ is_completed sang status
UPDATE checklist_items 
SET status = 'done' 
WHERE is_completed = true;

-- (Tùy chọn) Có thể giữ lại is_completed để tương thích ngược tạm thời, 
-- hoặc sau này xóa đi. Ở đây ta giữ lại và update song song trên code.

-- 3. Tạo index cho các cột mới để truy vấn nhanh
CREATE INDEX IF NOT EXISTS idx_checklist_items_status ON checklist_items(status);
CREATE INDEX IF NOT EXISTS idx_checklist_items_start_date ON checklist_items(start_date);
CREATE INDEX IF NOT EXISTS idx_checklist_items_end_date ON checklist_items(end_date);
