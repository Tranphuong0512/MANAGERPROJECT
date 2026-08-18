'use client'

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSyncingRef = useRef(false);
  const lastSyncTimeRef = useRef<number>(0);

  const syncData = useCallback(async (retryCount = 0) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);

    if (retryCount === 0) {
      setError(null);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout cho full sync

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
        lastSyncTimeRef.current = Date.now();
        console.log('[APEC GLOBAL SYNC] Đồng bộ dữ liệu thành công:', data.summary || data.message);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('apec-global-synced', { detail: data }));
        }
        setError(null);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbortError = err.name === 'AbortError';

      if (retryCount < 2) {
        const nextInterval = (retryCount + 1) * 3000;
        console.warn(`[APEC GLOBAL SYNC] Đang thử kết nối lại lần ${retryCount + 1}...`);
        setTimeout(() => {
          isSyncingRef.current = false;
          syncData(retryCount + 1);
        }, nextInterval);
        return;
      } else {
        if (isAbortError) {
          console.log('[APEC GLOBAL SYNC] Đồng bộ chạy ngầm, sử dụng dữ liệu cache tức thì.');
        } else {
          console.warn('[APEC GLOBAL SYNC] Lỗi đồng bộ API:', err?.message);
        }
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    // 1. Initial sync ngay khi khởi động
    syncData();

    // 2. Định kỳ đồng bộ ngầm liên tục mỗi 60 giây (1 phút)
    const interval = setInterval(() => {
      syncData();
    }, 60000);

    // 3. Tự động kiểm tra & đồng bộ khi người dùng focus quay lại tab/ứng dụng (nếu đã qua 30s)
    const handleFocus = () => {
      if (Date.now() - lastSyncTimeRef.current > 30000) {
        syncData();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          handleFocus();
        }
      });
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, [syncData]);

  return (
    <AutoSyncContext.Provider value={{ isSyncing, error }}>
      {children}
    </AutoSyncContext.Provider>
  )
}
