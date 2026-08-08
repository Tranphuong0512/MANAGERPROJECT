'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, User, FolderOpen, AlertTriangle, CheckCircle2, Clock, FileText, Send, Edit2, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { customAlert, customConfirm } from '@/utils/alert'

interface IncidentSlideOverProps {
  incident: any | null
  members?: any[]
  onClose: () => void
  canEdit?: boolean
}

export function IncidentSlideOver({ incident: initialIncident, members = [], onClose, canEdit = true }: IncidentSlideOverProps) {
  const [incident, setIncident] = useState(initialIncident)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: '',
    status: '',
    module: '',
    reported_by: '',
    assigned_to: ''
  })

  useEffect(() => {
    if (initialIncident) {
      setIncident(initialIncident)
      setFormData({
        title: initialIncident.title || '',
        description: initialIncident.description || '',
        severity: initialIncident.severity || 'medium',
        status: initialIncident.status || 'new',
        module: initialIncident.module || '',
        reported_by: initialIncident.reported_by || '',
        assigned_to: initialIncident.assigned_to || ''
      })
      setIsEditing(false)
    } else {
      setIncident(null)
    }
  }, [initialIncident])

  if (!incident) return null

  const getSeverityStyle = (s: string) => {
    if (s === 'critical') return 'text-red-700 bg-red-50 border-red-200'
    if (s === 'high') return 'text-orange-700 bg-orange-50 border-orange-200'
    if (s === 'medium') return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    return 'text-slate-600 bg-slate-50 border-slate-200'
  }

  const getSeverityText = (s: string) => {
    if (s === 'critical') return '🔴 Nghiêm trọng'
    if (s === 'high') return '🟠 Cao'
    if (s === 'medium') return '🟡 Trung bình'
    return '⚪ Thấp'
  }

  const getStatusStyle = (s: string) => {
    if (s === 'new') return 'text-red-600 bg-red-50'
    if (s === 'investigating') return 'text-orange-600 bg-orange-50'
    if (s === 'fixing') return 'text-blue-600 bg-blue-50'
    if (s === 'resolved') return 'text-green-600 bg-green-50'
    return 'text-slate-500 bg-slate-100'
  }

  const getStatusText = (s: string) => {
    if (s === 'new') return 'Mới phát sinh'
    if (s === 'investigating') return 'Đang điều tra'
    if (s === 'fixing') return 'Đang sửa'
    if (s === 'resolved') return 'Đã khắc phục'
    return 'Đã đóng'
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('incidents')
        .update({
          title: formData.title,
          description: formData.description,
          severity: formData.severity,
          status: formData.status,
          module: formData.module,
          reported_by: formData.reported_by || null,
          assigned_to: formData.assigned_to || null
        })
        .eq('id', incident.id)

      if (error) throw error

      try {
        await fetch('/api/v1/apec-global/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: String(incident.id).replace(/^apec_/, ''),
            title: formData.title,
            description: formData.description,
            status: formData.status,
            is_completed: formData.status === 'resolved' || formData.status === 'closed',
            process: (formData.status === 'resolved' || formData.status === 'closed') ? 100 : formData.status === 'in_progress' ? 50 : 0,
            progress: (formData.status === 'resolved' || formData.status === 'closed') ? 100 : formData.status === 'in_progress' ? 50 : 0
          })
        });
      } catch (apecErr) {
        console.warn('Lỗi đồng bộ sự cố lên APEC GLOBAL:', apecErr);
      }
      
      const newReporter = members.find(m => m.id === formData.reported_by)
      const newAssignee = members.find(m => m.id === formData.assigned_to)
      
      setIncident({ 
        ...incident, 
        ...formData,
        reporter: newReporter ? { full_name: newReporter.full_name } : incident.reporter,
        assignee: newAssignee ? { full_name: newAssignee.full_name } : incident.assignee
      })
      setIsEditing(false)
    } catch (err) {
      console.error(err)
      await customAlert('Có lỗi xảy ra khi lưu.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-slate-50 shadow-2xl z-50 flex flex-col border-l border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-slate-800">Chi tiết sự cố</h2>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && incident.status !== 'resolved' && incident.status !== 'closed' && (
              <>
                {isEditing ? (
                  <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Đang lưu...' : 'Lưu'}
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Sửa
                  </button>
                )}
              </>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{incident.code || `BUG-${incident.id.substring(0,4).toUpperCase()}`}</span>
              {!isEditing && (
                <>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityStyle(incident.severity)}`}>
                    {getSeverityText(incident.severity)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusStyle(incident.status)}`}>
                    {getStatusText(incident.status)}
                  </span>
                </>
              )}
            </div>
            
            {isEditing ? (
              <input 
                type="text" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full text-xl font-bold text-slate-900 leading-tight mb-4 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500" 
              />
            ) : (
              <h3 className="text-xl font-bold text-slate-900 leading-tight mb-4">{incident.title}</h3>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-4 text-[13px]">
                <div className="w-28 flex items-center gap-2 text-slate-500">
                  <FolderOpen className="w-4 h-4" />
                  <span className="font-medium">Dự án</span>
                </div>
                <span className="font-semibold text-slate-800 flex-1">{incident.projectName || incident.projects?.name || 'Nâng cấp App Mobile'}</span>
              </div>
              
              {isEditing && (
                <div className="flex items-center gap-4 text-[13px]">
                  <div className="w-28 flex items-center gap-2 text-slate-500">
                    <FolderOpen className="w-4 h-4" />
                    <span className="font-medium">Phân hệ</span>
                  </div>
                  <input 
                    type="text" 
                    value={formData.module} 
                    onChange={e => setFormData({...formData, module: e.target.value})}
                    className="flex-1 font-semibold text-slate-800 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500" 
                  />
                </div>
              )}
              {!isEditing && incident.module && (
                <div className="flex items-center gap-4 text-[13px]">
                  <div className="w-28 flex items-center gap-2 text-slate-500">
                    <FolderOpen className="w-4 h-4" />
                    <span className="font-medium">Phân hệ</span>
                  </div>
                  <span className="font-semibold text-slate-800 flex-1">{incident.module}</span>
                </div>
              )}

              {isEditing ? (
                <>
                  <div className="flex items-center gap-4 text-[13px]">
                    <div className="w-28 flex items-center gap-2 text-slate-500">
                      <User className="w-4 h-4" />
                      <span className="font-medium">Người ghi nhận</span>
                    </div>
                    <select 
                      value={formData.reported_by} 
                      onChange={e => setFormData({...formData, reported_by: e.target.value})}
                      className="flex-1 font-semibold text-slate-800 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                    >
                      <option value="">Chưa rõ</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-4 text-[13px]">
                    <div className="w-28 flex items-center gap-2 text-slate-500">
                      <User className="w-4 h-4 text-purple-500" />
                      <span className="font-medium">Người thực hiện</span>
                    </div>
                    <select 
                      value={formData.assigned_to} 
                      onChange={e => setFormData({...formData, assigned_to: e.target.value})}
                      className="flex-1 font-semibold text-slate-800 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                    >
                      <option value="">Chưa phân công</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4 text-[13px]">
                    <div className="w-28 flex items-center gap-2 text-slate-500">
                      <User className="w-4 h-4" />
                      <span className="font-medium">Người ghi nhận</span>
                    </div>
                    <span className="font-semibold text-slate-800 flex-1">{incident.reporter?.full_name || 'Chưa rõ'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[13px]">
                    <div className="w-28 flex items-center gap-2 text-slate-500">
                      <User className="w-4 h-4 text-purple-500" />
                      <span className="font-medium">Người thực hiện</span>
                    </div>
                    <span className="font-semibold text-slate-800 flex-1">{incident.assignee?.full_name || 'Chưa phân công'}</span>
                  </div>
                </>
              )}

              <div className="flex items-center gap-4 text-[13px]">
                <div className="w-28 flex items-center gap-2 text-slate-500">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Thời gian</span>
                </div>
                <span className="font-semibold text-slate-800 flex-1">{incident.created_at ? new Date(incident.created_at).toLocaleString('vi-VN') : ''}</span>
              </div>

              {isEditing && (
                <>
                  <div className="flex items-center gap-4 text-[13px]">
                    <div className="w-28 flex items-center gap-2 text-slate-500">
                      <span className="font-medium">Mức độ</span>
                    </div>
                    <select 
                      value={formData.severity} 
                      onChange={e => setFormData({...formData, severity: e.target.value})}
                      className="flex-1 font-semibold text-slate-800 border border-slate-200 rounded px-2 py-1 outline-none"
                    >
                      <option value="critical">Nghiêm trọng</option>
                      <option value="high">Cao</option>
                      <option value="medium">Trung bình</option>
                      <option value="low">Thấp</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4 text-[13px]">
                    <div className="w-28 flex items-center gap-2 text-slate-500">
                      <span className="font-medium">Trạng thái</span>
                    </div>
                    <select 
                      value={formData.status} 
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="flex-1 font-semibold text-slate-800 border border-slate-200 rounded px-2 py-1 outline-none"
                    >
                      <option value="new">Mới phát sinh</option>
                      <option value="investigating">Đang điều tra</option>
                      <option value="fixing">Đang sửa</option>
                      <option value="resolved">Đã khắc phục</option>
                      <option value="closed">Đã đóng</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-3">Mô tả chi tiết</h3>
            {isEditing ? (
              <textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full text-sm text-slate-800 border border-slate-200 rounded p-2 outline-none focus:border-blue-500 min-h-[100px]" 
              />
            ) : (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {incident.description || 'Chưa có mô tả chi tiết.'}
              </p>
            )}
          </div>

          {/* Timeline xử lý */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">Lịch sử xử lý</h3>
            
            <div className="space-y-4 relative">
              <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-100"></div>
              
              <div className="flex gap-3 relative">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 z-10 border-2 border-white">
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-slate-800">Sự cố được ghi nhận</span>
                    <span className="text-[10px] text-slate-400">18/07 09:30</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">bởi Trần Minh Quân</p>
                </div>
              </div>

              <div className="flex gap-3 relative">
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 z-10 border-2 border-white">
                  <Clock className="w-3 h-3 text-orange-600" />
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-slate-800">Bắt đầu điều tra</span>
                    <span className="text-[10px] text-slate-400">18/07 10:00</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">bởi Phạm Thu Hà — Xác định API VNPay bị timeout</p>
                </div>
              </div>

              <div className="flex gap-3 relative">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 z-10 border-2 border-white">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-blue-700">Đang chờ xử lý...</span>
                    <span className="text-[10px] text-slate-400">Hiện tại</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ảnh hưởng */}
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
            <h3 className="font-bold text-red-800 mb-2 text-sm">Mức độ ảnh hưởng</h3>
            <ul className="text-xs text-red-700 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>30% giao dịch thanh toán bị thất bại</li>
              <li>Ảnh hưởng trực tiếp đến doanh thu</li>
              <li>Trải nghiệm người dùng bị giảm sút</li>
              <li>Ước tính ~150 giao dịch/ngày bị ảnh hưởng</li>
            </ul>
          </div>

          {/* Tệp đính kèm */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 text-sm">Tệp đính kèm</h3>
              <span className="text-[11px] font-semibold text-blue-600 cursor-pointer">Thêm tệp</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-slate-800">error_log_20260718.txt</p>
                  <p className="text-[10px] text-slate-500">45 KB</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-slate-800">screenshot_error_500.png</p>
                  <p className="text-[10px] text-slate-500">890 KB</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ghi chú / Bình luận */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 text-sm">Ghi chú</h3>
            
            <div className="space-y-4 mb-4">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700 flex-shrink-0">TM</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-800">Trần Minh Quân</span>
                    <span className="text-[10px] text-slate-400">18/07 09:35</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl rounded-tl-none border border-slate-100">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Lỗi này xuất hiện sau khi deploy bản cập nhật v2.1.3 lúc 08:00. Có thể liên quan đến config timeout mới.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <input 
                type="text" 
                placeholder="Thêm ghi chú..." 
                className="w-full h-[42px] pl-4 pr-12 bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-xl text-sm outline-none transition-all"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Ghi chú khắc phục */}
          {(incident.status === 'resolved' || incident.status === 'closed') && (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-green-800 text-sm">Đã khắc phục</h3>
              </div>
              <p className="text-xs text-green-700 leading-relaxed">
                {incident.resolution_notes || 'Đã tăng timeout config lên 30s và thêm retry logic cho API VNPay. Triển khai hotfix v2.1.4 lúc 14:00 ngày 18/07.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
