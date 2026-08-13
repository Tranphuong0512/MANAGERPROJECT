'use client'

import { useMemo, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { generateUUID, getVietnamDateString } from '@/lib/utils'
import { X, ShieldAlert, Calendar, Users, Briefcase, Target, Building2, AlertTriangle, FileText } from 'lucide-react'

// Hàm kiểm tra UUID
const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

const toNumericId = (value: any): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  const cleaned = String(value).replace(/^(apec_|prj_|p-)/i, '')
  const n = Number(cleaned)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

const normalizeName = (value: any) => String(value || '').trim().toLowerCase()

const getEmployeeDepartment = (employee: any) => {
  if (!employee) return null
  const department = employee.department && typeof employee.department === 'object' ? employee.department : null
  const id = toNumericId(
    department?.id ||
    employee.department_id ||
    employee.dept_id ||
    employee.department?.department_id
  )
  const name =
    department?.name ||
    employee.department_name ||
    employee.dept_name ||
    (typeof employee.department === 'string' ? employee.department : '')

  if (!id && !name) return null
  return {
    id: id ? String(id) : '',
    name: name || `Phòng ban #${id}`,
  }
}

interface CreateIncidentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  projectId?: string
  projects?: any[]
  members?: any[]
  onIncidentCreated?: () => void
}

