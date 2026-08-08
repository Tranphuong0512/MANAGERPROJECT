import { NextRequest, NextResponse } from 'next/server'
import { inviteUserSchema } from '@/lib/schemas'
import { authenticateApiRequest } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, supabase, error: authError, organizationId } = await authenticateApiRequest(request)
    const orgId = (await params).id

    if (!authorized) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    if (organizationId && organizationId !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('organization_members')
      .select(
        `
        *,
        user_roles (name),
        profiles (full_name, avatar_url),
        teams (name)
      `
      )
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('joined_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, supabase, error: authError, userId, organizationId } = await authenticateApiRequest(request)
    const orgId = (await params).id

    if (!authorized) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    if (organizationId && organizationId !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Validate input
    const validation = inviteUserSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: (validation.error as any).errors }, { status: 400 })
    }

    // Check if user exists by email
    const { data: { users } } = await supabase.auth.admin.listUsers()

    let targetUserId: string | null = null

    // Find user by email
    const existingUser = users.find(u => u.email === validation.data.email)

    if (existingUser) {
      targetUserId = existingUser.id
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: validation.data.email,
        email_confirm: true,
        user_metadata: { invited: true },
      })

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 })
      }

      targetUserId = newUser.user?.id
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'Failed to create or find user' }, { status: 400 })
    }

    // Add user to organization
    const { data: member, error: addError } = await supabase
      .from('organization_members')
      .insert([
        {
          organization_id: orgId,
          user_id: targetUserId,
          role_id: validation.data.role_id,
          team_id: validation.data.team_id || null,
        },
      ])
      .select()
      .single()

    if (addError) {
      return NextResponse.json({ error: addError.message }, { status: 400 })
    }

    // Create profile if doesn't exist
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single()

    if (!profile) {
      await supabase.from('profiles').insert([
        {
          id: targetUserId,
          organization_id: orgId,
        },
      ])
    }

    return NextResponse.json(member, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
