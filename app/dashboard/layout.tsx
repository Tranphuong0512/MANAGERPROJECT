'use client'

import { useState, useEffect } from 'react'
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Tự động mở sidebar trên desktop lớn, đóng trên mobile/tablet để không che khuất nội dung
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setSidebarOpen(true)
    }
  }, [])

  return (
    <OrganizationProvider>
      <ApecGlobalAutoSyncProvider>
        <ToastInterceptorProvider>
          <AutoUpdateProvider>
            <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
              <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
              <div className="flex flex-1 overflow-hidden relative">
                <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
                <main className="flex-1 overflow-y-auto bg-[#F8F9FB]">
                  <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
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
