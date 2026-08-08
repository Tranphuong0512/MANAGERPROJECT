'use client'

import React, { useEffect, useRef } from 'react'

export function ApecGlobalAutoSyncProvider({ children }: { children: React.ReactNode }) {
  const syncedRef = useRef(false)

  useEffect(() => {
    if (syncedRef.current) return
    syncedRef.current = true

    if (typeof window !== 'undefined') {
      const alreadySynced = sessionStorage.getItem('apec_global_auto_synced');
      if (alreadySynced) {
        return;
      }
      sessionStorage.setItem('apec_global_auto_synced', 'true');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    fetch('/api/v1/apec-global/auto-sync-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(timeoutId);
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data && data.success) {
          console.log('[APEC GLOBAL SYNC] Đồng bộ dữ liệu thành công');
          window.dispatchEvent(new Event('apec-global-synced'));
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          console.warn('[APEC GLOBAL SYNC] Auto-sync timed out, continuing with cached BFF data.');
        } else {
          console.warn('[APEC GLOBAL SYNC] Auto-sync bypassed:', err?.message || err);
        }
      });
  }, []);

  return <>{children}</>
}
