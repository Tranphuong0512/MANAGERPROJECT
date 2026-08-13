import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Tạo Supabase Server Client sử dụng cookies() của Next.js (App Router / Next 15+ & Next 16)
 * Dùng cho Server Components, Server Actions, và Route Handlers.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase credentials not configured')
  }

  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  })
}

/**
 * Helper tương thích ngược với các file đang gọi getSupabaseClient()
 */
export async function getSupabaseClient() {
  return createClient()
}

export function validateSupabaseConfig() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}