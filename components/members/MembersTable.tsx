'use client'

import { Eye, Edit2, Trash2, Mail, MoreHorizontal } from 'lucide-react'

interface MembersTableProps {
  members: any[]
  onMemberClick: (member: any) => void
  onAssignEmailClick: (member: any) => void
  onDeleteClick: (id: string) => void
}

export function MembersTable({ members, onMemberClick, onAssignEmailClick, onDeleteClick }: MembersTableProps) {
  // Use dummy data to match exactly the design
  const displayMembers = [
    {
      id: 'm1', name: 'Phạm Thu Hà', code: 'NV-2023-001',
      department: 'Nhân sự', role: 'Chuyên viên tuyển dụng',
      manager: 'Lê Hoàng Nam', managerInitials: 'LH',
      status: 'active', shift: 'Hành chính',
      startDate: '15/03/2022', performance: 92
    },
    {
      id: 'm2', name: 'Nguyễn Văn Minh', code: 'NV-2022-015',
      department: 'IT', role: 'Lập trình viên',
      manager: 'Trần Minh Quân', managerInitials: 'TM',
      status: 'active', shift: 'Hành chính',
      startDate: '10/06/2022', performance: 88
    },
    {
      id: 'm3', name: 'Lê Hoàng Nam', code: 'NV-2021-008',
      department: 'Kinh doanh', role: 'Trưởng phòng KD',
      manager: 'Trần Minh Quân', managerInitials: 'TM',
      status: 'active', shift: 'Hành chính',
      startDate: '05/01/2021', performance: 95
    },
    {
      id: 'm4', name: 'Trần Minh Quân', code: 'NV-2020-002',
      department: 'IT', role: 'Trưởng phòng IT',
      manager: '-', managerInitials: '',
      status: 'remote', shift: 'Hành chính',
      startDate: '20/11/2020', performance: 91
    },
    {
      id: 'm5', name: 'Nguyễn Thị Mai', code: 'NV-2023-020',
      department: 'Marketing', role: 'Chuyên viên MKT',
      manager: 'Lê Hoàng Nam', managerInitials: 'LH',
      status: 'probation', shift: 'Hành chính',
      startDate: '12/04/2024', performance: 73
    },
    {
      id: 'm6', name: 'Lê Quang Huy', code: 'NV-2022-033',
      department: 'Kế toán', role: 'Kế toán viên',
      manager: 'Phạm Thu Hà', managerInitials: 'PT',
      status: 'leave', shift: 'Hành chính',
      startDate: '18/07/2022', performance: 84
    },
  ]

  const getStatusStyle = (s: string) => {
    if (s === 'active') return 'text-green-600 bg-green-50 border-green-100'
    if (s === 'remote') return 'text-purple-600 bg-purple-50 border-purple-100'
    if (s === 'probation') return 'text-orange-600 bg-orange-50 border-orange-100'
    if (s === 'leave') return 'text-red-600 bg-red-50 border-red-100'
    return 'text-slate-600 bg-slate-100 border-slate-200'
  }
  
  const getStatusText = (s: string) => {
    if (s === 'active') return 'Đang làm việc'
    if (s === 'remote') return 'Remote'
    if (s === 'probation') return 'Thử việc'
    if (s === 'leave') return 'Nghỉ phép'
    return 'Không rõ'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-4 w-12 text-center"><input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" /></th>
              <th className="px-6 py-4">Nhân viên</th>
              <th className="px-6 py-4">Phòng ban</th>
              <th className="px-6 py-4">Chức vụ</th>
              <th className="px-6 py-4">Quản lý</th>
              <th className="px-6 py-4 text-center">Trạng thái</th>
              <th className="px-6 py-4 text-center">Ca làm</th>
              <th className="px-6 py-4 text-center">Ngày vào làm</th>
              <th className="px-6 py-4">Hiệu suất</th>
              <th className="px-6 py-4 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {displayMembers.map((member: any, index) => (
              <tr 
                key={member.id} 
                className={`hover:bg-blue-50/50 transition-colors cursor-pointer group ${index === 0 ? 'bg-blue-50/30' : ''}`}
                onClick={() => onMemberClick(member)}
              >
                <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" defaultChecked={index === 0} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 text-slate-600 font-bold overflow-hidden shadow-sm border border-slate-200/50">
                      <img src={`https://i.pravatar.cc/150?img=${index + 10}`} alt={member.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{member.name}</div>
                      <div className="text-xs text-slate-500">{member.code}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-slate-700">{member.department}</td>
                <td className="px-6 py-4 font-medium text-slate-700">{member.role}</td>
                <td className="px-6 py-4">
                  {member.manager !== '-' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 overflow-hidden">
                        <img src={`https://i.pravatar.cc/150?img=${index + 20}`} alt={member.manager} className="w-full h-full object-cover" />
                      </div>
                      <span className="font-medium text-slate-700">{member.manager}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 font-medium">{member.manager}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusStyle(member.status)}`}>
                    {getStatusText(member.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-center text-slate-600 font-medium">
                  {member.shift}
                </td>
                <td className="px-6 py-4 text-center text-slate-600 font-medium">
                  {member.startDate}
                </td>
                <td className="px-6 py-4 w-32">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 w-8">{member.performance}%</span>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 flex-1">
                      <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${member.performance}%` }}></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
        <p className="text-sm text-slate-500">Hiển thị 1 đến {displayMembers.length} trong 248 dữ liệu</p>
        <div className="flex items-center gap-1">
          <button className="px-3 py-1 text-sm text-slate-400 border border-slate-200 rounded-lg hover:bg-slate-50">&lt;</button>
          <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg shadow-sm">1</button>
          <button className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">2</button>
          <button className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">3</button>
          <button className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">4</button>
          <button className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">5</button>
          <button className="px-3 py-1 text-sm text-slate-400 border border-slate-200 rounded-lg hover:bg-slate-50">&gt;</button>
        </div>
        <select className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 outline-none">
          <option>10 / trang</option>
        </select>
      </div>
    </div>
  )
}