export function CreateIncidentDialog({
  open,
  onOpenChange,
  organizationId,
  projectId,
  projects = [],
  members = [],
  onIncidentCreated,
}: CreateIncidentDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Dữ liệu cho các dropdown mới
  const [departments, setDepartments] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [kpiItems, setKpiItems] = useState<any[]>([])
  const [taskTypes, setTaskTypes] = useState<any[]>([])

  // Danh sách project nội bộ đã lưu
  const [localProjects, setLocalProjects] = useState<any[]>([])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium',
    status: 'new', // internal status
    project_id: projectId || '',
    checklist_item_id: '',
    assigned_to: '',
    reported_by: '',
    
    // APEC Global specific fields
    department_id: '',
    start_date: getVietnamDateString(),
    end_date: getVietnamDateString(),
    task_status: 2, // 1: Mới, 2: Đang thực hiện, 4: Hoàn thành, 5: Đóng
    kpi_item_id: 47,
    target_value: 100,
    min_count_reject: 2,
    max_count_reject: 3,
    type_id: '',
  })

  const selectableProjects = useMemo(() => {
    const byId = new Map<string, any>()
    const byName = new Map<string, any>()

    for (const project of [...localProjects, ...projects]) {
      const id = String(project.id)
      const existingById = byId.get(id)
      const merged = { ...(existingById || {}), ...project }
      byId.set(id, merged)

      const nameKey = normalizeName(project.name)
      if (nameKey) {
        const existingByName = byName.get(nameKey)
        byName.set(nameKey, { ...(existingByName || {}), ...merged })
      }
    }

    return Array.from(byId.values()).map((project) => {
      const nameMatch = byName.get(normalizeName(project.name))
      return {
        ...nameMatch,
        ...project,
        apec_id: project.apec_id || nameMatch?.apec_id || (project._from_apec ? toNumericId(project.id) : undefined),
      }
    })
  }, [localProjects, projects])

  const selectedEmployee = useMemo(
    () => employees.find((employee: any) => String(employee.id) === String(formData.assigned_to)),
    [employees, formData.assigned_to]
  )

  const selectedEmployeeDepartment = useMemo(() => {
    const department = getEmployeeDepartment(selectedEmployee)
    if (!department || department.id) return department

    const matchedDepartment = departments.find((d: any) => normalizeName(d.name || d.department_name) === normalizeName(department.name))
    return matchedDepartment
      ? { id: String(matchedDepartment.id), name: matchedDepartment.name || matchedDepartment.department_name }
      : department
  }, [selectedEmployee, departments])

  const visibleDepartments = selectedEmployeeDepartment ? [selectedEmployeeDepartment] : []
  // Pre-load data từ local Supabase (metadata đã sync)
  useEffect(() => {
    if (open) {
      setFormData(prev => ({ ...prev, project_id: projectId || '', assigned_to: '', reported_by: '', department_id: '' }))
      loadDropdownData()
    }
  }, [open, projectId])

  const loadDropdownData = async () => {
    try {
      // 1. Projects
      const { data: projs } = await supabase.from('projects').select('id, name, apec_id, organization_id')
      if (projs) setLocalProjects(projs)

      // 2. Fetch từ APEC Global API endpoint (thông qua nextjs route)
      // Departments
      const depsRes = await fetch('/api/v1/apec-global/departments')
      if (depsRes.ok) {
        const depsJson = await depsRes.json()
        setDepartments(depsJson.items || depsJson || [])
      }

      // Employees
      const empRes = await fetch('/api/v1/apec-global/employees')
      if (empRes.ok) {
        const empJson = await empRes.json()
        setEmployees(empJson.items || empJson || [])
      }

      // Task Types
      const typeRes = await fetch('/api/v1/apec-global/task-types')
      if (typeRes.ok) {
        const typeJson = await typeRes.json()
        setTaskTypes(typeJson.items || typeJson || [])
      }

      // APEC Projects (bổ sung vào local projects)
      const apecProjRes = await fetch('/api/v1/apec-global/projects')
      if (apecProjRes.ok) {
        const apecProjJson = await apecProjRes.json()
        const apecProjs = (apecProjJson.items || []).map((p: any) => ({ id: String(p.id), apec_id: Number(p.id), name: p.name || p.project_name, _from_apec: true }))
        setLocalProjects(prev => {
          const existingIds = new Set(prev.map((p: any) => String(p.id)))
          const newOnes = apecProjs.filter((p: any) => !existingIds.has(p.id))
          return [...prev, ...newOnes]
        })
      }

      // Fallback KPI Items (vì APEC endpoint kpi-items ko live)
      setKpiItems([
        { id: 47, name: 'Hoàn thành nhiệm vụ' },
        { id: 48, name: 'Khắc phục sự cố' },
        { id: 45, name: 'Doanh thu' }
      ])
    } catch (err) {
      console.warn('Không thể tải dữ liệu dropdown APEC:', err)
    }
  }

  const customAlert = (msg: string) => {
    const el = document.createElement('div')
    el.className = 'fixed top-4 right-4 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-[9999] font-medium transform transition-all translate-y-[-20px] opacity-0 flex items-center gap-3'
    el.innerHTML = `<div class="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>${msg}`
    document.body.appendChild(el)
    setTimeout(() => {
      el.style.transform = 'translateY(0)'
      el.style.opacity = '1'
    }, 10)
    setTimeout(() => {
      el.style.transform = 'translateY(-20px)'
      el.style.opacity = '0'
      setTimeout(() => el.remove(), 300)
    }, 3000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      if (!formData.title?.trim()) throw new Error('Vui lòng nhập tên / tiêu đề sự cố.')
      if (!formData.project_id) throw new Error('Vui lòng chọn dự án liên quan.')

      if (!formData.assigned_to) throw new Error('Vui lòng chọn người chịu trách nhiệm để tự xác định phòng ban xử lý.')

      // Tìm đúng dự án đã chọn và lấy ID dự án trên APEC. Tuyệt đối không fallback về dự án mặc định.
      const selectedProj = selectableProjects.find((p: any) =>
        String(p.id) === String(formData.project_id) ||
        String(p.apec_id || '') === String(formData.project_id) ||
        (!isUuid(formData.project_id) && String(p.id) === String(toNumericId(formData.project_id)))
      )
      const apecProjectId = toNumericId(selectedProj?.apec_id || (!isUuid(formData.project_id) ? formData.project_id : undefined))

      if (!apecProjectId) {
        throw new Error('Dự án đã chọn chưa có ID APEC hợp lệ. Vui lòng đồng bộ dự án này với APEC trước khi tạo sự cố.')
      }

      const employeeDepartment = selectedEmployeeDepartment
      const resolvedDepartmentId = toNumericId(employeeDepartment?.id)
      if (!resolvedDepartmentId) {
        throw new Error('Nhân viên được chọn chưa có phòng ban APEC hợp lệ. Vui lòng cập nhật phòng ban cho nhân viên trước khi tạo sự cố.')
      }

      // 1. Xác định Người Báo Cáo (Reporter)
      const { data: { user } } = await supabase.auth.getUser()
      let reporterId = formData.reported_by
      let reporterName = ''
      if (reporterId) {
        const matchedEmp = employees.find((e: any) => String(e.id) === String(reporterId))
        reporterName = matchedEmp ? (matchedEmp.name || matchedEmp.full_name) : ''
      } else if (user) {
        reporterId = user.id
        reporterName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Tôi'
      }

      // Đính kèm metadata Người báo cáo vào mô tả để luôn truy xuất được 100%
      const formattedDescription = reporterName 
        ? `${formData.description || ''}${formData.description ? '\n' : ''}[Người báo cáo: ${reporterName}]`
        : (formData.description || '')

      // 2. TẠO TASK TRÊN APEC GLOBAL
      const taskId = generateUUID()

      const cleanEmp = formData.assigned_to ? [Number(formData.assigned_to)].filter(n => !isNaN(n) && n > 0) : []
      const fallbackEmp = cleanEmp.length > 0 ? cleanEmp : (employees.length > 0 ? [Number(employees[0].id)].filter(n => !isNaN(n) && n > 0) : [37])

      const apecPayload = {
        id: taskId,
        name: formData.title,
        title: formData.title,
        description: formattedDescription,
        project_id: apecProjectId,
        checklist_id: null,
        type_name: 'SỰ CỐ & RỦI RO',
        type_task: 'SỰ CỐ & RỦI RO',
        is_incident: true,
        date_start: formData.start_date || new Date().toISOString().split("T")[0],
        date_end: formData.end_date || new Date().toISOString().split("T")[0],
        end_date: formData.end_date || null,
        employees: fallbackEmp.length > 0 ? fallbackEmp : [37],
        assignee_id: formData.assigned_to || null,
        department_id: resolvedDepartmentId || null,
        min_count_reject: Number(formData.min_count_reject || 2),
        max_count_reject: Number(formData.max_count_reject || 3),
        kpi_item_id: Number(formData.kpi_item_id || 47),
        target_value: Number(formData.target_value || 100),
        is_completed: Number(formData.task_status) === 4,
        status: Number(formData.task_status || 2),
        task_status: Number(formData.task_status || 2),
        process: Number(formData.task_status) === 4 ? 100 : (Number(formData.task_status) === 2 ? 50 : 0),
        priority: formData.severity === "critical" || formData.severity === "high" ? 3 : (formData.severity === "low" ? 1 : 2)
      }

      const apecRes = await fetch("/api/v1/apec-global/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apecPayload)
      })
      const apecJson = await apecRes.json().catch(() => ({}))
      
      // 3. LƯU DỮ LIỆU SỰ CỐ VÀO SUPABASE (Nếu tìm được project UUID hợp lệ)
      try {
        const supabaseProj = localProjects.find(
          (lp: any) => isUuid(String(lp.id)) && (
            String(lp.id) === String(formData.project_id) ||
            String(lp.apec_id) === String(apecProjectId) ||
            lp.name?.toLowerCase().trim() === selectedProj?.name?.toLowerCase().trim()
          )
        ) || localProjects.find((lp: any) => isUuid(String(lp.id)))

        const validProjectId = supabaseProj?.id && isUuid(String(supabaseProj.id)) ? String(supabaseProj.id) : null
        const validOrgId = organizationId && isUuid(String(organizationId)) 
          ? String(organizationId) 
          : (supabaseProj?.organization_id && isUuid(String(supabaseProj.organization_id)) ? String(supabaseProj.organization_id) : null)

        if (validProjectId && validOrgId) {
          const incidentId = isUuid(taskId) ? taskId : generateUUID()
          await supabase.from('incidents').insert({
            id: incidentId,
            title: formData.title,
            description: formattedDescription,
            severity: formData.severity || 'medium',
            status: formData.status || 'new',
            project_id: validProjectId,
            organization_id: validOrgId,
            checklist_item_id: String(taskId),
            reported_by: isUuid(String(reporterId)) ? String(reporterId) : (user?.id && isUuid(user.id) ? user.id : null),
            assigned_to: isUuid(String(formData.assigned_to)) ? String(formData.assigned_to) : null,
            created_at: new Date().toISOString()
          })
        }
      } catch (errSupabase) {
        console.warn('Bỏ qua lỗi lưu Supabase incidents phụ trợ:', errSupabase)
      }

      if (apecRes.ok && apecJson && apecJson.success !== false) {
        customAlert("✅ Khởi tạo sự cố thành công trên máy chủ APEC GLOBAL!")
      } else if (apecJson?.error) {
        console.warn("APEC Global sync error:", apecJson.error)
        customAlert("⚠️ Lỗi từ APEC: " + apecJson.error)
      } else {
        customAlert("✅ Ghi nhận sự cố thành công!")
      }

      // Reset & close
      setFormData({ 
        title: '', description: '', severity: 'medium', status: 'new', project_id: projectId || '', 
        checklist_item_id: '', assigned_to: '', reported_by: '',
        department_id: '', start_date: getVietnamDateString(), end_date: getVietnamDateString(),
        task_status: 2, kpi_item_id: 47, target_value: 100, min_count_reject: 2, max_count_reject: 3, type_id: ''
      })
      onOpenChange(false)
      onIncidentCreated?.()
    } catch (err: any) {
      setError(err.message || 'Ghi nhận sự cố thất bại')
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-red-50/50 via-white to-orange-50/50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-100/80 text-red-600 shadow-inner">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ghi nhận sự cố & rủi ro</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Tự động cấu hình và đẩy dữ liệu sang máy chủ APEC Global</p>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Core Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <FileText className="w-4 h-4 text-slate-400" /> Thông tin cơ bản
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Dự án liên quan *</label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-slate-50 hover:bg-white transition-colors"
                  required
                >
                  <option value="">Chọn dự án...</option>
                  {selectableProjects.map((p: any) => (
                    <option key={`${p.id}-${p.apec_id || ''}`} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phòng ban xử lý</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedEmployeeDepartment?.id || ''}
                    disabled
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-100 text-slate-600 cursor-not-allowed"
                  >
                    <option value="">{formData.assigned_to ? 'Nhân viên này chưa có phòng ban' : 'Chọn người thực hiện trước'}</option>
                    {visibleDepartments.map((d: any) => (
                      <option key={d.id || d.name} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tiêu đề sự cố *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                placeholder="Ví dụ: Lỗi rò rỉ dữ liệu / Chập cháy điện..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mô tả chi tiết</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Mô tả chi tiết nguyên nhân, hiện tượng, mức độ ảnh hưởng..."
                rows={3}
              />
            </div>
          </div>

          {/* Assignments */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Users className="w-4 h-4 text-slate-400" /> Giao việc & Xử lý
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Người chịu trách nhiệm (Assignee)</label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => {
                    const employee = employees.find((m: any) => String(m.id) === e.target.value)
                    const department = getEmployeeDepartment(employee)
                    setFormData({ ...formData, assigned_to: e.target.value, department_id: department?.id || '' })
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
                >
                  <option value="">-- Chọn nhân viên APEC --</option>
                  {employees.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name || m.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Người báo cáo</label>
                <select
                  value={formData.reported_by}
                  onChange={(e) => setFormData({ ...formData, reported_by: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
                >
                  <option value="">-- Mặc định: Tôi --</option>
                  {employees.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name || m.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ngày bắt đầu</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ngày dự kiến xong</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Properties & KPI */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Target className="w-4 h-4 text-slate-400" /> Cấu hình APEC Global
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Chỉ tiêu KPI & Target</label>
                <div className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-100 text-slate-600 font-medium cursor-not-allowed">
                  Hoàn thành nhiệm vụ (Target: 100%)
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mức độ nghiêm trọng</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="critical">🔴 Rất nghiêm trọng (Critical)</option>
                  <option value="high">🟠 Cao (High)</option>
                  <option value="medium">🟡 Trung bình (Medium)</option>
                  <option value="low">⚪ Thấp (Low)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Trạng thái Task (APEC)</label>
                <select
                  value={formData.task_status}
                  onChange={(e) => setFormData({ ...formData, task_status: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>Chưa thực hiện</option>
                  <option value={2}>Đang thực hiện</option>
                  <option value={3}>Chờ duyệt</option>
                  <option value={4}>Hoàn thành</option>
                  <option value={5}>Đóng</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Min Reject</label>
                  <input
                    type="number"
                    value={formData.min_count_reject}
                    onChange={(e) => setFormData({ ...formData, min_count_reject: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Max Reject</label>
                  <input
                    type="number"
                    value={formData.max_count_reject}
                    onChange={(e) => setFormData({ ...formData, max_count_reject: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-center"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.title}
              className="flex-[2] px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl disabled:bg-slate-400 transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  Ghi nhận sự cố lên APEC Global
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
