/**
 * ============================================================================
 * APEC GLOBAL — TypeScript Types & Interfaces
 * ============================================================================
 * Được thiết kế bởi Senior Database Architect.
 * Dựa trên JSON payload thực tế từ https://api.apecglobal.net (2026-08-11).
 *
 * QUAN TRỌNG:
 * - Tất cả ID là `number` (BIGINT) — KHÔNG dùng `string` UUID cho entity APEC.
 * - APEC API đôi khi trả về id dạng string ("388") → dùng `ApecId` type + helper.
 * - Supabase tables apec_* dùng BIGINT PRIMARY KEY, không phải UUID.
 * ============================================================================
 */

// ─── Helper: APEC trả về ID dạng string hoặc number ───────────────────────
export type ApecId = number | string;
export function toApecNumericId(id: ApecId | null | undefined): number | null {
  if (id === null || id === undefined || id === '') return null;
  const n = Number(id);
  return isNaN(n) ? null : n;
}

// ─── Embedded objects (sub-objects trong APEC responses) ───────────────────
export interface ApecStatusRef {
  id: number | null;
  name: string | null;
}

export interface ApecNameRef {
  id: number | null;
  name: string | null;
}

export interface ApecAssigneeRef {
  id: number | null;
  name: string | null;
  avatar: string | null;
}

// ─── 1. Company ────────────────────────────────────────────────────────────
/** Raw response từ /api/v1/external/companies */
export interface ApecCompanyRaw {
  id: ApecId;
  name: string;
  description: string | null;
  logo_url?: string | null;
  [key: string]: unknown; // extra fields → apec_sync_metadata
}

/** Supabase table: apec_companies */
export interface ApecCompany {
  id: number;                    // BIGINT PK
  name: string;
  description: string | null;
  logo_url: string | null;
  apec_sync_metadata: Record<string, unknown>;
  last_synced_at: string;        // ISO TIMESTAMPTZ
  created_at: string | null;
  updated_at: string | null;
}

// ─── 2. Project ────────────────────────────────────────────────────────────
/** Raw response từ /api/v1/external/projects */
export interface ApecProjectRaw {
  id: ApecId;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  project_status: ApecStatusRef;
  total_tasks: ApecId;           // API trả về dạng string "0"
  total_members: ApecId;         // API trả về dạng string "2"
  companies: Array<{ id: ApecId; name: string }>;
  [key: string]: unknown;
}

/** Supabase table: apec_projects */
export interface ApecProject {
  id: number;                    // BIGINT PK
  name: string;
  description: string | null;
  start_date: string | null;     // TIMESTAMPTZ
  end_date: string | null;
  created_at: string | null;
  status_id: number | null;      // project_status.id
  status_name: string | null;    // project_status.name
  total_tasks: number;
  total_members: number;
  primary_company_id: number | null;
  apec_sync_metadata: Record<string, unknown>; // chứa companies[] đầy đủ
  last_synced_at: string;
}

// ─── 3. Department ─────────────────────────────────────────────────────────
/** Raw response từ /api/v1/external/departments */
export interface ApecDepartmentRaw {
  id: ApecId;
  name: string;
  description: string | null;
  active: boolean;
  is_default: boolean;
  total_tasks: ApecId;
  manager?: { id: ApecId | null; name: string | null };
  projects?: Array<{ id: ApecId; name: string }>;
  [key: string]: unknown;
}

/** Supabase table: apec_departments */
export interface ApecDepartment {
  id: number;                    // BIGINT PK
  name: string;
  description: string | null;
  active: boolean;
  is_default: boolean;
  total_tasks: number;
  manager_id: number | null;     // FK → apec_employees.id
  manager_name: string | null;
  apec_sync_metadata: Record<string, unknown>; // chứa projects[]
  last_synced_at: string;
  created_at: string | null;
  updated_at: string | null;
}

