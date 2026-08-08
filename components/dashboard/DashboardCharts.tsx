'use client'

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

export function DashboardCharts() {
  const weeklyData = [
    { name: 'Tuần 1\n(29/04 - 05/05)', completed: 25, inProgress: 35, total: 60 },
    { name: 'Tuần 2\n(06/05 - 12/05)', completed: 60, inProgress: 30, total: 90 },
    { name: 'Tuần 3\n(13/05 - 19/05)', completed: 58, inProgress: 32, total: 90 },
    { name: 'Tuần 4\n(20/05 - 26/05)', completed: 72, inProgress: 38, total: 110 },
  ]

  const statusData = [
    { name: 'Cần làm', value: 14, color: '#94a3b8' },
    { name: 'Đang thực hiện', value: 15, color: '#3b82f6' },
    { name: 'Chờ duyệt', value: 9, color: '#f59e0b' },
    { name: 'Hoàn thành', value: 12, color: '#22c55e' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Weekly Progress Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-6">Tiến độ công việc theo tuần</h2>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                iconType="circle" 
                iconSize={8} 
              />
              <Bar dataKey="completed" name="Hoàn thành" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Bar dataKey="inProgress" name="Đang thực hiện" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Distribution Donut Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center">
        <div className="flex-1 w-full">
          <h2 className="text-lg font-bold text-slate-800 mb-2">Phân bổ trạng thái công việc</h2>
          
          <div className="flex flex-col md:flex-row items-center h-[220px]">
            <div className="w-full md:w-1/2 h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-sm font-semibold text-slate-500">Tổng</span>
                <span className="text-2xl font-bold text-slate-800">50</span>
              </div>
            </div>

            <div className="w-full md:w-1/2 flex flex-col justify-center gap-3 mt-4 md:mt-0 pl-0 md:pl-6">
              {statusData.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                    <span className="font-medium text-slate-700">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-500">
                    {Math.round((item.value / 50) * 100)}% <span className="text-slate-400 font-normal">({item.value})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
