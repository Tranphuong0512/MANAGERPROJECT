import { APEC_GLOBAL_BASE_URL, APEC_GLOBAL_SECRET_KEY, getApecTaskTypes } from '@/lib/services/apec-global-api';
import { recordAuditLog } from '@/lib/services/audit-logger';
import { invalidateCache } from '@/lib/services/server-cache';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getVietnamDateString } from '@/lib/utils';
import crypto from 'crypto';

/**
 * ============================================================================
 * APEC GLOBAL OUTBOUND SYNC SERVICE (NEAR REAL-TIME)
 * ============================================================================
 * Đồng bộ ngược dữ liệu từ phần mềm nội bộ lên APEC GLOBAL khi:
 * - Thêm / Sửa / Xóa Phòng ban (Departments)
 * - Thêm / Sửa / Xóa Dự án (Projects)
 * - Thêm / Sửa / Xóa Checklist / Loại nhiệm vụ (Task Types)
 */

import { resolveStatusToNumericId as resolveStatusId } from '@/lib/domain';

function resolveNumericId(val: any): number | string | undefined {
  if (val == null) return undefined;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (/^\d+$/.test(str)) return Number(str);
  const cleaned = str.replace(/^(apec_type_t_|apec_type_|apec_emp_|apec_prj_|apec_|p-|prj_|t_|st_|st_dir_|ea_inc_|ea_imp_|inc_|imp_)+/ig, '');
  if (/^\d+$/.test(cleaned)) return Number(cleaned);
  return val;
}

function isNumericApecId(val: any): boolean {
  const resolved = resolveNumericId(val);
  return typeof resolved === 'number' && !isNaN(resolved) && resolved > 0;
}

function getOutboundCandidateEndpoints(endpoint: string, bodyData: any): string[] {
  const list: string[] = [endpoint];
  const id = bodyData?.id || bodyData?.task_id || '';

  if (endpoint.includes('/tasks/approve') || endpoint.includes('/approve')) {
    list.push(
      '/api/v1/external/tasks/approve',
      '/api/external/tasks/approve'
    );
  } else if (endpoint.includes('/tasks/types')) {
    list.push(
      '/api/v1/external/tasks/types/update',
      '/api/v1/external/tasks/types',
      '/api/external/tasks/types/update',
      '/api/external/tasks/types',
      id ? `/api/v1/external/tasks/types/${id}` : '',
      id ? `/api/external/tasks/types/${id}` : ''
    );
  } else if (endpoint.includes('/tasks/progress/update') || endpoint.includes('/assignments/update') || endpoint.includes('/assignments')) {
    list.push(
      '/api/v1/external/assignments/update',
      '/api/external/assignments/update',
      '/api/v1/external/tasks/progress/update',
      '/api/external/tasks/progress/update',
      id ? `/api/v1/external/assignments/${id}` : '',
      id ? `/api/external/assignments/${id}` : ''
    );
  } else if (endpoint.includes('/tasks/create')) {
    list.push(
      '/api/v1/external/tasks/create',
      '/api/external/tasks/create'
    );
  } else if (endpoint.includes('/tasks/delete')) {
    list.push(
      '/api/v1/external/tasks/delete',
      '/api/external/tasks/delete'
    );
  } else if (endpoint.includes('/tasks/update') || endpoint.includes('/tasks')) {
    list.push(
      '/api/v1/external/tasks/update',
      '/api/external/tasks/update',
      id ? `/api/v1/external/tasks/${id}` : '',
      id ? `/api/external/tasks/${id}` : ''
    );
  } else if (endpoint.includes('/projects/update') || endpoint.includes('/projects')) {
    list.push(
      '/api/v1/external/projects/update',
      '/api/v1/external/projects',
      '/api/external/projects/update',
      '/api/external/projects',
      id ? `/api/v1/external/projects/${id}` : '',
      id ? `/api/external/projects/${id}` : ''
    );
  } else if (endpoint.includes('/departments/update') || endpoint.includes('/departments')) {
    list.push(
      '/api/v1/external/departments/update',
      '/api/v1/external/departments',
      '/api/external/departments/update',
      '/api/external/departments'
    );
  } else if (endpoint.includes('/companies/update') || endpoint.includes('/companies')) {
    list.push(
      '/api/v1/external/companies/update',
      '/api/v1/external/companies',
      '/api/external/companies/update',
      '/api/external/companies'
    );
  }
  return Array.from(new Set(list.filter(Boolean)));
}


