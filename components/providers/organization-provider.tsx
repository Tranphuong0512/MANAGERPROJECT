'use client'

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Organization {
  id: string
  name: string
  slug: string
}

interface OrganizationContextType {
  activeOrganization: Organization | null
  organizations: Organization[]
  setActiveOrganization: (org: Organization) => void
  isLoading: boolean
  isSuperAdmin: boolean
}

const OrganizationContext = createContext<OrganizationContextType>({
  activeOrganization: null,
  organizations: [],
  setActiveOrganization: () => { },
  isLoading: true,
  isSuperAdmin: false,
})

export const useOrganization = () => useContext(OrganizationContext)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadOrganizations = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (isMounted) setIsLoading(false)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('id', user.id)
          .single()

        let orgs: Organization[] = []

        if (profile?.is_super_admin) {
          if (isMounted) setIsSuperAdmin(true)
          const { data } = await supabase
            .from('organizations')
            .select('id, name, slug')
            .is('deleted_at', null)

          if (data) {
            orgs = data as Organization[]
          }
        } else {
          const { data } = await supabase
            .from('organization_members')
            .select('organizations (id, name, slug)')
            .eq('user_id', user.id)
            .is('deleted_at', null)

          if (data) {
            orgs = data.map((d: any) => d.organizations).filter(Boolean) as Organization[]
          }
        }

        if (orgs.length > 0 && isMounted) {
          setOrganizations(orgs)

          // Try to get from localStorage first
          const savedOrgId = localStorage.getItem('activeOrganizationId')
          const savedOrg = orgs.find(o => o.id === savedOrgId)

          if (savedOrg) {
            setActiveOrganization(savedOrg)
          } else if (orgs.length > 0) {
            setActiveOrganization(orgs[0])
            localStorage.setItem('activeOrganizationId', orgs[0].id)
          }
        }
      } catch (err) {
        console.error('Error loading organizations:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadOrganizations()
    return () => { isMounted = false }
  }, [])

  const handleSetActive = useCallback((org: Organization) => {
    setActiveOrganization(org)
    localStorage.setItem('activeOrganizationId', org.id)
  }, [])

  // Memoize context value to prevent unnecessary re-renders of all consumers
  const contextValue = useMemo(() => ({
    activeOrganization,
    organizations,
    setActiveOrganization: handleSetActive,
    isLoading,
    isSuperAdmin
  }), [activeOrganization, organizations, handleSetActive, isLoading, isSuperAdmin])

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  )
}