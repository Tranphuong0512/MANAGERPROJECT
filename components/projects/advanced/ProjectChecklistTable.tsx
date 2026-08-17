'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { produce } from 'immer'
import { ChevronDown, ChevronRight, Plus, MoreVertical, CalendarDays, CheckCircle2, Bug, Lightbulb, Trash2, Edit2, Copy, FileSpreadsheet, CornerDownRight, GripVertical, ArrowRightLeft, Filter, X as XIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CreateChecklistDialog } from '../CreateChecklistDialog'
import { ChecklistItemDialog } from '../ChecklistItemDialog'
import { ImportProjectDataDialog } from '../ImportProjectDataDialog'
import { getVietnamMonthBounds } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import { customAlert, customConfirm } from '@/utils/alert'

const isUuid = (str: any) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// --- AVATAR WITH FALLBACK COMPONENT ---
function AvatarWithFallback({ src, name, sizeClass = "w-6 h-6", textClass = "text-[10px]" }: { src?: string; name?: string; sizeClass?: string; textClass?: string }) {
  const [imgError, setImgError] = useState(false);
  const initial = name && name.trim() ? name.trim().charAt(0).toUpperCase() : 'A';
  const colors = [
    'bg-blue-500 text-white',
    'bg-emerald-500 text-white',
    'bg-purple-500 text-white',
    'bg-amber-500 text-white',
    'bg-rose-500 text-white',
    'bg-cyan-500 text-white',
    'bg-indigo-500 text-white',
  ];
  const colorIndex = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={`${sizeClass} rounded-full object-cover border border-slate-200 shrink-0`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full ${colors[colorIndex]} flex items-center justify-center font-bold ${textClass} shrink-0 border border-white shadow-xs`}>
      {initial}
    </div>
  );
}

// --- SORTABLE ITEM COMPONENT ---
function SortableChecklistItem({ item, onStatusChange, onProgressChange, onDateChange, onSubtaskChange, onApproveAll, onEditClick, highlightedTaskId }: Readonly<{ item: any, onStatusChange: any, onProgressChange: any, onDateChange: any, onSubtaskChange?: any, onApproveAll?: any, onEditClick: (item: any) => void, highlightedTaskId?: string | null }>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(false)
  const [isAssigneesOpen, setIsAssigneesOpen] = useState(false)
  
  const { hasPermission } = usePermissions()
  const canEditTask = hasPermission('edit_tasks')
  const canDeleteTask = hasPermission('delete_tasks')
  const canCreateTask = hasPermission('create_tasks')

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: (isAssigneesOpen || isSubtasksOpen) ? 99999 : (isDragging ? 10 : 1),
    opacity: isDragging ? 0.8 : 1,
    position: 'relative' as const,
  }

  const subtasks = Array.isArray(item.subtasks) ? item.subtasks : [];
  const completedSubtasksCount = subtasks.filter((sub: any) => 
    sub.checked || Number(sub.process || sub.progress) >= 100
  ).length;
  const hasAnyRealSubtask = subtasks.length > 0;
  const isHighlighted = Boolean(highlightedTaskId && (String(item.id) === String(highlightedTaskId) || subtasks.some((s: any) => String(s.id) === String(highlightedTaskId))));

  useEffect(() => {
    if (highlightedTaskId && subtasks.some((s: any) => String(s.id) === String(highlightedTaskId))) {
      setIsSubtasksOpen(true);
    }
  }, [highlightedTaskId, subtasks]);

  const renderStatusSelect = (item: any) => {
    // QUAN TRỌNG: Chỉ dùng item.status đã được tính đúng từ board-data API
    // KHÔNG tự suy ra 'done' từ progress >= 100 (vì chưa chắc đã được duyệt)
    const value = item.status || 'todo';
    const colorClasses = 
      value === 'done' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
      value === 'in_progress' ? 'text-blue-700 bg-blue-50 border-blue-200' :
      value === 'review' ? 'text-purple-700 bg-purple-50 border-purple-200' :
      'text-slate-600 bg-slate-50 border-slate-200';
      
    return (
      <select 
        value={value}
        disabled={!canEditTask}
        onChange={(e) => onStatusChange(item, e.target.value)}
        className={`px-2 py-0.5 rounded text-[10px] font-bold border outline-none transition-opacity ${colorClasses} ${!canEditTask ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:opacity-80'}`}
      >
        <option value="todo" className="text-slate-900 bg-white">Chưa bắt đầu</option>
        <option value="in_progress" className="text-slate-900 bg-white">Đang thực hiện</option>
        <option value="review" className="text-slate-900 bg-white">Chờ duyệt</option>
        <option value="done" className="text-slate-900 bg-white">Đã duyệt</option>
      </select>
    )
  }

  const getPriorityBadge = (prio: string) => {
    if (prio === 'high') return <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">Cao</span>
    if (prio === 'medium') return <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">Trung bình</span>
    return <span className="text-[10px] font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded border border-green-100">Thấp</span>
  }

  return (
    <div
      ref={setNodeRef}
      id={`task-row-${item.id}`}
      style={style}
      className={`flex flex-col bg-white border-b border-slate-100 hover:bg-slate-50/70 transition-colors group ${
        isHighlighted ? 'ring-2 ring-amber-400 bg-amber-50/80 shadow-md transition-all duration-500' : ''
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Drag handle */}
        {canEditTask ? (
          <div {...attributes} {...listeners} className="cursor-grab p-1 text-slate-300 hover:text-slate-500">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
              <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
            </svg>
          </div>
        ) : (
          <div className="w-[24px]" />
        )}

        <div className="flex-1 min-w-[200px] flex items-start gap-2 pt-1">
          <button 
            disabled={!canEditTask}
            onClick={() => {
              const current = item.status || 'todo';
              const nextStatus = current === 'todo' ? 'in_progress' : 
                                 current === 'in_progress' ? 'review' : 
                                 current === 'review' ? 'done' : 'todo';
              onStatusChange(item, nextStatus);
            }} 
            className={`mt-0.5 flex-shrink-0 ${!canEditTask ? 'cursor-not-allowed opacity-70' : ''}`}
            title={canEditTask ? "Nhấn để đổi trạng thái" : "Không có quyền sửa đổi"}
          >
            {item.status === 'done' || item.is_completed ? (
              <div className="w-4 h-4 rounded bg-emerald-500 flex items-center justify-center transition-colors shadow-sm">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
            ) : item.status === 'review' ? (
              <div className="w-4 h-4 rounded bg-purple-500 flex items-center justify-center transition-colors shadow-sm">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            ) : item.status === 'in_progress' ? (
              <div className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center transition-colors shadow-sm">
                <div className="w-2 h-0.5 bg-white rounded-full" />
              </div>
            ) : (
              <div className="w-4 h-4 rounded border-2 border-slate-300 hover:border-blue-500 transition-colors bg-white"></div>
            )}
          </button>
          <div className="flex flex-col gap-1 min-w-0">
            <span className={`text-sm font-semibold truncate ${item.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
              {item.title || item.name}
            </span>
            {/* Thống kê số công việc con bên trong công việc cha + nút xổ xuống */}
            <div className="flex items-center gap-2 flex-wrap">
              {hasAnyRealSubtask ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSubtasksOpen(!isSubtasksOpen);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all shadow-2xs cursor-pointer ${
                    subtasks.length > 0 
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' 
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title="Thống kê công việc con và xem chi tiết xổ xuống tại đây"
                >
                  {isSubtasksOpen ? <ChevronDown className="w-3 h-3 text-blue-600" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
                  <span>{completedSubtasksCount}/{subtasks.length} công việc con</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-400 border border-slate-200/80 select-none" title="Hiện tại công việc này chưa có công việc con">
                  Hiện tại chưa có công việc con
                </span>
              )}
              {(item.is_incident || item.is_improvement || item.incidents?.length > 0 || item.improvements?.length > 0) && (
                <div className="flex items-center gap-1.5">
                  {(item.is_incident || item.incidents?.length > 0) && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded" title="Sự cố & Rủi ro">
                      <Bug className="w-3 h-3" /> {item.incidents?.length || 1}
                    </span>
                  )}
                  {(item.is_improvement || item.improvements?.length > 0) && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded" title="Cải tiến & Nâng cấp">
                      <Lightbulb className="w-3 h-3" /> {item.improvements?.length || 1}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Người phụ trách đầy đủ theo API + Dropdown click list người tham gia */}
        <div className={`w-36 flex items-center gap-1.5 flex-shrink-0 relative group/emp ${isAssigneesOpen ? 'z-[99999]' : ''}`}>
          {item.assignees && item.assignees.length > 0 ? (
            <div 
              className="flex items-center -space-x-2 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setIsAssigneesOpen(!isAssigneesOpen);
              }}
              title="Nhấp để hiển thị danh sách người phụ trách"
            >
              {item.assignees.slice(0, 3).map((assignee: any, aIdx: number) => (
                <div 
                  key={assignee.id || aIdx} 
                  className="w-7 h-7 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 transition-transform hover:scale-110 hover:z-10"
                >
                  <AvatarWithFallback 
                    src={assignee.avatar} 
                    name={assignee.full_name || assignee.name || 'NV'} 
                    sizeClass="w-full h-full"
                    textClass="text-[10px]"
                  />
                </div>
              ))}
              {item.assignees.length > 3 && (
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm border-2 border-white flex-shrink-0 z-0">
                  +{item.assignees.length - 3}
                </div>
              )}
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-100 overflow-hidden border border-slate-200 border-dashed shadow-sm flex-shrink-0 flex items-center justify-center text-[10px] text-slate-400">
              ?
            </div>
          )}
          <span 
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 truncate ml-1 cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              if (item.assignees && item.assignees.length > 0) {
                setIsAssigneesOpen(!isAssigneesOpen);
              }
            }}
          >
            {item.assignees && item.assignees.length > 0 
              ? item.assignees.length === 1 
                ? item.assignees[0].full_name 
                : `${item.assignees.length} người` 
              : 'Chưa gán'}
          </span>

          {/* Dropdown / Popover List hiển thị khi Bấm vào hình avatar hoặc text */}
          {item.assignees && item.assignees.length > 0 && (isAssigneesOpen || false) && (
            <>
              {/* Backdrop ẩn để click ra ngoài thì tự đóng */}
              <div 
                className="fixed inset-0 z-[99998]" 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAssigneesOpen(false);
                }}
              />
              <div 
                className="absolute left-0 top-full mt-1.5 z-[99999] w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 text-left animate-in fade-in-0 zoom-in-95"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-xs font-bold text-slate-800 pb-2 mb-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>Người phụ trách (APEC GLOBAL)</span>
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">{item.assignees.length}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAssigneesOpen(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold px-1.5 py-0.5 rounded hover:bg-slate-100 text-xs"
                    title="Đóng danh sách"
                  >
                    ✕
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {item.assignees.map((assignee: any, aIdx: number) => (
                    <div key={assignee.id || aIdx} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                      <AvatarWithFallback 
                        src={assignee.avatar} 
                        name={assignee.full_name || assignee.name || 'NV'} 
                        sizeClass="w-9 h-9"
                        textClass="text-xs"
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-900 truncate">{assignee.full_name || assignee.name}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate">
                          <span>{assignee.position || assignee.role || 'Thành viên API'}</span>
                          {assignee.department_name && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-slate-600">{assignee.department_name}</span>
                            </>
                          )}
                        </div>
                        {assignee.email && <span className="text-[10px] text-blue-600 truncate">{assignee.email}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Hạn hoàn thành (ngày giờ) có thể chọn date cập nhật server Apec Global */}
        <div className="w-28 shrink-0">
          {(() => {
            const itemDueDate = item.end_date || item.date_end || item.due_date || item.completed_date || (Array.isArray(item.employee_assignments) && item.employee_assignments.find((ea: any) => ea.completed_date || ea.end_date || ea.date_end)?.completed_date) || '';
            const valStr = itemDueDate ? String(itemDueDate).split('T')[0] : '';
            return (
              <input
                type="date"
                disabled={!canEditTask}
                value={valStr}
                onChange={(e) => {
                  e.stopPropagation();
                  onDateChange(item, e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className={`px-1.5 py-1 text-xs font-medium text-slate-700 bg-transparent rounded transition-all outline-none border border-transparent ${!canEditTask ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-slate-100 hover:border-slate-300'}`}
                title={canEditTask ? "Thao tác ngày giờ cập nhật lên server Apec Global" : "Không có quyền sửa đổi"}
              />
            );
          })()}
        </div>

        <div className="w-24 flex-shrink-0">
          {renderStatusSelect(item)}
        </div>

        <div className="w-24 flex-shrink-0">
          {getPriorityBadge(item.priority || 'medium')}
        </div>

        {/* Tiến độ (%) có thể chọn trực tiếp cập nhật lên server Apec Global */}
        <div className="w-28 flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${item.progress || 0}%` }}></div>
          </div>
          <select
            value={item.progress || 0}
            disabled={!canEditTask}
            onChange={(e) => {
              e.stopPropagation();
              onProgressChange(item, Number(e.target.value));
            }}
            onClick={(e) => e.stopPropagation()}
            className={`text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded px-1 py-0.5 outline-none transition-colors ${!canEditTask ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-blue-400'}`}
            title={canEditTask ? "Thao tác tiến độ cập nhật lên server Apec Global" : "Không có quyền sửa đổi"}
          >
            <option value={0}>0%</option>
            <option value={10}>10%</option>
            <option value={25}>25%</option>
            <option value={50}>50%</option>
            <option value={75}>75%</option>
            <option value={90}>90%</option>
            <option value={100}>100%</option>
          </select>
        </div>

        {/* Nút DUYỆT CÔNG VIỆC TRÊN THANH CÔNG VIỆC - Khi đã duyệt thì chuyển đổi trạng thái Hoàn thành */}
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {(() => {
            const subs = Array.isArray(item.employee_assignments) ? item.employee_assignments : [];
            const isApproved = Boolean(item.checked) || Boolean(item.ea_checked) || (subs.length > 0
              ? subs.every((sub: any) => Boolean(sub.checked))
              : (item.status === 'done' && Boolean(item.checked)));
            return (
              <button
                type="button"
                disabled={!canEditTask}
                onClick={(e) => {
                  e.stopPropagation();
                  onApproveAll?.(item, !isApproved);
                }}
                className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1 shrink-0 ${
                  isApproved
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                } ${!canEditTask ? 'cursor-not-allowed opacity-60 bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-100' : ''}`}
                title={canEditTask ? (isApproved ? 'Đã duyệt công việc (Nhấp để hủy duyệt)' : 'Duyệt công việc & tự động chuyển trạng thái Hoàn thành') : 'Không có quyền duyệt công việc'}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isApproved ? 'Đã duyệt' : 'Duyệt'}</span>
              </button>
            );
          })()}
        </div>

        {canEditTask && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(item);
              }} 
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Chuyển sang Checklist khác / Chỉnh sửa công việc"
            >
              <ArrowRightLeft className="w-4 h-4 text-blue-500" />
            </button>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(item);
              }} 
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Chỉnh sửa công việc"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* --- DANH SÁCH CÔNG VIỆC CON XỔ XUỐNG --- */}
      {isSubtasksOpen && (
        <div className="bg-slate-50/80 border-t border-slate-200/80 px-6 py-3">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CornerDownRight className="w-4 h-4 text-blue-600" />
              Danh sách công việc con ({subtasks.length} hạng mục)
            </span>
            {canCreateTask && (
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  const subTitle = window.prompt('Nhập tên công việc con:');
                  if (!subTitle?.trim()) return;
                  
                  try {
                    const assigneeId = item.assignees?.[0]?.raw_id || null;
                    const res = await fetch('/api/v1/apec-global/assignments', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        task_id: String(item.id).replace(/^apec_/, ''),
                        name: subTitle.trim(),
                        process: 0,
                        status: { name: 'Chưa thực hiện', id: 1 },
                        employee_id: assigneeId
                      }),
                    });
                    if (!res.ok) throw new Error('Không thể tạo công việc con');
                    if (onSubtaskChange) onSubtaskChange(item.id, null, { action: 'reload' });
                  } catch (err: any) {
                    alert(err.message || 'Lỗi khi tạo công việc con');
                  }
                }}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
              >
                <Plus className="w-3 h-3" /> Thêm công việc con
              </button>
            )}
          </div>
          {subtasks.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-500 italic bg-white rounded-xl border border-slate-200 p-4">
              Chưa có công việc con nào từ APEC GLOBAL cho công việc này
            </div>
          ) : (
            <div className="space-y-2">
              {subtasks.map((sub: any, idx: number) => {
                const isSubHighlighted = highlightedTaskId && String(sub.id) === String(highlightedTaskId);
                return (
                <div
                  key={sub.id || idx}
                  id={`subtask-row-${sub.id}`}
                  className={`flex items-center justify-between gap-3 p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:border-blue-300 transition-all ${
                    isSubHighlighted ? 'ring-2 ring-amber-400 bg-amber-100/90 font-bold transition-all duration-500' : ''
                  }`}
                >
                  {/* STT + Checkbox + Nút Duyệt + Tên công việc con */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-400 w-6 shrink-0">#{idx + 1}</span>
                    <input
                      type="checkbox"
                      disabled={!canEditTask}
                      checked={sub.checked || Number(sub.process || sub.progress) >= 100}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        onSubtaskChange?.(item, idx, {
                          checked,
                          process: checked ? 100 : 0,
                          progress: checked ? 100 : 0,
                          status: checked ? { name: 'Hoàn thành' } : { name: 'Đang thực hiện' }
                        });
                      }}
                      className={`w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0 ${!canEditTask ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                      title={canEditTask ? "Hoàn thành công việc con (Cập nhật server Apec Global)" : "Không có quyền sửa đổi"}
                    />
                    {/* Nút DUYỆT TỪNG SUBTASK */}
                    <button
                      type="button"
                      disabled={!canEditTask}
                      onClick={(e) => {
                        e.stopPropagation();
                        const newChecked = !(sub.checked || Number(sub.process || sub.progress) >= 100);
                        onSubtaskChange?.(item, idx, {
                          checked: newChecked,
                          process: newChecked ? 100 : 0,
                          progress: newChecked ? 100 : 0,
                          status: newChecked ? { name: 'Hoàn thành' } : { name: 'Đang thực hiện' }
                        });
                      }}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 shrink-0 ${
                        Boolean(sub.checked)
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 shadow-2xs'
                          : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 shadow-2xs'
                      } ${!canEditTask ? 'cursor-not-allowed opacity-60 bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-100' : ''}`}
                      title={
                        canEditTask 
                          ? (Boolean(sub.checked) ? 'Đã duyệt (checked = true). Nhấp để hủy duyệt' : 'Chưa duyệt (checked = false). Nhấp để Duyệt (checked = true) và chuyển trạng thái Hoàn thành')
                          : 'Không có quyền duyệt công việc'
                      }
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{Boolean(sub.checked) ? 'Đã duyệt' : 'Duyệt'}</span>
                    </button>
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span className={`text-xs font-semibold truncate ${Boolean(sub.checked) ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {sub.title || sub.name || `Công việc con #${idx + 1}`}
                      </span>
                    </div>
                  </div>

                  {/* Chi tiết người phụ trách (Nhân sự) */}
                  <div className="w-48 shrink-0 flex items-center gap-2 relative group/subEmp">
                    <img
                      src={sub.employee?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sub.employee?.full_name || 'NV')}`}
                      alt="avatar"
                      className="w-7 h-7 rounded-full border border-slate-200 object-cover shrink-0 shadow-2xs"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-800 truncate">{sub.employee?.full_name || 'Chưa rõ'}</span>
                      {sub.employee?.position && (
                        <span className="text-[10px] text-slate-500 truncate">{sub.employee.position}</span>
                      )}
                    </div>

                    {/* Subtask Employee Details Tooltip */}
                    {sub.employee && (
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover/subEmp:block z-50 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 text-left">
                        <div className="flex items-center gap-2">
                          <img
                            src={sub.employee?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sub.employee?.full_name || 'NV')}`}
                            alt="avatar"
                            className="w-10 h-10 rounded-full border border-slate-200 object-cover shrink-0"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-900">{sub.employee.full_name}</span>
                            <span className="text-[10px] text-slate-500">{sub.employee.position || 'Chuyên viên APEC GLOBAL'}</span>
                            {sub.employee.email && <span className="text-[10px] text-blue-600 truncate">{sub.employee.email}</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hạn hoàn thành editable */}
                  <div className="w-28 shrink-0">
                    {(() => {
                      const subDueDate = sub.completed_date || sub.date_end || sub.end_date || sub.due_date || item.end_date || item.date_end || item.due_date || '';
                      const valStr = subDueDate ? String(subDueDate).split('T')[0] : '';
                      return (
                        <input
                          type="date"
                          disabled={!canEditTask}
                          value={valStr}
                          onChange={(e) => onSubtaskChange?.(item, idx, { completed_date: e.target.value, end_date: e.target.value, date_end: e.target.value, due_date: e.target.value })}
                          className={`px-1.5 py-0.5 text-xs font-medium text-slate-700 bg-transparent rounded transition-all outline-none border border-transparent ${!canEditTask ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-slate-100 hover:border-slate-300'}`}
                          title={canEditTask ? "Cập nhật hạn hoàn thành công việc con lên Apec Global" : "Không có quyền sửa đổi"}
                        />
                      );
                    })()}
                  </div>

                  {/* Trạng thái editable - đọc chính xác từ APEC Global */}
                  <div className="w-28 shrink-0">
                    {(() => {
                      const subStatus = sub.status;
                      const isSubDone = Boolean(sub.checked || Number(sub.process || sub.progress) >= 100);
                      const subProc = Number(sub.process || sub.progress) || 0;
                      let displayStatus = 'todo';

                      if (isSubDone) {
                        displayStatus = 'done';
                      } else if (subStatus && typeof subStatus === 'object') {
                        const sId = Number(subStatus.id);
                        const sNm = String(subStatus.name || '').toLowerCase();
                        if (sId === 4 || sNm.includes('hoàn thành') || sNm.includes('done')) displayStatus = subProc > 0 ? 'in_progress' : 'todo';
                        else if (sId === 3 || sNm.includes('chờ duyệt') || sNm.includes('review') || sNm.includes('duyệt')) displayStatus = 'review';
                        else if (sId === 2 || sNm.includes('đang') || sNm.includes('thực hiện') || sNm.includes('in_progress')) displayStatus = 'in_progress';
                        else displayStatus = subProc > 0 ? 'in_progress' : 'todo';
                      } else if (typeof subStatus === 'string') {
                        const s = subStatus.toLowerCase();
                        if (s === 'done' || s.includes('hoàn thành')) displayStatus = subProc > 0 ? 'in_progress' : 'todo';
                        else if (s === 'review' || s.includes('chờ duyệt')) displayStatus = 'review';
                        else if (s === 'in_progress' || s.includes('đang')) displayStatus = 'in_progress';
                        else displayStatus = subProc > 0 ? 'in_progress' : 'todo';
                      } else {
                        displayStatus = subProc > 0 ? 'in_progress' : 'todo';
                      }
                      const colorCls = displayStatus === 'done' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                        displayStatus === 'review' ? 'text-purple-700 bg-purple-50 border-purple-200' :
                        displayStatus === 'in_progress' ? 'text-blue-700 bg-blue-50 border-blue-200' :
                        'text-slate-600 bg-slate-50 border-slate-200';
                      return (
                        <select
                          value={displayStatus}
                          disabled={!canEditTask}
                          onChange={(e) => {
                            const val = e.target.value;
                            const proc = val === 'done' ? 100 : val === 'review' ? 90 : val === 'in_progress' ? 50 : 0;
                            onSubtaskChange?.(item, idx, {
                              process: proc,
                              progress: proc,
                              checked: val === 'done',
                              status: { name: val === 'done' ? 'Hoàn thành' : val === 'review' ? 'Chờ duyệt' : val === 'in_progress' ? 'Đang thực hiện' : 'Chưa thực hiện' }
                            });
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border outline-none transition-opacity ${colorCls} ${!canEditTask ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                        >
                          <option value="todo" className="text-slate-900 bg-white">Chưa bắt đầu</option>
                          <option value="in_progress" className="text-slate-900 bg-white">Đang xử lý</option>
                          <option value="review" className="text-slate-900 bg-white">Chờ duyệt</option>
                          <option value="done" className="text-slate-900 bg-white">Hoàn thành</option>
                        </select>
                      );
                    })()}
                  </div>

                  {/* Tiến độ editable */}
                  <div className="w-24 shrink-0 flex items-center gap-1.5">
                    <select
                      value={Number(sub.process || sub.progress) || 0}
                      disabled={!canEditTask}
                      onChange={(e) => {
                        const proc = Number(e.target.value);
                        onSubtaskChange?.(item, idx, {
                          process: proc,
                          progress: proc,
                          checked: sub.checked || false
                        });
                      }}
                      className={`text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded px-1 py-0.5 outline-none transition-all ${!canEditTask ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-blue-400'}`}
                      title={canEditTask ? "Cập nhật tiến độ công việc con lên Apec Global" : "Không có quyền sửa đổi"}
                    >
                      <option value={0}>0%</option>
                      <option value={10}>10%</option>
                      <option value={25}>25%</option>
                      <option value={50}>50%</option>
                      <option value={75}>75%</option>
                      <option value={90}>90%</option>
                      <option value={100}>100%</option>
                    </select>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


// --- SORTABLE CHECKLIST CARD COMPONENT ---
function SortableChecklistCard({ list, children }: { list: any; children: (props: { attributes: any; listeners: any }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: list.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    opacity: isDragging ? 0.85 : 1,
    position: 'relative' as const,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners })}
    </div>
  );
}

// --- MAIN ACCORDION COMPONENT ---
export function ProjectChecklistTable({ projectId, organizationId, onProgressChange }: Readonly<{ projectId: string, organizationId: string, onProgressChange: any }>) {
  const searchParams = useSearchParams()
  const { hasPermission } = usePermissions()
  const canCreateTask = hasPermission('create_tasks')
  const canEditTask = hasPermission('edit_tasks')
  const canDeleteTask = hasPermission('delete_tasks')
  const taskIdParam = searchParams.get('taskId')
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null)
  const [checklists, setChecklists] = useState<any[]>([])
  const [syncStatusText, setSyncStatusText] = useState<string>('⚡ Đồng bộ realtime APEC GLOBAL')
  const [expandedList, setExpandedList] = useState<string | null>(null)
  const [expandedDepartments, setExpandedDepartments] = useState<Record<string, boolean>>({})
  const [showCreateChecklist, setShowCreateChecklist] = useState(false)
  const [showItemDialog, setShowItemDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [activeChecklist, setActiveChecklist] = useState('')
  const [itemToEdit, setItemToEdit] = useState<any>(null)
  const [apecCompanyId, setApecCompanyId] = useState<number | string | null>(null)
  const [staff, setStaff] = useState<any[]>([])
  const [openStatusPopoverKey, setOpenStatusPopoverKey] = useState<string | null>(null)

  useEffect(() => {
    const handleGlobalClick = () => setOpenStatusPopoverKey(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);
  const loadData = async (retryCount = 0) => {
    try {
      setSyncStatusText('⏳ Đang tải dữ liệu từ máy chủ...');
      const res = await fetch(`/api/v1/projects/${projectId}/board-data`);
      
      if (!res.ok) {
        if (retryCount < 2) {
          console.warn(`[BoardData] Fetch returned HTTP ${res.status}, retrying in 1s...`);
          setTimeout(() => loadData(retryCount + 1), 1000);
          return;
        }
        setSyncStatusText('⚠️ Lỗi tải dữ liệu');
        return;
      }

      const data = await res.json();
      
      if (!data || !data.success) {
        console.error('Failed to load board data:', data?.error);
        setSyncStatusText('⚠️ Lỗi tải dữ liệu');
        return;
      }
      
      setApecProjectId(data.apecProjectId);
      if (data.apecCompanyId) setApecCompanyId(data.apecCompanyId);
      setStaff(data.staff || []);
      setTaskTypes(data.taskTypes || []);
      setChecklists(data.checklists || []);
      
      calculateOverallProgress(data.checklists || []);
      setSyncStatusText('');
    } catch (error) {
      console.warn('Error fetching board data:', error);
      setSyncStatusText('⚠️ Lỗi kết nối');
    }
  }

  useEffect(() => {
    loadData();

    // Supabase Realtime Channel: Listen for completed queue jobs and auto-refresh
    const channel = supabase
      .channel(`apec_queue_updates_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'apec_idempotency_keys',
          filter: 'status=eq.completed',
        },
        () => {
          console.log('[Realtime] Outbound Queue Job completed, refreshing board...');
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [taskTypes, setTaskTypes] = useState<any[]>([])
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [deptFilters, setDeptFilters] = useState<Record<string, string>>({})

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const [apecProjectId, setApecProjectId] = useState<string | number | undefined>(undefined);



  useEffect(() => {
    if (taskIdParam && checklists.length > 0) {
      setHighlightedTaskId(String(taskIdParam));
      checklists.forEach(l => {
        const items = l.checklist_items || [];
        items.forEach((i: any) => {
          const isMatch = String(i.id) === String(taskIdParam) || (i.subtasks && i.subtasks.some((st: any) => String(st.id) === String(taskIdParam)));
          if (isMatch) {
            setExpandedList(l.id);
          }
        });
      });
      setTimeout(() => {
        const el = document.getElementById(`task-row-${taskIdParam}`) || document.getElementById(`subtask-row-${taskIdParam}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 400);
    }
  }, [taskIdParam]);

  const calculateOverallProgress = (data: any[]) => {
    let taskTotal = 0, taskCompleted = 0, taskTodo = 0, taskInProgress = 0, taskReview = 0
    let checklistTotal = data.length
    let checklistCompleted = 0

    data.forEach(l => {
      const items = l.checklist_items || []
      if (items.length > 0) {
        let listCompletedItems = 0
        items.forEach((i: any) => {
          taskTotal++
          if (i.status === 'done' || i.is_completed) {
            taskCompleted++
            listCompletedItems++
          } else if (i.status === 'in_progress') {
            taskInProgress++
          } else if (i.status === 'review') {
            taskReview++
          } else {
            taskTodo++
          }
        })
        if (listCompletedItems === items.length) checklistCompleted++
      }
    })
    const progress = taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 0
    
    onProgressChange({
      progress,
      taskTotal,
      taskCompleted,
      taskTodo,
      taskInProgress,
      taskReview,
      checklistTotal,
      checklistCompleted
    })
  }

  const syncTaskToApecGlobal = async (item: any, overrideFields: any = {}) => {
    const cleanId = String(item.id).replace(/^apec_/, '');
    if (!cleanId) return true;
    try {
      const mergedProcess = overrideFields.process !== undefined ? overrideFields.process : (overrideFields.progress !== undefined ? overrideFields.progress : (item.progress || item.process || 0));
      const mergedStatus = overrideFields.status || item.status;
      
      const res = await fetch('/api/v1/apec-global/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cleanId,
          title: item.title || item.name,
          name: item.title || item.name,
          status: mergedStatus,
          process: mergedProcess,
          progress: mergedProcess,
          is_completed: overrideFields.is_completed !== undefined ? overrideFields.is_completed : (item.is_completed || false),
          date_end: overrideFields.date_end || item.end_date || item.due_date,
          end_date: overrideFields.end_date || item.end_date || item.due_date,
          due_date: overrideFields.due_date || item.end_date || item.due_date,
          project_id: item.project_id || projectId,
          checklist_id: item.checklist_id || item.type_id,
          type_id: item.type_id || item.checklist_id,
          target_value: overrideFields.target_value || item.target_value || item.rawApecTask?.target_value || 100,
          kpi_item_id: overrideFields.kpi_item_id || item.kpi_item_id || item.rawApecTask?.kpi_item?.id || 47,
          sort_order: item.sort_order || 0,
          order: item.sort_order || 0,
          index: item.sort_order || 0,
          employee_assignments: overrideFields.employee_assignments || item.employee_assignments || [],
          assignees: item.assignees || [],
        }),
      });
      if (res.ok) {
        setSyncStatusText('⚡ Đã đồng bộ realtime APEC GLOBAL');
        return true;
      } else {
        const errData = await res.json().catch(() => null);
        console.warn('APEC GLOBAL sync response:', errData);
        const errorMsg = errData?.error || 'Failed to sync with APEC GLOBAL';
        
        // Tự động hoàn thành các phân công nếu APEC báo lỗi do nhân viên chưa hoàn thành
        if (errorMsg.toLowerCase().includes('nhân viên') || 
            errorMsg.toLowerCase().includes('employee') || 
            errorMsg.toLowerCase().includes('hoàn thành')) {
            
            const assignments = overrideFields.employee_assignments || item.employee_assignments || [];
            let allSuccess = true;
            for (const sub of assignments) {
                const rawId = sub.id || sub.raw_id || sub.ea_id;
                const cleanNum = Number(String(rawId || '').replace(/^(apec_type_t_|apec_type_|apec_emp_|apec_prj_|apec_|p-|prj_|t_|st_|st_dir_|ea_)+/ig, ''));
                if (!isNaN(cleanNum) && cleanNum > 0) {
                    const cleanTaskId = Number(String(item.id || '').replace(/^(apec_type_t_|apec_type_|apec_emp_|apec_prj_|apec_|p-|prj_|t_|st_|st_dir_|ea_inc_|ea_imp_|inc_|imp_)+/ig, ''));
                    // Cập nhật tiến độ phân công lên 100%
                    await fetch('/api/v1/apec-global/assignments', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: cleanNum,
                            task_id: item.raw_id || cleanTaskId,
                            process: 100,
                            progress: 100,
                            value: 100,
                            target_value: 100,
                            status: 'done',
                            checked: true
                        })
                    });
                    
                    // Duyệt phân công
                    const appRes = await fetch('/api/v1/apec-global/approve', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ task_assignment_id: cleanNum })
                    });
                    if (!appRes.ok) allSuccess = false;
                }
            }
            
            if (allSuccess && assignments.length > 0) {
                // Thử đồng bộ lại task một lần nữa
                const retryRes = await fetch('/api/v1/apec-global/tasks', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: cleanId,
                    title: item.title || item.name,
                    name: item.title || item.name,
                    status: mergedStatus,
                    process: mergedProcess,
                    progress: mergedProcess,
                    is_completed: overrideFields.is_completed !== undefined ? overrideFields.is_completed : (item.is_completed || false),
                    date_end: overrideFields.date_end || item.end_date || item.due_date,
                    end_date: overrideFields.end_date || item.end_date || item.due_date,
                    due_date: overrideFields.due_date || item.end_date || item.due_date,
                    project_id: item.project_id || projectId,
                    checklist_id: item.checklist_id || item.type_id,
                    type_id: item.type_id || item.checklist_id,
                    target_value: overrideFields.target_value || item.target_value || item.rawApecTask?.target_value || 100,
                    kpi_item_id: overrideFields.kpi_item_id || item.kpi_item_id || item.rawApecTask?.kpi_item?.id || 47,
                    sort_order: item.sort_order || 0,
                    order: item.sort_order || 0,
                    index: item.sort_order || 0,
                    employee_assignments: assignments,
                    assignees: item.assignees || [],
                  }),
                });
                if (retryRes.ok) {
                    setSyncStatusText('⚡ Đã đồng bộ realtime APEC GLOBAL');
                    return true;
                }
            }
        }
        
        setSyncStatusText('⚠️ Lỗi đồng bộ APEC GLOBAL');
        throw new Error(errorMsg);
      }
    } catch (apecErr) {
      console.warn('Lỗi khi cập nhật lên APEC GLOBAL:', apecErr);
      setSyncStatusText('⚠️ Lỗi đồng bộ APEC GLOBAL');
      throw apecErr;
    }
  };

  const handleChecklistDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = checklists.findIndex(l => l.id === active.id);
    const newIndex = checklists.findIndex(l => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newChecklists = arrayMove(checklists, oldIndex, newIndex);
    const updatedChecklists = newChecklists.map((l, idx) => ({
      ...l,
      sort_order: idx + 1
    }));

    setChecklists(updatedChecklists);
    setSyncStatusText('⏳ Đang đồng bộ vị trí Checklist lên APEC GLOBAL...');

    try {
      await Promise.all(updatedChecklists.map(async (list, idx) => {
        const cleanId = String(list.id).replace('apec_type_', '').replace('apec_', '');
        if (!cleanId) return;
        await fetch('/api/v1/apec-global/checklists', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: cleanId,
            name: list.title,
            sort_order: idx + 1,
            order: idx + 1,
            index: idx + 1
          })
        });
      }));
      setSyncStatusText('⚡ Đã cập nhật vị trí Checklist lên APEC GLOBAL');
    } catch (err) {
      console.warn('Lỗi khi cập nhật vị trí checklist lên APEC GLOBAL:', err);
      setSyncStatusText('⚠️ Lỗi đồng bộ vị trí Checklist');
    }
  };

  const handleDragEnd = async (event: DragEndEvent, listId: string, deptId: string) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const listIndex = checklists.findIndex(l => l.id === listId)
    if (listIndex === -1) return
    const list = checklists[listIndex]

    const deptIndex = list.departments.findIndex((d: any) => d.id === deptId)
    if (deptIndex === -1) return
    const dept = list.departments[deptIndex]

    const oldIndex = dept.items.findIndex((i: any) => i.id === active.id)
    const newIndex = dept.items.findIndex((i: any) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    
    const newItems = arrayMove(dept.items, oldIndex, newIndex).map((item: any, idx: number) => ({
      ...item,
      sort_order: idx + 1
    }))
    
    // Update local state immediately
    const newChecklists = [...checklists]
    newChecklists[listIndex].departments[deptIndex] = {
      ...dept,
      items: newItems
    }
    newChecklists[listIndex].checklist_items = newChecklists[listIndex].departments.flatMap((d: any) => d.items)
    
    setChecklists(newChecklists)
    setSyncStatusText('⏳ Đang đồng bộ thứ tự công việc lên APEC GLOBAL...');

    // Cập nhật vị trí công việc trực tiếp lên server APEC GLOBAL (PUT)
    try {
      await Promise.all(newItems.map(async (item: any, idx: number) => {
        const cleanId = String(item.id).replace('apec_', '');
        if (!cleanId) return;
        await fetch('/api/v1/apec-global/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: cleanId,
            title: item.title || item.name,
            name: item.title || item.name,
            sort_order: idx + 1,
            order: idx + 1,
            index: idx + 1,
            project_id: item.project_id || projectId
          }),
        });
      }));
      setSyncStatusText('⚡ Đã cập nhật vị trí công việc con lên APEC GLOBAL');
    } catch (err) {
      console.warn('Lỗi cập nhật vị trí:', err);
    }
  };

    const updateChecklistData = (updater: (item: any) => any) => {
    const nextChecklists = checklists.map((list: any) => {
      let listUpdated = false;

      const updatedChecklistItems = Array.isArray(list.checklist_items)
        ? list.checklist_items.map((item: any) => {
            const newItem = updater(item);
            if (newItem !== item) listUpdated = true;
            return newItem;
          })
        : list.checklist_items;

      const updatedDepartments = Array.isArray(list.departments)
        ? list.departments.map((dept: any) => {
            let deptUpdated = false;
            const updatedDeptItems = Array.isArray(dept.items)
              ? dept.items.map((item: any) => {
                  const newItem = updater(item);
                  if (newItem !== item) {
                    deptUpdated = true;
                    listUpdated = true;
                  }
                  return newItem;
                })
              : dept.items;
            return deptUpdated ? { ...dept, items: updatedDeptItems } : dept;
          })
        : list.departments;

      if (!listUpdated) return list;

      const allItemsFromDepts = updatedDepartments ? updatedDepartments.flatMap((d: any) => d.items || []) : [];

      return {
        ...list,
        checklist_items: updatedChecklistItems || allItemsFromDepts,
        departments: updatedDepartments
      };
    });

    setChecklists(nextChecklists);
    calculateOverallProgress(nextChecklists);
    return nextChecklists;
  };

  const updateStatus = async (item: any, newStatus: string) => {
    const isDone = newStatus === 'done'
    let newProgress = item.progress || 0
    if (newStatus === 'done') newProgress = 100;
    else if (newStatus === 'todo') newProgress = 0;
    else if (newStatus === 'in_progress' && newProgress === 0) newProgress = 50;
    else if (newStatus === 'review') newProgress = 100;
    
    const previousChecklists = [...checklists]; // Backup for rollback
    
    const nextChecklists = updateChecklistData((i: any) => {
      if (String(i.id) !== String(item.id)) return i;
      const updatedSubs = Array.isArray(i.employee_assignments) ? i.employee_assignments.map((sub: any) => ({
        ...sub,
        process: newProgress,
        progress: newProgress,
        checked: isDone,
        status: isDone ? { name: 'Hoàn thành' } : (newStatus === 'review' ? { name: 'Hoàn thành' } : { name: 'Đang thực hiện' })
      })) : [];
      return {
        ...i,
        checked: isDone,
        status: newStatus,
        is_completed: isDone,
        progress: newProgress,
        employee_assignments: updatedSubs
      };
    });
    
    setSyncStatusText('⏳ Đang cập nhật trạng thái lên APEC GLOBAL...');
    const updatedItem = nextChecklists.flatMap(l => l.checklist_items || []).find((i: any) => String(i.id) === String(item.id)) || item;
    
    try {
      if (isDone) {
        const subs = Array.isArray(updatedItem.employee_assignments) ? updatedItem.employee_assignments : [];
        for (const sub of subs) {
          const rawId = sub.id || sub.raw_id || sub.ea_id;
          const cleanNum = Number(String(rawId || '').replace(/^(apec_type_t_|apec_type_|apec_emp_|apec_prj_|apec_|p-|prj_|t_|st_|st_dir_|ea_)+/ig, ''));
          if (!isNaN(cleanNum) && cleanNum > 0) {
            const cleanTaskId = Number(String(item.id || '').replace(/^(apec_type_t_|apec_type_|apec_emp_|apec_prj_|apec_|p-|prj_|t_|st_|st_dir_|ea_inc_|ea_imp_|inc_|imp_)+/ig, ''));
            // Cập nhật tiến độ 100% trước khi duyệt
            await fetch('/api/v1/apec-global/assignments', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: cleanNum,
                    task_id: item.raw_id || cleanTaskId,
                    process: 100,
                    progress: 100,
                    value: 100,
                    target_value: 100,
                    status: 'done',
                    checked: true
                })
            });
            await fetch('/api/v1/apec-global/approve', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_assignment_id: cleanNum })
            });
          }
        }
      }

      if (String(item.id).startsWith('inc_') || item.is_incident) {
        const rawIncId = String(item.id).replace('inc_', '').replace('apec_', '');
        const targetIncStatus = newStatus === 'done' ? 'resolved' : (newStatus === 'review' ? 'review' : (newStatus === 'in_progress' ? 'investigating' : 'new'));
        try {
          const validUuids = [rawIncId, item.id].filter(isUuid);
          if (validUuids.length > 0) {
            const orConditions = validUuids.map(u => `id.eq.${u},checklist_item_id.eq.${u}`).join(',');
            const { data: updatedByKey } = await supabase.from('incidents').update({
              status: targetIncStatus,
              updated_at: new Date().toISOString()
            }).or(orConditions).select('id');
            
            if ((!updatedByKey || updatedByKey.length === 0) && (item.title || item.name)) {
              await supabase.from('incidents').update({
                status: targetIncStatus,
                updated_at: new Date().toISOString()
              }).eq('title', item.title || item.name);
            }

            await supabase.from('checklist_items').update({
              status: newStatus,
              progress: newProgress,
              is_completed: isDone,
              updated_at: new Date().toISOString()
            }).in('id', validUuids);
          } else if (item.title || item.name) {
            await supabase.from('incidents').update({
              status: targetIncStatus,
              updated_at: new Date().toISOString()
            }).eq('title', item.title || item.name);
          }
        } catch {}
      } else if (String(item.id).startsWith('imp_') || item.is_improvement) {
        const rawImpId = String(item.id).replace('imp_', '').replace('apec_', '');
        try {
          if (isUuid(rawImpId)) {
            await supabase.from('improvements').update({
              status: newStatus === 'done' ? 'implemented' : (newStatus === 'review' ? 'review' : (newStatus === 'in_progress' ? 'in_progress' : 'pending')),
              updated_at: new Date().toISOString()
            }).eq('id', rawImpId);
          } else if (item.title || item.name) {
            await supabase.from('improvements').update({
              status: newStatus === 'done' ? 'implemented' : (newStatus === 'review' ? 'review' : (newStatus === 'in_progress' ? 'in_progress' : 'pending')),
              updated_at: new Date().toISOString()
            }).eq('title', item.title || item.name);
          }

          if (isUuid(updatedItem.id)) {
            await supabase.from('checklist_items').update({
              status: newStatus,
              progress: newProgress,
              is_completed: isDone,
              updated_at: new Date().toISOString()
            }).eq('id', updatedItem.id);
          }
        } catch {}
      } else {
        try {
          if (isUuid(updatedItem.id)) {
            await supabase.from('checklist_items').update({
              status: newStatus,
              progress: newProgress,
              is_completed: isDone,
              updated_at: new Date().toISOString()
            }).eq('id', updatedItem.id);
          }
        } catch {}
      }

      try {
        await syncTaskToApecGlobal(updatedItem, {
          status: newStatus,
          process: newProgress,
          progress: newProgress,
          is_completed: isDone,
          checked: isDone,
          target_value: item.target_value || 100,
          kpi_item_id: item.kpi_item_id || 47,
          employee_assignments: updatedItem.employee_assignments || []
        });
      } catch (syncErr) {
        console.warn('Bỏ qua lỗi syncTaskToApecGlobal trong updateStatus:', syncErr);
      }
    } catch (error) {
      setChecklists(previousChecklists);
      calculateOverallProgress(previousChecklists);
      customAlert('Lỗi cập nhật trạng thái. Đã khôi phục dữ liệu ban đầu.');
    }
  };

  const updateProgress = async (item: any, newProgress: number) => {
    const isApproved = Boolean(item.checked) || Boolean(item.ea_checked);
    const newStatus = isApproved ? 'done' : (newProgress >= 100 ? 'review' : (newProgress > 0 ? 'in_progress' : 'todo'));
    const isDone = isApproved;
    const previousChecklists = [...checklists]; // Backup

    const nextChecklists = updateChecklistData((i: any) => {
      if (String(i.id) !== String(item.id)) return i;
      const updatedSubs = Array.isArray(i.employee_assignments) ? i.employee_assignments.map((sub: any) => ({
        ...sub,
        process: newProgress,
        progress: newProgress,
        checked: isApproved,
        status: newProgress >= 100 ? { name: 'Hoàn thành' } : { name: 'Đang thực hiện' }
      })) : [];
      return {
        ...i,
        progress: newProgress,
        status: newStatus,
        is_completed: isDone,
        employee_assignments: updatedSubs
      };
    });

    setSyncStatusText('⏳ Đang cập nhật tiến độ lên APEC GLOBAL...');
    const updatedItem = nextChecklists.flatMap(l => l.checklist_items || []).find((i: any) => String(i.id) === String(item.id)) || item;
    
    try {
      if (String(item.id).startsWith('inc_') || item.is_incident) {
        const rawIncId = String(item.id).replace('inc_', '').replace('apec_', '');
        const targetIncStatus = newStatus === 'done' ? 'resolved' : (newStatus === 'review' ? 'review' : (newStatus === 'in_progress' ? 'investigating' : 'new'));
        try {
          const validUuids = [rawIncId, item.id].filter(isUuid);
          if (validUuids.length > 0) {
            const orConditions = validUuids.map(u => `id.eq.${u},checklist_item_id.eq.${u}`).join(',');
            const { data: updatedByKey } = await supabase.from('incidents').update({
              status: targetIncStatus,
              updated_at: new Date().toISOString()
            }).or(orConditions).select('id');
            
            if ((!updatedByKey || updatedByKey.length === 0) && (item.title || item.name)) {
              await supabase.from('incidents').update({
                status: targetIncStatus,
                updated_at: new Date().toISOString()
              }).eq('title', item.title || item.name);
            }

            await supabase.from('checklist_items').update({
              status: newStatus,
              progress: newProgress,
              is_completed: isDone,
              updated_at: new Date().toISOString()
            }).in('id', validUuids);
          } else if (item.title || item.name) {
            await supabase.from('incidents').update({
              status: targetIncStatus,
              updated_at: new Date().toISOString()
            }).eq('title', item.title || item.name);
          }
        } catch {}
      } else if (String(item.id).startsWith('imp_') || item.is_improvement) {
        const rawImpId = String(item.id).replace('imp_', '').replace('apec_', '');
        try {
          if (isUuid(rawImpId)) {
            await supabase.from('improvements').update({
              status: newStatus === 'done' ? 'implemented' : (newStatus === 'review' ? 'review' : (newStatus === 'in_progress' ? 'in_progress' : 'pending')),
              updated_at: new Date().toISOString()
            }).eq('id', rawImpId);
          } else if (item.title || item.name) {
            await supabase.from('improvements').update({
              status: newStatus === 'done' ? 'implemented' : (newStatus === 'review' ? 'review' : (newStatus === 'in_progress' ? 'in_progress' : 'pending')),
              updated_at: new Date().toISOString()
            }).eq('title', item.title || item.name);
          }

          if (isUuid(updatedItem.id)) {
            await supabase.from('checklist_items').update({
              status: newStatus,
              progress: newProgress,
              is_completed: isDone,
              updated_at: new Date().toISOString()
            }).eq('id', updatedItem.id);
          }
        } catch {}
      } else {
        try {
          if (isUuid(updatedItem.id)) {
            await supabase.from('checklist_items').update({
              status: newStatus,
              progress: newProgress,
              is_completed: isDone,
              updated_at: new Date().toISOString()
            }).eq('id', updatedItem.id);
          }
        } catch {}
      }

      await syncTaskToApecGlobal(updatedItem, {
        progress: newProgress,
        process: newProgress,
        status: newStatus,
        is_completed: isDone,
        target_value: item.target_value || 100,
        kpi_item_id: item.kpi_item_id || 47,
        employee_assignments: updatedItem.employee_assignments || []
      });
    } catch (error) {
      setChecklists(previousChecklists);
      calculateOverallProgress(previousChecklists);
      customAlert('Lỗi cập nhật tiến độ. Đã khôi phục dữ liệu ban đầu.');
    }
  };

  const updateDate = async (item: any, newDate: string) => {
    const previousChecklists = [...checklists];
    const nextChecklists = updateChecklistData((i: any) => String(i.id) === String(item.id) ? { ...i, end_date: newDate } : i);
    const updatedItem = nextChecklists.flatMap(l => l.checklist_items || []).find((i: any) => String(i.id) === String(item.id)) || item;
    setSyncStatusText('⏳ Đang cập nhật hạn hoàn thành lên APEC GLOBAL...');
    try {
      await syncTaskToApecGlobal(updatedItem, {
        date_end: newDate,
        end_date: newDate,
        due_date: newDate,
        employee_assignments: updatedItem.employee_assignments || []
      });
    } catch (error) {
      setChecklists(previousChecklists);
      calculateOverallProgress(previousChecklists);
      customAlert('Lỗi cập nhật thời gian. Đã khôi phục dữ liệu ban đầu.');
    }
  };

  const updateSubtask = async (item: any, subtaskIndex: number, updatedFields: any) => {
    const previousChecklists = [...checklists];
    
    let isAllApproved = false;
    updateChecklistData((i: any) => {
      if (String(i.id) !== String(item.id)) return i;
      const currentSubs = Array.isArray(i.employee_assignments) ? [...i.employee_assignments] : [];
      const oldSub = currentSubs[subtaskIndex] || {};
      const newSub = { ...oldSub, ...updatedFields };
      currentSubs[subtaskIndex] = newSub;

      let avgProgress = i.progress || 0;
      if (currentSubs.length > 0) {
        const sum = currentSubs.reduce((acc: number, cur: any) => acc + (Number(cur.process || cur.progress) || 0), 0);
        avgProgress = Math.round(sum / currentSubs.length);
      }
      isAllApproved = currentSubs.length > 0 && currentSubs.every((s: any) => Boolean(s.checked));
      const newStatus = isAllApproved ? 'done' : (avgProgress >= 100 ? 'review' : (avgProgress > 0 ? 'in_progress' : 'todo'));

      return {
        ...i,
        employee_assignments: currentSubs,
        progress: avgProgress,
        status: newStatus,
        is_completed: isAllApproved
      };
    });

    try {
      const updatedSub = (item.employee_assignments || [])[subtaskIndex];
      if (updatedSub) {
        const rawId = updatedSub.id || updatedSub.raw_id || updatedSub.ea_id;
        const cleanIdStr = String(rawId || '').replace(/^(apec_type_t_|apec_type_|apec_emp_|apec_prj_|apec_|p-|prj_|t_|st_|st_dir_|ea_)+/ig, '');
        const cleanNum = Number(cleanIdStr);

        if (updatedFields.checked && !isNaN(cleanNum) && cleanNum > 0) {
          await fetch('/api/v1/apec-global/approve', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_assignment_id: cleanNum })
          });
        } else if (updatedSub.id && !String(updatedSub.id).startsWith('ea_') && !String(updatedSub.id).startsWith('st_')) {
          const res = await fetch('/api/v1/apec-global/assignments', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: updatedSub.id,
              task_id: item.raw_id || item.id,
              process: updatedFields.process !== undefined ? updatedFields.process : updatedFields.progress,
              progress: updatedFields.process !== undefined ? updatedFields.process : updatedFields.progress,
              value: updatedFields.process !== undefined ? updatedFields.process : updatedFields.progress,
              target_value: item.target_value || 100,
              status: updatedFields.status,
              checked: updatedFields.checked,
              completed_date: updatedFields.completed_date
            })
          });
          if (!res.ok) throw new Error('API return error');
        }
      }
    } catch (err) {
      console.warn('Lỗi khi cập nhật công việc con lên APEC GLOBAL:', err);
      setChecklists(previousChecklists);
      calculateOverallProgress(previousChecklists);
      customAlert('Lỗi khi cập nhật công việc con. Đã khôi phục dữ liệu ban đầu.');
    }
  };

  const approveAllSubtasks = async (item: any, approve: boolean) => {
    const newProgress = approve ? 100 : 0;
    const newStatus = approve ? 'done' : 'todo';
    const isDone = approve;
    const previousChecklists = [...checklists];

    const nextChecklists = updateChecklistData((i: any) => {
      if (String(i.id) !== String(item.id)) return i;
      const updatedSubs = Array.isArray(i.employee_assignments) ? i.employee_assignments.map((sub: any) => ({
        ...sub,
        checked: approve,
        process: newProgress,
        progress: newProgress,
        status: approve ? { name: 'Hoàn thành' } : { name: 'Chưa thực hiện' }
      })) : [];

      return {
        ...i,
        checked: approve,
        ea_checked: approve,
        progress: newProgress,
        status: newStatus,
        is_completed: isDone,
        employee_assignments: updatedSubs
      };
    });

    setSyncStatusText(approve ? '⏳ Đang duyệt toàn bộ công việc con lên APEC GLOBAL...' : '⏳ Đang hủy duyệt lên APEC GLOBAL...');
    const updatedItem = nextChecklists.flatMap(l => l.checklist_items || []).find((i: any) => String(i.id) === String(item.id)) || item;
    
    try {
      if (approve) {
        const subs = Array.isArray(updatedItem.employee_assignments) ? updatedItem.employee_assignments : [];
        for (const sub of subs) {
          const rawId = sub.id || sub.raw_id || sub.ea_id;
          const cleanIdStr = String(rawId || '').replace(/^(apec_type_t_|apec_type_|apec_emp_|apec_prj_|apec_|p-|prj_|t_|st_|st_dir_|ea_)+/ig, '');
          const cleanNum = Number(cleanIdStr);
          if (!isNaN(cleanNum) && cleanNum > 0) {
            const cleanTaskId = Number(String(item.id || '').replace(/^(apec_type_t_|apec_type_|apec_emp_|apec_prj_|apec_|p-|prj_|t_|st_|st_dir_|ea_inc_|ea_imp_|inc_|imp_)+/ig, ''));
            // Cập nhật tiến độ phân công lên 100%
            await fetch('/api/v1/apec-global/assignments', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: cleanNum,
                    task_id: item.raw_id || cleanTaskId,
                    process: 100,
                    progress: 100,
                    value: 100,
                    target_value: 100,
                    status: 'done'
                })
            });

            const res = await fetch('/api/v1/apec-global/approve', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ task_assignment_id: cleanNum })
            });
            if (!res.ok) {
              let errMsg = 'API Duyệt lỗi';
              try {
                const data = await res.json();
                errMsg = data.error || data.message || errMsg;
              } catch {}
              throw new Error(`Duyệt phân công ${cleanNum} thất bại: ${errMsg}`);
            }
          }
        }
      }

      try {
        await syncTaskToApecGlobal(updatedItem, {
          status: approve ? 'done' : newStatus,
          process: newProgress,
          progress: newProgress,
          is_completed: isDone,
          checked: approve,
          employee_assignments: updatedItem.employee_assignments || []
        });
      } catch (syncErr) {
        console.warn('Bỏ qua lỗi syncTaskToApecGlobal sau khi duyệt:', syncErr);
      }
      
      setSyncStatusText('✅ Duyệt công việc thành công');
    } catch (error: any) {
      console.error("Lỗi duyệt công việc:", error);
      setChecklists(previousChecklists);
      calculateOverallProgress(previousChecklists);
      customAlert(error.message || 'Lỗi duyệt công việc. Đã khôi phục dữ liệu ban đầu.');
    }
  };

  const handleDeleteChecklist = async (listOrId: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(await customConfirm('Bạn có chắc chắn muốn xóa danh sách công việc này?'))) return;

    const listId = typeof listOrId === 'object' ? listOrId.id : listOrId;
    const listTitle = typeof listOrId === 'object' ? (listOrId.title || listOrId.name) : undefined;

    // 1. Cập nhật giao diện ngay lập tức (Optimistic UI update)
    setChecklists(prev => prev.filter(l => String(l.id) !== String(listId)));

    // 2. Gửi lệnh xóa lên APEC GLOBAL API trong nền
    try {
      const cleanIdStr = String(listId).replace(/^apec_type_t_/, '').replace(/^apec_type_/, '').replace(/^apec_/, '').replace(/^t_/, '');
      const cleanNumId = Number(cleanIdStr);
      const cleanId = !isNaN(cleanNumId) && cleanNumId > 0 ? cleanNumId : cleanIdStr;

      await fetch('/api/v1/apec-global/checklists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cleanId, ids: [cleanId], name: listTitle, title: listTitle }),
      });
    } catch (err) {
      console.warn('Lỗi xóa checklist trên server:', err);
    }
  };

  const handleEditChecklistName = async (list: any, e: React.MouseEvent) => {
    e.stopPropagation()
    const newName = window.prompt('Nhập tên mới cho danh sách:', list.title)
    if (!newName || newName.trim() === '' || newName === list.title) return
    try {
      // Sửa tên trực tiếp trên server APEC GLOBAL (PUT)
      const res = await fetch('/api/v1/apec-global/checklists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: list.id, name: newName.trim() }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.warn('Lỗi từ APEC GLOBAL:', errJson.error || errJson.error_message || res.statusText);
      }

      setChecklists(prev => prev.map(l => l.id === list.id ? { ...l, title: newName.trim() } : l))
    } catch (err) {
      console.error(err)
      await customAlert('Lỗi khi cập nhật tên checklist')
    }
  }

  const handleDuplicateChecklist = async (list: any, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!(await customConfirm(`Bạn muốn nhân bản danh sách "${list.title}"?`))) return
    try {
      // Nhân bản trực tiếp trên server APEC GLOBAL (POST)
      await fetch('/api/v1/apec-global/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${list.title} (Bản sao)`, is_default: false, projects: [] }),
      });

      loadData()
    } catch (err) {
      console.error(err)
      await customAlert('Lỗi khi nhân bản checklist')
    }
  }

  // --- Date filter helpers ---
  const setQuickMonth = (monthOffset: number) => {
    const { firstDay, lastDay } = getVietnamMonthBounds(monthOffset);
    setDateFrom(firstDay);
    setDateTo(lastDay);
  };

  const clearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
  };

  const getMonthLabel = (offset: number) => {
    return getVietnamMonthBounds(offset).label;
  };

  // Check if a task/subtask falls within the date range
  const isTaskInRange = (task: any): boolean => {
    if (!dateFrom && !dateTo) return true;
    const taskStart = task.start_date || task.date_start;
    const taskEnd = task.end_date || task.date_end || task.due_date || task.completed_date;
    // If the task has no dates at all, include it (don't hide undated tasks)
    if (!taskStart && !taskEnd) return true;
    const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
    const tStart = taskStart ? new Date(taskStart) : null;
    const tEnd = taskEnd ? new Date(taskEnd) : null;
    // Task overlaps with [from, to] range if task.end >= from AND task.start <= to
    if (from && tEnd && tEnd < from) return false;
    if (to && tStart && tStart > to) return false;
    return true;
  };

  // Apply date filter to checklists
  const filteredChecklists = (dateFrom || dateTo) ? checklists.map(list => {
    const filteredItems = (list.checklist_items || []).filter((item: any) => {
      // Check parent task
      if (isTaskInRange(item)) return true;
      // Check if any subtask is in range
      const subs = item.subtasks || item.employee_assignments || [];
      return subs.some((sub: any) => isTaskInRange(sub));
    }).map((item: any) => {
      // Also filter subtasks within the item
      const subs = item.subtasks || item.employee_assignments || [];
      const filteredSubs = subs.filter((sub: any) => isTaskInRange(sub));
      return {
        ...item,
        subtasks: item.subtasks ? filteredSubs : item.subtasks,
        employee_assignments: item.employee_assignments ? filteredSubs : item.employee_assignments
      };
    });
    return { ...list, checklist_items: filteredItems };
  }).filter(list => (list.checklist_items || []).length > 0) : checklists;

  const hasActiveFilter = !!(dateFrom || dateTo);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-0 overflow-hidden shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base">Checklist & Công việc</h3>
          {syncStatusText && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {syncStatusText}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border rounded-lg text-xs font-semibold transition-colors ${
              hasActiveFilter 
                ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100' 
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {hasActiveFilter ? `${dateFrom || '...'} → ${dateTo || '...'}` : 'Lọc thời gian'}
            {hasActiveFilter && (
              <span 
                onClick={(e) => { e.stopPropagation(); clearDateFilter(); }}
                className="ml-1 p-0.5 hover:bg-blue-200 rounded-full transition-colors cursor-pointer"
              >
                <XIcon className="w-3 h-3" />
              </span>
            )}
          </button>
          {canCreateTask && (
            <button 
              onClick={() => setShowImportDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Nhập Excel
            </button>
          )}
          {canCreateTask && (
            <button 
              onClick={async () => {
                if (checklists.length > 0) {
                  setActiveChecklist(expandedList || checklists[0].id)
                  setItemToEdit(null)
                  setShowItemDialog(true)
                } else {
                  await customAlert('Vui lòng tạo Checklist trước khi thêm công việc')
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm công việc
            </button>
          )}
        </div>
      </div>

      {/* Date Filter Panel */}
      {showDateFilter && (
        <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-slate-600">Chọn nhanh:</span>
            <div className="flex gap-1.5">
              {[-2, -1, 0, 1].map(offset => {
                const { firstDay, lastDay, label } = getVietnamMonthBounds(offset);
                const isActive = dateFrom === firstDay && dateTo === lastDay;
                return (
                  <button
                    key={offset}
                    onClick={() => setQuickMonth(offset)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {offset === 0 ? `Tháng này (${label})` : label}
                  </button>
                );
              })}
            </div>

            <div className="w-px h-5 bg-slate-300 mx-1"></div>

            <span className="text-xs font-semibold text-slate-600">Khoảng thời gian:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 cursor-pointer"
              />
              <span className="text-xs text-slate-400 font-bold">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 cursor-pointer"
              />
            </div>

            {hasActiveFilter && (
              <button
                onClick={clearDateFilter}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <XIcon className="w-3 h-3" /> Xóa lọc
              </button>
            )}
          </div>
          {hasActiveFilter && (
            <div className="mt-2 text-[11px] text-blue-600 font-medium">
              📋 Đang hiển thị {filteredChecklists.reduce((acc, l) => acc + (l.checklist_items?.length || 0), 0)} công việc trong khoảng thời gian đã chọn
            </div>
          )}
        </div>
      )}

      <div className="p-4 bg-slate-50/50">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleChecklistDragEnd}>
          <SortableContext items={checklists.map(l => l.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {filteredChecklists.map(list => {
                const isExpanded = expandedList === list.id
                const items = list.checklist_items || []
                let completedCount = 0, inProgressCount = 0, reviewCount = 0, todoCount = 0
                items.forEach((i: any) => {
                  const subs = Array.isArray(i.employee_assignments) ? i.employee_assignments : [];
                  const isApprovedByBoss = subs.length > 0 && subs.every((a: any) => Boolean(a.checked));
                  const allSubs100 = subs.length > 0 && subs.every((a: any) => Number(a.process ?? a.progress ?? 0) >= 100 || a.checked);
                  const prog = Number(i.progress ?? i.process ?? 0);

                  const st = typeof i.status === 'object' ? i.status?.name || i.status?.id : i.status;
                  const taskSt = i.task_status?.id || i.task_status;
                  const stStr = String(st || '').toLowerCase().trim();
                  
                  const isDone = isApprovedByBoss || Boolean(i.is_completed) || st === 'done' || st === 'completed' || taskSt === 4 || st === 4 || stStr.includes('hoàn thành') || stStr.includes('đã duyệt') || stStr.includes('da duyet') || stStr.includes('đã phê duyệt');
                  const isReview = !isDone && (st === 'review' || taskSt === 3 || st === 3 || stStr.includes('chờ') || stStr.includes('đợi') || stStr.includes('pending') || prog >= 100);

                  if (isDone) {
                    completedCount++;
                  } else if (isReview) {
                    reviewCount++;
                  } else if (st === 'in_progress' || taskSt === 2 || prog > 0 || stStr.includes('đang')) {
                    inProgressCount++;
                  } else {
                    todoCount++;
                  }
                })
                const progressPercent = items.length > 0 ? Math.round((completedCount/items.length)*100) : 0

                // Tính toán timeline (min start, max end) và đếm sự cố/cải tiến
                let minStart = null as Date | null
                let maxEnd = null as Date | null
                let totalIncidents = 0
                let totalImprovements = 0
                const uniqueStaff = new Map()

                items.forEach((item: any) => {
                  if (item.start_date) {
                    const d = new Date(item.start_date)
                    if (!minStart || d < minStart) minStart = d
                  }
                  if (item.end_date) {
                    const d = new Date(item.end_date)
                    if (!maxEnd || d > maxEnd) maxEnd = d
                  }
                  if (item.incidents?.length) {
                    totalIncidents += item.incidents.length
                  }
                  if (item.improvements?.length) {
                    totalImprovements += item.improvements.length
                  }
                  if (item.assignees && item.assignees.length > 0) {
                    item.assignees.forEach((a: any) => {
                      if (a && a.full_name) uniqueStaff.set(a.full_name, a.full_name)
                    })
                  } else if (item.profiles) {
                    uniqueStaff.set(item.profiles.full_name, item.profiles.full_name)
                  }
                })
                
                const staffList = Array.from(uniqueStaff.values())
                
                let timeText = '--'
                if (minStart && maxEnd) {
                  timeText = `${(minStart as Date).toLocaleDateString('vi-VN')} - ${(maxEnd as Date).toLocaleDateString('vi-VN')}`
                } else if (minStart) {
                  timeText = `Từ ${(minStart as Date).toLocaleDateString('vi-VN')}`
                } else if (maxEnd) {
                  timeText = `Đến ${(maxEnd as Date).toLocaleDateString('vi-VN')}`
                }
                return (
                  <SortableChecklistCard key={list.id} list={list}>
                    {({ attributes, listeners }) => (
                      <div className={`mb-4 border rounded-xl overflow-visible shadow-sm transition-colors duration-300 ${progressPercent === 100 ? 'bg-emerald-50/70 border-emerald-200' : 'bg-white border-slate-200'}`}>
                        
                        {/* List Header */}
                        <div 
                          className={`flex items-center gap-4 p-3 pr-4 cursor-pointer transition-colors border-b ${progressPercent === 100 ? 'hover:bg-emerald-100/50 border-emerald-100' : 'hover:bg-slate-50 border-slate-100'}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => setExpandedList(isExpanded ? null : list.id)}
                          onKeyDown={(e) => e.key === 'Enter' && setExpandedList(isExpanded ? null : list.id)}
                        >
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                          
                          {/* DRAG HANDLE CHO CHECKLIST */}
                          <div
                            {...attributes}
                            {...listeners}
                            onClick={(e) => e.stopPropagation()}
                            className="cursor-grab p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                            title="Kéo thả để thay đổi vị trí Checklist"
                          >
                            <GripVertical className="w-5 h-5" />
                          </div>

                          <div className="flex-1 min-w-[200px]">
                  <h4 className="font-bold text-[15px] text-slate-800 truncate mb-1">{list.title}</h4>
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-md text-slate-600 border border-slate-200">
                      <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                      {timeText}
                    </span>
                    <span className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold border border-slate-200" title="Tổng việc cha">
                      Tổng: {items.length}
                    </span>
                    {(todoCount + inProgressCount) > 0 && (
                      <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold border border-blue-200" title="Đang thực hiện + Chưa thực hiện">
                        Đang & Chưa làm: {todoCount + inProgressCount}
                      </span>
                    )}
                    {reviewCount > 0 && (
                      <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-bold border border-amber-200" title="Chờ duyệt">
                        Chờ duyệt: {reviewCount}
                      </span>
                    )}
                    {completedCount > 0 && (
                      <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold border border-emerald-200" title="Hoàn thành (Đã duyệt)">
                        Hoàn thành: {completedCount}
                      </span>
                    )}
                    {(totalIncidents > 0 || totalImprovements > 0) && (
                      <span className="flex items-center gap-2">
                        {totalIncidents > 0 && (
                          <span className="flex items-center gap-1 text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 font-bold">
                            <Bug className="w-3.5 h-3.5" />
                            {totalIncidents}
                          </span>
                        )}
                        {totalImprovements > 0 && (
                          <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 font-bold">
                            <Lightbulb className="w-3.5 h-3.5" />
                            {totalImprovements}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Avatar Group */}
                <div className="flex items-center -space-x-2 mr-4">
                  {staffList.slice(0, 3).map((name: any) => (
                    <div key={name} className="w-8 h-8 rounded-full border-2 border-white overflow-hidden shadow-sm z-10" title={name}>
                      <AvatarWithFallback name={name} sizeClass="w-full h-full" textClass="text-xs" />
                    </div>
                  ))}
                  {staffList.length > 3 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm z-0">
                      +{staffList.length - 3}
                    </div>
                  )}
                  {staffList.length === 0 && (
                    <div className="text-xs text-slate-400 font-medium italic pr-2">Chưa gán</div>
                  )}
                </div>

                <div className="w-48 flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500 w-8">{progressPercent}%</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%`}}></div>
                  </div>
                  <div className="w-6 flex justify-end">
                    {progressPercent === 100 ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <span className="w-5 h-5"></span>}
                  </div>
                </div>

                {/* Actions */}
                {(canCreateTask || canEditTask || canDeleteTask) && (
                  <div className="flex items-center gap-1 pl-4 border-l border-slate-200" role="presentation" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                    {canCreateTask && (
                      <button onClick={(e) => {
                          e.stopPropagation()
                          setActiveChecklist(list.id)
                          setItemToEdit(null)
                          setShowItemDialog(true)
                        }} 
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Thêm công việc">
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                    {canEditTask && (
                      <button onClick={(e) => handleEditChecklistName(list, e)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Đổi tên Danh sách">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {canDeleteTask && (
                      <button onClick={(e) => handleDeleteChecklist(list, e)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Xóa Danh sách">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* List Body (Table) */}
              {isExpanded && items.length > 0 && (
                <div className="overflow-visible">
                  {/* Table Header */}
                  <div className="flex items-center gap-3 p-2 px-3 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <div className="w-6"></div> {/* Drag handle space */}
                    <div className="flex-1 min-w-[200px]">Công việc</div>
                    <div className="w-32">Người phụ trách</div>
                    <div className="w-24">Hạn hoàn thành</div>
                    <div className="w-24">Trạng thái</div>
                    <div className="w-24">Ưu tiên</div>
                    <div className="w-24">Tiến độ</div>
                    <div className="w-6"></div>
                  </div>
                  
                  {/* Table Body (Sortable by Department) */}
                  {list.departments.map((dept: any) => {
                    const isDeptExpanded = expandedDepartments[`${list.id}_${dept.id}`] ?? false;
                    const isTaskDone = (i: any) => {
                      const subs = Array.isArray(i.employee_assignments) ? i.employee_assignments : [];
                      const isApprovedByBoss = subs.length > 0 && subs.every((a: any) => Boolean(a.checked));
                      const st = typeof i.status === 'object' ? i.status?.name || i.status?.id : i.status;
                      const taskSt = i.task_status?.id || i.task_status;
                      const stStr = String(st || '').toLowerCase().trim();
                      return isApprovedByBoss || Boolean(i.is_completed) || st === 'done' || st === 'completed' || taskSt === 4 || st === 4 || stStr.includes('hoàn thành') || stStr.includes('đã duyệt') || stStr.includes('da duyet') || stStr.includes('đã phê duyệt');
                    };
                    const isTaskReview = (i: any) => {
                      if (isTaskDone(i)) return false;
                      const prog = Number(i.progress ?? i.process ?? 0);
                      const st = typeof i.status === 'object' ? i.status?.name || i.status?.id : i.status;
                      const taskSt = i.task_status?.id || i.task_status;
                      const stStr = String(st || '').toLowerCase().trim();
                      return st === 'review' || taskSt === 3 || st === 3 || stStr.includes('chờ') || stStr.includes('đợi') || stStr.includes('pending') || prog >= 100;
                    };

                    const totalCount = dept.items.length;
                    const reviewCount = dept.items.filter(isTaskReview).length;
                    const doneCount = dept.items.filter(isTaskDone).length;
                    const activeCount = totalCount - doneCount; // Đang thực hiện gom Chưa làm, Đang làm & Chờ duyệt!
                    const currentFilter = deptFilters[`${list.id}_${dept.id}`] || 'active';

                    return (
                      <div key={dept.id} className="mb-4">
                        {/* Department Header */}
                        <div 
                          onClick={() => setExpandedDepartments(prev => ({ ...prev, [`${list.id}_${dept.id}`]: !isDeptExpanded }))}
                          className="bg-slate-100/80 hover:bg-slate-200/80 px-4 py-2 border-b border-slate-200 flex items-center gap-2 cursor-pointer transition-colors flex-wrap"
                        >
                          {isDeptExpanded ? <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
                          <span className="text-sm font-bold text-slate-700">🏢 {dept.name}</span>
                          <span className="text-xs font-semibold bg-white text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                            {dept.items.length}
                          </span>
                          <div className="flex-1"></div>
                          <div className="relative flex items-center gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
                            {/* Nút 1: Tất cả (Toàn bộ trạng thái) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeptFilters(prev => ({ ...prev, [`${list.id}_${dept.id}`]: 'all' }));
                                setExpandedDepartments(prev => ({ ...prev, [`${list.id}_${dept.id}`]: true }));
                                if (totalCount > 0) {
                                  const popKey = `${list.id}_${dept.id}_all`;
                                  setOpenStatusPopoverKey(prev => prev === popKey ? null : popKey);
                                }
                              }}
                              className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 border cursor-pointer ${
                                currentFilter === 'all'
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                  : 'bg-indigo-50/80 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                              }`}
                              title="Tất cả công việc (nhấp để mở danh sách công việc)"
                            >
                              📁 Tất cả
                              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                                currentFilter === 'all' ? 'bg-white/20 text-white' : 'bg-indigo-200/60 text-indigo-800'
                              }`}>
                                {totalCount}
                              </span>
                              {totalCount > 0 && (
                                <ChevronDown className={`w-3 h-3 transition-transform ${openStatusPopoverKey === `${list.id}_${dept.id}_all` ? 'rotate-180' : ''}`} />
                              )}
                            </button>

                            {/* Nút 2: Đang thực hiện (Chưa làm, Đang làm, Chờ duyệt) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeptFilters(prev => ({ ...prev, [`${list.id}_${dept.id}`]: 'active' }));
                                setExpandedDepartments(prev => ({ ...prev, [`${list.id}_${dept.id}`]: true }));
                                if (activeCount > 0) {
                                  const popKey = `${list.id}_${dept.id}_active`;
                                  setOpenStatusPopoverKey(prev => prev === popKey ? null : popKey);
                                }
                              }}
                              className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 border cursor-pointer ${
                                currentFilter === 'active' || currentFilter === 'in_progress' || currentFilter === 'todo' || currentFilter === 'review'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-blue-50/80 text-blue-700 border-blue-200 hover:bg-blue-100'
                              }`}
                              title="Công việc Đang thực hiện (nhấp để mở danh sách công việc)"
                            >
                              ⚡ Đang thực hiện
                              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                                (currentFilter === 'active' || currentFilter === 'in_progress' || currentFilter === 'todo' || currentFilter === 'review') ? 'bg-white/20 text-white' : 'bg-blue-200/60 text-blue-800'
                              }`}>
                                {activeCount}
                              </span>
                              {activeCount > 0 && (
                                <ChevronDown className={`w-3 h-3 transition-transform ${openStatusPopoverKey === `${list.id}_${dept.id}_active` ? 'rotate-180' : ''}`} />
                              )}
                            </button>

                            {/* Nút 3: Hoàn thành */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeptFilters(prev => ({ ...prev, [`${list.id}_${dept.id}`]: 'done' }));
                                setExpandedDepartments(prev => ({ ...prev, [`${list.id}_${dept.id}`]: true }));
                                if (doneCount > 0) {
                                  const popKey = `${list.id}_${dept.id}_done`;
                                  setOpenStatusPopoverKey(prev => prev === popKey ? null : popKey);
                                }
                              }}
                              className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 border cursor-pointer ${
                                currentFilter === 'done'
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                  : 'bg-emerald-50/80 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                              title="Công việc Hoàn thành (nhấp để mở danh sách công việc)"
                            >
                              ✅ Hoàn thành
                              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                                currentFilter === 'done' ? 'bg-white/20 text-white' : 'bg-emerald-200/60 text-emerald-800'
                              }`}>
                                {doneCount}
                              </span>
                              {doneCount > 0 && (
                                <ChevronDown className={`w-3 h-3 transition-transform ${openStatusPopoverKey === `${list.id}_${dept.id}_done` ? 'rotate-180' : ''}`} />
                              )}
                            </button>

                            {/* POPUP DROPDOWN MENU KHI NHẤP VÀO NÚT TRẠNG THÁI */}
                            {openStatusPopoverKey && openStatusPopoverKey.startsWith(`${list.id}_${dept.id}_`) && (() => {
                              const popType = openStatusPopoverKey.replace(`${list.id}_${dept.id}_`, '');
                              const popTasks = popType === 'all'
                                ? dept.items
                                : popType === 'done'
                                  ? dept.items.filter((i: any) => isTaskDone(i))
                                  : dept.items.filter((i: any) => !isTaskDone(i));

                              const titleText = popType === 'all' ? '📁 Tất cả công việc' : popType === 'done' ? '✅ Công việc hoàn thành' : '⚡ Công việc đang thực hiện';
                              const badgeColor = popType === 'all' ? 'bg-indigo-100 text-indigo-700' : popType === 'done' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700';

                              return (
                                <div className="absolute top-full right-0 mt-2 w-80 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl z-50 p-2.5 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
                                  <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-100 mb-1.5">
                                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                      {titleText}
                                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${badgeColor}`}>
                                        {popTasks.length}
                                      </span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenStatusPopoverKey(null);
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                      <XIcon className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                    {popTasks.length === 0 ? (
                                      <div className="p-3 text-center text-xs text-slate-400 italic">Không có công việc trong trạng thái này</div>
                                    ) : (
                                      popTasks.map((t: any) => {
                                        const isDone = isTaskDone(t);
                                        const statusLabel = isDone ? 'Hoàn thành' : t.status === 'review' ? 'Chờ duyệt' : t.status === 'in_progress' ? 'Đang làm' : 'Chưa làm';
                                        const statusStyle = isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : t.status === 'review' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200';

                                        return (
                                          <button
                                            key={t.id}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenStatusPopoverKey(null);
                                              setHighlightedTaskId(t.id);
                                              setTimeout(() => setHighlightedTaskId(null), 3000);
                                              const el = document.getElementById(`task-row-${t.id}`);
                                              if (el) {
                                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                              }
                                            }}
                                            className="w-full text-left p-2 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-between gap-2 group border border-transparent hover:border-slate-200 cursor-pointer"
                                          >
                                            <div className="min-w-0 flex-1">
                                              <div className={`text-xs font-semibold truncate group-hover:text-blue-600 ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                                {t.title || t.name}
                                              </div>
                                              {t.assignees && t.assignees.length > 0 && (
                                                <div className="text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                                                  <span>👤 {t.assignees.map((a: any) => a.full_name || a.name).join(', ')}</span>
                                                </div>
                                              )}
                                            </div>

                                            <div className="shrink-0 flex items-center gap-1.5">
                                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusStyle}`}>
                                                {statusLabel} ({t.progress || 0}%)
                                              </span>
                                              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        
                        {isDeptExpanded && (
                          <div className="border border-t-0 border-slate-200 rounded-b-xl overflow-hidden">
                            {(() => {
                              const currentFilter = deptFilters[`${list.id}_${dept.id}`] || 'active';
                              const getStatusPriority = (item: any) => {
                                // Ưu tiên: Chờ duyệt > Đang thực hiện > Chưa làm > Đã duyệt
                                if (item.status === 'review') return 1;
                                if (item.status === 'in_progress') return 2;
                                if (item.status === 'todo') return 3;
                                if (item.status === 'done' || item.is_completed) return 4;
                                return 3;
                              };
                              const sortedFilteredItems = [...dept.items]
                                .sort((a, b) => {
                                  const pA = getStatusPriority(a);
                                  const pB = getStatusPriority(b);
                                  if (pA !== pB) return pA - pB;
                                  return (a.sort_order || 0) - (b.sort_order || 0);
                                })
                                .filter((item: any) => {
                                  const isDone = isTaskDone(item);
                                  if (currentFilter === 'done') return isDone;
                                  if (currentFilter === 'all') return true;
                                  // Default 'active' (Đang thực hiện): Chưa làm + Đang làm + Chờ duyệt
                                  return !isDone;
                                });
                              
                              if (sortedFilteredItems.length === 0) {
                                return <div className="p-3 text-center text-xs text-slate-400 italic">Không có công việc</div>;
                              }

                              return (
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, list.id, dept.id)}>
                                  <SortableContext items={sortedFilteredItems.map((i:any) => i.id)} strategy={verticalListSortingStrategy}>
                                    <div className="flex flex-col">
                                      {sortedFilteredItems.map((item: any) => (
                                        <SortableChecklistItem 
                                          key={item.id} 
                                        item={item} 
                                  onStatusChange={updateStatus}
                                  onProgressChange={updateProgress}
                                  onDateChange={updateDate}
                                  onSubtaskChange={updateSubtask}
                                  onApproveAll={approveAllSubtasks}
                                  onEditClick={(item) => {
                                    setItemToEdit(item)
                                    setActiveChecklist(list.id)
                                    setShowItemDialog(true)
                                  }}
                                  highlightedTaskId={highlightedTaskId}
                                />
                              ))}
                                    </div>
                                  </SortableContext>
                                </DndContext>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {isExpanded && canCreateTask && (
                <div className="bg-slate-50 border-t border-slate-100 p-2 flex justify-end">
                  <button 
                    onClick={() => {
                      setActiveChecklist(list.id)
                      setItemToEdit(null)
                      setShowItemDialog(true)
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Thêm công việc cha
                  </button>
                </div>
              )}
              
              {isExpanded && items.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500">Chưa có công việc nào</div>
              )}
                    </div>
                  )}
                </SortableChecklistCard>
              )
            })}
            </div>
          </SortableContext>
        </DndContext>

        {canCreateTask && (
          <button 
            onClick={() => setShowCreateChecklist(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-blue-300 bg-blue-50/50 rounded-xl text-blue-600 text-xs font-bold hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-4 h-4" /> Thêm checklist mới
          </button>
        )}
      </div>
      
      <CreateChecklistDialog
        open={showCreateChecklist}
        onOpenChange={setShowCreateChecklist}
        projectId={projectId}
        onCreated={loadData}
      />

      {showItemDialog && (
        <ChecklistItemDialog 
          open={showItemDialog}
          onOpenChange={setShowItemDialog}
          checklistId={activeChecklist}
          itemToEdit={itemToEdit}
          staff={staff}
          taskTypes={taskTypes}
          projectId={apecProjectId ? String(apecProjectId) : projectId}
          organizationId={apecCompanyId ? String(apecCompanyId) : organizationId}
          onSaved={loadData}
        />
      )}

      <ImportProjectDataDialog 
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        projectId={projectId}
        organizationId={organizationId}
        onImported={loadData}
      />
    </div>
  )
}