async function sendOutboundRequest(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  bodyData: any,
  secretKey?: string
): Promise<{ success: boolean; data?: any; error?: string; message?: string }> {
  const key = secretKey || process.env.APEC_GLOBAL_SECRET_KEY || APEC_GLOBAL_SECRET_KEY;
  if (!key) {
    return { success: false, error: 'Chưa cấu hình Secret Key cho Outbound Sync' };
  }

  // 1. Execute direct sync to APEC GLOBAL API FIRST (Fast Direct Realtime Execution)
  const candidates = getOutboundCandidateEndpoints(endpoint, bodyData);
  const methodsToTry = (method === 'PUT' || method === 'PATCH') ? ['PUT', 'PATCH'] : [method];
  
  let success = false;
  let lastError = 'Không thể kết nối đến máy chủ APEC GLOBAL';
  let responseData: any = null;

  for (const candidate of candidates) {
    if (success) break;
    for (const m of methodsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s max timeout for direct call

        const response = await fetch(`${APEC_GLOBAL_BASE_URL}${candidate}`, {
          method: m,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Secret-Key': key,
            'x-secret-key': key,
            'Authorization': `Bearer ${key}`,
          },
          body: JSON.stringify(bodyData),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const text = await response.text();
        let resJson: any;
        try { resJson = JSON.parse(text); } catch { resJson = text; }

        if (response.ok && (!resJson || typeof resJson !== 'object' || (!resJson.error && resJson.status !== 'error' && resJson.status !== 401 && resJson.status !== 400))) {
          success = true;
          responseData = resJson;
          break;
        }

        if (response.status !== 404) {
          lastError = (typeof resJson === 'object' && resJson)
            ? (resJson?.data?.message || resJson?.message || resJson?.error || `HTTP ${response.status}`)
            : `HTTP ${response.status}`;
        }
      } catch (err: any) {
        lastError = err.name === 'AbortError' ? 'Timeout kết nối đến máy chủ APEC GLOBAL' : (err.message || 'Lỗi kết nối mạng');
      }
    }
  }

  if (success) {
    try {
      invalidateCache('apec-global:');
      invalidateCache('stats:');
      invalidateCache('board-data:');
    } catch {}
    return { success: true, message: 'Đồng bộ APEC GLOBAL thành công', data: responseData };
  }

  // 2. Fallback: Queue in apec_idempotency_keys if direct API call fails/times out
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const payloadString = JSON.stringify(bodyData);
    const hashInput = `${method}:${endpoint}:${payloadString}`;
    const keyHash = crypto.createHash('sha256').update(hashInput).digest('hex');

    await supabaseAdmin
      .from('apec_idempotency_keys')
      .insert({
        key_hash: keyHash,
        endpoint: endpoint,
        payload: {
          method,
          bodyData,
          secretKey: key
        },
        status: 'pending'
      });
  } catch (qErr) {
    console.warn('Queue backup failed:', qErr);
  }

  return { success: false, error: `Chưa cập nhật thành công lên máy chủ APEC GLOBAL (${lastError})`, message: lastError };
}

/**
 * Đồng bộ ngược Phòng ban (Department)
 */
export async function syncDepartmentOutbound(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  departmentData: { id?: string | number; name?: string; description?: string; manager_id?: string | number; ids?: Array<string | number> },
  changedBy?: string,
  secretKey?: string
) {
  let endpoint = '';
  let method: 'POST' | 'PUT' | 'DELETE' = 'POST';
  let body: any = {};

  if (action === 'CREATE') {
    endpoint = '/api/v1/external/departments/create';
    method = 'POST';
    body = {
      name: departmentData.name,
      description: departmentData.description,
      manager_id: departmentData.manager_id,
    };
  } else if (action === 'UPDATE') {
    endpoint = '/api/v1/external/departments/update';
    method = 'PUT';
    body = {
      id: departmentData.id,
      name: departmentData.name,
      description: departmentData.description,
      manager_id: departmentData.manager_id,
    };
  } else if (action === 'DELETE') {
    endpoint = '/api/v1/external/departments/delete';
    method = 'DELETE';
    body = {
      ids: departmentData.ids || (departmentData.id ? [departmentData.id] : []),
    };
  }

  const res = await sendOutboundRequest(endpoint, method, body, secretKey);

  await recordAuditLog({
    action: action as any,
    resource_type: 'department',
    resource_id: String(departmentData.id || (departmentData.ids && departmentData.ids[0]) || 'NEW'),
    new_value: body,
    changed_by: changedBy,
    sync_direction: 'OUTBOUND',
    status: res.success ? 'SUCCESS' : 'ERROR',
    error_message: res.error,
  });

  return res;
}

/**
 * Đồng bộ ngược Dự án (Project)
 */
