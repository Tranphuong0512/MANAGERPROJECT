'use client'

import Link from 'next/link'

export function ProjectProgress() {
  const projects = [
    { name: 'Nâng cấp App Mobile', w1: 'bg-green-500', w2: 'bg-green-500', w3: 'bg-slate-100', w4: 'bg-slate-100' },
    { name: 'Triển khai CRM', w1: 'bg-green-500', w2: 'bg-blue-500', w3: 'bg-blue-500', w4: 'bg-slate-100' },
    { name: 'Website Doanh Nghiệp', w1: 'bg-slate-100', w2: 'bg-slate-100', w3: 'bg-slate-100', w4: 'bg-slate-100' },
    { name: 'Hệ thống ERP', w1: 'bg-slate-100', w2: 'bg-slate-100', w3: 'bg-blue-500', w4: 'bg-blue-500' },
  ]

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-800">Tiến độ dự án (Gantt)</h2>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-green-500"></div> Hoàn thành</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-blue-500"></div> Đang thực hiện</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-slate-200"></div> Sắp tới</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="pb-4 text-sm font-semibold text-slate-500 w-[180px]">Dự án</th>
              <th className="pb-4 text-center">
                <div className="text-sm font-semibold text-slate-700">Tuần 1</div>
                <div className="text-[10px] font-medium text-slate-400 mt-0.5">(20/05 - 26/05)</div>
              </th>
              <th className="pb-4 text-center">
                <div className="text-sm font-semibold text-slate-700">Tuần 2</div>
                <div className="text-[10px] font-medium text-slate-400 mt-0.5">(27/05 - 02/06)</div>
              </th>
              <th className="pb-4 text-center">
                <div className="text-sm font-semibold text-slate-700">Tuần 3</div>
                <div className="text-[10px] font-medium text-slate-400 mt-0.5">(03/06 - 09/06)</div>
              </th>
              <th className="pb-4 text-center">
                <div className="text-sm font-semibold text-slate-700">Tuần 4</div>
                <div className="text-[10px] font-medium text-slate-400 mt-0.5">(10/06 - 16/06)</div>
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {projects.map((p, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="py-3 font-semibold text-slate-700">{p.name}</td>
                <td className="py-3 px-1"><div className={`h-4 rounded-full w-full ${p.w1}`}></div></td>
                <td className="py-3 px-1"><div className={`h-4 rounded-full w-full ${p.w2}`}></div></td>
                <td className="py-3 px-1"><div className={`h-4 rounded-full w-full ${p.w3}`}></div></td>
                <td className="py-3 px-1"><div className={`h-4 rounded-full w-full ${p.w4}`}></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Link href="/dashboard/projects" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Xem chi tiết tiến độ →
        </Link>
      </div>
    </div>
  )
}
