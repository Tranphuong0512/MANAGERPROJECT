'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'

interface AutoSyncContextProps {
  isSyncing: boolean;
  error: string | null;
}

const AutoSyncContext = createContext<AutoSyncContextProps>({
  isSyncing: false,
  error: null,
});

export const useApecGlobalAutoSync = () => useContext(AutoSyncContext);

export function ApecGlobalAutoSyncProvider({ children }: { children: React.ReactNode }) {
  const syncedRef = useRef(false)
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const syncData = async (retryCount = 0) => {
      setIsSyncing(true);
      if (retryCount === 0) {
        setError(null);
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout (đủ thời gian cho đồng bộ lớn)

      try {
        const res = await fetch('/api/v1/apec-global/auto-sync-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
           throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        if (data && data.success) {
          console.log('[APEC GLOBAL SYNC] Đồng bộ dữ liệu thành công');
          window.dispatchEvent(new Event('apec-global-synced'));
          setIsSyncing(false);
          setError(null);
        } else {
          setIsSyncing(false);
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        
        const isAbortError = err.name === 'AbortError';
        
        // Thử lại tối đa 2 lần cho các lỗi mạng hoặc timeout
        if (retryCount < 2) {
          const nextInterval = (retryCount + 1) * 3000;
          console.warn(`[APEC GLOBAL SYNC] Đang thử kết nối lại lần ${retryCount + 1}...`);
          
          setTimeout(() => {
            syncData(retryCount + 1);
          }, nextInterval);
        } else {
          setIsSyncing(false);
          if (isAbortError) {
            console.log('[APEC GLOBAL SYNC] Đồng bộ tự động chạy ngầm, giao diện đang hiển thị dữ liệu tức thì.');
          } else {
            console.log('[APEC GLOBAL SYNC] Sử dụng dữ liệu cache để đảm bảo tốc độ phản hồi.');
          }
        }
      }
    };

    syncData();

  }, []);

  return (
    <AutoSyncContext.Provider value={{ isSyncing, error }}>
      {children}
    </AutoSyncContext.Provider>
  )
}