export async function syncProjectOutbound(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  projectData: {
    id?: string | number;
    name?: string;
    description?: string;
    manager_id?: string | number;
    progress?: number;
    budget?: number;
    spent?: number;
    start_date?: string;
    end_date?: string;
    status?: string | number;
    ids?: Array<string | number>;
  },
  changedBy?: string,
  secretKey?: string
) {
  let endpoint = '';
  let method: 'POST' | 'PUT' | 'DELETE' = 'POST';
  let body: any = {};

  if (action === 'CREATE') {
    endpoint = '/api/v1/external/projects/create';
    method = 'POST';
    body = projectData;
  } else if (action === 'UPDATE') {
    const numId = resolveNumericId(projectData.id);
    if (typeof numId !== 'number' || isNaN(numId) || numId <= 0) {
      return { success: true, message: 'Dự án nội bộ Supabase, không đồng bộ APEC' };
    }
    endpoint = '/api/v1/external/projects/update';
    method = 'PUT';
    body = {
      ...projectData,
      id: numId,
      name: projectData.name || 'Dự án',
      company_id: (projectData as any).company_id || 6,
    };
    if (projectData.status !== undefined) {
      body.status = resolveStatusId(projectData.status);
    }
  } else if (action === 'DELETE') {
    endpoint = '/api/v1/external/projects/delete';
    method = 'DELETE';
    const rawIds = projectData.ids || (projectData.id ? [projectData.id] : []);
    const cleanIds = rawIds.map(resolveNumericId).map(Number).filter(n => !isNaN(n) && n > 0);
    if (cleanIds.length === 0) {
      return { success: true, message: 'Dự án nội bộ Supabase, đã xóa cục bộ' };
    }
    body = {
      ids: cleanIds,
    };
  }

  const res = await sendOutboundRequest(endpoint, method, body, secretKey);

  await recordAuditLog({
    action: action as any,
    resource_type: 'project',
    resource_id: String(projectData.id || (projectData.ids && projectData.ids[0]) || 'NEW'),
    new_value: body,
    changed_by: changedBy,
    sync_direction: 'OUTBOUND',
    status: res.success ? 'SUCCESS' : 'ERROR',
    error_message: res.error,
  });

  return res;
}

/**
 * Đồng bộ ngược Loại nhiệm vụ (Task Type / Checklist)
 */
export async function syncTaskTypeOutbound(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  checklistData: { id?: string | number; name?: string; is_default?: boolean; projects?: Array<{ id: string | number }>; ids?: Array<string | number> },
  changedBy?: string,
  secretKey?: string
) {
  let endpoint = '';
  let method: 'POST' | 'PUT' | 'DELETE' = 'POST';
  let body: any = {};

  if (action === 'CREATE') {
    endpoint = '/api/v1/external/tasks/types/create';
    method = 'POST';
    body = {
      name: checklistData.name,
      is_default: checklistData.is_default || false,
      projects: checklistData.projects || [],
    };
  } else if (action === 'UPDATE') {
    const numId = resolveNumericId(checklistData.id);
    if (typeof numId !== 'number' || isNaN(numId) || numId <= 0) {
      return { success: true, message: 'Checklist nội bộ Supabase, không đồng bộ APEC' };
    }
    endpoint = '/api/v1/external/tasks/types/update';
    method = 'PUT';
    body = {
      id: numId,
      name: checklistData.name,
    };
    if (checklistData.is_default !== undefined) {
      body.is_default = checklistData.is_default;
    }
    if (Array.isArray(checklistData.projects) && checklistData.projects.length > 0) {
      body.projects = checklistData.projects;
    }
  } else if (action === 'DELETE') {
    endpoint = '/api/v1/external/tasks/types/delete';
    method = 'DELETE';
    const rawIds = checklistData.ids || (checklistData.id ? [checklistData.id] : []);
    const cleanIds = rawIds.map(resolveNumericId).map(Number).filter(n => !isNaN(n) && n > 0);
    const cleanSingleId = Number(resolveNumericId(checklistData.id || rawIds[0]));
    if (cleanIds.length === 0 && (isNaN(cleanSingleId) || cleanSingleId <= 0)) {
      return { success: true, message: 'Checklist nội bộ Supabase, đã xóa cục bộ' };
    }
    body = {
      id: !isNaN(cleanSingleId) && cleanSingleId > 0 ? cleanSingleId : cleanIds[0],
      ids: cleanIds.length > 0 ? cleanIds : [cleanSingleId],
    };
  }

  const res = await sendOutboundRequest(endpoint, method, body, secretKey);

  await recordAuditLog({
    action: action as any,
    resource_type: 'checklist',
    resource_id: String(checklistData.id || (checklistData.ids && checklistData.ids[0]) || 'NEW'),
    new_value: body,
    changed_by: changedBy,
    sync_direction: 'OUTBOUND',
    status: res.success ? 'SUCCESS' : 'ERROR',
    error_message: res.error,
  });

  return res;
}

/**
 * Đồng bộ ngược Tổ Chức / Công ty (Company)
 */
export async function syncCompanyOutbound(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  companyData: {
    id?: string | number;
    name?: string;
    code?: string;
    tax_code?: string;
    address?: string;
    phone?: string;
    email?: string;
    description?: string;
    ids?: Array<string | number>;
  },
  changedBy?: string,
  secretKey?: string
) {
  let endpoint = '';
  let method: 'POST' | 'PUT' | 'DELETE' = 'POST';
  let body: any = {};

  if (action === 'CREATE') {
    endpoint = '/api/v1/external/companies/create';
    method = 'POST';
    body = companyData;
  } else if (action === 'UPDATE') {
    endpoint = '/api/v1/external/companies/update';
    method = 'PUT';
    body = companyData;
  } else if (action === 'DELETE') {
    endpoint = '/api/v1/external/companies/delete';
    method = 'DELETE';
    body = {
      ids: companyData.ids || (companyData.id ? [companyData.id] : []),
    };
  }

  const res = await sendOutboundRequest(endpoint, method, body, secretKey);

  await recordAuditLog({
    action: action as any,
    resource_type: 'organization' as any,
    resource_id: String(companyData.id || (companyData.ids && companyData.ids[0]) || 'NEW'),
    new_value: body,
    changed_by: changedBy,
    sync_direction: 'OUTBOUND',
    status: res.success ? 'SUCCESS' : 'ERROR',
    error_message: res.error,
  });

  return res;
}