// ─── 4. Employee ───────────────────────────────────────────────────────────
/** Raw response từ /api/v1/external/employees (payload đầy đủ) */
export interface ApecEmployeeRaw {
  id: ApecId;
  name: string;
  email: string | null;
  phone: string | null;
  department_id: ApecId | null;
  join_date: string | null;
  status: string;                // "active" | "inactive"
  avatar_url: string | null;
  salary: string | null;
  manager_id: ApecId | null;
  address: string | null;
  birthday: string | null;
  education: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
  password?: string;             // KHÔNG lưu vào Supabase — chỉ xuất hiện trong raw
  employees_status: number;      // 1=active
  position_id: ApecId | null;
  gen: number | null;            // 1=Nam, 2=Nữ
  birth_place: string | null;
  citizen_card: string | null;
  issue_date: string | null;
  issue_place: string | null;
  emergency_contract: string | null;
  second_avatar_url: string | null;
  third_avatar_url: string | null;
  exp: string;                   // "5710.00"
  level: number;
  next_exp: string | null;
  next_level: number | null;
  role_id: ApecId | null;
  level_id: ApecId | null;
  active: boolean;
  shift_work_id: string | null;
  saturday_attendance_id: string | null;
  annual_leave: number | null;
  leave_policy_id: ApecId | null;
  attendance_place_id: string | null;
  is_attendance: boolean;
  text_id: string | null;
  department: { id: ApecId; name: string } | null;
  positions: { id: ApecId; name: string } | null;
  levels: { id: ApecId; name: string } | null;
  certificates: ApecCertificate[];
  skills: ApecSkill[];
  employee_attendance_policy: unknown | null;
  leave_grant: unknown | null;
  [key: string]: unknown;
}

