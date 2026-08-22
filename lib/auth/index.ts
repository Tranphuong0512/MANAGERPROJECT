import { supabase } from '@/lib/supabase/client'

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return null
  }
  return user
}

export async function getUserSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) {
    return null
  }
  return session
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function signInWithGoogle() {
  const redirectOrigin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${redirectOrigin}/auth/callback`,
    },
  })
}

/**
 * Kiểm tra trạng thái phê duyệt của user
 */
export async function checkApprovalStatus(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('approval_status, google_email, full_name, avatar_url, google_avatar_url, is_super_admin')
    .eq('id', userId)
    .single()

  if (error || !data) return { status: 'pending' as const, profile: null }
  return {
    status: data.approval_status as 'pending' | 'approved' | 'rejected',
    profile: data
  }
}

export async function updateProfile(userId: string, data: any) {
  return supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)
    .select()
    .single()
}

export async function getProfile(userId: string) {
  return supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
}

export async function createProfile(userId: string, data: any) {
  return supabase
    .from('profiles')
    .insert([{ id: userId, ...data }])
    .select()
    .single()
}

export async function getUserOrganizations(userId: string) {
  return supabase
    .from('organization_members')
    .select(`
      organization_id,
      organizations (
        id,
        name,
        slug,
        description,
        created_at,
        updated_at
      ),
      user_roles (
        name
      )
    `)
    .eq('user_id', userId)
    .is('deleted_at', null)
}

export async function getUserRole(userId: string, organizationId: string) {
  return supabase
    .from('organization_members')
    .select(`
      user_roles (
        name
      )
    `)
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single()
}

export async function hasPermission(
  userId: string,
  organizationId: string,
  permissionName: string
) {
  const { data, error } = await supabase.rpc('has_permission', {
    p_user_id: userId,
    p_org_id: organizationId,
    p_permission_name: permissionName,
  })

  if (error) {
    console.error('Permission check error:', error)
    return false
  }

  return data
}