/**
 * Đồng bộ ngược Nhân sự (Employee - trừ tài khoản đăng nhập)
 */
export async function syncEmployeeOutbound(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  employeeData: {
    id?: string | number;
    fullname?: string;
    name?: string;
    code?: string;
    email?: string;
    phone?: string;
    position?: string;
    job_title?: string;
    department_name?: string;
    company_id?: string | number;
    ids?: Array<string | number>;
  },
  changedBy?: string,
  secretKey?: string
) {
  let endpoint = '';
  let method: 'POST' | 'PUT' | 'DELETE' = 'POST';
  let body: any = {};

  if (action === 'CREATE') {
    endpoint = '/api/v1/external/employees/create';
    method = 'POST';
    body = employeeData;
  } else if (action === 'UPDATE') {
    endpoint = '/api/v1/external/employees/update';
    method = 'PUT';
    body = employeeData;
  } else if (action === 'DELETE') {
    endpoint = '/api/v1/external/employees/delete';
    method = 'DELETE';
    body = {
      ids: employeeData.ids || (employeeData.id ? [employeeData.id] : []),
    };
  }

  const res = await sendOutboundRequest(endpoint, method, body, secretKey);

  await recordAuditLog({
    action: action as any,
    resource_type: 'employee' as any,
    resource_id: String(employeeData.id || (employeeData.ids && employeeData.ids[0]) || 'NEW'),
    new_value: body,
    changed_by: changedBy,
    sync_direction: 'OUTBOUND',
    status: res.success ? 'SUCCESS' : 'ERROR',
    error_message: res.error,
  });

  return res;
}

/**
 * Đồng bộ ngược Nhiệm vụ (Task) & Sự Cố cải tiến (nhiệm vụ trong Checklist Sự Cố và Cải Tiến)
 */
