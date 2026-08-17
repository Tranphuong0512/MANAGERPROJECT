import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const ALL_SYSTEM_PERMISSIONS = [
  // === MODULE: Tổng quan giám sát (overview) ===
  { name: 'view_overview', description: 'Xem phân hệ tổng quan và bảng giám sát công việc', category: 'overview' },
  { name: 'approve_overview', description: 'Duyệt và yêu cầu sửa lại công việc trên bảng giám sát', category: 'overview' },
  { name: 'export_overview', description: 'Xuất báo cáo và dữ liệu tổng quan', category: 'overview' },

  // === MODULE: Dự án (projects) ===
  { name: 'view_projects', description: 'Xem danh sách và chi tiết dự án', category: 'projects' },
  { name: 'create_projects', description: 'Tạo dự án mới', category: 'projects' },
  { name: 'edit_projects', description: 'Chỉnh sửa thông tin dự án', category: 'projects' },
  { name: 'delete_projects', description: 'Xóa dự án', category: 'projects' },
  { name: 'export_projects', description: 'Xuất dữ liệu dự án', category: 'projects' },
  { name: 'import_projects', description: 'Nhập dữ liệu dự án', category: 'projects' },

  // === MODULE: Công việc (tasks) ===
  { name: 'view_tasks', description: 'Xem danh sách công việc', category: 'tasks' },
  { name: 'create_tasks', description: 'Tạo công việc mới', category: 'tasks' },
  { name: 'edit_tasks', description: 'Chỉnh sửa công việc', category: 'tasks' },
  { name: 'delete_tasks', description: 'Xóa công việc', category: 'tasks' },
  { name: 'export_tasks', description: 'Xuất dữ liệu công việc', category: 'tasks' },
  { name: 'import_tasks', description: 'Nhập dữ liệu công việc', category: 'tasks' },

  // === MODULE: Sự cố (incidents) ===
  { name: 'view_incidents', description: 'Xem danh sách và chi tiết sự cố', category: 'incidents' },
  { name: 'create_incidents', description: 'Tạo sự cố mới', category: 'incidents' },
  { name: 'edit_incidents', description: 'Chỉnh sửa sự cố', category: 'incidents' },
  { name: 'delete_incidents', description: 'Xóa sự cố', category: 'incidents' },
  { name: 'export_incidents', description: 'Xuất dữ liệu sự cố', category: 'incidents' },
  { name: 'import_incidents', description: 'Nhập dữ liệu sự cố', category: 'incidents' },

  // === MODULE: Cải tiến (improvements) ===
  { name: 'view_improvements', description: 'Xem danh sách và chi tiết cải tiến', category: 'improvements' },
  { name: 'create_improvements', description: 'Tạo đề xuất cải tiến mới', category: 'improvements' },
  { name: 'edit_improvements', description: 'Chỉnh sửa cải tiến', category: 'improvements' },
  { name: 'delete_improvements', description: 'Xóa cải tiến', category: 'improvements' },
  { name: 'export_improvements', description: 'Xuất dữ liệu cải tiến', category: 'improvements' },
  { name: 'import_improvements', description: 'Nhập dữ liệu cải tiến', category: 'improvements' },

  // === MODULE: Nhân sự (staff) ===
  { name: 'view_staff', description: 'Xem danh sách nhân sự', category: 'staff' },
  { name: 'create_staff', description: 'Tạo tài khoản nhân sự mới', category: 'staff' },
  { name: 'edit_staff', description: 'Chỉnh sửa thông tin nhân sự', category: 'staff' },
  { name: 'delete_staff', description: 'Xóa tài khoản nhân sự', category: 'staff' },
  { name: 'manage_staff', description: 'Thêm, sửa, xóa và quản lý nhân sự', category: 'staff' },

  // === MODULE: Tổ chức (organization) ===
  { name: 'view_organization', description: 'Xem thông tin tổ chức', category: 'organization' },
  { name: 'create_organization', description: 'Tạo tổ chức mới', category: 'organization' },
  { name: 'edit_organization', description: 'Chỉnh sửa thông tin tổ chức', category: 'organization' },
  { name: 'delete_organization', description: 'Xóa tổ chức', category: 'organization' },
  { name: 'manage_org', description: 'Quản lý thông tin và cấu trúc tổ chức', category: 'organization' },

  // === MODULE: Báo cáo (reports) ===
  { name: 'view_reports', description: 'Xem báo cáo và phân tích', category: 'reports' },
  { name: 'export_reports', description: 'Xuất báo cáo', category: 'reports' },

  // === MODULE: Hệ thống / Cài đặt (settings) ===
  { name: 'view_settings', description: 'Xem trang cài đặt hệ thống', category: 'settings' },
  { name: 'manage_roles', description: 'Phân quyền và quản lý vai trò', category: 'settings' },
]

