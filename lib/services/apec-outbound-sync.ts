import { APEC_GLOBAL_BASE_URL } from '@/lib/services/apec-global-api';
import { recordAuditLog } from '@/lib/services/audit-logger';
import { invalidateCache } from '@/lib/services/server-cache';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
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

/**
 * Map status (string/object/number) -> numeric ID cho Apec Global API
 * 1 = Chưa thực hiện, 2 = Đang thực hiện, 3 = Chờ duyệt, 4 = Hoàn thành
 */
function resolveStatusId(st: any, fallbackProcess?: number): number {
  if (st && typeof st === 'object') {
    if (st.id) return Number(st.id);
    const name = String(st.name || '').toLowerCase();
    if (name.includes('hoàn thành') || name.includes('done') || name.includes('completed')) return 4;
    if (name.includes('chờ duyệt') || name.includes('review')) return 3;
    if (name.includes('đang') || name.includes('in_progress') || name.includes('progress')) return 2;
    if (name.includes('chưa') || name.includes('todo') || name.includes('not_started')) return 1;
  }
  if (typeof st === 'string') {
    const s = st.toLowerCase();
    if (s === 'done' || s === 'completed') return 4;
    if (s === 'review' || s === 'pending_review') return 3;
    if (s === 'in_progress' || s === 'doing') return 2;
    if (s === 'todo' || s === 'not_started') return 1;
  }
  if (st != null && !Number.isNaN(Number(st))) return Number(st);
  const p = fallbackProcess ?? 0;
  return p >= 100 ? 4 : p > 0 ? 2 : 1;
}

function resolveNumericId(val: any): number | string | undefined {
  if (val == null) return undefined;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (/^\d+$/.test(str)) return Number(str);
  const cleaned = str.replace(/^(apec_type_t_|apec_type_|apec_emp_|apec_prj_|apec_|p-|prj_|t_|st_|st_dir_)+/ig, '');
  if (/^\d+$/.test(cleaned)) return Number(cleaned);
  return val;
}

function getOutboundCandidateEndpoints(endpoint: string, bodyData: any): string[] {
  const list: string[] = [endpoint];
  const id = bodyData?.id || bodyData?.task_id || '';

  if (endpoint.includes('/tasks/types')) {
    list.push(
      '/api/v1/external/tasks/types/update',
      '/api/v1/external/tasks/types',
      '/api/v1/tasks/types/update',
      '/api/v1/tasks/types',
      id ? `/api/v1/external/tasks/types/${id}` : ''
    );
  } else if (endpoint.includes('/tasks/progress/update') || endpoint.includes('/assignments/update') || endpoint.includes('/assignments')) {
    list.push(
      '/api/v1/tasks/progress/update',
      '/api/v1/assignments/update',
      '/api/v1/external/assignments/update',
      id ? `/api/v1/external/assignments/${id}` : ''
    );
  } else if (endpoint.includes('/tasks/update') || endpoint.includes('/tasks')) {
    list.push(
      '/api/v1/tasks/update',
      '/api/v1/external/tasks/update',
      '/api/v1/external/tasks',
      id ? `/api/v1/external/tasks/${id}` : '',
      '/api/v1/tasks'
    );
  } else if (endpoint.includes('/projects/update') || endpoint.includes('/projects')) {
    list.push(
      '/api/v1/external/projects/update',
      '/api/v1/external/projects',
      '/api/v1/externals/projects/update',
      '/api/v1/externals/projects',
      id ? `/api/v1/external/projects/${id}` : '',
      '/api/v1/projects/update',
      '/api/v1/projects'
    );
  }
  return Array.from(new Set(list.filter(Boolean)));
}


