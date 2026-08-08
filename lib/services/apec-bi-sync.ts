/**
 * ============================================================================
 * APEC GLOBAL BI-DIRECTIONAL SYNC CONTROLLER (ĐỒNG BỘ 2 CHIỀU)
 * ============================================================================
 * Nguyên tắc kiến trúc:
 * - Single Source of Truth: Máy chủ APEC GLOBAL API (https://api.apecglobal.net)
 * - Supabase đóng vai trò là cache / source data cục bộ cho UI ứng dụng hoạt động
 * - Hỗ trợ đồng bộ 2 chiều 6 đối tượng cốt lõi:
 *   1. Tổ Chức (company / organization)
 *   2. Dự Án (project)
 *   3. Nhân sự API (employee / staff - trừ tài khoản đăng nhập)
 *   4. Phòng ban (department)
 *   5. Checklist / Loại nhiệm vụ (checklist / task_type)
 *   6. Nhiệm vụ & Sự cố cải tiến (task / incident_improvement)
 */

import {
  syncCompanyOutbound,
  syncProjectOutbound,
  syncEmployeeOutbound,
  syncDepartmentOutbound,
  syncChecklistOutbound,
  syncTaskOutbound,
} from '@/lib/services/apec-outbound-sync';
import { recordAuditLog } from '@/lib/services/audit-logger';

export type BiSyncEntityType =
  | 'company'
  | 'organization'
  | 'project'
  | 'employee'
  | 'staff'
  | 'department'
  | 'checklist'
  | 'task_type'
  | 'task'
  | 'incident_improvement';

export type BiSyncAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface BiSyncOptions {
  entityType: BiSyncEntityType;
  action: BiSyncAction;
  data: Record<string, any>;
  organizationId?: string;
  changedBy?: string;
  secretKey?: string;
}

export interface BiSyncResult {
  success: boolean;
  apiSuccess: boolean;
  data?: any;
  error?: string;
  message?: string;
}

/**
 * Thực thi lệnh đồng bộ 2 chiều lên máy chủ APEC GLOBAL API trước khi hoặc sau khi thao tác với cache Supabase.
 */
export async function executeBiDirectionalSync(options: BiSyncOptions): Promise<BiSyncResult> {
  const { entityType, action, data, changedBy, secretKey } = options;

  try {
    let apiResponse: { success: boolean; data?: any; error?: string } = { success: false, error: 'Chưa xác định loại đối tượng' };

    switch (entityType) {
      case 'company':
      case 'organization':
        apiResponse = await syncCompanyOutbound(action, data, changedBy, secretKey);
        break;

      case 'project':
        apiResponse = await syncProjectOutbound(action, data, changedBy, secretKey);
        break;

      case 'employee':
      case 'staff':
        apiResponse = await syncEmployeeOutbound(action, data, changedBy, secretKey);
        break;

      case 'department':
        apiResponse = await syncDepartmentOutbound(action, data, changedBy, secretKey);
        break;

      case 'checklist':
      case 'task_type':
        apiResponse = await syncChecklistOutbound(action, data, changedBy, secretKey);
        break;

      case 'task':
      case 'incident_improvement':
        apiResponse = await syncTaskOutbound(action, data, changedBy, secretKey);
        break;

      default:
        return {
          success: false,
          apiSuccess: false,
          error: `Loại đối tượng không hỗ trợ đồng bộ: ${entityType}`,
        };
    }

    // Ghi audit log tiến trình đồng bộ 2 chiều
    await recordAuditLog({
      action: action as any,
      resource_type: String(entityType) as any,
      resource_id: String(data.id || (data.ids && data.ids[0]) || 'BI_SYNC'),
      new_value: data,
      changed_by: changedBy,
      sync_direction: 'OUTBOUND',
      status: apiResponse.success ? 'SUCCESS' : 'ERROR',
      error_message: apiResponse.error,
    });

    if (!apiResponse.success) {
      console.warn(`[BiSync Warning] Ghi dữ liệu lên APEC GLOBAL API (${entityType} - ${action}) gặp thông báo: ${apiResponse.error}`);
      return {
        success: true, // Vẫn trả về true cho UI để duy trì cache ngoại tuyến/an toàn
        apiSuccess: false,
        error: apiResponse.error,
        message: `Lưu cache Supabase thành công. Lỗi đồng bộ API APEC GLOBAL: ${apiResponse.error}`,
      };
    }

    return {
      success: true,
      apiSuccess: true,
      data: apiResponse.data,
      message: 'Đã đồng bộ 2 chiều thành công lên máy chủ APEC GLOBAL API',
    };
  } catch (err: any) {
    console.error(`[BiSync Error] Lỗi thực thi đồng bộ 2 chiều:`, err);
    return {
      success: false,
      apiSuccess: false,
      error: err?.message || 'Lỗi hệ thống khi đồng bộ 2 chiều',
    };
  }
}
