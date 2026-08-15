import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { executeBiDirectionalSync } from '@/lib/services/apec-bi-sync'
import { requireAdminRequest } from '@/lib/admin-route-guard'

export async function GET(request: NextRequest) {
  try {
    const adminGuard = await requireAdminRequest(request)
    if (!adminGuard.authorized) return adminGuard.response

    const supabaseAdmin = getSupabaseAdminClient()

    // 1. Load profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    // 2. Load auth users for emails
    const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers()
    const users = authUsersData?.users || []

    // 3. Load organization_members for role and department info
    const { data: orgMembers } = await supabaseAdmin
      .from('organization_members')
      .select(`
        id, user_id, organization_id, job_title, role_id,
        member_departments(
          departments(name)
        ),
        user_roles(id, name, description)
      `)
      .is('deleted_at', null)

    // 4. Map profiles into accountList
    const accounts = (profiles || []).map((p: any) => {
      const authUser = users.find(u => u.id === p.id)
      const email = authUser?.email || 'Chưa có email'
      const member = orgMembers?.find((m: any) => m.user_id === p.id)
      const deptNames = member?.member_departments?.map((md: any) => md.departments?.name).filter(Boolean) || []
      const userRolesData = (member as any)?.user_roles
      const userRoleObj = Array.isArray(userRolesData) ? userRolesData[0] : userRolesData
      const roleName = userRoleObj?.description || userRoleObj?.name || member?.job_title || (p.is_super_admin ? 'Quản trị viên (Super Admin)' : 'Thành viên')

      return {
        id: p.id,
        org_member_id: member?.id || p.id,
        full_name: p.full_name || email.split('@')[0] || 'Tài khoản chưa đặt tên',
        email: email,
        phone: p.phone || '-',
        role: roleName,
        role_id: member?.role_id || userRoleObj?.id,
        departments: deptNames,
        is_super_admin: p.is_super_admin || false,
        stats: {
          tasks: 0,
          completedTasks: 0,
          checklists: 0,
          incidentsReported: 0,
          incidentsAssigned: 0,
          incidentsResolved: 0,
          incidents: 0,
          improvements: 0,
          orgs: 1
        },
        isAccount: true
      }
    })

    return NextResponse.json({ success: true, accounts })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminGuard = await requireAdminRequest(request)
    if (!adminGuard.authorized) return adminGuard.response

    const { email, password, full_name, organization_ids, department_ids, role, phone } = await request.json()

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc (Email, Mật khẩu, Họ tên)' }, { status: 400 })
    }

    const validOrgIds = Array.isArray(organization_ids) ? organization_ids.filter(Boolean) : []

    const supabaseAdmin = getSupabaseAdminClient()

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })
    const userId = authData.user.id

    // Fetch member role
    const { data: roleDataList } = await supabaseAdmin.from('user_roles').select('id').eq('name', 'member').limit(1)
    const roleData = roleDataList?.[0] || null

    // 2. Insert into profiles
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      full_name: full_name,
      phone: phone || null
    })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // 3. Process organizations and departments
    if (validOrgIds.length > 0 && roleData) {
      for (const orgId of validOrgIds) {
        const { data: orgMember, error: orgError } = await supabaseAdmin
          .from('organization_members')
          .insert({
            organization_id: orgId,
            user_id: userId,
            role_id: roleData.id,
            job_title: role || null
          })
          .select('id')
          .single()

        if (orgError) continue;

        if (department_ids && department_ids.length > 0) {
          // Find departments belonging to this org
          const { data: orgDepts } = await supabaseAdmin
            .from('departments')
            .select('id')
            .eq('organization_id', orgId)
            .in('id', department_ids)
          
          if (orgDepts && orgDepts.length > 0) {
            const memberDepts = orgDepts.map(d => ({
              org_member_id: orgMember.id,
              department_id: d.id
            }))
            await supabaseAdmin.from('member_departments').insert(memberDepts)
          }
        }
      }
    }

    // Đồng bộ 2 chiều lên APEC GLOBAL API (Employee API - không phải tài khoản login)
    await executeBiDirectionalSync({
      entityType: 'employee',
      action: 'CREATE',
      data: {
        id: userId,
        fullname: full_name,
        name: full_name,
        email,
        phone,
        job_title: role,
        company_id: validOrgIds[0],
      },
      changedBy: userId,
    });

    return NextResponse.json({ success: true, user: authData.user })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminGuard = await requireAdminRequest(request)
    if (!adminGuard.authorized) return adminGuard.response

    const { id, full_name, organization_ids, department_ids, role, phone, email, password } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID nhân viên' }, { status: 400 })
    }

    const validOrgIds = Array.isArray(organization_ids) ? organization_ids.filter(Boolean) : []

    const supabaseAdmin = getSupabaseAdminClient()

    let finalFullName = full_name;
    if (!finalFullName) {
      const { data: existingProfile } = await supabaseAdmin.from('profiles').select('full_name').eq('id', id).single();
      finalFullName = existingProfile?.full_name || 'Nhân viên';
    }

    // 1. Update profile & auth user
    const profileUpdates: any = { full_name: finalFullName };
    if (phone !== undefined) profileUpdates.phone = phone || null;
    await supabaseAdmin.from('profiles').update(profileUpdates).eq('id', id)
    
    // Build user update payload
    const userUpdatePayload: any = { user_metadata: { full_name: finalFullName } }
    if (email) userUpdatePayload.email = email
    if (password) userUpdatePayload.password = password
    
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(id, userUpdatePayload)
    if (updateError) {
      throw new Error(`Cập nhật tài khoản thất bại: ${updateError.message}`)
    }

    const { data: roleDataList } = await supabaseAdmin.from('user_roles').select('id').eq('name', 'member').limit(1)
    const roleData = roleDataList?.[0] || null

    // 2. Fetch current memberships
    const { data: currentMembers } = await supabaseAdmin
      .from('organization_members')
      .select('id, organization_id')
      .eq('user_id', id)
      .is('deleted_at', null)

    const currentOrgIds = (currentMembers || []).map(m => m.organization_id)
    
    // Orgs to add
    const orgsToAdd = validOrgIds.filter((orgId: string) => !currentOrgIds.includes(orgId))
    // Orgs to remove (soft delete)
    const orgsToRemove = currentOrgIds.filter(orgId => !validOrgIds.includes(orgId))

    for (const orgId of orgsToRemove) {
      await supabaseAdmin.from('organization_members').update({ deleted_at: new Date().toISOString() })
        .eq('user_id', id).eq('organization_id', orgId)
    }

    if (roleData) {
      for (const orgId of orgsToAdd) {
         await supabaseAdmin.from('organization_members').insert({
            organization_id: orgId,
            user_id: id,
            role_id: roleData.id,
            job_title: role || null
         })
      }
    }

    if (validOrgIds.length > 0) {
      // Update job_title for remaining
      await supabaseAdmin.from('organization_members')
        .update({ job_title: role || null })
        .eq('user_id', id)
        .in('organization_id', validOrgIds)
        .is('deleted_at', null)
    }

    // 3. Sync member_departments
    const { data: activeMembers } = await supabaseAdmin
      .from('organization_members')
      .select('id, organization_id')
      .eq('user_id', id)
      .is('deleted_at', null)

    if (activeMembers) {
      for (const member of activeMembers) {
        await supabaseAdmin.from('member_departments').delete().eq('org_member_id', member.id)

        const { data: orgDepts } = await supabaseAdmin
          .from('departments')
          .select('id')
          .eq('organization_id', member.organization_id)
          .in('id', department_ids || [])
        
        if (orgDepts && orgDepts.length > 0) {
          const memberDepts = orgDepts.map(d => ({
            org_member_id: member.id,
            department_id: d.id
          }))
          await supabaseAdmin.from('member_departments').insert(memberDepts)
        }
      }
    }

    // Đồng bộ 2 chiều lên APEC GLOBAL API (Employee API update)
    await executeBiDirectionalSync({
      entityType: 'employee',
      action: 'UPDATE',
      data: {
        id,
        fullname: full_name,
        name: full_name,
        email,
        phone,
        job_title: role,
        company_id: validOrgIds[0],
      },
      changedBy: id,
    });

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 })
  }
}

