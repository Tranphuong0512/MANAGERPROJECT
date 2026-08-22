'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useOrganization } from '@/components/providers/organization-provider'
import { useRouter } from 'next/navigation'
import {
  UserCheck, UserX, Clock, CheckCircle2, XCircle,
  Shield, ChevronDown, Users, Building2, Loader2, Mail
} from 'lucide-react'

type ApprovalStatus = 'pending' | 'approved' | 'rejected'

interface PendingUser {
  id: string
  full_name: string | null
  avatar_url: string | null
  google_email: string | null
  google_avatar_url: string | null
  approval_status: string
  approved_by: string | null
  approved_at: string | null
  created_at: string
  is_super_admin: boolean
}

interface Role {
  id: string
  name: string
}

interface Organization {
  id: string
  name: string
}

export default function UserApprovalPage() {
  const router = useRouter()
  const { isSuperAdmin } = useOrganization()
  const [activeTab, setActiveTab] = useState<ApprovalStatus>('pending')
  const [users, setUsers] = useState<PendingUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [roles, setRoles] = useState<Role[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])

  // Approve dialog state
  const [approveDialogUser, setApproveDialogUser] = useState<PendingUser | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Counts
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 })

  // Redirect non-super-admin
  useEffect(() => {
    if (!isSuperAdmin && !isLoading) {
      router.push('/dashboard')
    }
  }, [isSuperAdmin, isLoading, router])

  // Load roles and organizations
  useEffect(() => {
    const loadMeta = async () => {
      const [rolesRes, orgsRes] = await Promise.all([
        supabase.from('user_roles').select('id, name').order('name'),
        supabase.from('organizations').select('id, name').is('deleted_at', null).order('name'),
      ])
      if (rolesRes.data) setRoles(rolesRes.data)
      if (orgsRes.data) {
        setOrganizations(orgsRes.data)
        // Default to first org (ApecGlobal)
        if (orgsRes.data.length > 0) setSelectedOrgId(orgsRes.data[0].id)
      }
      // Default role to 'member'
      const memberRole = rolesRes.data?.find((r: any) => r.name === 'member')
      if (memberRole) setSelectedRoleId(memberRole.id)
    }
    loadMeta()
  }, [])

  const fetchUsers = useCallback(async (status: ApprovalStatus) => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`/api/user-approval?status=${status}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      const json = await res.json()
      if (json.users) setUsers(json.users)
    } catch (err) {
      console.error('Fetch users error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch counts for all tabs
  const fetchCounts = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const statuses: ApprovalStatus[] = ['pending', 'approved', 'rejected']
    const results = await Promise.all(
      statuses.map(s =>
        fetch(`/api/user-approval?status=${s}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }).then(r => r.json())
      )
    )
    setCounts({
      pending: results[0]?.users?.length || 0,
      approved: results[1]?.users?.length || 0,
      rejected: results[2]?.users?.length || 0,
    })
  }, [])

  useEffect(() => {
    fetchUsers(activeTab)
    fetchCounts()
  }, [activeTab, fetchUsers, fetchCounts])

  const handleApprove = async () => {
    if (!approveDialogUser || !selectedRoleId || !selectedOrgId) return
    setIsSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/user-approval', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: approveDialogUser.id,
          action: 'approve',
          roleId: selectedRoleId,
          organizationId: selectedOrgId,
        }),
      })

      if (res.ok) {
        setApproveDialogUser(null)
        fetchUsers(activeTab)
        fetchCounts()
      }
    } catch (err) {
      console.error('Approve error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await fetch('/api/user-approval', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId, action: 'reject' }),
      })

      fetchUsers(activeTab)
      fetchCounts()
    } catch (err) {
      console.error('Reject error:', err)
    }
  }

  const tabs: { key: ApprovalStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'pending', label: 'Chờ duyệt', icon: <Clock className="w-4 h-4" />, color: 'amber' },
    { key: 'approved', label: 'Đã duyệt', icon: <CheckCircle2 className="w-4 h-4" />, color: 'emerald' },
    { key: 'rejected', label: 'Đã từ chối', icon: <XCircle className="w-4 h-4" />, color: 'red' },
  ]

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(new Date(dateStr))
    } catch { return dateStr }
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Chỉ Super Admin mới có quyền truy cập.</p>
      </div>
    )
  }

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Duyệt tài khoản Google</h1>
          <p className="text-sm text-slate-500">Quản lý yêu cầu truy cập từ các tài khoản Google đăng nhập</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                tab.key === 'pending' ? 'bg-amber-100 text-amber-700' :
                tab.key === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                'bg-red-100 text-red-700'
              }`}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* User List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Đang tải...
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Không có tài khoản nào ở trạng thái này</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              {/* Avatar */}
              {u.google_avatar_url || u.avatar_url ? (
                <img
                  src={u.google_avatar_url || u.avatar_url || ''}
                  alt=""
                  className="w-12 h-12 rounded-full border-2 border-slate-100 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {(u.full_name || u.google_email || '?').charAt(0).toUpperCase()}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {u.full_name || 'Chưa có tên'}
                  {u.is_super_admin && (
                    <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">SUPER ADMIN</span>
                  )}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3 shrink-0" />
                  {u.google_email || 'N/A'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Đăng ký: {formatDate(u.created_at)}
                  {u.approved_at && ` • Duyệt: ${formatDate(u.approved_at)}`}
                </p>
              </div>

              {/* Actions */}
              {activeTab === 'pending' && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setApproveDialogUser(u)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Duyệt
                  </button>
                  <button
                    onClick={() => handleReject(u.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition-colors border border-red-200"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    Từ chối
                  </button>
                </div>
              )}

              {activeTab === 'rejected' && (
                <button
                  onClick={() => setApproveDialogUser(u)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm shrink-0"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Duyệt lại
                </button>
              )}

              {activeTab === 'approved' && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                  ✓ Đã duyệt
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approve Dialog Modal */}
      {approveDialogUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Phê duyệt tài khoản</h2>
            <p className="text-sm text-slate-500 mb-6">
              Gán quyền và tổ chức cho <strong>{approveDialogUser.full_name || approveDialogUser.google_email}</strong>
            </p>

            {/* User preview */}
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl mb-5">
              {approveDialogUser.google_avatar_url ? (
                <img src={approveDialogUser.google_avatar_url} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  {(approveDialogUser.full_name || '?').charAt(0)}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-slate-900">{approveDialogUser.full_name || 'Chưa có tên'}</p>
                <p className="text-xs text-slate-500">{approveDialogUser.google_email}</p>
              </div>
            </div>

            {/* Role Select */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                <Users className="w-4 h-4 inline mr-1" />
                Vai trò
              </label>
              <div className="relative">
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Organization Select */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                <Building2 className="w-4 h-4 inline mr-1" />
                Tổ chức
              </label>
              <div className="relative">
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setApproveDialogUser(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleApprove}
                disabled={isSubmitting || !selectedRoleId || !selectedOrgId}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50 shadow-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
                {isSubmitting ? 'Đang duyệt...' : 'Xác nhận duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
