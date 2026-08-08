'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, ComposedChart, Legend
} from 'recharts'

import { useOrganization } from '@/components/providers/organization-provider'

export default function ReportsPage() {
  const router = useRouter()
  const { activeOrganization, isLoading: isLoadingOrg } = useOrganization()
  const [isLoading, setIsLoading] = useState(true)
  const [incidents, setIncidents] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])

  useEffect(() => {
    if (isLoadingOrg) return

    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        
        if (activeOrganization) {
          const orgIds = [activeOrganization.id]
          
          const [incRes, prjRes] = await Promise.all([
            supabase.from('incidents').select('*, projects(name)').in('organization_id', orgIds).is('deleted_at', null),
            supabase.from('projects').select('*').in('organization_id', orgIds).is('deleted_at', null)
          ])

          setIncidents(incRes.data || [])
          setProjects(prjRes.data || [])
        } else {
          setIncidents([])
          setProjects([])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [router, activeOrganization, isLoadingOrg])

  // Compute severity data
  const severityPieData = [
    { name: 'Nghiêm trọng', value: incidents.filter(i => i.severity === 'critical').length, color: '#ef4444' },
    { name: 'Cao', value: incidents.filter(i => i.severity === 'high').length, color: '#f97316' },
    { name: 'Trung bình', value: incidents.filter(i => i.severity === 'medium').length, color: '#eab308' },
    { name: 'Thấp', value: incidents.filter(i => i.severity === 'low').length, color: '#94a3b8' },
  ].filter(s => s.value > 0)

  // Compute status data
  const statusPieData = [
    { name: 'Mới', value: incidents.filter(i => i.status === 'new').length, color: '#ef4444' },
    { name: 'Đang điều tra', value: incidents.filter(i => i.status === 'investigating').length, color: '#f97316' },
    { name: 'Đang sửa', value: incidents.filter(i => i.status === 'fixing').length, color: '#3b82f6' },
    { name: 'Đã khắc phục', value: incidents.filter(i => i.status === 'resolved').length, color: '#22c55e' },
    { name: 'Đã đóng', value: incidents.filter(i => i.status === 'closed').length, color: '#64748b' },
  ].filter(s => s.value > 0)

  const totalIncidents = incidents.length
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length
  const resolvedRate = totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 0
  const unresolvedIncidents = totalIncidents - resolvedIncidents

  // Project Summary
  const projectSummary = projects.map(p => {
    const pIncs = incidents.filter(i => i.project_id === p.id)
    const pTotal = pIncs.length
    const pResolved = pIncs.filter(i => i.status === 'resolved' || i.status === 'closed').length
    const pUnresolved = pTotal - pResolved
    let health = '🟢'
    if (pUnresolved >= 3) health = '🔴'
    else if (pUnresolved >= 1) health = '🟡'
    
    return {
      project: p.name,
      total: pTotal,
      resolved: pResolved,
      unresolved: pUnresolved,
      progress: p.progress_percentage || 0,
      health
    }
  }).sort((a, b) => b.unresolved - a.unresolved)

  const monthlyTrend = [
    { name: 'T1', reported: 0, resolved: 0, rate: 0 }
  ]
  
  const quarterlyData = [
    { name: 'Q1', total: totalIncidents, resolved: resolvedIncidents }
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg font-medium text-slate-600">Đang tải báo cáo...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-10 font-sans">
      <div className="flex flex-col gap-1 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Báo cáo tổng hợp</h1>
        <p className="text-sm text-slate-500">Thống kê tổng quan sự cố, tiến độ dự án và hiệu suất xử lý trên toàn hệ thống.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center">
          <p className="text-[13px] font-medium text-slate-500 mb-1">Tổng sự cố</p>
          <h2 className="text-3xl font-bold text-slate-800">{totalIncidents}</h2>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">Toàn thời gian</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center">
          <p className="text-[13px] font-medium text-slate-500 mb-1">Đã xử lý</p>
          <h2 className="text-3xl font-bold text-green-600">{resolvedIncidents}</h2>
          <p className="text-[11px] font-semibold text-green-500 mt-1">{resolvedRate}% tổng sự cố</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center">
          <p className="text-[13px] font-medium text-slate-500 mb-1">Chưa xử lý</p>
          <h2 className="text-3xl font-bold text-orange-500">{unresolvedIncidents}</h2>
          <p className="text-[11px] font-semibold text-orange-500 mt-1">Sự cố đang mở</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center">
          <p className="text-[13px] font-medium text-slate-500 mb-1">Tỷ lệ hoàn thành</p>
          <h2 className="text-3xl font-bold text-blue-600">{resolvedRate}%</h2>
          <p className="text-[11px] font-semibold text-blue-500 mt-1">Hiệu suất xử lý</p>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Xu hướng sự cố theo tháng */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-[380px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Xu hướng sự cố theo tháng</h3>
            <select className="px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none font-medium text-slate-600">
              <option>2026</option>
              <option>2025</option>
            </select>
          </div>

          <div className="flex items-center gap-4 mb-3 text-[11px] font-semibold text-slate-600 justify-center">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-400"></div> Phát sinh</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-500"></div> Đã xử lý</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-purple-500"></div> Tỷ lệ (%)</div>
          </div>

          <div className="flex-1 w-full relative -left-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                <Bar yAxisId="left" dataKey="reported" name="Phát sinh" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Bar yAxisId="left" dataKey="resolved" name="Đã xử lý" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="rate" name="Tỷ lệ xử lý" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 4, fill: '#a855f7', strokeWidth: 2, stroke: '#fff' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sự cố theo quý */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-[380px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Sự cố theo quý</h3>
          </div>

          <div className="flex items-center gap-4 mb-3 text-[11px] font-semibold text-slate-600 justify-center">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500"></div> Tổng sự cố</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-500"></div> Đã xử lý</div>
          </div>

          <div className="flex-1 w-full relative -left-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                <Bar dataKey="total" name="Tổng sự cố" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={25} />
                <Bar dataKey="resolved" name="Đã xử lý" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts row 2 - Pie charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Phân bố theo mức độ */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-[300px] flex flex-col">
          <h3 className="font-bold text-slate-800 mb-4">Phân bố theo mức độ nghiêm trọng</h3>
          <div className="flex-1 flex items-center justify-center gap-8">
            <div className="w-40 h-40 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={severityPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                    {severityPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-slate-800">57</span>
                <span className="text-[9px] font-semibold text-slate-500">Tổng</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {severityPieData.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-[12px] font-semibold text-slate-600 w-24">{item.name}</span>
                  <span className="text-[12px] font-bold text-slate-800">{item.value}</span>
                  <span className="text-[10px] text-slate-400">({Math.round((item.value / 57) * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Phân bố theo trạng thái */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-[300px] flex flex-col">
          <h3 className="font-bold text-slate-800 mb-4">Phân bố theo trạng thái</h3>
          <div className="flex-1 flex items-center justify-center gap-8">
            <div className="w-40 h-40 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                    {statusPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-slate-800">57</span>
                <span className="text-[9px] font-semibold text-slate-500">Tổng</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {statusPieData.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-[12px] font-semibold text-slate-600 w-24">{item.name}</span>
                  <span className="text-[12px] font-bold text-slate-800">{item.value}</span>
                  <span className="text-[10px] text-slate-400">({Math.round((item.value / 57) * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Bảng tổng hợp theo dự án</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3">Dự án</th>
                <th className="px-6 py-3 text-center">Tổng sự cố</th>
                <th className="px-6 py-3 text-center">Đã xử lý</th>
                <th className="px-6 py-3 text-center">Chưa xử lý</th>
                <th className="px-6 py-3 text-center">Tỷ lệ xử lý</th>
                <th className="px-6 py-3">Tiến độ dự án</th>
                <th className="px-6 py-3 text-center">Sức khỏe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {projectSummary.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3.5 font-bold text-slate-800">{row.project}</td>
                  <td className="px-6 py-3.5 text-center font-bold text-slate-700">{row.total}</td>
                  <td className="px-6 py-3.5 text-center font-bold text-green-600">{row.resolved}</td>
                  <td className="px-6 py-3.5 text-center font-bold text-red-600">{row.unresolved}</td>
                  <td className="px-6 py-3.5 text-center">
                    <span className={`font-bold ${row.total > 0 && Math.round((row.resolved / row.total) * 100) >= 80 ? 'text-green-600' : 'text-orange-600'}`}>
                      {row.total > 0 ? Math.round((row.resolved / row.total) * 100) : 0}%
                    </span>
                  </td>
                  <td className="px-6 py-3.5 w-36">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${row.progress}%` }}></div>
                      </div>
                      <span className="text-xs font-bold text-slate-600 w-8 text-right">{row.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-center text-lg">{row.health}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