export async function syncTaskOutbound(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  taskData: {
    id?: string | number;
    title?: string;
    name?: string;
    code?: string;
    description?: string;
    project_id?: string | number;
    checklist_id?: string | number;
    status?: string | number;
    priority?: string | number;
    type_id?: string | number;
    is_incident?: boolean;
    ids?: Array<string | number>;
    [key: string]: any;
  },
  changedBy?: string,
  secretKey?: string
) {
  let endpoint = '';
  let method: 'POST' | 'PUT' | 'DELETE' = 'POST';
  let body: any = {};
  let resolvedKpiId = Number(resolveNumericId(taskData.kpi_item_id || taskData.kpi_item?.id)) || 47;
  let targetVal = Number(taskData.target_value);
  if (!targetVal || isNaN(targetVal) || targetVal <= 0) {
    targetVal = (resolvedKpiId === 47 || resolvedKpiId === 48) ? 100 : (resolvedKpiId === 45 ? 1000000 : 1);
  }

  if (action === 'CREATE') {
    endpoint = '/api/v1/external/tasks/create';
    method = 'POST';
    const numProcess = Number(taskData.process ?? taskData.progress ?? 0);
    const rawPrjId = taskData.project_id ?? taskData.projectId;
    let resolvedPrjId = Number(resolveNumericId(rawPrjId));
    if (isNaN(resolvedPrjId) || !resolvedPrjId) resolvedPrjId = 62;
    let rawTypeId = taskData.type_task ?? taskData.type_id ?? taskData.checklist_id;
    let resolvedTypeId = Number(resolveNumericId(rawTypeId));

    if (taskData.is_incident || taskData.type_name === 'SỰ CỐ & RỦI RO' || (typeof rawTypeId === 'string' && rawTypeId.toUpperCase().includes('SỰ CỐ'))) {
      try {
        const typesRes = await getApecTaskTypes({ limit: 100 }, secretKey);
        const existingType = (typesRes.items || []).find((tt: any) => {
          const n = (tt.name || tt.title || '').toUpperCase();
          return n.includes('SỰ CỐ') || n.includes('RỦI RO');
        });
        if (existingType && existingType.id) {
          resolvedTypeId = Number(existingType.id);
        }
      } catch (err) {
        console.warn('Lỗi tìm task type SỰ CỐ & RỦI RO:', err);
      }
    } else if (taskData.is_improvement || taskData.type_name === 'CẢI TIẾN & NÂNG CẤP' || (typeof rawTypeId === 'string' && rawTypeId.toUpperCase().includes('CẢI TIẾN'))) {
      try {
        const typesRes = await getApecTaskTypes({ limit: 100 }, secretKey);
        const existingType = (typesRes.items || []).find((tt: any) => {
          const n = (tt.name || tt.title || '').toUpperCase();
          return n.includes('CẢI TIẾN') || n.includes('NÂNG CẤP');
        });
        if (existingType && existingType.id) {
          resolvedTypeId = Number(existingType.id);
        }
      } catch (err) {
        console.warn('Lỗi tìm task type CẢI TIẾN & NÂNG CẤP:', err);
      }
    }

    if (!resolvedTypeId || isNaN(resolvedTypeId)) {
      resolvedTypeId = 6;
    }

    const rawCompanyId = taskData.company_id ?? taskData.company ?? taskData.organization_id ?? taskData.organizationId;
    let resolvedCompanyId = Number(resolveNumericId(rawCompanyId));
    if (isNaN(resolvedCompanyId) || !resolvedCompanyId) resolvedCompanyId = 6;
    if (resolvedKpiId === 47 || resolvedKpiId === 48) {
      targetVal = 100;
    } else if (!targetVal || targetVal <= 0) {
      targetVal = resolvedKpiId === 45 ? 1000000 : 1;
    }
    const resolvedEmployees = (Array.isArray(taskData.employees) && taskData.employees.length > 0)
      ? taskData.employees.map(resolveNumericId).map(Number).filter(n => !isNaN(n) && n > 0)
      : (taskData.assignee_id ? [Number(resolveNumericId(taskData.assignee_id))].filter(n => !isNaN(n)) : [37]);

    body = {
      name: taskData.name || taskData.title || 'Công việc mới',
      title: taskData.title || taskData.name || 'Công việc mới',
      description: taskData.description || '',
      date_start: taskData.date_start || taskData.start_date || getVietnamDateString(),
      date_end: taskData.date_end || taskData.end_date || taskData.due_date || getVietnamDateString(),
      start_date: taskData.date_start || taskData.start_date || getVietnamDateString(),
      end_date: taskData.date_end || taskData.end_date || taskData.due_date || getVietnamDateString(),
      type_task: resolvedTypeId,
      type_id: resolvedTypeId,
      checklist_id: resolvedTypeId,
      project_id: resolvedPrjId,
      company_id: resolvedCompanyId,
      company: resolvedCompanyId,
      organization_id: resolvedCompanyId,
      kpi_item_id: resolvedKpiId,
      target_value: targetVal,
      min_count_reject: (isNaN(Number(taskData.min_count_reject)) || !taskData.min_count_reject) ? 2 : Number(taskData.min_count_reject),
      max_count_reject: (isNaN(Number(taskData.max_count_reject)) || !taskData.max_count_reject) ? 3 : Number(taskData.max_count_reject),
      employees: (resolvedEmployees && resolvedEmployees.length > 0) ? resolvedEmployees : [37],
      priority: taskData.priority ? Number(resolveNumericId(taskData.priority)) : 2,
      process: numProcess,
      progress: numProcess,
      status: resolveStatusId(taskData.status || taskData.task_status, numProcess),
      task_status: resolveStatusId(taskData.status || taskData.task_status, numProcess),
      is_incident: taskData.is_incident || false,
      is_improvement: taskData.is_improvement || false,
    };
    if (taskData.department_id) {
      body.department_id = Number(resolveNumericId(taskData.department_id));
      body.department = body.department_id;
    }
  } else if (action === 'UPDATE') {
    const cleanId = resolveNumericId(taskData.id);
    if (typeof cleanId !== 'number' || isNaN(cleanId) || cleanId <= 0) {
      return { success: true, message: 'Nhiệm vụ nội bộ Supabase, không đồng bộ APEC' };
    }

    endpoint = '/api/v1/external/tasks/update';
    method = 'PUT';
    // Map status string/object -> numeric ID cho Apec Global
    const numProcess = Number(taskData.process ?? taskData.progress ?? 0);
    const resolvedKpiId = Number(resolveNumericId(taskData.kpi_item_id || taskData.kpi_item?.id)) || 47;
    let targetVal = Number(taskData.target_value);
    if (!targetVal || isNaN(targetVal) || targetVal <= 0) {
      targetVal = (resolvedKpiId === 47 || resolvedKpiId === 48) ? 100 : (resolvedKpiId === 45 ? 1000000 : 1);
    }
    const numStatus = resolveStatusId(taskData.status || taskData.task_status, numProcess);
    const isCompletedStatus = numStatus === 4 || taskData.is_completed === true || taskData.status === 'done' || taskData.status === 'completed' || taskData.status === 'resolved';

    // Nếu task chuyển sang Hoàn thành và có danh sách employee_assignments trong payload, tự động duyệt trước
    if (isCompletedStatus && Array.isArray(taskData.employee_assignments) && taskData.employee_assignments.length > 0) {
      for (const ea of taskData.employee_assignments) {
        const eaNumId = resolveNumericId(ea.id || ea.ea_id || ea.raw_id);
        if (typeof eaNumId === 'number' && eaNumId > 0) {
          try {
            await sendOutboundRequest('/api/v1/tasks/progress/update', 'PUT', {
              id: eaNumId,
              task_id: cleanId,
              value: 100,
              actual_value: 100,
              process: 100,
              target_value: targetVal,
              status: 2,
              checked: true
            }, secretKey);
            await sendOutboundRequest('/api/v1/external/tasks/approve', 'PUT', {
              task_assignment_id: eaNumId
            }, secretKey);
          } catch {}
        }
      }
    }

    body = {
      ...taskData,
      id: cleanId,
      status: isCompletedStatus ? 4 : numStatus,
      task_status: isCompletedStatus ? 4 : numStatus,
      process: isCompletedStatus ? Math.max(numProcess, 100) : numProcess,
      progress: isCompletedStatus ? Math.max(numProcess, 100) : numProcess,
      kpi_item_id: resolvedKpiId,
      target_value: targetVal,
      updated_at: new Date().toISOString(),
    };
    if (taskData.project_id !== undefined) body.project_id = resolveNumericId(taskData.project_id);
    if (taskData.type_id !== undefined) {
      body.type_id = resolveNumericId(taskData.type_id);
      body.type_task = resolveNumericId(taskData.type_id);
    }
    if (taskData.checklist_id !== undefined) {
      body.checklist_id = resolveNumericId(taskData.checklist_id);
      body.type_task = resolveNumericId(taskData.checklist_id);
    }
    if (taskData.type_id === undefined && taskData.checklist_id !== undefined) {
      body.type_id = resolveNumericId(taskData.checklist_id);
    }
  } else if (action === 'DELETE') {
    endpoint = '/api/v1/external/tasks/delete';
    method = 'DELETE';
    const rawIds = taskData.ids || (taskData.id ? [taskData.id] : []);
    const cleanIds = rawIds.map(resolveNumericId).map(Number).filter(n => !isNaN(n) && n > 0);
    const cleanId = resolveNumericId(taskData.id || rawIds[0]);
    if (typeof cleanId !== 'number' && cleanIds.length === 0) {
      return { success: true, message: 'Nhiệm vụ nội bộ Supabase, đã xóa cục bộ' };
    }
    body = {
      id: typeof cleanId === 'number' ? cleanId : cleanIds[0],
      ids: cleanIds.length > 0 ? cleanIds : [cleanId],
    };
  }

  const res = await sendOutboundRequest(endpoint, method, body, secretKey);

  // Sau khi tạo mới thành công, tự động gọi UPDATE để ép khởi tạo target_value & kpi_item_id trong DB APEC
  if (action === 'CREATE' && res.success) {
    const createdId = res.data?.data?.task_id || res.data?.task_id || res.data?.id;
    if (createdId) {
      try {
        await sendOutboundRequest('/api/v1/external/tasks/update', 'PUT', {
          id: resolveNumericId(createdId),
          target_value: targetVal,
          target: targetVal,
          kpi_item_id: resolvedKpiId,
          min_count_reject: body.min_count_reject,
          max_count_reject: body.max_count_reject,
          process: body.process,
          status: body.status
        }, secretKey);
      } catch (postUpdateErr) {
        console.warn('Lỗi post-create initialize target_value:', postUpdateErr);
      }
    }
  }

  // Recovery: Nếu lỗi 'nhân viên chưa hoàn thành' hoặc 'ràng buộc dữ liệu', tự động hoàn thành tất cả assignments trước rồi retry
  if (!res.success && (
    res.error?.includes('nhân viên') || res.message?.includes('nhân viên') ||
    res.error?.includes('hoàn thành') || res.message?.includes('hoàn thành') ||
    res.error?.includes('ràng buộc') || res.message?.includes('ràng buộc')
  )) {
    // Lấy danh sách assignments từ APEC
    const taskId = resolveNumericId(taskData.id);
    try {
      const fetchRes = await fetch(`${APEC_GLOBAL_BASE_URL}/api/v1/external/tasks?id=${taskId}`, {
        headers: { 'X-Secret-Key': secretKey || '' }
      });
      if (fetchRes.ok) {
        const remoteJson = await fetchRes.json();
        const remoteAssignments = remoteJson?.data?.employee_assignments || [];
        // Complete and approve each assignment
        for (const ea of remoteAssignments) {
          if (!ea.checked) {
            // Update progress to 100
            await sendOutboundRequest('/api/v1/tasks/progress/update', 'PUT', {
              id: ea.id,
              task_id: taskId,
              value: 100,
              actual_value: 100,
              process: 100,
              target_value: Number(taskData.target_value) || 100,
              status: 2,
              checked: false
            }, secretKey);
            // Approve
            await sendOutboundRequest('/api/v1/external/tasks/approve', 'PUT', {
              task_assignment_id: ea.id
            }, secretKey);
          }
        }
        // Retry the original request
        const retryRes = await sendOutboundRequest(endpoint, method, body, secretKey);
        if (retryRes.success) {
          // Use retry result
          Object.assign(res, retryRes);
        }
      }
    } catch (recoveryErr) {
      console.warn('Recovery for nhân viên chưa hoàn thành failed:', recoveryErr);
    }
  }

  // Tự động đồng bộ toàn bộ công việc con (employee_assignments) sang APEC GLOBAL khi công việc cha cập nhật trạng thái/tiến độ
  if (action === 'UPDATE') {
    let assignmentsToSync = Array.isArray(taskData.employee_assignments) ? taskData.employee_assignments : [];
    if (assignmentsToSync.length === 0 && taskData.id && !String(taskData.id).startsWith('apec_') && (taskData.process !== undefined || taskData.progress !== undefined || taskData.status !== undefined)) {
      try {
        const fetchRes = await fetch(`${APEC_GLOBAL_BASE_URL}/api/v1/external/tasks?id=${taskData.id}`, {
          headers: { 'X-Secret-Key': secretKey || '' }
        });
        if (fetchRes.ok) {
          const remoteJson = await fetchRes.json();
          if (remoteJson?.data?.employee_assignments && Array.isArray(remoteJson.data.employee_assignments)) {
            assignmentsToSync = remoteJson.data.employee_assignments;
          }
        }
      } catch (err) {
        console.warn('Không thể tự động tải employee_assignments cho task cha:', err);
      }
    }

    if (assignmentsToSync.length > 0) {
      const subtaskPromises = assignmentsToSync
        .filter((st: any) => st && st.id && !String(st.id).startsWith('ea_') && !String(st.id).startsWith('st_'))
        .map((st: any) =>
          syncAssignmentOutbound(
            'UPDATE',
            {
              id: st.id,
              task_id: taskData.id,
              process: taskData.process !== undefined ? taskData.process : (taskData.progress !== undefined ? taskData.progress : st.process),
              progress: taskData.process !== undefined ? taskData.process : (taskData.progress !== undefined ? taskData.progress : st.process),
              status: taskData.status || st.status,
              checked: st.checked !== undefined ? st.checked : (taskData.status === 'done' || taskData.status === 4 || taskData.is_completed === true),
              completed_date: st.completed_date || taskData.date_end || taskData.end_date,
            },
            changedBy,
            secretKey,
            true
          )
        );
      await Promise.all(subtaskPromises).catch(err => {
        console.warn('Lỗi khi đồng bộ tự động danh sách subtasks theo task cha:', err);
      });
    }
  }

  await recordAuditLog({
    action: action as any,
    resource_type: 'task' as any,
    resource_id: String(taskData.id || (taskData.ids && taskData.ids[0]) || 'NEW'),
    new_value: body,
    changed_by: changedBy,
    sync_direction: 'OUTBOUND',
    status: res.success ? 'SUCCESS' : 'ERROR',
    error_message: res.error,
  });

  return res;
}

