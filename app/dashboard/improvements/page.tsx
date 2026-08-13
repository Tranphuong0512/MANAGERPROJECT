'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ImprovementsRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/incidents?tab=improvements')
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-600">Đang chuyển đến trang Quản lý Cải tiến...</p>
      </div>
    </div>
  )
}