export interface ApecCertificate {
  id: number;
  employee_id: number;
  certificate_name: string;
  status: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApecSkill {
  id: number;
  name: string;
  value: number;
  id_skill_group: number;
  max_value_skill: string;
}

/** Supabase table: apec_employees */
export interface ApecEmployee {
  id: number;                    // BIGINT PK
  name: string;
  email: string | null;
  phone: string | null;
  department_id: number | null;  // FK → apec_departments.id
  department_name: string | null;
  manager_id: number | null;     // FK → apec_employees.id (self-ref)
  position_id: number | null;
  position_name: string | null;
  level_id: number | null;
  level: number;
  level_name: string | null;
  exp: number;
  next_exp: number | null;
  next_level: number | null;
  status: string;
  employees_status: number;
  active: boolean;
  is_attendance: boolean;
  join_date: string | null;
  birthday: string | null;
  birth_place: string | null;
  address: string | null;
  gen: number | null;
  citizen_card: string | null;
  issue_date: string | null;
  issue_place: string | null;
  emergency_contract: string | null;
  education: string | null;
  bio: string | null;
  salary: number | null;
  annual_leave: number | null;
  leave_policy_id: number | null;
  text_id: string | null;
  avatar_url: string | null;
  second_avatar_url: string | null;
  third_avatar_url: string | null;
  role_id: number | null;
  shift_work_id: string | null;
  saturday_attendance_id: string | null;
  attendance_place_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  apec_sync_metadata: Record<string, unknown>; // chứa certificates[], skills[], leave_grant, attendance_policy
  last_synced_at: string;
}

// ─── 5. Task Type ──────────────────────────────────────────────────────────
/** Raw response từ /api/v1/external/tasks/types */
export interface ApecTaskTypeRaw {
  id: ApecId;
  name: string;
  active: boolean;
  is_default: boolean;
  total_tasks: ApecId;
  projects?: Array<{ id: ApecId; name: string }>;
  [key: string]: unknown;
}

/** Supabase table: apec_task_types */
export interface ApecTaskType {
  id: number;                    // BIGINT PK
  name: string;
  active: boolean;
  is_default: boolean;
  total_tasks: number;
  apec_sync_metadata: Record<string, unknown>; // chứa projects[]
  last_synced_at: string;
  created_at: string | null;
  updated_at: string | null;
}

// ─── 6. Employee Assignment (sub-object của Task) ──────────────────────────
/** Raw từ task.employee_assignments[] */
export interface ApecEmployeeAssignmentRaw {
  id: ApecId;
  completed_date: string | null;
  prove: string | null;
  checked: boolean;
  process: number;
  employee: { id: ApecId | null; name: string | null; avatar: string | null };
  status: ApecStatusRef;
  subtasks: unknown[];
}

/** Supabase table: apec_employee_assignments */
export interface ApecEmployeeAssignment {
  id: number;                    // BIGINT PK
  task_id: number;               // FK → apec_tasks.id
  employee_id: number | null;    // FK → apec_employees.id
  employee_name: string | null;
  employee_avatar: string | null;
  status_id: number;
  status_name: string | null;
  process: number;
  checked: boolean;
  completed_date: string | null;
  prove: string | null;
  apec_sync_metadata: Record<string, unknown>; // chứa subtasks[]
  last_synced_at: string;
  created_at: string | null;
  updated_at: string | null;
}

// ─── 7. Task ───────────────────────────────────────────────────────────────
/** Raw response từ /api/v1/external/tasks */
export interface ApecTaskRaw {
  id: ApecId;                    // API trả về string "388"
  name: string;
  description: string | null;
  process: string;               // "50.00"
  date_start: string;
  date_end: string;
  created_at: string;
  type: ApecNameRef;             // {id:13, name:"SỰ CỐ & RỦI RO"}
  priority: ApecStatusRef;       // {id:3, name:"Trung bình"}
  status: ApecStatusRef;         // {id:2, name:"Đang thực hiện"}
  project: ApecNameRef;          // {id:97, name:"GUARDCAM"}
  company: ApecNameRef;
  assignee: ApecAssigneeRef;
  target_type: ApecNameRef;
  kpi_item: ApecNameRef;         // {id:47, name:"Hoàn thành nhiệm vụ"}
  employee_assignments: ApecEmployeeAssignmentRaw[];
  [key: string]: unknown;
}

/** Supabase table: apec_tasks */
export interface ApecTask {
  id: number;                    // BIGINT PK (từ string "388")
  name: string;
  description: string | null;
  process: number;               // NUMERIC(6,2)
  date_start: string | null;
  date_end: string | null;
  created_at: string | null;
  updated_at: string | null;
  type_id: number | null;        // FK → apec_task_types.id
  type_name: string | null;
  priority_id: number | null;
  priority_name: string | null;
  status_id: number;
  status_name: string | null;
  project_id: number | null;     // FK → apec_projects.id (BIGINT!)
  project_name: string | null;
  company_id: number | null;
  company_name: string | null;
  assignee_id: number | null;    // FK → apec_employees.id (BIGINT!)
  assignee_name: string | null;
  assignee_avatar: string | null;
  kpi_item_id: number | null;
  kpi_item_name: string | null;
  target_type_id: number | null;
  target_type_name: string | null;
  apec_sync_metadata: Record<string, unknown>; // chứa employee_assignments[] đầy đủ
  last_synced_at: string;
}

// ─── 8. Incident (bảng sự cố, mirror từ tasks với type SỰ CỐ) ──────────────
/** Supabase table: apec_incidents */
export interface ApecIncident {
  id: number;                    // BIGINT PK = apec_tasks.id khi là sự cố
  task_id: number | null;        // FK → apec_tasks.id
  project_id: number | null;     // FK → apec_projects.id
  project_name: string | null;
  title: string;
  description: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'fixing' | 'resolved' | 'closed';
  reported_by: number | null;    // FK → apec_employees.id
  assigned_to: number | null;    // FK → apec_employees.id
  department_id: number | null;  // FK → apec_departments.id
  checklist_type_id: number | null;
  process: number;
  date_start: string | null;
  date_end: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  apec_sync_metadata: Record<string, unknown>;
  last_synced_at: string;
}

// ─── 9. Unified View type (từ VIEW v_incidents_unified) ───────────────────
export interface UnifiedIncident {
  id: string;                    // BIGINT → TEXT trong view
  project_id: string | null;
  project_name: string | null;
  title: string;
  description: string | null;
  severity: ApecIncident['severity'];
  status: ApecIncident['status'];
  reported_by: string | null;
  reporter_name: string | null;
  reporter_avatar: string | null;
  assigned_to: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  department_id: string | null;
  department_name: string | null;
  process: number;
  start_date: string | null;
  end_date: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  last_synced_at: string;
  apec_sync_metadata: Record<string, unknown>;
}

// ─── 10. Utility: Convert raw APEC payload → Supabase-ready objects ────────

export function mapApecTaskRawToDb(raw: ApecTaskRaw): ApecTask {
  const { type, priority, status, project, company, assignee, kpi_item, target_type, employee_assignments, process, ...rest } = raw;
  return {
    id: toApecNumericId(raw.id)!,
    name: raw.name || '',
    description: raw.description ?? null,
    process: parseFloat(String(process || '0')) || 0,
    date_start: raw.date_start ?? null,
    date_end: raw.date_end ?? null,
    created_at: raw.created_at ?? null,
    updated_at: null,
    type_id: toApecNumericId(type?.id),
    type_name: type?.name ?? null,
    priority_id: toApecNumericId(priority?.id),
    priority_name: priority?.name ?? null,
    status_id: toApecNumericId(status?.id) ?? 1,
    status_name: status?.name ?? null,
    project_id: toApecNumericId(project?.id),        // BIGINT — sẽ không bao giờ là UUID!
    project_name: project?.name ?? null,
    company_id: toApecNumericId(company?.id),
    company_name: company?.name ?? null,
    assignee_id: toApecNumericId(assignee?.id),       // BIGINT — không bị isUuid() loại bỏ!
    assignee_name: assignee?.name ?? null,
    assignee_avatar: assignee?.avatar ?? null,
    kpi_item_id: toApecNumericId(kpi_item?.id),
    kpi_item_name: kpi_item?.name ?? null,
    target_type_id: toApecNumericId(target_type?.id),
    target_type_name: target_type?.name ?? null,
    apec_sync_metadata: { employee_assignments, ...rest } as Record<string, unknown>,
    last_synced_at: new Date().toISOString(),
  };
}

export function mapApecEmployeeRawToDb(raw: ApecEmployeeRaw): Omit<ApecEmployee, 'password'> {
  const { password, department, positions, levels, certificates, skills, employee_attendance_policy, leave_grant, ...rest } = raw;
  return {
    id: toApecNumericId(raw.id)!,
    name: raw.name || '',
    email: raw.email ?? null,
    phone: raw.phone ?? null,
    department_id: toApecNumericId(raw.department_id),   // BIGINT FK
    department_name: raw.department?.name ?? null,
    manager_id: toApecNumericId(raw.manager_id),          // BIGINT FK self-ref
    position_id: toApecNumericId(raw.position_id),
    position_name: positions?.name ?? null,
    level_id: toApecNumericId(raw.level_id),
    level: raw.level || 1,
    level_name: levels?.name ?? null,
    exp: parseFloat(String(raw.exp || '0')) || 0,
    next_exp: raw.next_exp ? parseFloat(String(raw.next_exp)) : null,
    next_level: raw.next_level ?? null,
    status: raw.status || 'active',
    employees_status: raw.employees_status ?? 1,
    active: raw.active ?? true,
    is_attendance: raw.is_attendance ?? false,
    join_date: raw.join_date ?? null,
    birthday: raw.birthday ?? null,
    birth_place: raw.birth_place ?? null,
    address: raw.address ?? null,
    gen: raw.gen ?? null,
    citizen_card: raw.citizen_card ?? null,
    issue_date: raw.issue_date ?? null,
    issue_place: raw.issue_place ?? null,
    emergency_contract: raw.emergency_contract ?? null,
    education: raw.education ?? null,
    bio: raw.bio ?? null,
    salary: raw.salary ? parseFloat(String(raw.salary)) : null,
    annual_leave: raw.annual_leave ?? null,
    leave_policy_id: toApecNumericId(raw.leave_policy_id),
    text_id: raw.text_id ?? null,
    avatar_url: raw.avatar_url ?? null,
    second_avatar_url: raw.second_avatar_url ?? null,
    third_avatar_url: raw.third_avatar_url ?? null,
    role_id: toApecNumericId(raw.role_id),
    shift_work_id: raw.shift_work_id ?? null,
    saturday_attendance_id: raw.saturday_attendance_id ?? null,
    attendance_place_id: raw.attendance_place_id ?? null,
    created_at: raw.created_at ?? null,
    updated_at: raw.updated_at ?? null,
    apec_sync_metadata: { certificates, skills, employee_attendance_policy, leave_grant } as Record<string, unknown>,
    last_synced_at: new Date().toISOString(),
  };
}

// ─── Status mappings ───────────────────────────────────────────────────────
export const APEC_TASK_STATUS: Record<number, string> = {
  1: 'Chưa thực hiện',
  2: 'Đang thực hiện',
  3: 'Chờ duyệt',
  4: 'Hoàn thành',
};

export const APEC_PRIORITY: Record<number, string> = {
  1: 'Thấp',
  2: 'Bình thường',
  3: 'Trung bình',
  4: 'Cao',
  5: 'Khẩn cấp',
};

export const APEC_PROJECT_STATUS: Record<number, string> = {
  1: 'Mới',
  2: 'Đang thực hiện',
  3: 'Tạm dừng',
  4: 'Hoàn thành',
};

export function priorityIdToSeverity(priorityId: number | null): ApecIncident['severity'] {
  if (!priorityId) return 'medium';
  if (priorityId >= 5) return 'critical';
  if (priorityId === 4) return 'high';
  if (priorityId <= 2) return 'low';
  return 'medium';
}

export function taskStatusIdToIncidentStatus(statusId: number | null): ApecIncident['status'] {
  if (statusId === 4) return 'resolved';
  if (statusId === 3) return 'fixing';
  if (statusId === 2) return 'investigating';
  return 'new';
}
