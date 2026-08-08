'use client'

import { X, Mail, Phone, Calendar, Briefcase, FileText, CheckCircle2, UserCheck, Play } from 'lucide-react'

interface MemberSlideOverProps {
  member: any | null
  onClose: () => void
}

export function MemberSlideOver({ member, onClose }: MemberSlideOverProps) {
  if (!member) return null

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-slate-50 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out translate-x-0 border-l border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <h2 className="text-lg font-bold text-slate-800">Chi tiết nhân sự</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Info Header */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden shadow-sm border border-slate-200 flex-shrink-0">
                <img src={`https://i.pravatar.cc/150?img=10`} alt={member.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 pt-1">
                <h3 className="text-xl font-bold text-slate-900 leading-tight mb-1">{member.name || 'Phạm Thu Hà'}</h3>
                <p className="text-sm font-medium text-slate-500 mb-2">{member.code || 'NV-2023-001'}</p>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold text-green-600 bg-green-50 border border-green-100 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Đang làm việc
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-4 text-[13px]">
                <div className="w-32 flex items-center gap-2 text-slate-500">
                  <Briefcase className="w-4 h-4" />
                  <span className="font-medium">Phòng ban</span>
                </div>
                <span className="font-semibold text-slate-800 flex-1">{member.department || 'Nhân sự'}</span>
              </div>
              
              <div className="flex items-center gap-4 text-[13px]">
                <div className="w-32 flex items-center gap-2 text-slate-500">
                  <UserCheck className="w-4 h-4" />
                  <span className="font-medium">Chức vụ</span>
                </div>
                <span className="font-semibold text-slate-800 flex-1">{member.role || 'Chuyên viên tuyển dụng'}</span>
              </div>

              <div className="flex items-center gap-4 text-[13px]">
                <div className="w-32 flex items-center gap-2 text-slate-500">
                  <Mail className="w-4 h-4" />
                  <span className="font-medium">Email</span>
                </div>
                <span className="font-medium text-blue-600 flex-1">thaha@abc.vn</span>
              </div>

              <div className="flex items-center gap-4 text-[13px]">
                <div className="w-32 flex items-center gap-2 text-slate-500">
                  <Phone className="w-4 h-4" />
                  <span className="font-medium">Số điện thoại</span>
                </div>
                <span className="font-semibold text-slate-800 flex-1">0987 654 321</span>
              </div>

              <div className="flex items-center gap-4 text-[13px]">
                <div className="w-32 flex items-center gap-2 text-slate-500">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Ngày vào làm</span>
                </div>
                <span className="font-semibold text-slate-800 flex-1">15/03/2022 <span className="font-medium text-slate-400 text-[11px]">(2 năm 2 tháng)</span></span>
              </div>

              <div className="flex items-center gap-4 text-[13px]">
                <div className="w-32 flex items-center gap-2 text-slate-500">
                  <UserCheck className="w-4 h-4" />
                  <span className="font-medium">Quản lý trực tiếp</span>
                </div>
                <div className="flex items-center gap-1.5 flex-1">
                  <div className="w-5 h-5 rounded-full overflow-hidden">
                    <img src={`https://i.pravatar.cc/150?img=20`} alt="Manager" className="w-full h-full object-cover" />
                  </div>
                  <span className="font-semibold text-slate-800">{member.manager || 'Lê Hoàng Nam'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200 flex flex-col items-center justify-center">
              <span className="text-[10px] font-semibold text-slate-500 mb-1 leading-tight">Chấm công<br/>tháng này</span>
              <span className="text-xl font-bold text-blue-600">22<span className="text-xs font-semibold text-slate-400">/22</span></span>
              <span className="text-[9px] font-medium text-slate-400 mt-1">Ngày công</span>
            </div>
            
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200 flex flex-col items-center justify-center">
              <span className="text-[10px] font-semibold text-slate-500 mb-1 leading-tight">Ngày phép<br/>còn lại</span>
              <span className="text-xl font-bold text-blue-600">10</span>
              <span className="text-[9px] font-medium text-slate-400 mt-1">Ngày</span>
            </div>
            
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200 flex flex-col items-center justify-center">
              <span className="text-[10px] font-semibold text-slate-500 mb-1 leading-tight">Đánh giá KPI<br/>Q1/2024</span>
              <span className="text-xl font-bold text-green-500">A</span>
              <span className="text-[9px] font-medium text-slate-400 mt-1">Xuất sắc</span>
            </div>

            <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200 flex flex-col items-center justify-center">
              <span className="text-[9px] font-semibold text-slate-500 mb-1 leading-tight text-center">Tỷ lệ hoàn thành<br/>mục tiêu</span>
              <div className="w-10 h-10 rounded-full border-[3px] border-blue-100 relative flex items-center justify-center mt-1">
                <div className="absolute inset-0 rounded-full border-[3px] border-blue-600 border-r-transparent border-b-transparent -rotate-45"></div>
                <span className="text-[11px] font-bold text-blue-600">92%</span>
              </div>
            </div>
          </div>

          {/* Kỹ năng */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-3 text-sm">Kỹ năng</h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg">Recruitment</span>
              <span className="px-2.5 py-1 text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-100 rounded-lg">Training</span>
              <span className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg">Onboarding</span>
              <span className="px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-100 rounded-lg">Interview</span>
              <span className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg">HRIS</span>
            </div>
          </div>

          {/* Tài liệu */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm">Tài liệu</h3>
              <span className="text-[11px] font-semibold text-blue-600 cursor-pointer">Xem tất cả</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-red-50 text-red-500 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-700 group-hover:text-blue-600 transition-colors">Hợp đồng lao động.pdf</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400">PDF • 245 KB</span>
                  <span className="text-[10px] text-slate-400 font-medium">15/03/2022</span>
                </div>
              </div>

              <div className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-red-50 text-red-500 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-700 group-hover:text-blue-600 transition-colors">CV - Phạm Thu Hà.pdf</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400">PDF • 512 KB</span>
                  <span className="text-[10px] text-slate-400 font-medium">10/03/2022</span>
                </div>
              </div>

              <div className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-red-50 text-red-500 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-700 group-hover:text-blue-600 transition-colors">Đánh giá thử việc.pdf</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400">PDF • 198 KB</span>
                  <span className="text-[10px] text-slate-400 font-medium">15/06/2022</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hoạt động gần đây */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm">Hoạt động gần đây</h3>
              <span className="text-[11px] font-semibold text-blue-600 cursor-pointer">Xem tất cả</span>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                  <img src={`https://i.pravatar.cc/150?img=10`} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Cập nhật thông tin cá nhân
                  </p>
                  <p className="text-[10px] font-medium text-slate-400">bởi Phạm Thu Hà</p>
                </div>
                <span className="text-[9px] text-slate-400 font-medium">1 ngày trước</span>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                  <img src={`https://i.pravatar.cc/150?img=10`} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Nộp đơn xin nghỉ phép ngày 20/05
                  </p>
                  <p className="text-[10px] font-medium text-slate-400">bởi Phạm Thu Hà</p>
                </div>
                <span className="text-[9px] text-slate-400 font-medium">2 ngày trước</span>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                  <img src={`https://i.pravatar.cc/150?img=20`} alt="Manager" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Đánh giá KPI Q1/2024
                  </p>
                  <p className="text-[10px] font-medium text-slate-400">bởi Lê Hoàng Nam</p>
                </div>
                <span className="text-[9px] text-slate-400 font-medium">15/04/2024</span>
              </div>
            </div>
          </div>

          {/* Ghi chú */}
          <div className="bg-yellow-50 rounded-2xl p-5 shadow-sm border border-yellow-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-yellow-800 text-sm">Ghi chú</h3>
              <span className="text-[11px] font-semibold text-blue-600 cursor-pointer">Chỉnh sửa</span>
            </div>
            <p className="text-xs text-yellow-700 leading-relaxed italic">
              "Ứng viên tiềm năng cho vị trí Trưởng nhóm tuyển dụng."
            </p>
          </div>

        </div>
      </div>
    </>
  )
}
