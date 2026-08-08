'use client'

import React, { useState } from 'react'
import { Printer, FileSpreadsheet, X, CheckSquare, Square, Filter } from 'lucide-react'

interface PrintReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  checklists: Array<{ id: string | number; title: string; count?: number }>
  onConfirmPrint: (selectedChecklistIds: (string | number)[], includeIncidents: boolean, includeImprovements: boolean, includeMembers: boolean) => void
  onConfirmExcel: (selectedChecklistIds: (string | number)[], includeIncidents: boolean, includeImprovements: boolean, includeMembers: boolean) => void
}

export function PrintReportModal({
  open,
  onOpenChange,
  checklists,
  onConfirmPrint,
  onConfirmExcel,
}: PrintReportModalProps) {
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>(checklists.map((c) => c.id))
  const [includeMembers, setIncludeMembers] = useState(true)
  const [includeIncidents, setIncludeIncidents] = useState(true)
  const [includeImprovements, setIncludeImprovements] = useState(true)

  if (!open) return null

  const isAllSelected = selectedIds.length === checklists.length && checklists.length > 0

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(checklists.map((c) => c.id))
    }
  }

  const toggleChecklist = (id: string | number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Filter className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Tùy Chọn In & Xuất Báo Cáo</h3>
              <p className="text-xs text-blue-200">Chọn danh mục công việc & nội dung cần xuất</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Section 1: Checklist Picker */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                📂 Chọn Danh Mục Công Việc (Checklist)
              </label>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
              >
                {isAllSelected ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> : <Square className="w-3.5 h-3.5" />}
                {isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>

            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50 max-h-48 overflow-y-auto">
              {checklists.length > 0 ? (
                checklists.map((c) => {
                  const isChecked = selectedIds.includes(c.id)
                  return (
                    <label
                      key={c.id}
                      onClick={() => toggleChecklist(c.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-blue-50/80 border-blue-200 text-blue-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm truncate">{c.title}</span>
                      </div>
                      {c.count !== undefined && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                          {c.count} việc
                        </span>
                      )}
                    </label>
                  )
                })
              ) : (
                <div className="text-xs text-slate-400 italic text-center py-4">Không có danh mục nào</div>
              )}
            </div>
          </div>

          {/* Section 2: Optional Reports */}
          <div>
            <label className="text-sm font-bold text-slate-800 block mb-3">
              📊 Mục Báo Cáo Bổ Sung
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                includeMembers ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-white border-slate-200 text-slate-600'
              }`}>
                <input
                  type="checkbox"
                  checked={includeMembers}
                  onChange={(e) => setIncludeMembers(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                />
                👥 Đội ngũ nhân sự
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                includeIncidents ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-white border-slate-200 text-slate-600'
              }`}>
                <input
                  type="checkbox"
                  checked={includeIncidents}
                  onChange={(e) => setIncludeIncidents(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300"
                />
                ⚠️ Báo cáo sự cố
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                includeImprovements ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-600'
              }`}>
                <input
                  type="checkbox"
                  checked={includeImprovements}
                  onChange={(e) => setIncludeImprovements(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                />
                💡 Sáng kiến cải tiến
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            Hủy
          </button>

          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => {
              onConfirmExcel(selectedIds, includeIncidents, includeImprovements, includeMembers)
              onOpenChange(false)
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Xuất Excel
          </button>

          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => {
              onConfirmPrint(selectedIds, includeIncidents, includeImprovements, includeMembers)
              onOpenChange(false)
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Xác Nhận In
          </button>
        </div>

      </div>
    </div>
  )
}
