import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

type AdminGuardResult =
  | { authorized: true; userId: string }
  | { authorized: false; response: NextResponse }

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

export async function requireAdminRequest(request: NextRequest): Promise<AdminGuardResult> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const url = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  const token = authHeader.slice(7)

  const authClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  const { data: { user }, error: authError } = await authClient.auth.getUser(token)

  if (authError || !user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const adminClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data: profile } = await adminClient
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (profile?.is_super_admin) {
    return { authorized: true, userId: user.id }
  }

  const { data: ownerMembership } = await adminClient
    .from('organization_members')
    .select('id, user_roles(name)')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .eq('user_roles.name', 'owner')
    .limit(1)

  const isOwner = (ownerMembership || []).some((member: any) => {
    const role = Array.isArray(member.user_roles) ? member.user_roles[0] : member.user_roles
    return role?.name === 'owner'
  })

  if (!isOwner) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden. Admin only.' }, { status: 403 }),
    }
  }

  return { authorized: true, userId: user.id }
}