export async function GET(request: Request) {
  try {
    const admin = getSupabaseAdminClient()

    // 1. Tự động Upsert các permissions hệ thống để đảm bảo luôn đầy đủ
    await admin.from('permissions').upsert(ALL_SYSTEM_PERMISSIONS, { onConflict: 'name' })

    // 2. Lấy danh sách permissions mới nhất
    const { data: permissions, error: permsError } = await admin
      .from('permissions')
      .select('*')
      .order('category')

    if (permsError) throw permsError

    // 3. Đảm bảo vai trò owner & manager có permissions mới nhất
    const { data: roles } = await admin.from('user_roles').select('*')

    if (roles && permissions) {
      const ownerRole = roles.find(r => r.name === 'owner')
      if (ownerRole) {
        const ownerPermEntries = permissions.map(p => ({
          role_id: ownerRole.id,
          permission_id: p.id,
        }))
        await admin.from('role_permissions').upsert(ownerPermEntries, { onConflict: 'role_id,permission_id' }).select()
      }

      const managerRole = roles.find(r => r.name === 'manager')
      if (managerRole) {
        const managerPermEntries = permissions
          .filter(p => p.name !== 'manage_roles')
          .map(p => ({
            role_id: managerRole.id,
            permission_id: p.id,
          }))
        await admin.from('role_permissions').upsert(managerPermEntries, { onConflict: 'role_id,permission_id' }).select()
      }

      const teamLeadRole = roles.find(r => r.name === 'team_lead')
      if (teamLeadRole) {
        const leadPermNames = [
          'view_overview', 'approve_overview', 'export_overview',
          'view_projects', 'create_projects', 'edit_projects',
          'view_tasks', 'create_tasks', 'edit_tasks',
          'view_staff', 'view_incidents', 'create_incidents', 'edit_incidents',
          'view_improvements', 'create_improvements', 'edit_improvements',
          'view_reports', 'export_reports'
        ]
        const leadPermEntries = permissions
          .filter(p => leadPermNames.includes(p.name))
          .map(p => ({
            role_id: teamLeadRole.id,
            permission_id: p.id,
          }))
        await admin.from('role_permissions').upsert(leadPermEntries, { onConflict: 'role_id,permission_id' }).select()
      }

      const memberRole = roles.find(r => r.name === 'member')
      if (memberRole) {
        const memberPermNames = ['view_overview', 'view_projects', 'view_tasks', 'view_staff', 'view_incidents', 'view_improvements', 'view_reports']
        const memberPermEntries = permissions
          .filter(p => memberPermNames.includes(p.name))
          .map(p => ({
            role_id: memberRole.id,
            permission_id: p.id,
          }))
        await admin.from('role_permissions').upsert(memberPermEntries, { onConflict: 'role_id,permission_id' }).select()
      }

      const guestRole = roles.find(r => r.name === 'guest')
      if (guestRole) {
        const guestPermNames = ['view_overview', 'view_projects', 'view_tasks']
        const guestPermEntries = permissions
          .filter(p => guestPermNames.includes(p.name))
          .map(p => ({
            role_id: guestRole.id,
            permission_id: p.id,
          }))
        await admin.from('role_permissions').upsert(guestPermEntries, { onConflict: 'role_id,permission_id' }).select()
      }
    }

    // 4. Lấy danh sách role_permissions mới nhất
    const { data: role_permissions } = await admin.from('role_permissions').select('*')

    return NextResponse.json({
      success: true,
      permissions: permissions || ALL_SYSTEM_PERMISSIONS,
      roles: roles || [],
      role_permissions: role_permissions || []
    })
  } catch (error: any) {
    console.error('Error in /api/v1/permissions:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      permissions: ALL_SYSTEM_PERMISSIONS
    }, { status: 500 })
  }
}
