'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Plus, User, CalendarDays, Bug, Lightbulb } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { CreateChecklistDialog } from './CreateChecklistDialog'
import { CreateChecklistItemDialog } from './CreateChecklistItemDialog'
import { getVietnamDateString } from '@/lib/utils'

interface ProjectChecklistAccordionProps {
  projectId: string
  organizationId: string
  onProgressChange?: (completed: number, total: number) => void
}

export function ProjectChecklistAccordion({ projectId, organizationId, onProgressChange }: ProjectChecklistAccordionProps) {
  const [checklists, setChecklists] = useState<any[]>([])
  const [expandedChecklist, setExpandedChecklist] = useState<string | null>(null)
  
  const [showCreateListDialog, setShowCreateListDialog] = useState(false)
  const [showCreateItemDialog, setShowCreateItemDialog] = useState(false)
  const [activeChecklistId, setActiveChecklistId] = useState<string>('')
  
  const [staff, setStaff] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const { data: listData, error } = await supabase
        .from('project_checklists')
        .select(`
          id, title, sort_order,
          checklist_items (
            id, title, is_completed, status, start_date, end_date, assigned_staff_id, sort_order,
            staff (full_name, departments (name))
          )
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })

      if (error) throw error

      let totalItems = 0
      let completedItems = 0

      if (listData) {
        for (const list of listData) {
          if (list.checklist_items) {
            list.checklist_items.sort((a: any, b: any) => a.sort_order - b.sort_order)
            
            for (const item of list.checklist_items) {
              totalItems++
              if (item.status === 'done' || item.is_completed) completedItems++

              const [{ count: incCount }, { count: impCount }] = await Promise.all([
                supabase
                  .from('incidents')
                  .select('*', { count: 'exact', head: true })
                  .eq('checklist_item_id', item.id)
                  .is('deleted_at', null),
                supabase
                  .from('improvements')
                  .select('*', { count: 'exact', head: true })
                  .eq('checklist_item_id', item.id)
                  .is('deleted_at', null)
              ])
              
              ;(item as any).incidentCount = incCount || 0
              ;(item as any).improvementCount = impCount || 0
            }
          }
        }
        setChecklists(listData)
        if (listData.length > 0 && !expandedChecklist) {
          setExpandedChecklist(listData[0].id)
        }
        if (onProgressChange) onProgressChange(completedItems, totalItems)
      }

      const { data: staffData } = await supabase
        .from('staff')
        .select('id, full_name, departments(name)')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('full_name')

      if (staffData) setStaff(staffData)

    } catch (err) {
      console.error('Error loading checklists:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId, organizationId])

  const updateItemStatus = async (item: any, newStatus: string) => {
    try {
      const isCompleted = newStatus === 'done'
      
      setChecklists(prev => {
        const newData = prev.map(list => {
          if (list.checklist_items.find((i: any) => i.id === item.id)) {
            return {
              ...list,
              checklist_items: list.checklist_items.map((i: any) => 
                i.id === item.id ? { ...i, status: newStatus, is_completed: isCompleted } : i
              )
            }
          }
          return list
        })
        
        // Recalculate progress
        if (onProgressChange) {
          let t = 0
          let c = 0
          newData.forEach(l => {
            if (l.checklist_items) {
              l.checklist_items.forEach((i: any) => {
                t++
                if (i.status === 'done' || i.is_completed) c++
              })
            }
          })
          onProgressChange(c, t)
        }
        
        return newData
      })

      await supabase
        .from('checklist_items')
        .update({ 
          status: newStatus,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', item.id)

      const cleanId = String(item.id).replace(/^apec_/, '');
      if (cleanId) {
        try {
          await fetch('/api/v1/apec-global/tasks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: cleanId,
              title: item.title || item.name || 'Công việc',
              name: item.title || item.name || 'Công việc',
              status: newStatus,
              is_completed: isCompleted,
              process: isCompleted ? 100 : newStatus === 'in_progress' ? 50 : 0,
              progress: isCompleted ? 100 : newStatus === 'in_progress' ? 50 : 0,
            }),
          });
        } catch (apecErr) {
          console.warn('Lỗi đồng bộ APEC GLOBAL (ProjectChecklistAccordion status):', apecErr);
        }
      }

    } catch (err) {
      console.error(err)
    }
  }

  const updateItemDate = async (item: any, field: 'start_date' | 'end_date', value: string) => {
    try {
      const dateValue = value ? new Date(value).toISOString() : null
      
      setChecklists(prev => prev.map(list => {
        if (list.checklist_items.find((i: any) => i.id === item.id)) {
          return {
            ...list,
            checklist_items: list.checklist_items.map((i: any) => 
              i.id === item.id ? { ...i, [field]: dateValue } : i
            )
          }
        }
        return list
      }))

      await supabase
        .from('checklist_items')
        .update({ [field]: dateValue })
        .eq('id', item.id)

    } catch (err) {
      console.error(err)
    }
  }

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'done': return 'text-green-700 bg-green-50 border-green-200'
      case 'in_progress': return 'text-blue-700 bg-blue-50 border-blue-200'
      case 'review': return 'text-purple-700 bg-purple-50 border-purple-200'
      default: return 'text-slate-600 bg-slate-100 border-slate-200' // todo
    }
  }

  const formatDateForInput = (isoString: string) => {
    if (!isoString) return ''
    return getVietnamDateString(isoString)
  }

  if (isLoading) {
    return <div className="p-4 text-center text-sm text-slate-500">Đang tải checklist...</div>
  }

  return (
    <div className="space-y-4">
      {checklists.map((list) => {
        const isExpanded = expandedChecklist === list.id
        const items = list.checklist_items || []
        const completedCount = items.filter((i: any) => i.status === 'done' || i.is_completed).length
        const totalItems = items.length

        return (
          <div key={list.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setExpandedChecklist(isExpanded ? null : list.id)}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                <h4 className="font-bold text-slate-800">{list.title}</h4>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ml-2">
                  {completedCount}/{totalItems}
                </span>
              </div>
              
              {totalItems > 0 && (
                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all" 
                    style={{ width: `${(completedCount / totalItems) * 100}%` }}
                  ></div>
                </div>
              )}
            </div>

            {isExpanded && (
              <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50">
                <div className="space-y-3 mt-3">
                  {items.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-2">Chưa có công việc nào</p>
                  ) : (
                    items.map((item: any) => (
                      <div key={item.id} className="flex flex-col gap-3 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition-colors group">
                        
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <span className={`text-sm font-semibold transition-colors ${item.status === 'done' || item.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              {item.title}
                            </span>
                          </div>
                          
                          <select
                            value={item.status || (item.is_completed ? 'done' : 'todo')}
                            onChange={(e) => updateItemStatus(item, e.target.value)}
                            className={`px-2 py-1 text-xs font-bold rounded-lg border cursor-pointer outline-none ${getStatusStyles(item.status || (item.is_completed ? 'done' : 'todo'))}`}
                          >
                            <option value="todo">Cần làm</option>
                            <option value="in_progress">Đang làm</option>
                            <option value="review">Chờ duyệt</option>
                            <option value="done">Hoàn thành</option>
                          </select>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-50">
                          
                          <div className="flex items-center gap-2 text-xs">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                            <div className="flex items-center gap-1">
                              <input 
                                type="date"
                                value={formatDateForInput(item.start_date || item.date_start || item.created_at)}
                                onChange={(e) => updateItemDate(item, 'start_date', e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 cursor-pointer focus:outline-none focus:border-blue-400"
                                title="Ngày bắt đầu"
                              />
                              <span className="text-slate-400">-</span>
                              <input 
                                type="date"
                                value={formatDateForInput(item.end_date || item.date_end || item.due_date || item.completed_date)}
                                onChange={(e) => updateItemDate(item, 'end_date', e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 cursor-pointer focus:outline-none focus:border-blue-400"
                                title="Ngày kết thúc / Hạn chót"
                              />
                            </div>
                          </div>

                          {item.staff ? (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-md text-xs font-medium text-slate-600 border border-slate-100">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate max-w-[120px]">{item.staff.full_name}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 rounded-md text-xs font-medium text-amber-700 border border-amber-100">
                              <User className="w-3.5 h-3.5 text-amber-500" />
                              <span>Chưa gán</span>
                            </div>
                          )}

                          {item.incidentCount > 0 && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded-md text-xs font-bold border border-red-100" title={`${item.incidentCount} sự cố liên quan`}>
                              <Bug className="w-3.5 h-3.5" />
                              {item.incidentCount} sự cố
                            </div>
                          )}
                          
                          {item.improvementCount > 0 && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-600 rounded-md text-xs font-bold border border-orange-100" title={`${item.improvementCount} cải tiến liên quan`}>
                              <Lightbulb className="w-3.5 h-3.5" />
                              {item.improvementCount} cải tiến
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  <button 
                    onClick={() => {
                      setActiveChecklistId(list.id)
                      setShowCreateItemDialog(true)
                    }}
                    className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 px-2 py-2 mt-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Thêm công việc
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      <button 
        onClick={() => setShowCreateListDialog(true)}
        className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-colors"
      >
        <Plus className="w-4 h-4" /> Thêm Checklist mới
      </button>

      <CreateChecklistDialog
        open={showCreateListDialog}
        onOpenChange={setShowCreateListDialog}
        projectId={projectId}
        onCreated={loadData}
      />

      <CreateChecklistItemDialog
        open={showCreateItemDialog}
        onOpenChange={setShowCreateItemDialog}
        checklistId={activeChecklistId}
        staff={staff}
        onCreated={loadData}
      />
    </div>
  )
}
