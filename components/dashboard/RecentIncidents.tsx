'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'

interface RecentIncidentsProps {
  incidents: any[]
}

export function RecentIncidents({ incidents }: RecentIncidentsProps) {
  const displayIncidents = incidents.slice(0, 8)

  const getSeverityStyle = (s: string) => {
    if (s === 'critical') return 'text-red-700 bg-red-50 border-red-200'
    if (s === 'high') return 'text-orange-700 bg-orange-50 border-orange-200'
    if (s === 'medium') return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    return 'text-slate-600 bg-slate-50 border-slate-200'
  }

  const getSeverityText = (s: string) => {
    if (s === 'critical') return 'Nghiêm trọng'
    if (s === 'high') return 'Cao'
    if (s === 'medium') return 'Trung bình'
    return 'Thấp'
  }

  const getStatusStyle = (s: string) => {
    if (s === 'new') return 'text-red-600 bg-red-50'
    if (s === 'investigating') return 'text-orange-600 bg-orange-50'
    if (s === 'fixing') return 'text-blue-600 bg-blue-50'
    if (s === 'resolved') return 'text-green-600 bg-green-50'
    return 'text-slate-500 bg-slate-100'
  }

  const getStatusText = (s: string) => {
    if (s === 'new') return 'Mới'
    if (s === 'investigating') return 'Đang điều tra'
    if (s === 'fixing') return 'Đang sửa'
    if (s === 'resolved') return 'Đã khắc phục'
    return 'Đã đóng'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h2 className="font-bold text-slate-800">Sự cố gần đây</h2>
        </div>
        <Link href="/dashboard/incidents" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
          Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-slate-100">
        {displayIncidents.map((inc: any, i: number) => (
          <div key={inc.id || i} className="px-6 py-3.5 hover:bg-slate-50/50 transition-colors cursor-pointer flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-[13px] font-bold text-slate-800 truncate">{inc.title}</h4>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {inc.projects?.name || inc.project || 'Dự án'} • {new Date(inc.created_at).toLocaleDateString('vi-VN')}
              </p>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 ${getSeverityStyle(inc.severity)}`}>
              {getSeverityText(inc.severity)}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${getStatusStyle(inc.status)}`}>
              {getStatusText(inc.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
