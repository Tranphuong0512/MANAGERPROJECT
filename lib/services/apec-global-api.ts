/**
 * ============================================================================
 * APEC GLOBAL API CLIENT SERVICE
 * ============================================================================
 * 
 * BASE_URL: https://api.apecglobal.net
 * Header: X-Secret-Key: 7LBsS1bIq+0jHWLDRmDktDY36LD0ea7mH2TnHFYzVwc=
 */

export const APEC_GLOBAL_BASE_URL = 'https://api.apecglobal.net';
export const APEC_GLOBAL_SECRET_KEY = process.env.APEC_GLOBAL_SECRET_KEY || '7LBsS1bIq+0jHWLDRmDktDY36LD0ea7mH2TnHFYzVwc=';

export interface ApecCompany {
  id: string | number;
  name?: string;
  company_name?: string;
  code?: string;
  tax_code?: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: string | number;
  description?: string;
  [key: string]: any;
}

export interface ApecProject {
  id: string | number;
  name?: string;
  project_name?: string;
  code?: string;
  company_id?: string | number;
  status?: string | number;
  start_date?: string;
  end_date?: string;
  description?: string;
  manager?: string;
  [key: string]: any;
}

export interface ApecEmployee {
  id: string | number;
  fullname?: string;
  name?: string;
  code?: string;
  email?: string;
  phone?: string;
  position?: string;
  job_title?: string;
  department_name?: string;
  company_id?: string | number;
  avatar?: string;
  status?: string | number;
  [key: string]: any;
}

export interface ApecDepartment {
  id: string | number;
  name?: string;
  department_name?: string;
  description?: string;
  manager_id?: string | number;
  company_id?: string | number;
  organization_id?: string | number;
  status?: string | number;
  [key: string]: any;
}

export interface ApecTaskType {
  id: string | number;
  name?: string;
  active?: boolean | number;
  is_default?: boolean;
  projects?: Array<{ id: string | number; name?: string }>;
  tasks?: Array<{ id: string | number; name?: string }>;
  total_tasks?: number;
  [key: string]: any;
}

export interface ApecEmployeeAssignment {
  id: string | number;
  completed_date?: string;
  prove?: string;
  checked?: boolean;
  process?: number;
  employee?: { id: string | number; name?: string; avatar?: string };
  status?: { id: string | number; name?: string };
  [key: string]: any;
}

export interface ApecTask {
  id: string | number;
  title?: string;
  name?: string;
  code?: string;
  description?: string;
  project_id?: string | number;
  status?: string | number | { id?: string | number; name?: string };
  priority?: string | number | { id?: string | number; name?: string };
  type?: { id: string | number; name?: string };
  start_date?: string;
  due_date?: string;
  end_date?: string;
  assignee?: string | { id?: string | number; name?: string; avatar?: string };
  progress?: number;
  process?: number;
  employee_assignments?: ApecEmployeeAssignment[];
  subtasks?: Array<{ id: string | number; name?: string; process?: number; status?: any }>;
  [key: string]: any;
}

export interface ApecQueryParams {
  id?: string | number;
  search?: string;
  limit?: number;
}

