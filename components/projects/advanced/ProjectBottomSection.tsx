'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, XCircle, Lightbulb, TrendingUp, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { CreateIncidentDialog } from '@/components/incidents/CreateIncidentDialog'
import { CreateImprovementDialog } from '@/components/improvements/CreateImprovementDialog'
import { IncidentSlideOver } from '@/components/incidents/IncidentSlideOver'
import { ImprovementSlideOver } from '@/components/improvements/ImprovementSlideOver'

export function ProjectBottomSection({ projectId }: { projectId?: string }) {
  const [incidents, setIncidents] = useState<any[]>([])
  const [improvements, setImprovements] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [checklists, setChecklists] = useState<any[]>([])
  const [organizationId, setOrganizationId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showIncidentDialog, setShowIncidentDialog] = useState(false)
  const [showImprovementDialog, setShowImprovementDialog] = useState(false)
  
  const [selectedIncident, setSelectedIncident] = useState<any>(null)
  const [selectedImprovement, setSelectedImprovement] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [projectData, setProjectData] = useState<any>(null)

  const loadData = async () => {
    if (!projectId) return
      try {
        // Fetch org ID and budget
        const { data: pData } = await supabase.from('projects').select('organization_id, budget, spent').eq('id', projectId).single()
        if (pData) {
          setOrganizationId(pData.organization_id)
          setProjectData(pData)
        }

        // Fetch members for profiles mapping (Supabase org members + APEC employees)
        let orgMembers: any[] = []
        const uniqueMembers = new Map();

        const [mDataRes, apecEmpRes] = await Promise.all([
          pData?.organization_id 
            ? supabase.from('organization_members').select('user_id, profiles(full_name)').eq('organization_id', pData.organization_id).is('deleted_at', null)
            : Promise.resolve({ data: null }),
          fetch('/api/v1/apec-global/employees').then(r => r.json()).catch(() => ({ items: [] }))
        ]);
        
        if (mDataRes.data) {
          mDataRes.data.forEach((m: any) => {
            if (m.user_id) {
              const fullName = Array.isArray((m as any).profiles) ? (m as any).profiles[0]?.full_name : (m as any).profiles?.full_name || 'Chưa rõ';
              uniqueMembers.set(m.user_id, { id: m.user_id, raw_id: m.user_id, full_name: fullName });
            }
          });
        }

        if (apecEmpRes.items) {
          apecEmpRes.items.forEach((e: any) => {
            const empId = String(e.id);
            const fullName = e.fullname || e.name || e.email || 'Chưa rõ';
            if (!uniqueMembers.has(empId)) uniqueMembers.set(empId, { id: empId, raw_id: e.id, full_name: fullName });
          });
        }
        orgMembers = Array.from(uniqueMembers.values());
        setMembers(orgMembers);

        const findStaff = (idVal: any) => {
          if (!idVal) return undefined;
          const strId = String(idVal);
          const cleanId = strId.replace('apec_', '');
          return orgMembers.find((m: any) => 
            String(m.id) === strId || 
            String(m.id) === cleanId || 
            String(m.raw_id) === cleanId ||
            String(m.id).replace('apec_', '') === cleanId
          );
        };

        // Fetch Incidents from Supabase
        let { data: incs } = await supabase
          .from('incidents')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        let filteredIncs = (incs || []).filter(inc => 
          inc.project_id === projectId || 
          String(inc.project_id) === String(projectId).replace(/^p-/, '')
        );

        // Fallback: If no direct incidents in Supabase, fetch board-data incident tasks
        if (filteredIncs.length === 0 && projectId) {
          try {
            const bdRes = await fetch(`/api/v1/projects/${projectId}/board-data`).then(r => r.json());
            const actualProjectName = bdRes?.projectName || bdRes?.project?.name || '';
            if (bdRes && bdRes.checklists) {
              const incidentChecklist = bdRes.checklists.find((c: any) => 
                (c.title || '').toUpperCase().includes('S\u1ef0 C\u1ed0') || (c.title || '').toUpperCase().includes('R\u1ee6I RO')
              );
              if (incidentChecklist && incidentChecklist.checklist_items) {
                // Map APEC task status_id → incident status
                const mapStatus = (item: any): string => {
                  if (item.status === 'done' || item.is_completed) return 'resolved';
                  if (item.status === 'review') return 'fixing';
                  if (item.status === 'in_progress') return 'investigating';
                  // also check numeric status from APEC raw
                  const sid = Number(item.apec_status_id || item.task_status_id);
                  if (sid === 4) return 'resolved';
                  if (sid === 3) return 'fixing';
                  if (sid === 2) return 'investigating';
                  return 'new';
                };
                const mapPriority = (item: any): string => {
                  const pid = Number(item.priority_id || item.priority?.id);
                  if (pid >= 5) return 'critical';
                  if (pid === 4) return 'high';
                  if (pid <= 2 && pid > 0) return 'low';
                  return item.severity || 'medium';
                };
                filteredIncs = incidentChecklist.checklist_items
                  .filter((item: any) => !item.is_deleted && !item.deleted_at && item.status !== 'deleted')
                  .map((item: any) => {
                    const assigneeObj = item.assignees?.[0];
                    const numericId = String(item.id).replace(/^(inc_|apec_|t_|st_)/, '');
                    return {
                      id: numericId,
                      code: `BUG-${numericId}`,
                      title: item.title || item.name,
                      module: item.module || item.type_name || 'Hệ thống',
                      severity: mapPriority(item),
                      status: mapStatus(item),
                      created_at: item.created_at || new Date().toISOString(),
                      reported_by: item.reporter_id || null,
                      assigned_to: assigneeObj?.raw_id || assigneeObj?.id || null,
                      project_name: actualProjectName,
                      projects: { name: actualProjectName || 'Chưa xác định' }
                    };
                  });
              }
            }
          } catch (bdErr) {
            console.warn('L\u1ed7i load board data incidents fallback:', bdErr);
          }
        }
        
        setIncidents(filteredIncs.map(inc => ({
          ...inc,
          reporter: findStaff(inc.reported_by),
          assignee: findStaff(inc.assigned_to)
        })))

        // Fetch Improvements
        const { data: imps } = await supabase
          .from('improvements')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(10)
        
        let filteredImps = (imps || []).filter(imp => 
          imp.project_id === projectId || 
          String(imp.project_id) === String(projectId).replace(/^p-/, '')
        );

        setImprovements(filteredImps.map(imp => ({
          ...imp,
          reporter: findStaff(imp.reporter_id),
          assignee: findStaff(imp.assigned_to)
        })))

        // Fetch Activities
        const { data: acts } = await supabase
          .from('project_activities')
          .select(`
            *,
            auth.users!project_activities_user_id_fkey(
              raw_user_meta_data
            )
          `)
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(5)
        
        if (acts) setActivities(acts)

        // Fetch Checklists for Timeline and Dialogs
        const { data: lists } = await supabase
          .from('project_checklists')
          .select(`
            id, 
            title, 
            organization_id,
            checklist_items(id, title, status, is_completed)
          `)
          .eq('project_id', projectId)
          .is('deleted_at', null)
          
        if (lists) setChecklists(lists)
        
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
  }

  useEffect(() => {
    loadData()
  }, [projectId])

  const fixedIncs = incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length
  const processingIncs = incidents.filter(i => i.status === 'investigating' || i.status === 'fixing').length
  const openIncs = incidents.length - fixedIncs // Mọi thứ chưa resolved hoặc closed đều tính là chưa fix

  const implImps = improvements.filter(i => i.status === 'implemented').length
  const pendingImps = improvements.length - implImps

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      
      {/* Cột 1: Sự cố & lỗi */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h3 className="font-bold text-slate-800 text-sm">Sự cố & lỗi ghi nhận</h3>
          <button 
            onClick={() => setShowIncidentDialog(true)}
            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex gap-2 mb-4">
          <div className="flex-1 border border-slate-100 rounded-lg p-2 text-center bg-slate-50">
            <div className="flex items-center justify-center gap-1 text-slate-800 font-bold"><Clock className="w-4 h-4" /> {incidents.length}</div>
            <div className="text-[10px] text-slate-500 uppercase">Tổng</div>
          </div>
          <div className="flex-1 border border-green-100 rounded-lg p-2 text-center bg-green-50">
            <div className="flex items-center justify-center gap-1 text-green-700 font-bold"><CheckCircle2 className="w-4 h-4" /> {fixedIncs}</div>
            <div className="text-[10px] text-green-600 uppercase">Đã fix</div>
          </div>
          <div className="flex-1 border border-red-100 rounded-lg p-2 text-center bg-red-50">
            <div className="flex items-center justify-center gap-1 text-red-700 font-bold"><XCircle className="w-4 h-4" /> {openIncs}</div>
            <div className="text-[10px] text-red-600 uppercase">Chưa fix</div>
          </div>
        </div>

        <div className="space-y-3">
          {incidents.slice(0, 5).map((b,i) => {
            let severityStyle = 'text-slate-600 bg-slate-50 border-slate-200'
            let severityText = 'Thấp'
            if (b.severity === 'critical') { severityStyle = 'text-red-700 bg-red-50 border-red-200'; severityText = 'Nghiêm trọng' }
            else if (b.severity === 'high') { severityStyle = 'text-orange-700 bg-orange-50 border-orange-200'; severityText = 'Cao' }
            else if (b.severity === 'medium') { severityStyle = 'text-yellow-700 bg-yellow-50 border-yellow-200'; severityText = 'TB' }

            let statusStyle = 'text-slate-500 bg-slate-100 border-slate-200'
            let statusText = 'Hoàn thành'
            if (b.status === 'new') { statusStyle = 'text-red-600 bg-red-50 border-red-200'; statusText = 'Chưa thực hiện' }
            else if (b.status === 'investigating') { statusStyle = 'text-orange-600 bg-orange-50 border-orange-200'; statusText = 'Đang xử lý' }
            else if (b.status === 'fixing') { statusStyle = 'text-blue-600 bg-blue-50 border-blue-200'; statusText = 'Đang thực hiện' }
            else if (b.status === 'resolved') { statusStyle = 'text-green-600 bg-green-50 border-green-200'; statusText = 'Hoàn thành' }

            return (
              <div key={i} onClick={() => setSelectedIncident(b)} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer group">
                <span className="text-xs font-bold text-slate-500 w-14">BUG-{b.id.length > 4 ? b.id.substring(0,4) : b.id}</span>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 truncate">{b.title}</div>
                  <div className="text-[10px] text-slate-500">{b.module || 'Hệ thống'}</div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${severityStyle}`}>
                    {severityText}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${statusStyle}`}>
                    {statusText}
                  </span>
                </div>
              </div>
            )
          })}
          {incidents.length === 0 && !loading && (
             <div className="text-xs text-slate-500 text-center py-4">Chưa có sự cố nào ghi nhận.</div>
          )}
        </div>
      </div>

      {/* Cột 2: Đề xuất cải tiến */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h3 className="font-bold text-slate-800 text-sm">Đề xuất cải tiến</h3>
          <button 
            onClick={() => setShowImprovementDialog(true)}
            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-purple-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex gap-2 mb-4">
          <div className="flex-1 border border-slate-100 rounded-lg p-2 text-center bg-slate-50">
            <div className="flex items-center justify-center gap-1 text-slate-800 font-bold"><Lightbulb className="w-4 h-4" /> {improvements.length}</div>
            <div className="text-[10px] text-slate-500 uppercase">Tổng</div>
          </div>
          <div className="flex-1 border border-purple-100 rounded-lg p-2 text-center bg-purple-50">
            <div className="flex items-center justify-center gap-1 text-purple-700 font-bold"><TrendingUp className="w-4 h-4" /> {implImps}</div>
            <div className="text-[10px] text-purple-600 uppercase">Áp dụng</div>
          </div>
          <div className="flex-1 border border-blue-100 rounded-lg p-2 text-center bg-blue-50">
            <div className="flex items-center justify-center gap-1 text-blue-700 font-bold"><Clock className="w-4 h-4" /> {pendingImps}</div>
            <div className="text-[10px] text-blue-600 uppercase">Chờ duyệt</div>
          </div>
        </div>

        <div className="space-y-3">
          {improvements.slice(0, 5).map((b,i) => {
            let statusStyle = 'text-slate-500 bg-slate-100 border-slate-200'
            let statusText = 'Chờ duyệt'
            if (b.status === 'in_progress') { statusStyle = 'text-blue-600 bg-blue-50 border-blue-200'; statusText = 'Đang thực hiện' }
            else if (b.status === 'implemented') { statusStyle = 'text-green-600 bg-green-50 border-green-200'; statusText = 'Đã áp dụng' }
            else if (b.status === 'rejected') { statusStyle = 'text-red-600 bg-red-50 border-red-200'; statusText = 'Từ chối' }

            let impactStyle = 'text-slate-600 bg-slate-50 border-slate-200'
            let impactText = 'Thấp'
            if (b.impact_level === 'high') { impactStyle = 'text-red-700 bg-red-50 border-red-200'; impactText = 'Cao' }
            else if (b.impact_level === 'medium') { impactStyle = 'text-orange-700 bg-orange-50 border-orange-200'; impactText = 'Trung bình' }

            return (
              <div key={i} onClick={() => setSelectedImprovement(b)} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer group">
                <span className="text-xs font-bold text-slate-500 w-14">IMP-{b.id.substring(0,4).toUpperCase()}</span>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-slate-800 group-hover:text-purple-600 truncate">{b.title}</div>
                  <div className="text-[10px] text-slate-500">{b.module || 'Hệ thống'}</div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${impactStyle}`}>
                    {impactText}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${statusStyle}`}>
                    {statusText}
                  </span>
                </div>
              </div>
            )
          })}
          {improvements.length === 0 && !loading && (
             <div className="text-xs text-slate-500 text-center py-4">Chưa có đề xuất nào ghi nhận.</div>
          )}
        </div>
      </div>

      {/* Cột 3: Timeline Triển Khai */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h3 className="font-bold text-slate-800 text-sm">Timeline triển khai</h3>
          <div className="flex items-center gap-2">
            <select className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none">
              <option>Theo tuần</option>
              <option>Theo tháng</option>
            </select>
          </div>
        </div>

        <div className="relative pt-6 pb-2">
          {/* Header */}
          <div className="flex items-center text-[10px] font-semibold text-slate-400 border-b border-slate-100 pb-2 mb-3">
            <div className="w-1/3">Giai đoạn</div>
            <div className="w-2/3 flex justify-between px-2">
              <span>T4</span><span>T5</span><span>T6</span><span>T7</span>
            </div>
          </div>
          
          {/* Grid lines */}
          <div className="absolute top-12 bottom-0 left-1/3 right-0 flex justify-between pointer-events-none opacity-20">
            <div className="w-px h-full bg-slate-300"></div>
            <div className="w-px h-full bg-slate-300"></div>
            <div className="w-px h-full bg-slate-300"></div>
            <div className="w-px h-full bg-slate-300"></div>
          </div>

          <div className="space-y-4 relative z-10">
            {checklists.length > 0 ? checklists.map((list: any, idx: number) => {
              const items = list.checklist_items || []
              let progress = 0
              if (items.length > 0) {
                const doneCount = items.filter((i:any) => i.is_completed || i.status === 'done').length
                progress = Math.round((doneCount / items.length) * 100)
              }
              const colors = ['bg-green-500', 'bg-blue-500', 'bg-indigo-500', 'bg-amber-500', 'bg-purple-500']
              const bg = colors[idx % colors.length]
              
              // Fake duration mapping for visual presentation
              const startPct = (idx * 15) % 50
              const widthPct = Math.max(20, 100 - startPct - ((checklists.length - idx) * 10))

              return (
                <div key={list.id} className="flex items-center text-xs">
                  <div className="w-1/3 font-semibold text-slate-700 truncate pr-2" title={list.title}>{list.title}</div>
                  <div className="w-2/3 relative h-4 bg-slate-50 rounded">
                    <div 
                      className={`absolute h-full ${bg} rounded flex items-center px-1 text-[8px] text-white font-bold transition-all overflow-hidden`}
                      style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                    >
                      <div className="bg-white/30 h-full absolute top-0 left-0" style={{ width: `${progress}%` }}></div>
                      <span className="relative z-10 w-full text-center">{progress}%</span>
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div className="text-xs text-slate-500 text-center py-4">Chưa có dữ liệu timeline.</div>
            )}
          </div>
        </div>
      </div>

      {/* Cột 4: Cảnh báo & Hoạt động */}
      <div className="space-y-6">
        
        {/* Cảnh báo */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-start gap-3 relative z-10">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h4 className="font-bold text-orange-800 text-sm mb-1">Cảnh báo & rủi ro</h4>
              <p className="text-xs text-orange-700 leading-relaxed mb-3">
                {openIncs > 0 ? `Dự án đang có ${openIncs} lỗi chưa khắc phục. Tiến độ có thể bị chậm.` : (
                  projectData?.budget && projectData?.spent > 0 && (projectData.spent / projectData.budget) >= 0.8 
                    ? 'Ngân sách sử dụng đã đạt mức cao, cần lưu ý.' 
                    : 'Không có cảnh báo nghiêm trọng nào.'
                )}
              </p>
              <ul className="text-[10px] text-orange-800 font-semibold list-disc pl-3 space-y-1">
                {openIncs > 0 && <li>Có {openIncs} lỗi chưa xử lý</li>}
                {projectData?.budget > 0 && (
                  <li>
                    Chi phí sử dụng: {Math.round((projectData.spent / projectData.budget) * 100)}% ngân sách
                  </li>
                )}
                {(!projectData?.budget || projectData.budget === 0) && openIncs === 0 && (
                  <li>Mọi thứ đang trong tầm kiểm soát</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Hoạt động gần đây */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-full">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Hoạt động gần đây</h3>
          </div>
          
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[15px] before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
            
            {activities.length > 0 ? activities.map(act => (
              <div key={act.id} className="relative flex items-center justify-normal group is-active">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white bg-slate-200 text-slate-500 shadow shrink-0 z-10 overflow-hidden">
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${act.auth?.users?.raw_user_meta_data?.full_name || 'U'}`} alt="user" className="w-full h-full" />
                </div>
                <div className="ml-3 w-full bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-slate-800 text-[10px]">{act.auth?.users?.raw_user_meta_data?.full_name || 'User'}</div>
                    <time className="text-[9px] font-medium text-slate-500">{new Date(act.created_at).toLocaleDateString('vi-VN')}</time>
                  </div>
                  <div className="text-[10px] text-slate-600">{act.description}</div>
                </div>
              </div>
            )) : (
              <div className="text-xs text-slate-500 text-center py-4">Chưa có hoạt động nào.</div>
            )}
            
          </div>
        </div>

      </div>

      <CreateIncidentDialog
        open={showIncidentDialog}
        onOpenChange={setShowIncidentDialog}
        organizationId={organizationId}
        projectId={projectId!}
        members={members}
        projects={projectData ? [projectData] : []}
        onIncidentCreated={() => loadData()}
      />

      <CreateImprovementDialog
        open={showImprovementDialog}
        onOpenChange={setShowImprovementDialog}
        organizationId={organizationId}
        projectId={projectId!}
        members={members}
        projects={projectData ? [projectData] : []}
        onSaved={() => loadData()}
      />

      <IncidentSlideOver 
        incident={selectedIncident} 
        members={members}
        onClose={() => {
          setSelectedIncident(null)
          loadData() // Refresh data in case of edits
        }} 
      />

      <ImprovementSlideOver 
        improvement={selectedImprovement} 
        members={members}
        onClose={() => {
          setSelectedImprovement(null)
          loadData()
        }} 
      />
    </div>
  )
}
