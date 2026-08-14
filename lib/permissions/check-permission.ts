import { createClient } from '@supabase/supabase-js'

/**
 * Server-side permission check.
 * Queries: organization_members → role_id → role_permissions → permissions
 * Returns true if the user has the specified permission in the given organization.
 */
export async function checkPermission(
  userId: string,
  organizationId: string,
  permissionName: string
): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return false

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 1. Check if user is super admin
  const { data: profile } = await admin
    .from('profiles')
    .select('is_super_admin')
    .eq('id', userId)
    .single()

  if (profile?.is_super_admin) return true

  // 2. Get user's role in this organization
  const { data: membership } = await admin
    .from('organization_members')
    .select('role_id, user_roles(name)')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single()

  if (!membership) return false

  // Owner role always has all permissions
  const roleName = Array.isArray((membership as any).user_roles)
    ? (membership as any).user_roles[0]?.name
    : (membership as any).user_roles?.name
  if (roleName === 'owner') return true

  // 3. Check if the role has the required permission
  const { data: permissionData } = await admin
    .from('role_permissions')
    .select('permissions(name)')
    .eq('role_id', membership.role_id)

  if (!permissionData) return false

  return permissionData.some(
    (rp: any) => rp.permissions?.name === permissionName
  )
}
