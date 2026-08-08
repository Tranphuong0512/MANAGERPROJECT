import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * ============================================================================
 * XÓA TOÀN BỘ DỮ LIỆU ĐỂ ĐỒNG BỘ LẠI
 * ============================================================================
 * Xóa theo thứ tự FK dependency (bảng con trước, bảng cha sau).
 * Giữ lại:
 *   - Tài khoản admin (auth.users + profiles)
 *   - Bảng cấu hình hệ thống (user_roles, permissions, role_permissions)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const confirmCode = body.confirm;

    if (confirmCode !== 'XOA-HET-DU-LIEU') {
      return NextResponse.json(
        {
          error: 'Cần gửi { "confirm": "XOA-HET-DU-LIEU" } để xác nhận xóa toàn bộ dữ liệu.',
          warning: 'Hành động này KHÔNG THỂ hoàn tác!',
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const results: { table: string; action: string; error?: string }[] = [];

    // Helper: xóa toàn bộ dữ liệu trong một bảng
    const truncateTable = async (tableName: string) => {
      try {
        // Supabase không có truncate trực tiếp, dùng delete với điều kiện luôn đúng
        const { error } = await supabaseAdmin
          .from(tableName)
          .delete()
          .gte('created_at', '1970-01-01');

        if (error) {
          results.push({ table: tableName, action: 'error', error: error.message });
        } else {
          results.push({ table: tableName, action: 'deleted' });
        }
      } catch (err: any) {
        results.push({ table: tableName, action: 'error', error: err.message });
      }
    };

    // =====================================================
    // THỨ TỰ XÓA: Bảng con → Bảng cha
    // =====================================================

    // 1. Xóa lịch sử
    await truncateTable('task_history');
    await truncateTable('project_history');

    // 2. Xóa công việc con (checklist items)
    await truncateTable('checklist_items');

    // 3. Xóa checklist (project_checklists)
    await truncateTable('project_checklists');

    // 4. Xóa tasks
    await truncateTable('tasks');

    // 5. Xóa sự cố
    await truncateTable('incidents');

    // 6. Xóa cải tiến
    await truncateTable('improvements');

    // 7. Xóa project members
    await truncateTable('project_members');

    // 8. Xóa dự án
    await truncateTable('projects');

    // 9. Xóa nhân sự (staff table - APEC employees)
    await truncateTable('staff');

    // 10. Xóa member_departments (liên kết nhân sự - phòng ban)
    await truncateTable('member_departments');

    // 11. Xóa organization members (giữ lại admin)
    // Tìm admin user trước
    const { data: adminMembers } = await supabaseAdmin
      .from('organization_members')
      .select('id, user_id, role_id, user_roles(name)')
      .eq('user_roles.name', 'owner');

    const adminUserIds = (adminMembers || [])
      .filter((m: any) => m.user_roles?.name === 'owner')
      .map((m: any) => m.user_id);

    // Xóa tất cả organization members KHÔNG phải admin/owner
    if (adminUserIds.length > 0) {
      const { error: delMemberErr } = await supabaseAdmin
        .from('organization_members')
        .delete()
        .not('user_id', 'in', `(${adminUserIds.join(',')})`);

      results.push({
        table: 'organization_members',
        action: delMemberErr ? 'error' : 'deleted (giữ admin)',
        error: delMemberErr?.message,
      });
    } else {
      // Nếu không tìm thấy admin, xóa tất cả
      await truncateTable('organization_members');
    }

    // 12. Xóa teams
    await truncateTable('teams');

    // 13. Xóa departments
    await truncateTable('departments');

    // 14. Xóa API keys & webhooks
    await truncateTable('api_keys');
    await truncateTable('webhooks');

    // 15. Xóa profiles KHÔNG phải admin (trước organizations vì profiles.organization_id -> organizations)
    if (adminUserIds.length > 0) {
      const { error: delProfileErr } = await supabaseAdmin
        .from('profiles')
        .delete()
        .not('id', 'in', `(${adminUserIds.join(',')})`);

      results.push({
        table: 'profiles',
        action: delProfileErr ? 'error' : 'deleted (giữ admin)',
        error: delProfileErr?.message,
      });

      // Clear organization_id trên admin profiles để tránh FK constraint
      const { error: clearOrgErr } = await supabaseAdmin
        .from('profiles')
        .update({ organization_id: null })
        .in('id', adminUserIds);

      results.push({
        table: 'profiles (clear org_id)',
        action: clearOrgErr ? 'error' : 'cleared',
        error: clearOrgErr?.message,
      });
    } else {
      await truncateTable('profiles');
    }

    // 16. Xóa organizations (sau khi profiles đã xóa FK)
    await truncateTable('organizations');

    // Tổng kết
    const errors = results.filter((r) => r.action === 'error');
    const success = results.filter((r) => r.action !== 'error');

    return NextResponse.json({
      success: errors.length === 0,
      message: `Đã xóa ${success.length} bảng thành công${errors.length > 0 ? `, ${errors.length} bảng lỗi` : ''}`,
      admin_preserved: adminUserIds,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi server khi xóa dữ liệu' },
      { status: 500 }
    );
  }
}
