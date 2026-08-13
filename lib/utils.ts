import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================================================
// VIETNAM TIMEZONE UTILITIES (Asia/Ho_Chi_Minh - GMT+7)
// ============================================================================

export const VN_TIMEZONE = 'Asia/Ho_Chi_Minh'

/**
 * Trả về chuỗi ngày theo định dạng YYYY-MM-DD theo giờ Việt Nam hiện tại hoặc từ date đầu vào.
 * Luôn chính xác ở mọi khung giờ trong ngày (kể cả 0h - 7h sáng).
 */
export function getVietnamDateString(dateInput?: string | Date | number | null): string {
  if (!dateInput) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: VN_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  }

  try {
    let d: Date
    if (dateInput instanceof Date) {
      d = dateInput
    } else if (typeof dateInput === 'number') {
      d = new Date(dateInput)
    } else {
      const s = String(dateInput).trim()
      if (!s) return ''
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
      d = new Date(s)
    }

    if (isNaN(d.getTime())) return ''

    return new Intl.DateTimeFormat('en-CA', {
      timeZone: VN_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d)
  } catch {
    return ''
  }
}

/**
 * Parse bất kỳ chuỗi ngày / Date nào sang Date an toàn.
 */
export function parseToVietnamDate(dateStr?: string | Date | null): Date | null {
  if (!dateStr) return null
  try {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return d
  } catch {
    return null
  }
}

export const parseToDate = parseToVietnamDate

/**
 * Định dạng ngày theo chuẩn Việt Nam: DD/MM/YYYY
 */
export function formatVietnamDate(dateStr?: string | Date | number | null): string {
  if (!dateStr) return '--/--/----'
  try {
    if (typeof dateStr === 'string') {
      const s = dateStr.trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-')
        return `${d}/${m}/${y}`
      }
    }

    const d = dateStr instanceof Date ? dateStr : new Date(dateStr)
    if (isNaN(d.getTime())) return '--/--/----'

    return new Intl.DateTimeFormat('en-GB', {
      timeZone: VN_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d)
  } catch {
    return '--/--/----'
  }
}

/**
 * Định dạng giờ theo chuẩn Việt Nam: HH:mm:ss
 */
export function formatVietnamTime(dateStr?: string | Date | number | null): string {
  if (!dateStr) return ''
  try {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr)
    if (isNaN(d.getTime())) return ''

    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: VN_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d)
  } catch {
    return ''
  }
}

/**
 * Định dạng ngày giờ đầy đủ theo chuẩn Việt Nam: DD/MM/YYYY HH:mm:ss
 */
export function formatVietnamDateTime(dateStr?: string | Date | number | null): string {
  if (!dateStr) return '--/--/----'
  try {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr)
    if (isNaN(d.getTime())) return '--/--/----'

    const datePart = formatVietnamDate(d)
    const timePart = formatVietnamTime(d)
    if (datePart === '--/--/----' || !timePart) return datePart
    return `${datePart} ${timePart}`
  } catch {
    return '--/--/----'
  }
}

/**
 * Lấy mốc ngày bắt đầu và kết thúc của tháng (dùng cho bộ lọc thời gian) theo giờ Việt Nam
 * @param monthOffset 0 = tháng này, -1 = tháng trước, 1 = tháng sau
 */
export function getVietnamMonthBounds(monthOffset = 0) {
  const now = new Date()
  const vnFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: VN_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
  })
  const parts = vnFormatter.formatToParts(now)
  const currentYear = parseInt(parts.find(p => p.type === 'year')?.value || `${now.getFullYear()}`, 10)
  const currentMonth = parseInt(parts.find(p => p.type === 'month')?.value || `${now.getMonth() + 1}`, 10)

  let targetMonth = currentMonth + monthOffset
  let targetYear = currentYear
  while (targetMonth < 1) {
    targetMonth += 12
    targetYear -= 1
  }
  while (targetMonth > 12) {
    targetMonth -= 12
    targetYear += 1
  }

  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate()
  const mm = String(targetMonth).padStart(2, '0')
  const firstDay = `${targetYear}-${mm}-01`
  const lastDay = `${targetYear}-${mm}-${String(daysInMonth).padStart(2, '0')}`

  return {
    year: targetYear,
    month: targetMonth,
    firstDay,
    lastDay,
    label: `T${targetMonth}/${targetYear}`,
  }
}

/**
 * Hiển thị khoảng thời gian tương đối bằng tiếng Việt (Vừa xong, x phút trước, x giờ trước,...)
 */
export function getVietnamTimeAgo(dateStr?: string | Date | number | null): string {
  if (!dateStr) return ''
  try {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr)
    if (isNaN(d.getTime())) return ''

    const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
    if (seconds < 60) return 'Vừa xong'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} phút trước`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} giờ trước`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} ngày trước`

    return formatVietnamDate(d)
  } catch {
    return ''
  }
}
