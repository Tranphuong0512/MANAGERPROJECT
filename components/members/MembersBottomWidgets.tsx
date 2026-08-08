'use client'

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, PieChart, Pie, Cell, Legend
} from 'recharts'

export function MembersBottomWidgets() {
  const attendanceData = [
    { name: 'Kế toán', rate: 93 },
    { name: 'Nhân sự', rate: 90 },
    { name: 'Marketing', rate: 88 },
    { name: 'Kinh doanh', rate: 92 },
    { name: 'IT', rate: 95 },
  ]

  const recruitData = [
    { name: 'T12/23', new: 10, success: 8, rate: 80 },
    { name: 'T01/24', new: 22, success: 15, rate: 85 },
    { name: 'T02/24', new: 18, success: 12, rate: 92 },
    { name: 'T03/24', new: 12, success: 9, rate: 90 },
    { name: 'T05/24', new: 20, success: 16, rate: 88 },
  ]

  const structureData = [
    { name: 'IT', value: 70, color: '#3b82f6' },
    { name: 'Kinh doanh', value: 65, color: '#22c55e' },
    { name: 'Marketing', value: 40, color: '#f59e0b' },
    { name: 'Nhân sự', value: 35, color: '#ef4444' },
    { name: 'Kế toán', value: 25, color: '#8b5cf6' },
    { name: 'Khác', value: 13, color: '#64748b' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
      
      {/* Chấm công theo phòng ban */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-[350px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-slate-800">Chấm công theo phòng ban</h2>
          <select className="px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none font-medium text-slate-600">
            <option>Tháng này</option>
          </select>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-5">
          {attendanceData.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[11px] font-semibold text-slate-600 w-16 text-right truncate">{item.name}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${item.rate}%` }}></div>
              </div>
              <span className="text-[11px] font-bold text-slate-700 w-8">{item.rate}%</span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-center gap-3 text-[10px] font-semibold text-slate-500">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-blue-600"></div> Tỷ lệ chấm công</div>
        </div>
      </div>

      {/* Xu hướng tuyển dụng */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-[350px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-slate-800">Xu hướng tuyển dụng</h2>
          <select className="px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none font-medium text-slate-600">
            <option>6 tháng qua</option>
          </select>
        </div>

        <div className="flex-1 w-full h-full relative -left-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={recruitData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar yAxisId="left" dataKey="new" name="Tuyển mới" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={15} />
              <Line yAxisId="left" type="monotone" dataKey="success" name="Tuyển thành công" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} />
              <Line yAxisId="right" type="monotone" dataKey="rate" name="Tỷ lệ thành công" stroke="#a855f7" strokeWidth={2} dot={{ r: 3, fill: '#a855f7' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 flex items-center justify-center gap-4 text-[10px] font-semibold text-slate-500">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500"></div> Tuyển mới</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-0.5 bg-green-500"></div> Tuyển thành công</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-0.5 bg-purple-500"></div> Tỷ lệ thành công</div>
        </div>
      </div>

      {/* Lịch nghỉ phép */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-[350px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800">Lịch nghỉ phép trong tuần</h2>
        </div>

        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
          {[
            { date: '20/05', day: 'T2', name: 'Phạm Thu Hà', note: 'Nghỉ phép năm', img: 10 },
            { date: '21/05', day: 'T3', name: 'Lê Quang Huy', note: 'Nghỉ phép năm', img: 15 },
            { date: '22/05', day: 'T4', name: 'Nguyễn Thị Mai', note: 'Nghỉ ốm', img: 12 },
            { date: '23/05', day: 'T5', name: 'Trần Văn Bảo', note: 'Nghỉ phép năm', img: 18 },
            { date: '24/05', day: 'T6', name: 'Không có', note: '', img: null },
          ].map((item, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center w-8 flex-shrink-0">
                <span className={`text-[10px] font-bold ${item.img ? 'text-blue-600' : 'text-slate-400'}`}>{item.day}</span>
                <span className="text-[11px] font-semibold text-slate-700">{item.date}</span>
              </div>
              
              {item.img ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-slate-200">
                    <img src={`https://i.pravatar.cc/150?img=${item.img}`} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-800 leading-tight">{item.name}</p>
                    <p className="text-[10px] text-slate-500">{item.note}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center h-8 text-[11px] font-medium text-slate-400">
                  - Không có
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Cơ cấu nhân sự */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-[350px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800">Cơ cấu nhân sự</h2>
          <select className="px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none font-medium text-slate-600">
            <option>Hiện tại</option>
          </select>
        </div>

        <div className="flex-1 flex items-center justify-center relative">
          <div className="w-36 h-36 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={structureData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {structureData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-slate-800">248</span>
              <span className="text-[10px] font-semibold text-slate-500">Nhân sự</span>
            </div>
          </div>
          
          <div className="flex flex-col justify-center gap-2 pl-4">
            {structureData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] w-24">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="font-semibold text-slate-600">{item.name}</span>
                </div>
                <span className="font-bold text-slate-400">
                  {Math.round((item.value / 248) * 100)}% <span className="font-normal text-[10px]">({item.value})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
