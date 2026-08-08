'use client'

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, ComposedChart
} from 'recharts'

import { useMemo, useState } from 'react'

export function IncidentsBottomWidgets({ incidents = [] }: { incidents?: any[] }) {
  const [timeRange, setTimeRange] = useState('week')

  const weeklyData = useMemo(() => {
    const days = [
      { name: 'CN', critical: 0, high: 0, medium: 0, low: 0 },
      { name: 'T2', critical: 0, high: 0, medium: 0, low: 0 },
      { name: 'T3', critical: 0, high: 0, medium: 0, low: 0 },
      { name: 'T4', critical: 0, high: 0, medium: 0, low: 0 },
      { name: 'T5', critical: 0, high: 0, medium: 0, low: 0 },
      { name: 'T6', critical: 0, high: 0, medium: 0, low: 0 },
      { name: 'T7', critical: 0, high: 0, medium: 0, low: 0 },
    ];

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    incidents.forEach(inc => {
      const created = new Date(inc.created_at);
      
      // Filter by range
      if (timeRange === 'week' && created < startOfWeek) return;
      if (timeRange === 'month' && created < startOfMonth) return;
      
      const dayIdx = created.getDay();
      const sev = inc.severity || 'low';
      if ((days[dayIdx] as any)[sev] !== undefined) {
        (days[dayIdx] as any)[sev] += 1;
      }
    });

    // Reorder to T2 -> CN
    return [
      days[1], days[2], days[3], days[4], days[5], days[6], days[0]
    ];
  }, [incidents, timeRange]);

  const resolutionTimeData = useMemo(() => {
    const data = {
      critical: { count: 0, totalHours: 0, name: 'Nghiêm trọng', target: 2 },
      high: { count: 0, totalHours: 0, name: 'Cao', target: 8 },
      medium: { count: 0, totalHours: 0, name: 'Trung bình', target: 24 },
      low: { count: 0, totalHours: 0, name: 'Thấp', target: 72 },
    };

    incidents.forEach(inc => {
      if (inc.status === 'resolved' || inc.status === 'closed') {
        const created = new Date(inc.created_at);
        const resolved = inc.resolved_at ? new Date(inc.resolved_at) : new Date(inc.updated_at);
        const hours = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
        
        const sev = inc.severity || 'low';
        if (data[sev as keyof typeof data]) {
          data[sev as keyof typeof data].count += 1;
          data[sev as keyof typeof data].totalHours += hours;
        }
      }
    });

    return [
      { ...data.critical, avg: data.critical.count ? Number((data.critical.totalHours / data.critical.count).toFixed(1)) : 0 },
      { ...data.high, avg: data.high.count ? Number((data.high.totalHours / data.high.count).toFixed(1)) : 0 },
      { ...data.medium, avg: data.medium.count ? Number((data.medium.totalHours / data.medium.count).toFixed(1)) : 0 },
      { ...data.low, avg: data.low.count ? Number((data.low.totalHours / data.low.count).toFixed(1)) : 0 },
    ];
  }, [incidents]);

  const topProjectsData = useMemo(() => {
    const projectsMap = new Map();

    incidents.forEach(inc => {
      if (!inc.project_id) return;
      
      const projectName = inc.projects?.name || `Project ${inc.project_id.substring(0, 4)}`;
      
      if (!projectsMap.has(inc.project_id)) {
        projectsMap.set(inc.project_id, { name: projectName, total: 0, resolved: 0 });
      }
      
      const p = projectsMap.get(inc.project_id);
      p.total += 1;
      if (inc.status === 'resolved' || inc.status === 'closed') {
        p.resolved += 1;
      }
    });

    return Array.from(projectsMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [incidents]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* Sự cố theo ngày trong tuần */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-[350px]">
        <div className="flex items-center justify-between mb-4">
          <select 
            className="px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none font-medium text-slate-600"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="all">Tất cả</option>
          </select>
        </div>

        <div className="flex items-center gap-3 mb-3 text-[10px] font-semibold text-slate-600 justify-center">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-red-500"></div> Nghiêm trọng</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-orange-400"></div> Cao</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-yellow-400"></div> Trung bình</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-slate-300"></div> Thấp</div>
        </div>

        <div className="flex-1 w-full relative -left-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
              <Bar dataKey="critical" name="Nghiêm trọng" stackId="a" fill="#ef4444" radius={[0,0,0,0]} maxBarSize={25} />
              <Bar dataKey="high" name="Cao" stackId="a" fill="#f97316" maxBarSize={25} />
              <Bar dataKey="medium" name="Trung bình" stackId="a" fill="#eab308" maxBarSize={25} />
              <Bar dataKey="low" name="Thấp" stackId="a" fill="#cbd5e1" radius={[4,4,0,0]} maxBarSize={25} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Thời gian xử lý trung bình */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-[350px]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-slate-800">Thời gian xử lý trung bình</h3>
        </div>

        <div className="flex-1 flex flex-col gap-6 justify-center">
          {resolutionTimeData.map((item, i) => {
            const colors = ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-slate-400']
            const isOverTarget = item.avg > item.target
            
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${colors[i]}`}></div>
                    <span className="text-[12px] font-semibold text-slate-700">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[12px] font-bold ${isOverTarget ? 'text-red-600' : 'text-green-600'}`}>
                      {item.avg}h
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Mục tiêu: {item.target}h
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${isOverTarget ? 'bg-red-400' : 'bg-green-400'}`} 
                    style={{ width: `${Math.min((item.avg / item.target) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top dự án có nhiều sự cố */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-[350px]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-slate-800">Top dự án có sự cố</h3>
        </div>

        <div className="flex-1 flex flex-col gap-5 justify-center">
          {topProjectsData.length > 0 ? topProjectsData.map((item, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 w-4">{i + 1}</span>
                  <span className="text-[12px] font-semibold text-slate-700">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-slate-700">{item.total}</span>
                  <span className="text-[10px] text-slate-400">sự cố</span>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-green-400 rounded-l-full" 
                  style={{ width: `${(item.resolved / item.total) * 100}%` }}
                ></div>
                <div 
                  className="h-full bg-red-400 rounded-r-full" 
                  style={{ width: `${((item.total - item.resolved) / item.total) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                <span>Đã xử lý: {item.resolved}</span>
                <span>Chưa xử lý: {item.total - item.resolved}</span>
              </div>
            </div>
          )) : (
            <div className="text-center text-sm text-slate-500 py-8">Chưa có dữ liệu dự án</div>
          )}
        </div>
      </div>
    </div>
  )
}
