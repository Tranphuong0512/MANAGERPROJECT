-- =============================================
-- Migration 025: Thêm khả năng gán nhiều người phụ trách cho Checklist Item
-- =============================================

-- 1. Thêm cột assignee_ids dạng mảng (Array of UUIDs)
ALTER TABLE checklist_items 
ADD COLUMN IF NOT EXISTS assignee_ids UUID[] DEFAULT '{}'::UUID[];

-- 2. Chuyển đổi dữ liệu cũ (đưa người phụ trách cũ vào mảng mới)
UPDATE checklist_items
SET assignee_ids = ARRAY[assigned_staff_id]
WHERE assigned_staff_id IS NOT NULL AND (assignee_ids IS NULL OR array_length(assignee_ids, 1) IS NULL);

-- Lưu ý: Không xóa cột assigned_staff_id cũ ngay để đảm bảo an toàn.