function getCandidateEndpoints(baseEndpoint: string): string[] {
  const resource = baseEndpoint.split('/').filter(Boolean).pop() || '';
  const singular = resource.endsWith('ies')
    ? resource.slice(0, -3) + 'y'
    : resource.endsWith('s')
      ? resource.slice(0, -1)
      : resource;

  let extraTasksCandidates: string[] = [];
  if (resource === 'tasks' || baseEndpoint.includes('task')) {
    extraTasksCandidates = [
      '/api/v1/external/tasks',
      '/api/external/tasks',
      '/api/v1/jobs',
      '/api/v1/tasks',
      '/api/v1/work',
      '/api/v1/works',
      '/api/v1/checklists',
      '/api/v1/checklist',
      '/api/v1/project-tasks',
      '/api/v1/project_tasks',
      '/api/v1/todos',
      '/api/v1/issues',
      '/api/v1/task-list',
      '/api/v1/tasks-list',
      '/api/v1/assignments',
      '/api/v1/task',
      '/api/v1/project/tasks',
      '/api/v1/projects/tasks'
    ];
  }

  let extraDeptCandidates: string[] = [];
  if (resource === 'departments' || baseEndpoint.includes('department')) {
    extraDeptCandidates = [
      '/api/v1/external/departments',
      '/api/external/departments',
      '/api/v1/departments',
      '/api/v1/externals/departments',
      '/api/departments',
    ];
  }

  let extraTaskTypesCandidates: string[] = [];
  if (baseEndpoint.includes('tasks/types') || baseEndpoint.includes('task-types') || resource === 'types') {
    extraTaskTypesCandidates = [
      '/api/v1/external/tasks/types',
      '/api/external/tasks/types',
      '/api/v1/externals/task-types',
      '/api/v1/externals/tasks/types',
      '/api/v1/task-types',
      '/api/v1/tasks/types',
      '/api/tasks/types',
    ];
  }

  const candidates = [
    baseEndpoint,                             // /api/v1/externals/companies
    ...extraTasksCandidates,
    ...extraDeptCandidates,
    ...extraTaskTypesCandidates,
    `/api/externals/${resource}`,             // /api/externals/companies
    `/externals/${resource}`,                 // /externals/companies
    `/api/v1/external/${resource}`,           // /api/v1/external/companies
    `/api/external/${resource}`,              // /api/external/companies
    `/api/v1/${resource}`,                    // /api/v1/companies
    `/api/${resource}`,                       // /api/companies
    `/${resource}`,                           // /companies
    `/api/share/${resource}`,                 // /api/share/companies
    `/api/integration/${resource}`,           // /api/integration/companies
    `/api/v1/externals/${singular}`,          // /api/v1/externals/company
    `/api/v1/${singular}`,                    // /api/v1/company
  ];
  return Array.from(new Set(candidates));
}

// In-memory Circuit Breaker state
let cbConsecutiveFailures = 0;
let cbOpenUntil = 0;

/**
 * Common request fetcher to APEC GLOBAL APIs with auto fallback discovery
 */
export async function fetchFromApecGlobal<T = any>(
  endpoint: string,
  params: ApecQueryParams = {},
  customSecretKey?: string
): Promise<{ success: boolean; data?: T; status: number; error?: string }> {
  const secretKeyToUse = customSecretKey || (params as any).secretKey || APEC_GLOBAL_SECRET_KEY;
  if (!secretKeyToUse) {
    return {
      success: false,
      status: 401,
      error: 'X-Secret-Key buộc phải nhập thủ công trên phần Cài đặt để đảm bảo bảo mật tuyệt đối.',
    };
  }

  // Circuit Breaker Check
  const now = Date.now();
  if (cbConsecutiveFailures >= 5 && now < cbOpenUntil) {
    return {
      success: false,
      status: 503,
      error: `Hệ thống APEC GLOBAL đang quá tải hoặc lỗi. Ngắt mạch bảo vệ (Circuit Breaker) được kích hoạt. Vui lòng thử lại sau ${Math.ceil((cbOpenUntil - now) / 1000)} giây.`,
    };
  }

  const candidatePaths = getCandidateEndpoints(endpoint);
  let lastError = 'Không thể kết nối đến máy chủ APEC GLOBAL';
  let lastStatus = 404;

  for (const candidate of candidatePaths) {
    try {
      const url = new URL(`${APEC_GLOBAL_BASE_URL}${candidate}`);
      if (params.id !== undefined && params.id !== null && params.id !== '') {
        url.searchParams.set('id', String(params.id));
      } else {
        url.searchParams.set('limit', params.limit ? String(params.limit) : '1000');
      }
      if (params.search !== undefined && params.search !== null && params.search !== '') {
        url.searchParams.set('search', String(params.search));
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Secret-Key': secretKeyToUse,
        },
        cache: 'no-store',
      });

      const status = response.status;
      lastStatus = status;
      let data: any;
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      // Nếu HTTP status OK (200-299), trả về thành công ngay lập tức
      if (response.ok) {
        // Reset Circuit Breaker on success
        cbConsecutiveFailures = 0;
        return {
          success: true,
          status,
          data,
        };
      }

      // Nếu không phải 404 (ví dụ 401, 403, 500, hay có json error phản hồi), dừng probe và báo lỗi
      if (status !== 404 || (typeof data === 'object' && data && (data.error || data.message))) {
        // Record failure for Circuit Breaker
        cbConsecutiveFailures++;
        if (cbConsecutiveFailures >= 5) {
          cbOpenUntil = Date.now() + 30000; // Open circuit for 30s
        }
        return {
          success: false,
          status,
          error: typeof data === 'string' ? data : data?.message || data?.error || `HTTP ${status}`,
        };
      }

      lastError = typeof data === 'string' ? data : `HTTP ${status}`;
    } catch (error: any) {
      lastError = error?.message || lastError;
      // Record failure for Circuit Breaker (Network errors)
      cbConsecutiveFailures++;
      if (cbConsecutiveFailures >= 5) {
        cbOpenUntil = Date.now() + 30000;
      }
    }
  }

  // If all probes failed (e.g. 404s everywhere)
  cbConsecutiveFailures++;
  if (cbConsecutiveFailures >= 5) {
    cbOpenUntil = Date.now() + 30000;
  }

  return {
    success: false,
    status: lastStatus,
    error: lastError,
  };
}

