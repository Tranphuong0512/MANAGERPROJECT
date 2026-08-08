'use client'

import Link from 'next/link'
import { MessageSquare, CheckCircle2, FileText, UserPlus } from 'lucide-react'

export function TeamAndActivity() {
  const members = [
    { name: 'Nguyễn Văn An', role: 'Quản trị viên', status: 'Online', tasks: 12, isOnline: true },
    { name: 'Trần Minh Quân', role: 'Trưởng dự án', status: 'Online', tasks: 8, isOnline: true },
    { name: 'Phạm Thu Hà', role: 'Kỹ sư', status: 'Offline', tasks: 7, isOnline: false },
    { name: 'Lê Hoàng Nam', role: 'Thiết kế UI/UX', status: 'Offline', tasks: 6, isOnline: false },
    { name: 'Nguyễn Thị Mai', role: 'QA Engineer', status: 'Online', tasks: 5, isOnline: true },
  ]

  const activities = [
    { user: 'Nguyễn Văn An', action: 'đã cập nhật tiến độ dự án', target: 'Nâng cấp App Mobile', time: '2 phút trước', icon: FolderIcon, color: 'text-blue-500' },
    { user: 'Phạm Thu Hà', action: 'đã hoàn thành công việc', target: 'Phân tích yêu cầu', time: '15 phút trước', icon: CheckCircle2, color: 'text-green-500' },
    { user: 'Lê Hoàng Nam', action: 'đã bình luận trong', target: 'Review thiết kế UI/UX', time: '1 giờ trước', icon: MessageSquare, color: 'text-orange-500' },
    { user: 'Trần Minh Quân', action: 'đã tạo công việc mới', target: 'Thiết kế giao diện dashboard', time: '2 giờ trước', icon: FileText, color: 'text-purple-500' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Team Members */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800">Thành viên nhóm</h2>
          <Link href="/dashboard/members" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Xem tất cả
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="pb-3 text-sm font-semibold text-slate-500 w-[40%]">Thành viên</th>
                <th className="pb-3 text-sm font-semibold text-slate-500">Vai trò</th>
                <th className="pb-3 text-sm font-semibold text-slate-500">Trạng thái</th>
                <th className="pb-3 text-sm font-semibold text-slate-500 text-center">Công việc</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {members.map((m, i) => (
                <tr key={i} className="border-t border-slate-50">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{m.name}</p>
                        <p className="text-[11px] text-slate-500">@{m.name.split(' ').pop()?.toLowerCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-slate-600 font-medium">{m.role}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${m.isOnline ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                      <span className={`text-[13px] font-medium ${m.isOnline ? 'text-green-600' : 'text-slate-500'}`}>{m.status}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-bold text-slate-700">{m.tasks}</span>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(m.tasks / 15) * 100}%` }}></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800">Hoạt động gần đây</h2>
          <span className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer">
            Xem tất cả
          </span>
        </div>

        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
          {activities.map((a, i) => (
            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <a.icon className={`w-4 h-4 ${a.color}`} />
              </div>
              <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col items-start gap-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                    {a.user.charAt(0)}
                  </div>
                  <span className="text-[13px] font-semibold text-slate-800">{a.user}</span>
                </div>
                <p className="text-[13px] text-slate-600">
                  {a.action} <span className="font-semibold text-slate-800">{a.target}</span>
                </p>
                <time className="text-[11px] font-medium text-slate-400 mt-1">{a.time}</time>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FolderIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  )
}
