'use client'

import { X, Calendar, User, Flag, Tag, Paperclip, MessageSquare, Plus, Check, Send } from 'lucide-react'

interface TaskSlideOverProps {
  task: any | null
  onClose: () => void
}

export function TaskSlideOver({ task, onClose }: TaskSlideOverProps) {
  if (!task) return null

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-slate-50 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out translate-x-0 border-l border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <h2 className="text-lg font-bold text-slate-800">Chi tiết công việc</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight">{task.title}</h3>
            
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs font-semibold text-slate-500">ID: TASK-1024</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold text-red-600 bg-red-50 border border-red-100">C Cao</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100">Đang thực hiện</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-32 flex items-center gap-2 text-slate-500">
                  <FolderIcon className="w-4 h-4" />
                  <span className="text-xs font-medium">Dự án</span>
                </div>
                <span className="text-sm font-semibold text-slate-800 flex-1">{task.project || 'Nâng cấp App Mobile'}</span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-32 flex items-center gap-2 text-slate-500">
                  <User className="w-4 h-4" />
                  <span className="text-xs font-medium">Người phụ trách</span>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
                    {task.assigneeInitials || 'PT'}
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{task.assignee || 'Phạm Thu Hà'}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-32 flex items-center gap-2 text-slate-500">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium">Thời hạn</span>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm font-semibold text-slate-800">28/05/2024</span>
                  <span className="text-[11px] font-bold text-red-500">Còn 3 ngày</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-32 flex items-center gap-2 text-slate-500">
                  <Flag className="w-4 h-4" />
                  <span className="text-xs font-medium">Ưu tiên</span>
                </div>
                <span className="text-sm font-semibold text-slate-800 flex-1">Cao</span>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-32 flex items-center gap-2 text-slate-500 mt-1">
                  <Tag className="w-4 h-4" />
                  <span className="text-xs font-medium">Nhãn</span>
                </div>
                <div className="flex flex-wrap gap-2 flex-1">
                  <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-[11px] font-bold">Backend</span>
                  <span className="px-2 py-1 bg-teal-50 text-teal-600 rounded-md text-[11px] font-bold">API</span>
                  <button className="px-2 py-1 bg-slate-100 text-slate-400 hover:bg-slate-200 rounded-md text-[11px] font-bold">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">Tiến độ tổng thể</h3>
            <div className="flex items-center gap-4 mb-2">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '37%' }}></div>
              </div>
              <span className="text-sm font-bold text-slate-700 w-8 text-right">37%</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Checklist</h3>
              <span className="text-sm font-bold text-slate-500">3/8</span>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="w-5 h-5 rounded flex-shrink-0 bg-blue-500 flex items-center justify-center mt-0.5">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-500 line-through">Tạo endpoint thanh toán</span>
                </div>
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-700 flex-shrink-0">PT</div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="w-5 h-5 rounded flex-shrink-0 border-2 border-slate-300 mt-0.5 group-hover:border-blue-400 transition-colors"></div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-700">Xác thực và phân quyền API</span>
                </div>
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-700 flex-shrink-0">PT</div>
              </label>
              
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="w-5 h-5 rounded flex-shrink-0 border-2 border-slate-300 mt-0.5 group-hover:border-blue-400 transition-colors"></div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-700">Kết nối cổng thanh toán (VNPay)</span>
                </div>
                <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-[9px] font-bold text-orange-700 flex-shrink-0">TM</div>
              </label>

              <div className="text-xs font-semibold text-blue-600 cursor-pointer pt-2">+ Xem thêm 3 mục</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Tệp đính kèm</h3>
              <span className="text-sm font-bold text-slate-500">2</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                  <FileTextIcon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-slate-800">API_Integration_Spec.pdf</p>
                  <p className="text-[11px] text-slate-500">1.2 MB</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                <div className="w-10 h-10 rounded-lg bg-green-50 text-green-500 flex items-center justify-center">
                  <FileTextIcon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-slate-800">Payment_Flow_Diagram.png</p>
                  <p className="text-[11px] text-slate-500">890 KB</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">Bình luận</h3>
            
            <div className="space-y-4 mb-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 flex-shrink-0">
                  LH
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800">Lê Hoàng Nam</span>
                    <span className="text-[10px] text-slate-400">3 giờ trước</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl rounded-tl-none border border-slate-100">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Phần kết nối VNPay cần thêm config môi trường production nhé.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <input 
                type="text" 
                placeholder="Viết bình luận..." 
                className="w-full h-[42px] pl-4 pr-12 bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-xl text-sm outline-none transition-all"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

function FolderIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
  )
}

function FileTextIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
  )
}
