'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  Search,
  RefreshCw,
  Building2,
  FolderOpen,
  Users,
  CheckSquare,
  Check,
  AlertCircle,
  Globe,
  Database,
  Loader2,
  Eye,
  Info,
  ListChecks,
  Layers,
  Play,
  CheckCircle2,
  ShieldCheck,
  History,
} from 'lucide-react'
import { useOrganization } from '@/components/providers/organization-provider'

interface ApecGlobalSyncDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type TabType = 'companies' | 'departments' | 'projects' | 'employees' | 'task-types' | 'tasks'

export function ApecGlobalSyncDialog({ open, onOpenChange }: ApecGlobalSyncDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>('companies')
  const [searchQuery, setSearchQuery] = useState('')
  const [idQuery, setIdQuery] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [detailItem, setDetailItem] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResults, setSyncResults] = useState<{
    created: number
    updated: number
    skipped: number
    errors: number
    logs: string[]
  } | null>(null)
  const [projectsList, setProjectsList] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  const { activeOrganization, organizations } = useOrganization()

  useEffect(() => {
    if (open && activeOrganization?.id) {
      fetch(`/api/v1/projects?organization_id=${activeOrganization.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setProjectsList(data)
            if (data.length > 0 && !selectedProjectId) {
              setSelectedProjectId(data[0].id)
            }
          }
        })
        .catch(() => {})
    }
  }, [open, activeOrganization])

  // Fetch from our local proxy API route which calls APEC GLOBAL
  const fetchApecData = async () => {
    setIsLoading(true)
    setError(null)
    setStatusMsg(null)
    setDetailItem(null)

    try {
      const secretKey = localStorage.getItem('nix_apec_global_secret_key') || ''
      if (!secretKey) {
        throw new Error('X-Secret-Key chưa được cấu hình! Vui lòng vào Cài đặt để nhập thủ công X-Secret-Key nhằm đảm bảo bảo mật tuyệt đối.')
      }

      const url = new URL(
        `${window.location.origin}/api/v1/apec-global/${activeTab}`
      )
      if (searchQuery.trim()) {
        url.searchParams.set('search', searchQuery.trim())
      }
      if (idQuery.trim()) {
        url.searchParams.set('id', idQuery.trim())
      }

      const res = await fetch(url.toString(), {
        headers: {
          'x-secret-key': secretKey,
        },
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(
          data.error || `Không thể truy xuất dữ liệu từ APEC GLOBAL (${res.status})`
        )
      }

      setItems(data.items || [])
      if (data.detail) {
        setDetailItem(data.detail)
      } else if (idQuery.trim() && data.items?.length === 1) {
        setDetailItem(data.items[0])
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi gọi API APEC GLOBAL')
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchApecData()
    }
  }, [open, activeTab])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchApecData()
  }



  const handleSyncItem = async (item: any) => {
    try {
      let typeStr = ''
      if (activeTab === 'companies') typeStr = 'company'
      else if (activeTab === 'departments') typeStr = 'department'
      else if (activeTab === 'projects') typeStr = 'project'
      else if (activeTab === 'employees') typeStr = 'employee'
      else if (activeTab === 'task-types') typeStr = 'task_type'
      else if (activeTab === 'tasks') typeStr = 'task'

      const res = await fetch('/api/v1/apec-global/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: typeStr,
          item,
          organization_id: activeOrganization?.id,
          project_id: selectedProjectId || undefined,
        }),
      })
      const data = await res.json()
      return data
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const handleSyncAll = async () => {
    if (items.length === 0) return
    setIsSyncing(true)
    setSyncResults(null)
    const stats = { created: 0, updated: 0, skipped: 0, errors: 0, logs: [] as string[] }

    for (const item of items) {
      const res = await handleSyncItem(item)
      if (res.success) {
        if (res.action === 'created' || res.action === 'created_task' || res.action === 'created_checklist') {
          stats.created++
        } else if (res.action === 'updated') {
          stats.updated++
        } else {
          stats.skipped++
        }
        stats.logs.push(`✔ ${res.message || 'Đồng bộ thành công'}`)
      } else {
        stats.errors++
        stats.logs.push(`✖ Lỗi: ${res.error || 'Thất bại'}`)
      }
    }

    setSyncResults(stats)
    setIsSyncing(false)
  }

  if (!open) return null

  const tabs = [
    {
      id: 'companies' as TabType,
      label: 'Công ty',
      icon: Building2,
      desc: '/api/v1/external/companies',
    },
    {
      id: 'departments' as TabType,
      label: 'Phòng ban',
      icon: Layers,
      desc: '/api/v1/external/departments',
    },
    {
      id: 'projects' as TabType,
      label: 'Dự án',
      icon: FolderOpen,
      desc: '/api/v1/external/projects',
    },
    {
      id: 'employees' as TabType,
      label: 'Nhân sự',
      icon: Users,
      desc: '/api/v1/external/employees',
    },
    {
      id: 'task-types' as TabType,
      label: 'Checklist (Loại việc)',
      icon: ListChecks,
      desc: '/api/v1/external/tasks/types',
    },
    {
      id: 'tasks' as TabType,
      label: 'Công việc',
      icon: CheckSquare,
      desc: '/api/v1/external/tasks',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <Globe className="w-5 h-5 text-blue-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">
                  Cổng kết nối API APEC GLOBAL
                </h2>
                <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/30 font-medium">
                  api.apecglobal.net
                </span>
              </div>
              <p className="text-xs text-blue-200/80">
                Truy vấn dữ liệu gốc từ APEC GLOBAL (chỉ đọc)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-2 gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setSearchQuery('')
                  setIdQuery('')
                }}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-t-xl text-sm font-semibold transition-all relative ${
                  isActive
                    ? 'bg-white text-blue-700 shadow-sm border-t-2 border-t-blue-600 border-x border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 flex-1 min-w-[300px]"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm đối tượng (query: search)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div className="w-44">
              <input
                type="text"
                placeholder="ID chi tiết (query: id)"
                value={idQuery}
                onChange={(e) => setIdQuery(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>Truy vấn</span>
            </button>
          </form>

          {/* Project selector cho các tab Checklist hoặc Task */}
          {(activeTab === 'task-types' || activeTab === 'tasks') && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Đồng bộ vào Dự án:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn Dự án --</option>
                {projectsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code || p.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Chế độ đồng bộ chuẩn với Kiểm soát Race Condition & Audit Log */}
          <div className="flex items-center gap-2 bg-blue-50/80 border border-blue-200 px-3 py-1.5 rounded-xl text-xs">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-blue-800">Bảo vệ Tranh chấp (Race Condition) & Ghi nhật ký Audit Log</span>
          </div>

          {items.length > 0 && (
            <button
              onClick={handleSyncAll}
              disabled={isSyncing || ((activeTab === 'task-types' || activeTab === 'tasks') && !selectedProjectId)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>Đồng bộ toàn bộ trang vào CSDL ({items.length})</span>
            </button>
          )}
        </div>

        {/* Sync Status Banner */}
        {syncResults && (
          <div className="mx-6 mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Hoàn tất đồng bộ toàn bộ vào CSDL & lưu Audit Log</span>
              </div>
              <div className="flex gap-3 font-semibold">
                <span className="text-emerald-700">Tạo mới: {syncResults.created}</span>
                <span className="text-blue-700">Cập nhật: {syncResults.updated}</span>
                <span className="text-amber-700">Bỏ qua (bảo vệ mới hơn): {syncResults.skipped}</span>
                {syncResults.errors > 0 && (
                  <span className="text-red-700">Lỗi: {syncResults.errors}</span>
                )}
              </div>
            </div>
            {syncResults.logs.length > 0 && (
              <div className="max-h-24 overflow-y-auto bg-white/80 p-2 rounded-lg border border-emerald-100 space-y-1 text-slate-700 font-mono">
                {syncResults.logs.slice(0, 10).map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <div className="flex-1">
              <span className="font-semibold">Lỗi truy vấn: </span>
              {error}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 text-xs font-semibold"
            >
              Đóng
            </button>
          </div>
        )}

        {statusMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm">
            <Check className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <div className="flex-1 font-medium">{statusMsg}</div>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
              <p className="text-sm font-medium">
                Đang kết nối tới https://api.apecglobal.net...
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Đang tải {tabs.find((t) => t.id === activeTab)?.label}
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-700">
                Chưa có dữ liệu từ APEC GLOBAL
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                Vui lòng kiểm tra lại kết nối API, hoặc thử thay đổi từ khóa
                tìm kiếm và nhấn "Truy vấn".
              </p>
              <button
                onClick={fetchApecData}
                className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-all inline-flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại ngay</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>
                  Tìm thấy{' '}
                  <strong className="text-slate-900">{items.length}</strong>{' '}
                  đối tượng từ endpoint{' '}
                  <code className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                    {tabs.find((t) => t.id === activeTab)?.desc}
                  </code>
                </span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
                  Kết nối X-Secret-Key hợp lệ
                </span>
              </div>

              {/* Data Cards / Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item, idx) => {
                  const itemId = item.id || item.code || idx
                  const nameStr =
                    item.name ||
                    item.company_name ||
                    item.project_name ||
                    item.fullname ||
                    item.title ||
                    `Đối tượng ${itemId}`
                  const codeStr = item.code || item.tax_code || `ID: ${itemId}`

                  return (
                    <div
                      key={itemId}
                      className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all p-4 flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                              {codeStr}
                            </span>
                            <h4 className="text-base font-bold text-slate-900 mt-1.5 group-hover:text-blue-700 transition-colors">
                              {nameStr}
                            </h4>
                          </div>
                          {item.status !== undefined && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                item.status == 1 || item.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {item.status == 1 || item.status === 'active'
                                ? 'Hoạt động'
                                : String(item.status)}
                            </span>
                          )}
                        </div>

                        {/* Extra metadata preview */}
                        <div className="text-xs text-slate-500 space-y-1 mt-2 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                          {item.address && (
                            <div>
                              <strong className="text-slate-700">Địa chỉ:</strong>{' '}
                              {item.address}
                            </div>
                          )}
                          {item.phone && (
                            <div>
                              <strong className="text-slate-700">Điện thoại:</strong>{' '}
                              {item.phone}
                            </div>
                          )}
                          {item.email && (
                            <div>
                              <strong className="text-slate-700">Email:</strong>{' '}
                              {item.email}
                            </div>
                          )}
                          {item.position && (
                            <div>
                              <strong className="text-slate-700">Chức vụ:</strong>{' '}
                              {item.position}
                            </div>
                          )}
                          {item.department_name && (
                            <div>
                              <strong className="text-slate-700">Phòng ban:</strong>{' '}
                              {item.department_name}
                            </div>
                          )}
                          {item.start_date && (
                            <div>
                              <strong className="text-slate-700">Bắt đầu:</strong>{' '}
                              {item.start_date}
                            </div>
                          )}
                          {item.description && (
                            <div className="line-clamp-2">
                              <strong className="text-slate-700">Mô tả:</strong>{' '}
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons: Xem chi tiết & Đồng bộ vào CSDL */}
                      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setIdQuery(String(itemId))
                            fetchApecData()
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem chi tiết</span>
                        </button>

                        <button
                          onClick={async () => {
                            const res = await handleSyncItem(item)
                            if (res.success) {
                              setStatusMsg(`✔ ${res.message || 'Đồng bộ thành công vào CSDL'}`)
                            } else {
                              setError(`✖ Lỗi đồng bộ: ${res.error}`)
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <Database className="w-3.5 h-3.5" />
                          <span>Đồng bộ vào CSDL</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            <span>
              Header bảo mật{' '}
              <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-800">
                X-Secret-Key
              </code>{' '}
              được cấu hình chuẩn APEC GLOBAL.
            </span>
          </div>

          <button
            onClick={() => onOpenChange(false)}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors text-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
