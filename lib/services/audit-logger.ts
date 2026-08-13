import { createClient } from '@supabase/supabase-js';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC_INBOUND' | 'SYNC_OUTBOUND';
export type AuditResourceType = 'organization' | 'department' | 'project' | 'staff' | 'checklist' | 'task';
export type AuditSyncStatus = 'SUCCESS' | 'CONFLICT_RESOLVED' | 'ERROR';

export interface AuditLogEntry {
  id?: string;
  action: AuditAction;
  resource_type: AuditResourceType;
  resource_id: string | number;
  old_value?: any;
  new_value?: any;
  changed_by?: string;
  sync_direction?: 'INBOUND' | 'OUTBOUND' | 'LOCAL';
  status: AuditSyncStatus;
  error_message?: string;
  created_at?: string;
}

/**
 * ============================================================================
 * AUDIT LOGGER SERVICE
 * ============================================================================
 * Ghi vết toàn bộ lịch sử thao tác:
 * - Ai đã thêm/sửa/xóa hoặc đồng bộ đối tượng gì
 * - Snapshot dữ liệu trước (old_value) và sau (new_value)
 * - Trạng thái xử lý (bao gồm giải quyết xung đột Race Condition)
 */

export async function recordAuditLog(entry: AuditLogEntry): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.warn('[AuditLogger] Supabase credentials missing, logging to console only:', entry);
      return false;
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const logRecord = {
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: String(entry.resource_id),
      old_value: entry.old_value ? JSON.stringify(entry.old_value) : null,
      new_value: entry.new_value ? JSON.stringify(entry.new_value) : null,
      changed_by: entry.changed_by || 'SYSTEM_SYNC',
      sync_direction: entry.sync_direction || 'LOCAL',
      status: entry.status,
      error_message: entry.error_message || null,
      created_at: entry.created_at || new Date().toISOString(),
    };

    // Try inserting into audit_logs table
    const { error } = await supabaseAdmin.from('audit_logs').insert([logRecord]);

    if (error) {
      if (error.code !== '42P01' && !error.message?.includes('schema cache')) {
        console.warn('[AuditLogger] Could not insert into audit_logs table:', error.message);
      }
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('[AuditLogger] Exception while recording audit log:', err.message);
    return false;
  }
}

/**
 * Lấy danh sách Audit Log gần nhất
 */
export async function getAuditLogs(params?: {
  limit?: number;
  resource_type?: AuditResourceType;
  resource_id?: string;
}): Promise<AuditLogEntry[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) return [];

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(params?.limit || 50);

    if (params?.resource_type) {
      query = query.eq('resource_type', params.resource_type);
    }
    if (params?.resource_id) {
      query = query.eq('resource_id', String(params.resource_id));
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((item: any) => ({
      id: item.id,
      action: item.action,
      resource_type: item.resource_type,
      resource_id: item.resource_id,
      old_value: item.old_value ? JSON.parse(item.old_value) : undefined,
      new_value: item.new_value ? JSON.parse(item.new_value) : undefined,
      changed_by: item.changed_by,
      sync_direction: item.sync_direction,
      status: item.status,
      error_message: item.error_message,
      created_at: item.created_at,
    }));
  } catch {
    return [];
  }
}
