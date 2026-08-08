import { neon, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './erp-schema'

// ============================================================================
// NEON POSTGRES CLIENT — CHỈ ĐỌC (READ-ONLY SATELLITE)
// ============================================================================
// Module vệ tinh kết nối trực tiếp đến Neon Postgres của hệ thống ERP Apec Global.
// Sử dụng HTTP driver của Neon (tối ưu cho Serverless/Edge Runtime).
// Chỉ thực hiện các truy vấn SELECT / Aggregation. Tuyệt đối KHÔNG ghi dữ liệu.
// ============================================================================

// Bật cache kết nối cho Serverless/Edge Runtime
neonConfig.fetchConnectionCache = true

const connectionString = process.env.NEON_DATABASE_URL

/**
 * Kiểm tra xem Neon Database URL đã được cấu hình chưa.
 * Module hoạt động ở chế độ fallback (Supabase) nếu chưa có.
 */
export function isNeonConfigured(): boolean {
  return !!connectionString && connectionString.startsWith('postgresql://')
}

/**
 * Drizzle ORM Client kết nối đến Neon Postgres (ERP gốc).
 * Trả về null nếu chưa cấu hình NEON_DATABASE_URL.
 */
export function getErpDb() {
  if (!isNeonConfigured()) {
    return null
  }

  const sql = neon(connectionString!)
  return drizzle(sql, { schema })
}

// Singleton instance (lazy initialization)
let _erpDb: ReturnType<typeof getErpDb> | undefined

export function erpDb() {
  if (_erpDb === undefined) {
    _erpDb = getErpDb()
  }
  return _erpDb
}
