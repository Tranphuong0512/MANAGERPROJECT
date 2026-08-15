import { NextRequest } from 'next/server'
import { getSupabaseClient, validateSupabaseConfig } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export type ApiAuthResult = {
  authorized: boolean
  userId?: string
  organizationId?: string
  error?: string
  supabase: SupabaseClient
}

export async function authenticateApiRequest(request: NextRequest): Promise<ApiAuthResult> {
  if (!validateSupabaseConfig()) {
    throw new Error('Supabase not configured')
  }

  // Use service role to bypass RLS when looking up api keys if necessary, 
  // but getSupabaseClient() uses normal server client (with cookies).
  // Wait, API requests from 3rd party won't have cookies. They only have the x-api-key header!
  // The default getSupabaseClient() creates a client that looks for cookies.
  // We need an admin client to look up the api key from DB safely.

  const supabase = await getSupabaseClient()

  // 1. Try x-api-key header first
  const apiKey = request.headers.get('x-api-key') || request.headers.get('apikey')
  if (apiKey) {
    // Sử dụng admin client singleton để tra cứu API key (bypass RLS)
    const adminSupabase = getSupabaseAdminClient()

    // Hash API key trước khi so sánh với DB (key_hash lưu SHA-256)
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex')

    const { data: keyData, error: keyError } = await adminSupabase
      .from('api_keys')
      .select('organization_id, is_active')
      .eq('key_hash', hashedKey)
      .single()

    if (keyError || !keyData || !keyData.is_active) {
      return { authorized: false, error: 'Invalid or inactive API Key', supabase }
    }

    return {
      authorized: true,
      organizationId: keyData.organization_id,
      supabase: adminSupabase // Return the admin client so they can fetch data without RLS (since they authenticated via API Key)
    }
  }

  // 2. Try Authorization: Bearer <token>
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return { authorized: false, error: 'Invalid Bearer token', supabase }
    }

    return {
      authorized: true,
      userId: user.id,
      supabase // Return the normal client, which respects RLS based on the JWT token
    }
  }

  // 3. Try cookie session from Supabase Client (for Web App clients)
  try {
    const { data: { user }, error: cookieAuthError } = await supabase.auth.getUser()
    if (user && !cookieAuthError) {
      return {
        authorized: true,
        userId: user.id,
        supabase
      }
    }
  } catch {
    // Ignore cookie resolution errors and fallback to unauthorized response
  }

  return { authorized: false, error: 'Missing authentication headers (x-api-key or Authorization Bearer) or active session', supabase }
}