/**
 * Wrapper đồng bộ ngược cho Checklist (liên kết với Task Type)
 */
export async function syncChecklistOutbound(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  checklistData: { id?: string | number; name?: string; is_default?: boolean; projects?: Array<{ id: string | number }>; ids?: Array<string | number> },
  changedBy?: string,
  secretKey?: string
) {
  return syncTaskTypeOutbound(action, checklistData, changedBy, secretKey);
}

/**
 * Đồng bộ ngược Công việc con (Subtask / Assignment / employee_assignments)
 */
export async function syncAssignmentOutbound(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  assignmentData: {
    id?: string | number;
    task_id?: string | number;
    name?: string;
    title?: string;
    process?: number;
    progress?: number;
    status?: string;
    checked?: boolean;
    completed_date?: string;
    assignee_id?: string | number;
    assignee?: any;
    due_date?: string;
    end_date?: string;
    start_date?: string;
    ids?: Array<string | number>;
    [key: string]: any;
  },
  changedBy?: string,
  secretKey?: string,
  skipParentSync?: boolean
) {
  let endpoint = '';
  let method: 'POST' | 'PUT' | 'DELETE' = 'POST';
  let body: any = { ...assignmentData };

  if (action === 'CREATE') {
    endpoint = '/api/v1/external/assignments/create';
    method = 'POST';
  } else if (action === 'UPDATE') {
    const numEaId = resolveNumericId(assignmentData.id);
    if (typeof numEaId !== 'number' || isNaN(numEaId) || numEaId <= 0) {
      return { success: true, message: 'Phân công nội bộ Supabase, không đồng bộ APEC' };
    }

    endpoint = '/api/v1/tasks/progress/update';
    method = 'PUT';
    const numProcess = Number(
      assignmentData.process !== undefined
        ? assignmentData.process
        : assignmentData.progress !== undefined
          ? assignmentData.progress
          : 0
    );

    const numStatus = resolveStatusId(assignmentData.status, numProcess);
    const targetVal = Number(assignmentData.target_value) || 100;
    const isExplicitlyDone = assignmentData.status === 'done' || assignmentData.status === 'completed' || assignmentData.checked === true || numStatus === 4;
    const resolvedStatus = isExplicitlyDone ? 4 : (numProcess >= 100 ? 3 : numStatus);

    body = {
      id: numEaId,
      task_id: resolveNumericId(assignmentData.task_id || assignmentData.taskId || assignmentData.parent_id),
      value: numProcess,
      actual_value: numProcess,
      process: numProcess,
      progress: numProcess,
      target_value: targetVal,
      status: resolvedStatus,
      checked: isExplicitlyDone,
    };
  } else if (action === 'DELETE') {
    endpoint = '/api/v1/external/assignments/delete';
    method = 'DELETE';
    const rawIds = assignmentData.ids || (assignmentData.id ? [assignmentData.id] : []);
    const cleanIds = rawIds.map(resolveNumericId).map(Number).filter(n => !isNaN(n) && n > 0);
    if (cleanIds.length === 0) {
      return { success: true, message: 'Phân công nội bộ Supabase, đã xóa cục bộ' };
    }
    body = {
      ids: cleanIds,
    };
  }

  let res = await sendOutboundRequest(endpoint, method, body, secretKey);

  // Nếu hoàn thành thành công, tự động gọi approve để máy chủ xác nhận đã duyệt
  const isExplicitlyDoneFinal = assignmentData.status === 'done' || assignmentData.status === 'completed' || assignmentData.checked === true;
  const finalEaId = resolveNumericId(assignmentData.id);
  if (action === 'UPDATE' && res.success && isExplicitlyDoneFinal && typeof finalEaId === 'number' && finalEaId > 0) {
    try {
      await sendOutboundRequest('/api/v1/external/tasks/approve', 'PUT', { task_assignment_id: finalEaId }, secretKey);
    } catch {}
  }

  // Nếu máy chủ báo lỗi liên quan đến target_value hoặc chưa đạt target_value
  if (!res.success && (res.error?.includes('target_value') || res.message?.includes('target_value') || res.error?.includes('hoàn thành'))) {
    const targetVal = Number(assignmentData.target_value) || 100;
    const numProcess = Number(assignmentData.process ?? assignmentData.progress ?? 0);
    const parentTaskId = resolveNumericId(assignmentData.task_id || assignmentData.taskId || assignmentData.parent_id);

    // Ép khởi tạo target_value lên task cha trước
    if (parentTaskId) {
      try {
        await sendOutboundRequest('/api/v1/external/tasks/update', 'PUT', {
          id: parentTaskId,
          target_value: targetVal,
          target: targetVal,
          kpi_item_id: 47,
          process: numProcess
        }, secretKey);
      } catch {}
    }
    
    // Thử gửi cập nhật với status: 2 hoặc 3 kèm target_value
    const retryBody = {
      ...body,
      status: numProcess >= 100 ? 3 : 2,
      target_value: targetVal,
      actual_value: numProcess,
      value: numProcess
    };
    const retryRes = await sendOutboundRequest(endpoint, method, retryBody, secretKey);
    if (retryRes.success) {
      res = retryRes;
    }
  }

  // Fallback: nếu API assignments trên apecglobal trả về hoặc có task_id, tự động đồng bộ cả tiến độ công việc cha
  if (!skipParentSync && (assignmentData.task_id || assignmentData.taskId || assignmentData.parent_id)) {
    const parentTaskId = resolveNumericId(assignmentData.task_id || assignmentData.taskId || assignmentData.parent_id);
    const numProcess = Number(assignmentData.process ?? assignmentData.progress ?? 0);
    const targetVal = Number(assignmentData.target_value) || 100;
    try {
      await sendOutboundRequest('/api/v1/external/tasks/update', 'PUT', {
        id: parentTaskId,
        process: numProcess,
        progress: numProcess,
        status: resolveStatusId(assignmentData.status, numProcess),
        target_value: targetVal,
        kpi_item_id: 47,
      }, secretKey);
    } catch { }
  }

  await recordAuditLog({
    action: action as any,
    resource_type: 'task' as any,
    resource_id: String(assignmentData.id || (assignmentData.ids && assignmentData.ids[0]) || 'NEW_SUBTASK'),
    new_value: body,
    changed_by: changedBy,
    sync_direction: 'OUTBOUND',
    status: res.success ? 'SUCCESS' : 'ERROR',
    error_message: res.error,
  });

  return res;
}