/**
 * Trích xuất danh sách mảng từ Response của APEC GLOBAL
 */
export function extractApecArray<T = any>(responseData: any): T[] {
  if (!responseData) return [];
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData.data)) return responseData.data;
  if (Array.isArray(responseData.result)) return responseData.result;
  if (Array.isArray(responseData.items)) return responseData.items;
  if (Array.isArray(responseData.list)) return responseData.list;
  if (Array.isArray(responseData.employees)) return responseData.employees;
  if (Array.isArray(responseData.tasks)) return responseData.tasks;
  if (Array.isArray(responseData.jobs)) return responseData.jobs;
  if (Array.isArray(responseData.companies)) return responseData.companies;
  if (Array.isArray(responseData.projects)) return responseData.projects;
  if (Array.isArray(responseData.departments)) return responseData.departments;
  if (Array.isArray(responseData.task_types)) return responseData.task_types;
  if (Array.isArray(responseData.types)) return responseData.types;
  if (Array.isArray(responseData.checklists)) return responseData.checklists;

  // Nếu data là object (ví dụ: { data: { employees: [...] } } hoặc { data: { tasks: [...] } } hoặc { data: { jobs: [...] } })
  if (responseData.data && typeof responseData.data === 'object') {
    const obj = responseData.data;
    if (Array.isArray(obj.employees)) return obj.employees;
    if (Array.isArray(obj.tasks)) return obj.tasks;
    if (Array.isArray(obj.jobs)) return obj.jobs;
    if (Array.isArray(obj.companies)) return obj.companies;
    if (Array.isArray(obj.projects)) return obj.projects;
    if (Array.isArray(obj.departments)) return obj.departments;
    if (Array.isArray(obj.task_types)) return obj.task_types;
    if (Array.isArray(obj.types)) return obj.types;
    if (Array.isArray(obj.checklists)) return obj.checklists;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.list)) return obj.list;
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) return val;
    }
  }

  // Nếu responseData là object chứa một mảng con bất kỳ
  if (typeof responseData === 'object') {
    for (const val of Object.values(responseData)) {
      if (Array.isArray(val)) return val;
    }
  }

  // If a single item is returned as object
  if (typeof responseData === 'object' && responseData.id) return [responseData];
  if (typeof responseData.data === 'object' && responseData.data?.id) return [responseData.data];
  return [];
}

/**
 * Trích xuất đối tượng chi tiết khi truy vấn bằng id
 */
export function extractApecDetail<T = any>(responseData: any): T | null {
  if (!responseData) return null;
  if (Array.isArray(responseData)) return responseData[0] || null;
  if (responseData.data && typeof responseData.data === 'object') {
    if (Array.isArray(responseData.data)) return responseData.data[0] || null;
    return responseData.data;
  }
  if (typeof responseData === 'object') return responseData;
  return null;
}

/**
 * 1. Lấy Danh sách / Chi tiết Công ty
 * - Path: /api/v1/external/companies
 */
export async function getApecCompanies(params?: ApecQueryParams, customSecretKey?: string) {
  const res = await fetchFromApecGlobal('/api/v1/external/companies', params, customSecretKey);
  if (!res.success) {
    return {
      ...res,
      items: [] as ApecCompany[],
      detail: null,
    };
  }
  return {
    ...res,
    items: extractApecArray<ApecCompany>(res.data),
    detail: params?.id ? extractApecDetail<ApecCompany>(res.data) : null,
  };
}

