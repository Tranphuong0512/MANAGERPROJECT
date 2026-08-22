import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/user-approval?status=pending|approved|rejected
 * Lấy danh sách users theo trạng thái approval (Super Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate current user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check Super Admin
    const adminClient = getSupabaseAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden. Super Admin only.' }, { status: 403 })
    }

    // Get query params
    const status = request.nextUrl.searchParams.get('status') || 'pending'

    // Fetch users with the given approval status
    const { data: users, error: fetchError } = await adminClient
      .from('profiles')
      .select('id, full_name, avatar_url, google_email, google_avatar_url, approval_status, approved_by, approved_at, created_at, is_super_admin')
      .eq('approval_status', status)
      .order('created_at', { ascending: false })

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    return NextResponse.json({ users: users || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

/**
 * PATCH /api/user-approval
 * Approve or reject a user (Super Admin only)
 * Body: { userId, action: 'approve' | 'reject', roleId?, organizationId?, teamId? }
 */
export async function PATCH(request: NextRequest) {
  try {
    // Authenticate current user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check Super Admin
    const adminClient = getSupabaseAdminClient()
    const { data: adminProfile } = await adminClient
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (!adminProfile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden. Super Admin only.' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, action, roleId, organizationId, teamId } = body

    if (!userId || !action) {
      return NextResponse.json({ error: 'userId and action are required' }, { status: 400 })
    }

    if (action === 'approve') {
      // 1. Update profile approval status
      const { error: updateError } = await adminClient
        .from('profiles')
        .update({
          approval_status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // 2. Assign to organization with role
      if (organizationId && roleId) {
        // Check if already a member
        const { data: existing } = await adminClient
          .from('organization_members')
          .select('id')
          .eq('user_id', userId)
          .eq('organization_id', organizationId)
          .is('deleted_at', null)
          .single()

        if (!existing) {
          const { error: memberError } = await adminClient
            .from('organization_members')
            .insert({
              organization_id: organizationId,
              user_id: userId,
              role_id: roleId,
              team_id: teamId || null,
            })

          if (memberError) {
            console.error('Failed to add org member:', memberError)
            // Don't fail the whole operation — user is approved even if org assignment fails
          }
        }
      }

      return NextResponse.json({ success: true, message: 'User approved successfully' })
    } else if (action === 'reject') {
      const { error: updateError } = await adminClient
        .from('profiles')
        .update({
          approval_status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'User rejected' })
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "approve" or "reject"' }, { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
