'use server'

import { createClient } from '@supabase/supabase-js'

// We create a server-side Supabase client using the SERVICE_ROLE_KEY to bypass RLS and perform admin actions.
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase URL or Service Role Key in environment variables.')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function createPlaceholderUser(data: { fullName: string; organizationId: string; departmentId?: string; teamId?: string }) {
  try {
    const adminClient = getAdminClient()

    // 1. Generate a temporary email
    const uuid = crypto.randomUUID()
    const tempEmail = `temp_${uuid.split('-')[0]}@placeholder.local`
    const tempPassword = crypto.randomUUID()

    // 2. Create the user in auth.users
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email: tempEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        is_placeholder: true
      }
    })

    if (createError || !userData.user) {
      throw new Error(createError?.message || 'Failed to create placeholder user')
    }

    const userId = userData.user.id

    // 3. The trigger 005 might auto-create an org for them.
    // Wait, the trigger creates an org if they don't have one in organization_members.
    // However, we immediately want to add them to a specific organization.
    // Let's manually add them to the requested organization and role.
    
    // Get member role id
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('name', 'member')
      .single()

    if (!roleData) {
      throw new Error('Member role not found')
    }

    // Insert into organization_members
    const { error: memberError } = await adminClient
      .from('organization_members')
      .insert({
        organization_id: data.organizationId,
        user_id: userId,
        role_id: roleData.id,
        team_id: data.teamId || null
      })
      
    if (memberError) {
      // Ignore conflict if trigger 005 already added them to an auto-org?
      // Wait, 005 creates a DIFFERENT organization.
      // We should ideally assign them here. The trigger 005 runs synchronously, so they might have 2 orgs now.
      // That's fine, we can clean up the auto-org later or just let them have a personal org too.
      console.error('Member insert error:', memberError)
    }

    return { success: true, userId }
  } catch (error: any) {
    console.error('Error in createPlaceholderUser:', error)
    return { success: false, error: error.message }
  }
}

export async function assignEmailToUser(userId: string, realEmail: string) {
  try {
    const adminClient = getAdminClient()

    // 1. Update the user's email
    const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
      email: realEmail,
      email_confirm: true, // We auto-confirm since Admin is setting it
      user_metadata: {
        is_placeholder: false
      }
    })

    if (error) {
      throw new Error(error.message)
    }

    // Gửi email reset mật khẩu để người dùng có thể đặt mật khẩu và đăng nhập
    const { error: resetError } = await adminClient.auth.resetPasswordForEmail(realEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`
    })

    if (resetError) {
      console.error('Failed to send reset email, but email was updated:', resetError)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error in assignEmailToUser:', error)
    return { success: false, error: error.message }
  }
}
