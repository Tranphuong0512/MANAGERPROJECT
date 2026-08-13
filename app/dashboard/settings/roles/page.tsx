'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/hooks/usePermissions'
import { useOrganization } from '@/components/providers/organization-provider'
import { Check, Shield, Users, Save, X, Plus, ChevronDown, ChevronRight, Trash2, Code, Key, Copy, Terminal, Server, ExternalLink } from 'lucide-react'
import { customAlert, customConfirm } from '@/utils/alert'

export default function RolesSettingsPage() {
  const router = useRouter()
  const { isOwner, hasPermission, isLoading: isLoadingPerms } = usePermissions()
  const { activeOrganization } = useOrganization()
  
  const [activeTab, setActiveTab] = useState<'matrix' | 'accounts' | 'api'>('matrix')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handleCopy = (text: string, keyType: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(keyType)
    setTimeout(() => setCopiedKey(null), 2000)
  }
  const [roles, setRoles] = useState<any[]>([])
  
  // Matrix State
  const [activeRoleTab, setActiveRoleTab] = useState<string | null>(null)
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({})
  const [permissionsList, setPermissionsList] = useState<any[]>([])
  const [originalRolePermissions, setOriginalRolePermissions] = useState<any[]>([])
  const [rolePermissions, setRolePermissions] = useState<any[]>([])
  const [isSavingMatrix, setIsSavingMatrix] = useState(false)
  const [matrixHasChanges, setMatrixHasChanges] = useState(false)

  // Accounts State
  const [members, setMembers] = useState<any[]>([])
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(true)

  // Add Role State
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDesc, setNewRoleDesc] = useState('')
  const [isCreatingRole, setIsCreatingRole] = useState(false)

  // API Keys and Webhooks State
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [isApiLoading, setIsApiLoading] = useState(false)
  const [isAddApiKeyOpen, setIsAddApiKeyOpen] = useState(false)
  const [newApiKeyName, setNewApiKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  
  const [isAddWebhookOpen, setIsAddWebhookOpen] = useState(false)
  const [newWebhookUrl, setNewWebhookUrl] = useState('')

  const loadData = async () => {
    try {
      const orgId = activeOrganization?.id
      const [rolesRes, permsRes, rolePermsRes] = await Promise.all([
        orgId 
          ? supabase.from('user_roles').select('*').or(`organization_id.eq.${orgId},organization_id.is.null`).order('created_at')
          : supabase.from('user_roles').select('*').is('organization_id', null).order('created_at'),
        supabase.from('permissions').select('*').order('category'),
        supabase.from('role_permissions').select('*')
      ])

      if (rolesRes.data) {
        setRoles(rolesRes.data)
        if (!activeRoleTab && rolesRes.data.length > 0) {
          setActiveRoleTab(rolesRes.data[0].id)
        }
      }
      if (permsRes.data) setPermissionsList(permsRes.data)
      if (rolePermsRes.data) {
        setOriginalRolePermissions(rolePermsRes.data)
        setRolePermissions(rolePermsRes.data)
      }
    } catch (err) {
      console.error('Error loading roles data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isLoadingPerms) return
    if (!isOwner && !hasPermission('manage_roles' as any)) {
      router.push('/dashboard')
      return
    }
    loadData()
  }, [router, isOwner, hasPermission, isLoadingPerms, activeOrganization])

  useEffect(() => {
    const loadMembers = async () => {
      if (activeTab !== 'accounts') return
      
      try {
        let query = supabase
          .from('organization_members')
          .select('id, user_id, role_id, profiles(full_name, phone)')
          .is('deleted_at', null)
        
        if (activeOrganization?.id) {
          query = query.eq('organization_id', activeOrganization.id)
        }
        
        const { data } = await query
        if (data && data.length > 0) {
          setMembers(data)
        } else {
          const { data: { session } } = await supabase.auth.getSession()
          const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined
          const res = await fetch('/api/staff', { headers })
          if (res.ok) {
            const staffData = await res.json()
            if (staffData.accounts) {
              const mapped = staffData.accounts.map((a: any) => ({
                id: a.org_member_id || a.id,
                user_id: a.id,
                role_id: roles.find((r: any) => r.description === a.role || r.name === a.role)?.id || (roles.length > 3 ? roles[3].id : ''),
                profiles: {
                  full_name: a.full_name,
                  phone: a.phone
                }
              }))
              setMembers(mapped)
            }
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
    loadMembers()
  }, [activeOrganization, activeTab, roles])

  // --- MATRIX HANDLERS ---
  const handleTogglePermission = (roleId: string, permissionId: string) => {
    setRolePermissions(prev => {
      const exists = prev.some(rp => rp.role_id === roleId && rp.permission_id === permissionId)
      let next = []
      if (exists) {
        next = prev.filter(rp => !(rp.role_id === roleId && rp.permission_id === permissionId))
      } else {
        next = [...prev, { role_id: roleId, permission_id: permissionId }]
      }
      return next
    })
    setMatrixHasChanges(true)
  }

  const handleCancelMatrix = () => {
    setRolePermissions(originalRolePermissions)
    setMatrixHasChanges(false)
  }

  const handleSaveMatrix = async () => {
    setIsSavingMatrix(true)
    try {
      const toDelete = originalRolePermissions.filter(op => !rolePermissions.some(rp => rp.role_id === op.role_id && rp.permission_id === op.permission_id))
      const toInsert = rolePermissions.filter(rp => !originalRolePermissions.some(op => op.role_id === rp.role_id && op.permission_id === rp.permission_id))

      for (const item of toDelete) {
        await supabase.from('role_permissions').delete().match({ role_id: item.role_id, permission_id: item.permission_id })
      }
      if (toInsert.length > 0) {
        await supabase.from('role_permissions').insert(toInsert)
      }

      setOriginalRolePermissions(rolePermissions)
      setMatrixHasChanges(false)
      await customAlert('Lưu phân quyền thành công!')
    } catch (e) {
      console.error(e)
      await customAlert('Có lỗi xảy ra khi lưu.')
    } finally {
      setIsSavingMatrix(false)
    }
  }

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({ ...prev, [category]: !prev[category] }))
  }

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoleName.trim() || !newRoleDesc.trim() || !activeOrganization) return
    
    setIsCreatingRole(true)
    try {
      // Create slug-like name
      const roleNameSlug = newRoleName.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Date.now()
      
      const { data, error } = await supabase.from('user_roles').insert({
        name: roleNameSlug,
        description: newRoleDesc.trim(),
        organization_id: activeOrganization.id
      }).select().single()
      
      if (error) throw error
      
      if (data) {
        setRoles([...roles, data])
        setActiveRoleTab(data.id)
        setIsAddRoleOpen(false)
        setNewRoleName('')
        setNewRoleDesc('')
      }
    } catch (e: any) {
      console.error(e)
      await customAlert('Có lỗi khi tạo vai trò mới: ' + (e.message || ''))
    } finally {
      setIsCreatingRole(false)
    }
  }

  const handleDeleteRole = async (roleId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!(await customConfirm('Bạn có chắc chắn muốn xóa vai trò này? Tất cả người dùng đang có vai trò này sẽ bị ảnh hưởng.'))) return
    
    try {
      const { error } = await supabase.from('user_roles').delete().eq('id', roleId)
      if (error) throw error
      
      const newRoles = roles.filter(r => r.id !== roleId)
      setRoles(newRoles)
      if (activeRoleTab === roleId) {
        setActiveRoleTab(newRoles.length > 0 ? newRoles[0].id : null)
      }
    } catch (e: any) {
      console.error(e)
      await customAlert('Lỗi khi xóa vai trò: ' + (e.message || ''))
    }
  }

  // --- ACCOUNTS HANDLERS ---
  const handleChangeUserRole = async (memberId: string, newRoleId: string) => {
    setSavingMemberId(memberId)
    try {
      const targetRole = roles.find(r => r.id === newRoleId)
      const roleName = targetRole?.description || targetRole?.name || null

      await supabase
        .from('organization_members')
        .update({ role_id: newRoleId, job_title: roleName })
        .or(`id.eq.${memberId},user_id.eq.${memberId}`)
      
      setMembers(prev => prev.map(m => (m.id === memberId || m.user_id === memberId) ? { ...m, role_id: newRoleId } : m))
      await customAlert('Đổi vai trò thành công!')
    } catch (e) {
      console.error(e)
      await customAlert('Đổi vai trò thất bại.')
    } finally {
      setSavingMemberId(null)
    }
  }

  // --- API AND WEBHOOKS HANDLERS ---
  useEffect(() => {
    const loadApiData = async () => {
      if (!activeOrganization || activeTab !== 'api') return
      setIsApiLoading(true)
      try {
        const [keysRes, hooksRes] = await Promise.all([
          supabase.from('api_keys').select('*').eq('organization_id', activeOrganization.id).order('created_at', { ascending: false }),
          supabase.from('webhooks').select('*').eq('organization_id', activeOrganization.id).order('created_at', { ascending: false })
        ])
        if (keysRes.data) setApiKeys(keysRes.data)
        if (hooksRes.data) setWebhooks(hooksRes.data)
      } catch (e) {
        console.error(e)
      } finally {
        setIsApiLoading(false)
      }
    }
    loadApiData()
  }, [activeOrganization, activeTab])

  const generateApiKeyStr = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let token = 'sk_live_'
    for (let i = 0; i < 40; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return token
  }

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newApiKeyName.trim() || !activeOrganization) return
    const plainKey = generateApiKeyStr()
    try {
      const { data, error } = await supabase.from('api_keys').insert({
        organization_id: activeOrganization.id,
        name: newApiKeyName,
        key_hash: plainKey,
        is_active: true
      }).select().single()
      if (error) throw error
      setApiKeys([data, ...apiKeys])
      setGeneratedKey(plainKey)
      setNewApiKeyName('')
    } catch (e) {
      customAlert('Lỗi khi tạo API Key')
    }
  }

  const handleRevokeApiKey = async (id: string) => {
    if (!await customConfirm('Bạn có chắc chắn muốn thu hồi API Key này? Các ứng dụng đang dùng key này sẽ mất kết nối ngay lập tức.')) return
    try {
      await supabase.from('api_keys').delete().eq('id', id)
      setApiKeys(apiKeys.filter(k => k.id !== id))
    } catch (e) {
      customAlert('Lỗi khi xóa API Key')
    }
  }

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWebhookUrl.trim() || !activeOrganization) return
    try {
      const { data, error } = await supabase.from('webhooks').insert({
        organization_id: activeOrganization.id,
        url: newWebhookUrl,
        events: ['task.created', 'task.updated', 'project.created', 'project.updated'],
        is_active: true
      }).select().single()
      if (error) throw error
      setWebhooks([data, ...webhooks])
      setIsAddWebhookOpen(false)
      setNewWebhookUrl('')
    } catch (e) {
      customAlert('Lỗi khi cấu hình Webhook')
    }
  }
  
  const handleDeleteWebhook = async (id: string) => {
    if (!await customConfirm('Xóa Webhook này?')) return
    try {
      await supabase.from('webhooks').delete().eq('id', id)
      setWebhooks(webhooks.filter(w => w.id !== id))
    } catch (e) {
      customAlert('Lỗi khi xóa Webhook')
    }
  }

  if (isLoading || isLoadingPerms) {
    return <div className="text-center py-12 text-sm text-slate-500">Đang tải dữ liệu...</div>
  }

  const categories = Array.from(new Set(permissionsList.map(p => p.category)))
  const activeRoleObj = roles.find(r => r.id === activeRoleTab)
  const isOwnerRole = activeRoleObj?.name === 'owner'
  const isCustomRole = activeRoleObj?.organization_id !== null && activeRoleObj?.organization_id !== undefined

  const categoryTranslations: Record<string, string> = {
    'projects': 'Dự án',
    'project': 'Dự án',
    'tasks': 'Công việc',
    'task': 'Công việc',
    'incidents': 'Sự cố',
    'improvements': 'Cải tiến',
    'staff': 'Nhân sự',
    'organization': 'Tổ chức',
    'reports': 'Báo cáo',
    'reporting': 'Báo cáo',
    'settings': 'Hệ thống'
  }
  const actionTranslations: Record<string, string> = {
    'view': 'Xem',
    'create': 'Thêm mới',
    'edit': 'Chỉnh sửa',
    'delete': 'Xóa',
    'manage': 'Quản lý',
    'import': 'Nhập (Import)',
    'export': 'Xuất (Export)',
    'download': 'Tải xuống',
    'upload': 'Tải lên',
    'assign': 'Phân công'
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-100 rounded-md flex items-center justify-center text-indigo-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Quản lý Phân quyền</h1>
            <p className="text-xs text-slate-500">Cấu hình quyền hạn chi tiết và gán chức danh cho tài khoản</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'matrix' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          Vai trò & Phân quyền
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'accounts' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <Users className="w-4 h-4" />
          Gán tài khoản
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'api' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <Code className="w-4 h-4" />
          Kết nối API
        </button>
      </div>

      {activeTab === 'matrix' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* Roles Tabs */}
          <div className="flex flex-wrap gap-2 items-center border-b border-slate-200 pb-2">
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => setActiveRoleTab(role.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2
                  ${activeRoleTab === role.id ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-600 hover:bg-slate-50'}
                `}
              >
                {role.description}
                {activeRoleTab === role.id && role.organization_id && (
                  <Trash2 
                    onClick={(e) => handleDeleteRole(role.id, e)} 
                    className="w-3.5 h-3.5 text-slate-400 hover:text-red-500 ml-1 cursor-pointer" 
                  />
                )}
              </button>
            ))}
            <button
              onClick={() => setIsAddRoleOpen(true)}
              className="px-3 py-1.5 ml-2 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Thêm vai trò
            </button>
          </div>

          <div className="flex justify-between items-center h-8">
            <div className="text-sm text-slate-500">
              Cấu hình quyền cho: <span className="font-semibold text-slate-800">{activeRoleObj?.description}</span>
              {isOwnerRole && <span className="ml-2 text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">Toàn quyền (Không thể sửa)</span>}
            </div>
            {matrixHasChanges && (
              <div className="flex gap-2">
                <button onClick={handleCancelMatrix} className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center gap-1">
                  <X className="w-3 h-3" /> Hủy
                </button>
                <button onClick={handleSaveMatrix} disabled={isSavingMatrix} className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors flex items-center gap-1 disabled:opacity-50">
                  <Save className="w-3 h-3" /> {isSavingMatrix ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            )}
          </div>

          {/* Modules Accordion */}
          <div className="space-y-3">
            {categories.map(category => {
              const translatedCategory = categoryTranslations[category as string] || category
              const isOpen = openCategories[category] !== false // Default open
              const perms = permissionsList.filter(p => p.category === category)
              
              // Count how many perms are checked for this role
              const checkedCount = perms.filter(p => rolePermissions.some(rp => rp.role_id === activeRoleTab && rp.permission_id === p.id)).length

              return (
                <div key={category} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                  <button 
                    onClick={() => toggleCategory(category)}
                    className="w-full px-4 py-3 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between transition-colors border-b border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      <span className="font-semibold text-slate-800 uppercase text-xs tracking-wider">Module: {translatedCategory}</span>
                    </div>
                    <div className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {isOwnerRole ? `${perms.length}/${perms.length}` : `${checkedCount}/${perms.length}`}
                    </div>
                  </button>
                  
                  {isOpen && (
                    <div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {perms.map(permission => {
                        const action = permission.name.split('_')[0]
                        const displayActionName = actionTranslations[action] || action
                        const displayLabel = permission.description || displayActionName
                        const hasPerm = isOwnerRole || rolePermissions.some(rp => rp.role_id === activeRoleTab && rp.permission_id === permission.id)
                        
                        return (
                          <div 
                            key={permission.id} 
                            onClick={() => {
                              if (!isOwnerRole && activeRoleTab) {
                                handleTogglePermission(activeRoleTab, permission.id)
                              }
                            }}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                              !isOwnerRole ? 'cursor-pointer hover:border-indigo-300' : 'opacity-70'
                            } ${hasPerm ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 bg-white'}`}
                          >
                            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors ${
                                hasPerm 
                                  ? isOwnerRole ? 'bg-slate-300 text-white' : 'bg-indigo-600 text-white'
                                  : 'border border-slate-300 bg-white'
                              }`}
                            >
                              {hasPerm && <Check className="w-3 h-3" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-700 truncate" title={displayLabel}>
                                {displayActionName}
                              </div>
                              {permission.description && (
                                <div className="text-[10px] text-slate-400 truncate" title={permission.description}>
                                  {permission.description}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'accounts' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold text-slate-900">Nhân sự</th>
                  <th className="px-6 py-3 font-semibold text-slate-900">Vai trò</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-slate-500 text-sm">
                      Không có tài khoản nào
                    </td>
                  </tr>
                ) : (
                  members.map(member => (
                    <tr key={member.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <div className="font-medium text-slate-900">{member.profiles?.full_name || 'Chưa rõ'}</div>
                        {member.profiles?.phone && <div className="text-xs text-slate-500">{member.profiles.phone}</div>}
                      </td>
                      <td className="px-6 py-3">
                        <select
                          value={member.role_id}
                          disabled={savingMemberId === member.id}
                          onChange={(e) => handleChangeUserRole(member.id, e.target.value)}
                          className={`w-full max-w-[250px] text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${savingMemberId === member.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {roles.map(r => (
                            <option key={r.id} value={r.id}>{r.description}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* API Tab */}
      {activeTab === 'api' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                  <Key className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">Xác thực API (Authentication)</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Sử dụng các khóa này để xác thực các yêu cầu API từ ứng dụng bên thứ 3 của bạn. 
                  <strong className="text-red-500 font-medium block mt-2">Tuyệt đối không chia sẻ khóa bí mật ở client!</strong>
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1 block">Project URL (Base URL)</label>
                    <div className="flex relative">
                      <input type="text" readOnly value={process.env.NEXT_PUBLIC_SUPABASE_URL || 'Chưa cấu hình URL'} className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 pr-10 text-slate-600 font-mono" />
                      <button onClick={() => handleCopy(process.env.NEXT_PUBLIC_SUPABASE_URL || '', 'url')} className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600">
                        {copiedKey === 'url' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1 block">Anon Key (Public)</label>
                    <div className="flex relative">
                      <input type="password" readOnly value={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'Chưa cấu hình Key'} className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md py-2 px-3 pr-10 text-slate-600 font-mono" />
                      <button onClick={() => handleCopy(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', 'anon')} className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600">
                        {copiedKey === 'anon' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button onClick={() => { setIsAddApiKeyOpen(true); setGeneratedKey(null); }} className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2.5 rounded-md transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Tạo API Key tĩnh mới
                  </button>
                </div>
                
                {apiKeys.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <h4 className="text-xs font-semibold text-slate-800 mb-3">API Keys đang hoạt động</h4>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {apiKeys.map(key => (
                        <div key={key.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-lg group">
                          <div>
                            <div className="text-xs font-medium text-slate-700">{key.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">sk_live_...{key.key_hash?.slice(-6)}</div>
                          </div>
                          <button onClick={() => handleRevokeApiKey(key.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Thu hồi Key">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                  <Server className="w-4 h-4" /> Webhooks
                </h3>
                <p className="text-xs text-indigo-700 mb-4">
                  Đăng ký nhận thông báo real-time khi có sự thay đổi dữ liệu (tạo task mới, cập nhật dự án, v.v.).
                </p>
                <button onClick={() => setIsAddWebhookOpen(true)} className="text-xs font-medium text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-md transition-colors w-full text-center">
                  Cấu hình Webhooks
                </button>
                
                {webhooks.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {webhooks.map(wh => (
                      <div key={wh.id} className="bg-white p-2 rounded border border-indigo-100 text-xs flex justify-between items-center group">
                        <div className="truncate w-40 text-indigo-800" title={wh.url}>{wh.url}</div>
                        <button onClick={() => handleDeleteWebhook(wh.id)} className="text-indigo-200 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-0 shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-4 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-slate-500" /> Tài liệu Hướng dẫn API
                  </h3>
                  <a href="#" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    Xem Docs đầy đủ <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                
                <div className="p-5 space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-2">1. Xác thực (Authentication)</h4>
                    <p className="text-sm text-slate-600 mb-3">Tất cả các API requests đều yêu cầu 2 headers: <code>apikey</code> và <code>Authorization</code>.</p>
                    <div className="bg-slate-900 rounded-md p-4 text-xs font-mono text-green-400 overflow-x-auto">
                      <div>Headers: {'{'}</div>
                      <div className="pl-4 text-blue-300">"apikey": <span className="text-orange-300">"YOUR_ANON_KEY"</span>,</div>
                      <div className="pl-4 text-blue-300">"Authorization": <span className="text-orange-300">"Bearer YOUR_USER_JWT"</span></div>
                      <div>{'}'}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-2">2. Lấy danh sách Dự án (Projects)</h4>
                    <p className="text-sm text-slate-600 mb-3">Lấy tất cả các dự án mà tài khoản hiện tại có quyền truy cập.</p>
                    <div className="bg-slate-900 rounded-t-md p-2 px-4 border-b border-slate-700 flex items-center gap-3">
                      <span className="text-[10px] font-bold text-white bg-blue-500 px-2 py-0.5 rounded uppercase">GET</span>
                      <span className="text-xs text-slate-300 font-mono">/projects?select=*</span>
                    </div>
                    <div className="bg-slate-900 rounded-b-md p-4 text-xs font-mono text-slate-300 overflow-x-auto">
                      <div className="text-slate-500 mb-1">// cURL Example</div>
                      <div>curl -X GET 'https://your-project.supabase.co/rest/v1/projects?select=*' \</div>
                      <div className="pl-4">-H 'apikey: SUPABASE_KEY' \</div>
                      <div className="pl-4">-H 'Authorization: Bearer USER_TOKEN'</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-2">3. Lấy danh sách Công việc (Tasks)</h4>
                    <div className="bg-slate-900 rounded-t-md p-2 px-4 border-b border-slate-700 flex items-center gap-3">
                      <span className="text-[10px] font-bold text-white bg-blue-500 px-2 py-0.5 rounded uppercase">GET</span>
                      <span className="text-xs text-slate-300 font-mono">/tasks?project_id=eq.YOUR_PROJECT_ID</span>
                    </div>
                    <div className="bg-slate-900 rounded-b-md p-4 text-xs font-mono text-slate-300 overflow-x-auto">
                      <div className="text-slate-500 mb-1">// Node.js (fetch) Example</div>
                      <div>const response = await fetch('https://your-project.supabase.co/rest/v1/tasks?project_id=eq.123', {'{'}</div>
                      <div className="pl-4">headers: {'{'}</div>
                      <div className="pl-8">apikey: 'SUPABASE_KEY',</div>
                      <div className="pl-8">Authorization: 'Bearer USER_TOKEN'</div>
                      <div className="pl-4">{'}'}</div>
                      <div>{'}'});</div>
                      <div className="mt-2 text-green-400">const data = await response.json();</div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Role Modal */}
      {isAddRoleOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <form onSubmit={handleCreateRole}>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Thêm vai trò mới</h3>
                <button type="button" onClick={() => setIsAddRoleOpen(false)} className="text-slate-400 hover:text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mã vai trò (Nội bộ)</label>
                  <input
                    type="text"
                    required
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    placeholder="VD: ke_toan"
                    className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Hệ thống sẽ tự động thêm hậu tố để tránh trùng lặp.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tên hiển thị (Tiếng Việt)</label>
                  <input
                    type="text"
                    required
                    value={newRoleDesc}
                    onChange={e => setNewRoleDesc(e.target.value)}
                    placeholder="VD: Kế toán trưởng"
                    className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAddRoleOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                  Hủy
                </button>
                <button type="submit" disabled={isCreatingRole} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
                  {isCreatingRole ? 'Đang tạo...' : 'Tạo vai trò'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {isAddApiKeyOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {!generatedKey ? (
              <form onSubmit={handleCreateApiKey}>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Tạo API Key tĩnh</h3>
                  <button type="button" onClick={() => setIsAddApiKeyOpen(false)} className="text-slate-400 hover:text-slate-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tên khóa (Gợi nhớ)</label>
                    <input
                      type="text"
                      required
                      value={newApiKeyName}
                      onChange={e => setNewApiKeyName(e.target.value)}
                      placeholder="VD: App Mobile, Zapier Integration..."
                      className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="bg-orange-50 text-orange-800 text-xs p-3 rounded flex gap-2">
                    <Shield className="w-4 h-4 shrink-0 text-orange-500" />
                    <span>API Key này sẽ cấp quyền truy cập toàn diện theo Tổ chức. Vui lòng bảo mật kỹ.</span>
                  </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsAddApiKeyOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Hủy</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Tạo Key</button>
                </div>
              </form>
            ) : (
              <div>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-green-600 flex items-center gap-2"><Check className="w-5 h-5" /> Tạo thành công</h3>
                  <button type="button" onClick={() => { setIsAddApiKeyOpen(false); setGeneratedKey(null); }} className="text-slate-400 hover:text-slate-500"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-sm text-slate-600">Đây là API Key của bạn. <strong className="text-red-500">Nó sẽ chỉ hiển thị duy nhất một lần này.</strong> Hãy copy và lưu trữ ở nơi an toàn.</p>
                  <div className="flex relative">
                    <input type="text" readOnly value={generatedKey} className="w-full text-sm bg-slate-50 border border-slate-300 rounded-md py-3 px-3 pr-10 text-slate-900 font-mono" />
                    <button onClick={() => handleCopy(generatedKey, 'newKey')} className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 bg-slate-100 p-1 rounded">
                      {copiedKey === 'newKey' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <button type="button" onClick={() => { setIsAddApiKeyOpen(false); setGeneratedKey(null); }} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800">Tôi đã copy an toàn</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Webhook Modal */}
      {isAddWebhookOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <form onSubmit={handleCreateWebhook}>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Cấu hình Endpoint Webhook</h3>
                <button type="button" onClick={() => setIsAddWebhookOpen(false)} className="text-slate-400 hover:text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payload URL</label>
                  <input
                    type="url"
                    required
                    value={newWebhookUrl}
                    onChange={e => setNewWebhookUrl(e.target.value)}
                    placeholder="https://example.com/api/webhook"
                    className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-2">Hệ thống sẽ gửi phương thức POST với content-type là application/json đến URL này mỗi khi có sự kiện thay đổi dữ liệu.</p>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAddWebhookOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Hủy</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Lưu cấu hình</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