/**
 * 2. Lấy Danh sách / Chi tiết Dự án
 * - Path: /api/v1/external/projects
 */
export async function getApecProjects(params?: ApecQueryParams, customSecretKey?: string) {
  const res = await fetchFromApecGlobal('/api/v1/external/projects', params, customSecretKey);
  if (!res.success) {
    return {
      ...res,
      items: [] as ApecProject[],
      detail: null,
    };
  }
  return {
    ...res,
    items: extractApecArray<ApecProject>(res.data),
    detail: params?.id ? extractApecDetail<ApecProject>(res.data) : null,
  };
}

/**
 * 3. Lấy Danh sách / Chi tiết Nhân viên tập đoàn
 * - Path: /api/v1/external/employees
 */
export async function getApecEmployees(params?: ApecQueryParams, customSecretKey?: string) {
  const res = await fetchFromApecGlobal('/api/v1/external/employees', params, customSecretKey);
  if (!res.success) {
    return {
      ...res,
      items: [] as ApecEmployee[],
      detail: null,
    };
  }
  return {
    ...res,
    items: extractApecArray<ApecEmployee>(res.data),
    detail: params?.id ? extractApecDetail<ApecEmployee>(res.data) : null,
  };
}

/**
 * 4. Lấy Danh sách / Chi tiết Công việc
 * - Path: /api/v1/external/tasks
 */
export async function getApecTasks(params?: ApecQueryParams, customSecretKey?: string) {
  const res = await fetchFromApecGlobal('/api/v1/external/tasks', params, customSecretKey);
  if (!res.success) {
    return {
      ...res,
      items: [] as ApecTask[],
      detail: null,
    };
  }
  return {
    ...res,
    items: extractApecArray<ApecTask>(res.data),
    detail: params?.id ? extractApecDetail<ApecTask>(res.data) : null,
  };
}

/**
 * 5. Lấy Danh sách / Chi tiết Phòng ban
 * - Path: /api/v1/external/departments
 */
export async function getApecDepartments(params?: ApecQueryParams, customSecretKey?: string) {
  const res = await fetchFromApecGlobal('/api/v1/external/departments', params, customSecretKey);
  if (!res.success) {
    return {
      ...res,
      items: [] as ApecDepartment[],
      detail: null,
    };
  }
  return {
    ...res,
    items: extractApecArray<ApecDepartment>(res.data),
    detail: params?.id ? extractApecDetail<ApecDepartment>(res.data) : null,
  };
}

/**
 * 6. Lấy Danh sách / Chi tiết Loại nhiệm vụ (ĐỒNG BỘ LÀ CHECKLIST)
 * - Path: /api/v1/external/tasks/types
 */
export async function getApecTaskTypes(params?: ApecQueryParams, customSecretKey?: string) {
  const res = await fetchFromApecGlobal('/api/v1/external/tasks/types', params, customSecretKey);
  if (!res.success) {
    return {
      ...res,
      items: [] as ApecTaskType[],
      detail: null,
    };
  }
  return {
    ...res,
    items: extractApecArray<ApecTaskType>(res.data),
    detail: params?.id ? extractApecDetail<ApecTaskType>(res.data) : null,
  };
}

/**
 * 7. Lấy Danh sách / Chi tiết Công việc con (Employee Assignments / Subtasks)
 */
export async function getApecAssignments(params?: ApecQueryParams, customSecretKey?: string) {
  const taskRes = await getApecTasks(params, customSecretKey);
  if (!taskRes.success) {
    return {
      ...taskRes,
      items: [],
      detail: null,
    };
  }
  const tasks = taskRes.items || [];
  const allAssignments: any[] = [];
  tasks.forEach((t: any) => {
    if (Array.isArray(t.employee_assignments)) {
      t.employee_assignments.forEach((ea: any, idx: number) => {
        allAssignments.push({
          ...ea,
          task_id: t.id,
          task_title: t.title || t.name,
          project_id: t.project_id || t.project?.id,
          sort_order: ea.sort_order || idx + 1
        });
      });
    }
  });
  return {
    ...taskRes,
    items: allAssignments,
    detail: params?.id ? allAssignments.find((x: any) => String(x.id) === String(params.id)) || null : null,
  };
}