/**
 * Duyệt phân công công việc (Task Assignment Approve)
 * Endpoint: PUT /api/v1/external/tasks/approve
 * Body: { task_assignment_id: number }
 */
export async function syncTaskApproveOutbound(
  taskAssignmentId: number | string,
  changedBy?: string,
  secretKey?: string
) {
  const cleanId = resolveNumericId(taskAssignmentId);
  if (typeof cleanId !== 'number' || isNaN(cleanId) || cleanId <= 0) {
    return { success: true, message: 'Phân công nội bộ Supabase, không cần duyệt APEC' };
  }
  const body = {
    task_assignment_id: cleanId
  };

  const res = await sendOutboundRequest('/api/v1/external/tasks/approve', 'PUT', body, secretKey);

  // Nếu đã được duyệt từ trước, bỏ qua lỗi và coi như thành công
  if (!res.success && (res.error?.toLowerCase().includes('đã được duyệt') || res.message?.toLowerCase().includes('đã được duyệt'))) {
    res.success = true;
    res.error = undefined;
    res.message = 'Thành công (Đã được duyệt từ trước)';
  }

  await recordAuditLog({
    action: 'UPDATE' as any,
    resource_type: 'task' as any,
    resource_id: String(cleanId),
    new_value: body,
    changed_by: changedBy,
    sync_direction: 'OUTBOUND',
    status: res.success ? 'SUCCESS' : 'ERROR',
    error_message: res.error,
  });

  return res;
}


