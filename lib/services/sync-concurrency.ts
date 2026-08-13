import { createClient } from '@supabase/supabase-js';

export interface ConcurrencyCheckResult {
  canProceed: boolean;
  reason?: string;
  isConflict?: boolean;
  latestVersion?: number;
  existingRecord?: any;
}

/**
 * ============================================================================
 * DATA INTEGRITY & RACE CONDITION CONTROL SERVICE
 * ============================================================================
 * Kiểm soát tranh chấp đồng thời (Optimistic Concurrency Control):
 * 1. Kiểm tra version số (khi 2 người cùng sửa một record cùng lúc)
 * 2. So sánh timestamp (updated_at) khi đồng bộ giữa APEC GLOBAL và CSDL nội bộ
 */

export async function checkConcurrencyVersion(
  tableName: string,
  recordId: string,
  expectedVersion?: number
): Promise<ConcurrencyCheckResult> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return { canProceed: true };
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: existing, error } = await supabaseAdmin
      .from(tableName)
      .select('id, version, updated_at')
      .eq('id', recordId)
      .maybeSingle();

    if (error || !existing) {
      return { canProceed: true };
    }

    // Nếu expectedVersion được truyền lên, kiểm tra xem version trong DB có bị thay đổi bởi người khác chưa
    if (expectedVersion !== undefined && existing.version !== undefined) {
      if (existing.version > expectedVersion) {
        return {
          canProceed: false,
          isConflict: true,
          reason: `Bản ghi đã được sửa đổi bởi người khác (Version mới: ${existing.version} vs Version của bạn: ${expectedVersion}). Vui lòng tải lại trang để hợp nhất.`,
          latestVersion: existing.version,
          existingRecord: existing,
        };
      }
    }

    return {
      canProceed: true,
      latestVersion: existing.version || 1,
      existingRecord: existing,
    };
  } catch (err: any) {
    console.error('[SyncConcurrency] Error checking version:', err.message);
    return { canProceed: true };
  }
}

/**
 * Kiểm tra xem bản ghi nội bộ có mới hơn bản ghi từ APEC GLOBAL không (reconcile theo timestamp)
 */
export async function reconcileInboundSync(
  tableName: string,
  matchColumn: string,
  matchValue: string | number,
  externalTimestamp?: string,
  forceOverwrite = false
): Promise<{ shouldUpdate: boolean; existing?: any; conflictResolved?: boolean }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return { shouldUpdate: true };
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: existing, error } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .eq(matchColumn, matchValue)
      .maybeSingle();

    if (error || !existing) {
      // Bản ghi chưa tồn tại, cho phép tạo mới
      return { shouldUpdate: true };
    }

    if (forceOverwrite || !externalTimestamp || !existing.updated_at) {
      return { shouldUpdate: true, existing };
    }

    const externalDate = new Date(externalTimestamp).getTime();
    const localDate = new Date(existing.updated_at).getTime();

    // Nếu bản ghi nội bộ được sửa đổi sau thời điểm của APEC GLOBAL và chênh lệch > 5 giây
    if (localDate - externalDate > 5000) {
      return {
        shouldUpdate: false,
        existing,
        conflictResolved: true, // Giữ lại bản ghi nội bộ mới hơn
      };
    }

    return { shouldUpdate: true, existing };
  } catch {
    return { shouldUpdate: true };
  }
}
