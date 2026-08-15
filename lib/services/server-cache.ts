// ============================================================================
// SERVER IN-MEMORY CACHE WITH STALE-WHILE-REVALIDATE (SIÊU TỐI ƯU TỐC ĐỘ)
// ============================================================================
// Giúp các API GET (APEC GLOBAL, Thống kê, Danh sách) phản hồi trong < 1ms
// bằng cách đọc trực tiếp từ RAM, đồng thời làm tươi dữ liệu ngầm (SWR).
// ============================================================================

interface CacheEntry<T> {
  data: T
  timestamp: number
  staleAt: number
  expireAt: number
  isRevalidating?: boolean
}

const MAX_CACHE_ENTRIES = 500
const cacheStore = new Map<string, CacheEntry<any>>()

function ensureCapacity() {
  if (cacheStore.size >= MAX_CACHE_ENTRIES) {
    const now = Date.now()
    // First remove any expired entries
    for (const [k, v] of cacheStore.entries()) {
      if (now >= v.expireAt) {
        cacheStore.delete(k)
      }
    }
    // If still over capacity, remove oldest entries (first items in Map iterator)
    if (cacheStore.size >= MAX_CACHE_ENTRIES) {
      const excess = cacheStore.size - MAX_CACHE_ENTRIES + 50
      let deleted = 0
      for (const k of cacheStore.keys()) {
        cacheStore.delete(k)
        deleted++
        if (deleted >= excess) break
      }
    }
  }
}

export interface CacheOptions {
  /** Thời gian (ms) dữ liệu được coi là mới hoàn toàn (mặc định 15 giây) */
  staleTimeMs?: number
  /** Thời gian (ms) tối đa giữ trong cache trước khi bắt buộc fetch lại (mặc định 5 phút) */
  expireTimeMs?: number
}

/**
 * Lấy dữ liệu từ cache bộ nhớ RAM. Nếu hết hạn hoặc chưa có, tự động gọi fetcher.
 * Nếu dữ liệu ở trạng thái "stale", trả ngay cache (< 1ms) và revalidate ngầm.
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const now = Date.now()
  const staleTimeMs = options.staleTimeMs ?? 15_000 // 15 giây
  const expireTimeMs = options.expireTimeMs ?? 300_000 // 5 phút

  const entry = cacheStore.get(key)

  // 1. Trường hợp 1: Chưa có trong cache hoặc đã hết hạn hoàn toàn -> fetch trực tiếp
  if (!entry || now >= entry.expireAt) {
    const data = await fetcher()
    ensureCapacity()
    cacheStore.set(key, {
      data,
      timestamp: now,
      staleAt: now + staleTimeMs,
      expireAt: now + expireTimeMs,
      isRevalidating: false,
    })
    return data
  }

  // 2. Trường hợp 2: Còn mới hoàn toàn (now < staleAt) -> trả ngay cache lập tức (< 1ms)
  if (now < entry.staleAt) {
    return entry.data
  }

  // 3. Trường hợp 3: Stale-While-Revalidate (staleAt <= now < expireAt)
  // -> Trả ngay cache hiện tại cho user (< 1ms), đồng thời cập nhật ngầm ở background
  if (!entry.isRevalidating) {
    entry.isRevalidating = true
    Promise.resolve()
      .then(async () => {
        try {
          const freshData = await fetcher()
          ensureCapacity()
          cacheStore.set(key, {
            data: freshData,
            timestamp: Date.now(),
            staleAt: Date.now() + staleTimeMs,
            expireAt: Date.now() + expireTimeMs,
            isRevalidating: false,
          })
        } catch (err) {
          // Nếu fetch lỗi ngầm, giữ lại cache hiện tại và thử lại sau
          const e = cacheStore.get(key)
          if (e) e.isRevalidating = false
        }
      })
      .catch(() => {})
  }

  return entry.data
}

/**
 * Xóa cache theo tiền tố key (hoặc xóa toàn bộ nếu không truyền param).
 * Gọi khi có hành động thêm/sửa/xóa (Mutation) để đảm bảo dữ liệu luôn chính xác.
 */
export function invalidateCache(keyPrefix?: string): number {
  if (!keyPrefix) {
    const size = cacheStore.size
    cacheStore.clear()
    return size
  }

  let count = 0
  for (const key of cacheStore.keys()) {
    if (key.startsWith(keyPrefix)) {
      cacheStore.delete(key)
      count++
    }
  }
  return count
}

/**
 * Lấy thống kê hiện trạng cache (chỉ dùng cho theo dõi / debug).
 */
export function getCacheStats() {
  return {
    totalEntries: cacheStore.size,
    keys: Array.from(cacheStore.keys()),
  }
}
