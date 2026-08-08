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

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  })
}

export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({
    email,
    password,
  })
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
    },
  })
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
