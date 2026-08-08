'use client'

import { createRoot } from 'react-dom/client'
import { AlertTriangle, CheckCircle2, XCircle, Info, X } from 'lucide-react'

// --- CONFIRM MODAL (For deletion / destructive confirmations) ---
type AlertType = 'confirm' | 'alert'

interface DialogProps {
  message: string
  title?: string
  type: AlertType
  onConfirm: () => void
  onCancel?: () => void
}

function Dialog({ message, title, type, onConfirm, onCancel }: DialogProps) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 border border-slate-100">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${type === 'confirm' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              {type === 'confirm' ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            </div>
            <h3 className="text-lg font-bold text-slate-800 mt-1">{title || (type === 'confirm' ? 'Xác nhận' : 'Thông báo')}</h3>
          </div>
          {type === 'alert' && onCancel && (
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <p className="text-slate-600 text-sm mb-6 leading-relaxed whitespace-pre-wrap">{message}</p>
        <div className="flex justify-end gap-3">
          {type === 'confirm' && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Hủy
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors ${type === 'confirm' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {type === 'confirm' ? 'Đồng ý' : 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  )
}

export const customConfirm = (message: string, title?: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve(false)

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const cleanup = () => {
      root.unmount()
      if (document.body.contains(container)) {
        document.body.removeChild(container)
      }
    }

    const handleConfirm = () => {
      cleanup()
      resolve(true)
    }

    const handleCancel = () => {
      cleanup()
      resolve(false)
    }

    root.render(
      <Dialog
        message={message}
        title={title}
        type="confirm"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    )
  })
}

// --- CORNER TOAST POPUP SYSTEM ---
export type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  message: string
  title?: string
}

let toastContainer: HTMLDivElement | null = null
let toastRoot: ReturnType<typeof createRoot> | null = null
let toastList: ToastItem[] = []

function renderToasts() {
  if (typeof document === 'undefined') return

  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.createElement('div')
    toastContainer.id = 'custom-toast-container'
    toastContainer.className = 'fixed bottom-5 right-5 z-[999999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4'
    document.body.appendChild(toastContainer)
    toastRoot = createRoot(toastContainer)
  }

  if (!toastRoot) return

  toastRoot.render(
    <div className="flex flex-col gap-2.5 w-full items-end">
      {toastList.map((t) => {
        const isSuccess = t.type === 'success'
        const isError = t.type === 'error'

        return (
          <div
            key={t.id}
            className={`pointer-events-auto w-full flex items-start gap-3.5 p-4 rounded-2xl shadow-2xl border-2 backdrop-blur-md transition-all duration-300 transform translate-y-0 ${
              isSuccess
                ? 'bg-emerald-50/95 border-emerald-500 text-emerald-950 shadow-emerald-500/10'
                : isError
                ? 'bg-rose-50/95 border-rose-500 text-rose-950 shadow-rose-500/10'
                : 'bg-blue-50/95 border-blue-500 text-blue-950 shadow-blue-500/10'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2.5]" />}
              {isError && <XCircle className="w-5 h-5 text-rose-600 stroke-[2.5]" />}
              {!isSuccess && !isError && <Info className="w-5 h-5 text-blue-600 stroke-[2.5]" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`text-xs font-black uppercase tracking-wider mb-0.5 ${
                isSuccess ? 'text-emerald-700' : isError ? 'text-rose-700' : 'text-blue-700'
              }`}>
                {t.title || (isSuccess ? 'Thành công (100%)' : isError ? 'Thất bại' : 'Thông báo')}
              </h4>
              <p className={`text-sm font-bold leading-snug whitespace-pre-wrap ${
                isSuccess ? 'text-emerald-900' : isError ? 'text-rose-900' : 'text-slate-800'
              }`}>
                {t.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className={`p-1 rounded-lg transition-colors flex-shrink-0 ${
                isSuccess
                  ? 'text-emerald-500 hover:text-emerald-800 hover:bg-emerald-100'
                  : isError
                  ? 'text-rose-500 hover:text-rose-800 hover:bg-rose-100'
                  : 'text-blue-500 hover:text-blue-800 hover:bg-blue-100'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

function removeToast(id: string) {
  toastList = toastList.filter((t) => t.id !== id)
  renderToasts()
}

let lastToastTime = 0
let lastToastKey = ''

export function showToast(type: ToastType, message: string, title?: string) {
  const cleanMsg = message.replace(/^[✅⚡❌⚠️]\s*/, '').trim()
  const key = `${type}:${cleanMsg}`
  const now = Date.now()

  // Deduplicate identical toasts sent within 1.5s
  if (key === lastToastKey && now - lastToastTime < 1500) {
    return
  }

  lastToastKey = key
  lastToastTime = now

  const id = Math.random().toString(36).substring(2, 9)
  toastList.push({ id, type, message: cleanMsg, title })
  renderToasts()

  setTimeout(() => {
    removeToast(id)
  }, 4000)
}

export const customAlert = (message: string, title?: string): Promise<void> => {
  return new Promise((resolve) => {
    const isSuccess =
      message.includes('✅') ||
      message.includes('⚡') ||
      message.toLowerCase().includes('thành công')

    const isError =
      message.includes('❌') ||
      message.includes('⚠️') ||
      message.toLowerCase().includes('lỗi') ||
      message.toLowerCase().includes('thất bại') ||
      message.toLowerCase().includes('chưa cập nhật')

    const type: ToastType = isSuccess ? 'success' : isError ? 'error' : 'info'
    const defaultTitle = isSuccess ? 'Thành công (100%)' : isError ? 'Thất bại' : 'Thông báo'

    showToast(type, message, title || defaultTitle)
    resolve()
  })
}
