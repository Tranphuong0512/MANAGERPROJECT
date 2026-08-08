'use client'

import { useEffect, useRef } from 'react'
import { showToast } from '@/utils/alert'

export function ToastInterceptorProvider({ children }: { children: React.ReactNode }) {
  const isIntercepted = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || isIntercepted.current) return
    isIntercepted.current = true

    const originalFetch = window.fetch

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const method = (init?.method || 'GET').toUpperCase()
      const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)

      const response = await originalFetch(input, init)

      if (isMutating) {
        const headers = init?.headers ? new Headers(init.headers) : null
        if (headers && headers.get('x-silent-toast') === 'true') {
          return response
        }

        try {
          const clone = response.clone()
          const resJson = await clone.json().catch(() => null)
          const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url)

          // Ignore internal sync polling or non-apec noise if needed
          if (urlStr.includes('/auto-sync-all')) {
            return response
          }

          let actionLabel = `${method} thao tác`
          if (method === 'POST') actionLabel = 'Tạo mới'
          else if (method === 'PUT' || method === 'PATCH') actionLabel = 'Cập nhật'
          else if (method === 'DELETE') actionLabel = 'Xóa'

          if (urlStr.includes('/tasks')) actionLabel = method === 'POST' ? 'Tạo mới công việc' : (method === 'DELETE' ? 'Xóa công việc' : 'Cập nhật công việc');
          else if (urlStr.includes('/checklists')) actionLabel = method === 'POST' ? 'Tạo checklist' : (method === 'DELETE' ? 'Xóa checklist' : 'Cập nhật checklist');
          else if (urlStr.includes('/assignments') || urlStr.includes('/subtasks')) actionLabel = 'Cập nhật nhiệm vụ con';

          if (response.ok && (!resJson || resJson.success !== false)) {
            const successMsg = resJson?.message || resJson?.data?.message || `${actionLabel} thành công 100% lên máy chủ APEC GLOBAL!`;
            showToast('success', successMsg, `THÀNH CÔNG 100% (${method})`);
          } else {
            const errorMsg = resJson?.error || resJson?.message || resJson?.data?.message || `${actionLabel} không thành công`;
            showToast('error', errorMsg, `THẤT BẠI (${method})`);
          }
        } catch (e) {
          console.warn('Toast interceptor error:', e)
        }
      }

      return response
    }
  }, [])

  return <>{children}</>
}
