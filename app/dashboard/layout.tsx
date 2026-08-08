'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { OrganizationProvider } from '@/components/providers/organization-provider'
import { ApecGlobalAutoSyncProvider } from '@/components/apec-global/apec-global-auto-sync-provider'

import { ToastInterceptorProvider } from '@/components/providers/toast-interceptor'
import { AutoUpdateProvider } from '@/components/providers/auto-update-provider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <OrganizationProvider>
      <ApecGlobalAutoSyncProvider>
        <ToastInterceptorProvider>
          <AutoUpdateProvider>
            <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
              <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
              <div className="flex flex-1 overflow-hidden">
                <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
                <main className="flex-1 overflow-y-auto bg-[#F8F9FB]">
                  <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {children}
                  </div>
                </main>
              </div>
            </div>
          </AutoUpdateProvider>
        </ToastInterceptorProvider>
      </ApecGlobalAutoSyncProvider>
    </OrganizationProvider>
  )
}