async function sendOutboundRequest(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  bodyData: any,
  secretKey?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const key = secretKey || process.env.APEC_GLOBAL_SECRET_KEY || '';
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
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s max timeout for direct call

        const response = await fetch(`${APEC_GLOBAL_BASE_URL}${candidate}`, {
          method: m,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Secret-Key': key,
          },
          body: JSON.stringify(bodyData),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const text = await response.text();
        let resJson: any;
        try { resJson = JSON.parse(text); } catch { resJson = text; }

        if (response.ok && (!resJson || typeof resJson !== 'object' || (!resJson.error && resJson.status !== 'error'))) {
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
    endpoint = '/api/v1/external/projects/update';
    method = 'PUT';
    body = {
      ...projectData,
      id: resolveNumericId(projectData.id),
    };
    if (projectData.status) {
      body.status = resolveStatusId(projectData.status);
    }
  } else if (action === 'DELETE') {
    endpoint = '/api/v1/external/projects/delete';
    method = 'DELETE';
    body = {
      ids: projectData.ids || (projectData.id ? [projectData.id] : []),
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
    endpoint = '/api/v1/external/tasks/types/update';
    method = 'PUT';
    const numId = resolveNumericId(checklistData.id);
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
    body = {
      id: cleanSingleId,
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

  if (action === 'CREATE') {
    endpoint = '/api/v1/external/tasks/create';
    method = 'POST';
    const numProcess = Number(taskData.process ?? taskData.progress ?? 0);
    const rawPrjId = taskData.project_id ?? taskData.projectId;
    const resolvedPrjId = Number(resolveNumericId(rawPrjId) || 62);
    const rawTypeId = taskData.type_task ?? taskData.type_id ?? taskData.checklist_id;
    const resolvedTypeId = Number(resolveNumericId(rawTypeId) || 6);
    const rawCompanyId = taskData.company_id ?? taskData.company ?? taskData.organization_id ?? taskData.organizationId;
    const resolvedCompanyId = Number(resolveNumericId(rawCompanyId) || 6);
    const resolvedKpiId = Number(resolveNumericId(taskData.kpi_item_id) || 47);
    let targetVal = Number(taskData.target_value);
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
      description: taskData.description || '',
      date_start: taskData.date_start || taskData.start_date || new Date().toISOString().split('T')[0],
      date_end: taskData.date_end || taskData.end_date || taskData.due_date || new Date().toISOString().split('T')[0],
      type_task: resolvedTypeId,
      project_id: resolvedPrjId,
      company_id: resolvedCompanyId,
      company: resolvedCompanyId,
      organization_id: resolvedCompanyId,
      kpi_item_id: resolvedKpiId,
      target_value: targetVal,
      employees: resolvedEmployees,
      priority: taskData.priority ? Number(resolveNumericId(taskData.priority)) : 2,
      process: numProcess
    };
  } else if (action === 'UPDATE') {
    endpoint = '/api/v1/external/tasks/update';
    method = 'PUT';
    // Map status string/object -> numeric ID cho Apec Global
    const numProcess = Number(taskData.process ?? taskData.progress ?? 0);
    body = {
      ...taskData,
      id: resolveNumericId(taskData.id),
      status: resolveStatusId(taskData.status, numProcess),
      process: numProcess,
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
    const cleanId = resolveNumericId(taskData.id || (rawIds[0] ?? ''));
    body = {
      id: cleanId,
      ids: rawIds.map(resolveNumericId),
    };
  }

  const res = await sendOutboundRequest(endpoint, method, body, secretKey);

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
              checked: st.checked !== undefined ? st.checked : (Number(taskData.process || taskData.progress) >= 100),
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

    body = {
      id: resolveNumericId(assignmentData.id),
      task_id: resolveNumericId(assignmentData.task_id || assignmentData.taskId || assignmentData.parent_id),
      value: numProcess,
      status: numStatus,
      checked: assignmentData.checked !== undefined ? assignmentData.checked : numProcess >= 100,
    };
  } else if (action === 'DELETE') {
    endpoint = '/api/v1/external/assignments/delete';
    method = 'DELETE';
    const rawIds = assignmentData.ids || (assignmentData.id ? [assignmentData.id] : []);
    body = {
      ids: rawIds.map(resolveNumericId),
    };
  }

  const res = await sendOutboundRequest(endpoint, method, body, secretKey);

  // Fallback: nếu API assignments trên apecglobal trả về hoặc có task_id, tự động đồng bộ cả tiến độ công việc cha
  if (!skipParentSync && (assignmentData.task_id || assignmentData.taskId || assignmentData.parent_id)) {
    try {
      await sendOutboundRequest('/api/v1/tasks/update', 'PUT', {
        id: resolveNumericId(assignmentData.task_id || assignmentData.taskId || assignmentData.parent_id),
        process: assignmentData.process !== undefined ? assignmentData.process : assignmentData.progress,
        status: assignmentData.status
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

