import { NextRequest } from 'next/server'
import { getSupabaseClient, validateSupabaseConfig } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'

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

  const supabase = getSupabaseClient()

  // 1. Try x-api-key header first
  const apiKey = request.headers.get('x-api-key') || request.headers.get('apikey')
  if (apiKey) {
    // Note: getSupabaseClient creates a client. For API keys, we might need a service_role client if we want to bypass RLS 
    // to check the api_keys table, because the request has no cookies.
    // However, if we just use the service role key internally to fetch:
    const { createClient } = await import('@supabase/supabase-js')
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: keyData, error: keyError } = await adminSupabase
      .from('api_keys')
      .select('organization_id, is_active')
      .eq('key_hash', apiKey)
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

  return { authorized: false, error: 'Missing authentication headers (x-api-key or Authorization Bearer)', supabase }
}