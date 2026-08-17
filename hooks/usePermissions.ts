'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useOrganization } from '@/components/providers/organization-provider'

type PermissionModule = 'projects' | 'tasks' | 'incidents' | 'improvements' | 'staff' | 'organization' | 'reports' | 'settings' | 'overview'
type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'import' | 'export' | 'download' | 'upload' | 'approve' | 'manage'
export type Permission = `${PermissionAction}_${PermissionModule}`

export function usePermissions() {
  const { activeOrganization, isSuperAdmin } = useOrganization()
  const [permissions, setPermissions] = useState<string[]>([])
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadPermissions = async () => {
      if (!activeOrganization) {
        setPermissions([])
        setRole(null)
        if (isMounted) setIsLoading(false)
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get user's role in the active organization
        const { data: memberData } = await supabase
          .from('organization_members')
          .select('role_id, user_roles(name)')
          .eq('organization_id', activeOrganization.id)
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .single()

        if (memberData && memberData.user_roles) {
          const roleName = Array.isArray((memberData as any).user_roles) ? (memberData as any).user_roles[0]?.name : (memberData as any).user_roles?.name
          setRole(roleName)
          
          // Get permissions for this role
          const { data: permData } = await supabase
            .from('role_permissions')
            .select('permissions(name)')
            .eq('role_id', memberData.role_id)

          if (permData) {
            const perms = permData.map((p: any) => p.permissions?.name).filter(Boolean)
            setPermissions(perms)
          }
        }
      } catch (err) {
        console.error('Error loading permissions:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    setIsLoading(true)
    loadPermissions()

    return () => {
      isMounted = false
    }
  }, [activeOrganization])

  const hasPermission = useCallback((permission: Permission) => {
    // Super admin and Owner always have all permissions
    if (isSuperAdmin || role === 'owner') return true

    // Fallback thông minh cho module Tổng quan (overview)
    if (permission === 'view_overview') {
      if (permissions.includes('view_overview')) return true
      if (!permissions.length || role) return true // Mặc định các role đều được xem tổng quan
    }

    if (permission === 'approve_overview') {
      if (permissions.includes('approve_overview')) return true
      if (role === 'manager' || role === 'team_lead') return true // Quản lý & Trưởng nhóm được duyệt
    }

    if (permission === 'export_overview') {
      if (permissions.includes('export_overview')) return true
      if (role === 'manager' || role === 'team_lead') return true
    }

    return permissions.includes(permission)
  }, [role, permissions, isSuperAdmin])

  return {
    permissions,
    role,
    hasPermission,
    isLoading,
    isOwner: isSuperAdmin || role === 'owner',
    isManager: role === 'manager',
    isTeamLead: role === 'team_lead',
  }
}
