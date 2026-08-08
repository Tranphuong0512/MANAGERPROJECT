'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { exportOrganizationData } from '@/utils/export-excel'
import { customAlert, customConfirm } from '@/utils/alert'

interface ExportDataButtonProps {
  orgId?: string | null
  filename?: string
  label?: string
}

export function ExportDataButton({ orgId = null, filename = 'backup_data', label = 'Sao lưu dữ liệu' }: ExportDataButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    
    // Simulate slight delay for UI feedback
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const { success, error } = await exportOrganizationData(orgId, filename)
    
    setIsExporting(false)
    
    if (success) {
      await customAlert('Đã xuất dữ liệu thành công!')
    } else {
      await customAlert(`Lỗi khi xuất dữ liệu: ${error}`)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        isExporting 
          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
          : 'bg-green-600 hover:bg-green-700 text-white'
      }`}
    >
      {isExporting ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <Download className="w-5 h-5" />
      )}
      {isExporting ? 'Đang sao lưu...' : label}
    </button>
  )
}
