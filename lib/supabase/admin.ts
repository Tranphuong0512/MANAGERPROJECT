import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// SUPABASE ADMIN CLIENT — SINGLETON (TỐI ƯU TỐC ĐỘ)
// ============================================================================
// Chỉ tạo client 1 lần duy nhất (lazy singleton) rồi tái sử dụng cho mọi request.
// Tránh chi phí khởi tạo createClient() lặp lại hàng trăm lần/luồng xử lý.
// KHÔNG thay đổi hành vi dữ liệu — client là stateless, chỉ kết nối HTTP.
// ============================================================================

let _adminClient: SupabaseClient | null = null

/**
 * Lấy Supabase Admin Client (service_role) singleton.
 * Dùng cho các tác vụ server-side cần bypass RLS:
 * - Tra cứu API key
 * - Kiểm tra concurrency version
 * - Ghi audit log
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase credentials not configured for admin client')
  }

  _adminClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return _adminClient
}

/**
 * Reset singleton (chỉ dùng trong test / hot-reload dev khi env thay đổi).
 */
export function resetSupabaseAdminClient() {
  _adminClient = null
}

/**
 * Convenience proxy export for direct `supabaseAdmin` usage
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdminClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
