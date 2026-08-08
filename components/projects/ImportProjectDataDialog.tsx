'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X, Upload, Download } from 'lucide-react'
import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

interface ImportProjectDataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  organizationId: string
  onImported?: () => void
}

export function ImportProjectDataDialog({
  open,
  onOpenChange,
  projectId,
  organizationId,
  onImported,
}: ImportProjectDataDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDownloadTemplate = async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Data')
    ws.columns = [
      { header: 'Nhóm công việc', key: 'group', width: 30 },
      { header: 'Tên công việc', key: 'task', width: 40 },
      { header: 'Mô tả', key: 'desc', width: 30 },
      { header: 'Hạn chót (DD/MM/YYYY)', key: 'end_date', width: 25 },
      { header: 'Độ ưu tiên (high/medium/low)', key: 'priority', width: 25 }
    ]
    
    ws.addRow({
      group: 'Giai đoạn 1',
      task: 'Thiết kế giao diện',
      desc: 'Thiết kế trang chủ',
      end_date: '30/12/2023',
      priority: 'high'
    })
    
    // Style headers
    ws.getRow(1).font = { bold: true }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }

    const buf = await wb.xlsx.writeBuffer()
    saveAs(new Blob([buf]), 'Project_Import_Template.xlsx')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(await file.arrayBuffer())
      const ws = wb.worksheets[0]
      
      if (!ws) throw new Error('Không tìm thấy sheet dữ liệu')

      const dataToImport: any[] = []
      
      let headerRow: any = null
      
      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          headerRow = row.values
          return
        }
        
        // Assume standard order if headers not matched, but it's better to rely on order as template
        const group = row.getCell(1).text?.trim()
        const task = row.getCell(2).text?.trim()
        const desc = row.getCell(3).text?.trim()
        let endDate = row.getCell(4).value
        const priority = row.getCell(5).text?.trim()?.toLowerCase() || 'medium'

        if (group && task) {
          let parsedDate = null
          if (endDate) {
             if (endDate instanceof Date) {
                 parsedDate = endDate
             } else if (typeof endDate === 'string') {
                 // Try parse DD/MM/YYYY
                 const parts = endDate.split('/')
                 if (parts.length === 3) {
                     parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
                 }
             }
          }

          dataToImport.push({
            group,
            task,
            desc,
            endDate: parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
            priority: ['high', 'medium', 'low'].includes(priority) ? priority : 'medium'
          })
        }
      })

      if (dataToImport.length === 0) {
        throw new Error('Không tìm thấy dữ liệu hợp lệ để import. Vui lòng kiểm tra lại file.')
      }

      // Group by checklist
      const checklistsMap = new Map<string, any[]>()
      dataToImport.forEach(item => {
        if (!checklistsMap.has(item.group)) checklistsMap.set(item.group, [])
        checklistsMap.get(item.group)?.push(item)
      })

      // Fetch existing checklists to find max sort_order
      const { data: existingLists } = await supabase
        .from('project_checklists')
        .select('sort_order')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: false })
        .limit(1)
        
      let nextListOrder = (existingLists?.[0]?.sort_order || 0) + 1

      for (const [groupName, tasks] of checklistsMap.entries()) {
        // Create Checklist
        const { data: newList, error: listError } = await supabase
          .from('project_checklists')
          .insert({
            title: groupName,
            project_id: projectId,
            sort_order: nextListOrder++
          })
          .select()
          .single()

        if (listError) throw listError

        // Create tasks
        const itemsToInsert = tasks.map((t, idx) => ({
          checklist_id: newList.id,
          title: t.task,
          description: t.desc,
          priority: t.priority,
          end_date: t.endDate,
          sort_order: idx,
          status: 'todo',
          is_completed: false,
          progress: 0
        }))

        if (itemsToInsert.length > 0) {
          const { error: itemsErr } = await supabase.from('checklist_items').insert(itemsToInsert)
          if (itemsErr) throw itemsErr
        }
      }

      setSuccess(`Import thành công ${dataToImport.length} công việc!`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      
      setTimeout(() => {
        onOpenChange(false)
        onImported?.()
      }, 1500)

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Có lỗi xảy ra khi import dữ liệu.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-900">Import Dữ Liệu Từ Excel</h2>
          <button onClick={() => onOpenChange(false)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
              <Download className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 text-sm mb-1">1. Tải file mẫu</h4>
                <p className="text-xs text-blue-700 mb-2 leading-relaxed">
                  Tải file Excel mẫu về máy để điền dữ liệu công việc theo đúng định dạng được yêu cầu.
                </p>
                <button 
                  onClick={handleDownloadTemplate}
                  className="text-xs font-bold text-blue-700 hover:text-blue-800 underline underline-offset-2"
                >
                  Tải Template Excel
                </button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 border-dashed p-6 rounded-xl flex flex-col items-center justify-center gap-3 relative hover:bg-slate-100 transition-colors">
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".xlsx"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <Upload className={`w-8 h-8 ${isLoading ? 'text-blue-500 animate-bounce' : 'text-slate-400'}`} />
              <div className="text-center">
                <h4 className="font-semibold text-slate-700 text-sm mb-1">
                  {isLoading ? 'Đang xử lý...' : '2. Tải lên file đã điền'}
                </h4>
                <p className="text-xs text-slate-500">
                  Kéo thả hoặc click để chọn file .xlsx
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
