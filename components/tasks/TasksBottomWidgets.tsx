'use client'

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart
} from 'recharts'

export function TasksBottomWidgets() {
  const workloadData = [
    { name: 'Phạm Thu Hà', value: 18 },
    { name: 'Trần Minh Quân', value: 16 },
    { name: 'Nguyễn Thị Mai', value: 14 },
    { name: 'Lê Hoàng Nam', value: 13 },
    { name: 'Đặng Quốc Bảo', value: 12 },
  ]

  const trendData = [
    { name: 'Tuần 15\n(15/04)', new: 25, completed: 20, rate: 80 },
    { name: 'Tuần 16\n(22/04)', new: 30, completed: 28, rate: 93 },
    { name: 'Tuần 17\n(29/04)', new: 20, completed: 18, rate: 90 },
    { name: 'Tuần 18\n(06/05)', new: 35, completed: 30, rate: 85 },
    { name: 'Tuần 19\n(13/05)', new: 25, completed: 24, rate: 96 },
    { name: 'Tuần 20\n(20/05)', new: 40, completed: 32, rate: 80 },
    { name: 'Tuần 21\n(27/05)', new: 45, completed: 42, rate: 93 },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* Khối lượng công việc theo người */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-[350px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-slate-800">Khối lượng công việc theo người</h2>
          <select className="px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none font-medium text-slate-600">
            <option>Tất cả dự án</option>
          </select>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-4">
          {workloadData.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 flex-shrink-0">
                {item.name.charAt(0)}
              </div>
              <span className="text-[11px] font-semibold text-slate-700 w-[100px] truncate">{item.name}</span>
              <span className="text-[11px] font-bold text-slate-500 w-4 text-right">{item.value}</span>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-slate-300" style={{ width: '20%' }}></div>
                <div className="h-full bg-orange-400" style={{ width: '40%' }}></div>
                <div className="h-full bg-purple-500" style={{ width: '10%' }}></div>
                <div className="h-full bg-green-500" style={{ width: '30%' }}></div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-center gap-3 text-[10px] font-semibold text-slate-500">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-slate-300"></div> Cần làm</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-orange-400"></div> Đang thực hiện</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-purple-500"></div> Chờ duyệt</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-green-500"></div> Hoàn thành</div>
        </div>
      </div>

      {/* Xu hướng hoàn thành công việc */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-[350px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-slate-800">Xu hướng hoàn thành công việc</h2>
          <select className="px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none font-medium text-slate-600">
            <option>7 tuần qua</option>
          </select>
        </div>

        <div className="flex items-center gap-4 mb-4 text-[11px] font-semibold text-slate-600 justify-center">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-500"></div> Hoàn thành</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500"></div> Tạo mới</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-purple-500"></div> Hiệu suất (%)</div>
        </div>

        <div className="flex-1 w-full h-full relative -left-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar yAxisId="left" dataKey="completed" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={15} />
              <Bar yAxisId="left" dataKey="new" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={15} />
              <Line yAxisId="right" type="monotone" dataKey="rate" stroke="#a855f7" strokeWidth={2} dot={{ r: 3, fill: '#a855f7' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sắp đến hạn */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-[350px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-slate-800">Sắp đến hạn</h2>
          <span className="text-xs font-semibold text-blue-600 cursor-pointer">Xem tất cả</span>
        </div>

        <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
          {[
            { title: 'Tích hợp API thanh toán', project: 'Nâng cấp App Mobile', date: '28/05/2026', priority: 'Cao', pColor: 'text-red-500', iconBg: 'bg-indigo-100 text-indigo-600' },
            { title: 'Thiết kế UI trang chủ', project: 'Website Doanh nghiệp', date: '29/05/2026', priority: 'Trung bình', pColor: 'text-orange-500', iconBg: 'bg-purple-100 text-purple-600' },
            { title: 'Triển khai thông báo push', project: 'Nâng cấp App Mobile', date: '27/05/2026', priority: 'Trung bình', pColor: 'text-orange-500', iconBg: 'bg-blue-100 text-blue-600' },
            { title: 'Kiểm thử API báo cáo', project: 'Nâng cấp App Mobile', date: '28/05/2026', priority: 'Trung bình', pColor: 'text-orange-500', iconBg: 'bg-teal-100 text-teal-600' },
            { title: 'Tối ưu hiệu năng ứng dụng', project: 'Nâng cấp App Mobile', date: '31/05/2026', priority: 'Thấp', pColor: 'text-green-500', iconBg: 'bg-emerald-100 text-emerald-600' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[10px] ${item.iconBg}`}>
                D
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-slate-800 leading-tight">{item.title}</p>
                <p className="text-[10px] text-slate-500">{item.project}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-slate-700">{item.date}</p>
                <p className={`text-[10px] font-bold ${item.pColor}`}>{item.priority}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
