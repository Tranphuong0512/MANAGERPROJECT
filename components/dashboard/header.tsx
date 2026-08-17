'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Filter, Bell, ChevronDown, LogOut, Menu, Building2, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useOrganization } from '@/components/providers/organization-provider'
import { usePermissions } from '@/hooks/usePermissions'
import { useAutoUpdate } from '@/components/providers/auto-update-provider'

interface HeaderProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const { activeOrganization, organizations, setActiveOrganization, isLoading: isLoadingOrgs, isSuperAdmin } = useOrganization()
  const { role } = usePermissions()
  const { checkNow, isChecking, updateInfo } = useAutoUpdate()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close search results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Search effect
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (searchQuery.trim().length > 0 && activeOrganization) {
        setIsSearching(true)
        setShowSearchResults(true)
        const { data } = await supabase
          .from('projects')
          .select('id, name, code, status')
          .eq('organization_id', activeOrganization.id)
          .is('deleted_at', null)
          .or(`name.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%`)
          .limit(5)
        
        setSearchResults(data || [])
        setIsSearching(false)
      } else {
        setSearchResults([])
        setShowSearchResults(false)
      }
    }, 300)
    return () => clearTimeout(searchTimer)
  }, [searchQuery, activeOrganization])

  // Format role for display
  const getRoleDisplay = () => {
    if (isSuperAdmin) return 'Super Admin'
    switch (role) {
      case 'owner': return 'Chủ sở hữu'
      case 'manager': return 'Quản lý'
      case 'team_lead': return 'Trưởng nhóm'
      case 'member': return 'Thành viên'
      case 'guest': return 'Khách'
      default: return 'Thành viên'
    }
  }

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        
        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (profileData) setProfile(profileData)
      }
      setIsLoadingUser(false)
    }

    loadData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isLoading = isLoadingUser || isLoadingOrgs

  return (
    <header suppressHydrationWarning className="bg-white border-b border-slate-200 px-3 sm:px-6 h-16 flex items-center justify-between z-40 sticky top-0">
      {/* Left section: Org Selector & Mobile/Desktop Hamburger */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors flex items-center justify-center focus:outline-none"
          title={sidebarOpen ? "Đóng menu" : "Mở menu"}
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-100 bg-slate-50/50 select-none">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm shrink-0">
            {activeOrganization?.name?.charAt(0) || 'A'}
          </div>
          <div className="hidden xs:block min-w-0">
            <div className="text-xs sm:text-sm font-semibold text-slate-900 leading-tight truncate max-w-[120px] sm:max-w-[180px]">
              {activeOrganization?.name || 'ApecGlobal'}
            </div>
            <div className="text-[10px] sm:text-[11px] text-blue-600 font-medium leading-none mt-0.5">Workspace</div>
          </div>
        </div>
      </div>

      {/* Center section: Search */}
      <div className="flex-1 max-w-xl px-2 sm:px-4 min-w-0" ref={searchRef}>
        <div className="relative group">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchQuery.trim().length > 0) setShowSearchResults(true) }}
            placeholder="Tìm kiếm dự án..."
            className="w-full h-9 sm:h-10 pl-9 sm:pl-10 pr-3 sm:pr-4 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-full text-xs sm:text-sm outline-none transition-all"
          />

          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
              <div className="p-2">
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Kết quả tìm kiếm</div>
                {isSearching ? (
                  <div className="p-3 text-sm text-slate-500 text-center">Đang tìm kiếm...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => {
                        setShowSearchResults(false)
                        setSearchQuery('')
                        router.push(`/dashboard/projects/${p.id}`)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600">{p.name}</div>
                        <div className="text-xs text-slate-500">{p.code || `PRJ-${p.id.substring(0,6)}`}</div>
                      </div>
                      <div className="text-[10px] font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded">
                        {p.status === 'active' ? 'Đang chạy' : p.status === 'completed' ? 'Hoàn thành' : 'Khác'}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-slate-500 text-center">Không tìm thấy dự án nào.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right section: Actions & Profile */}
      <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => checkNow(true)}
            disabled={isChecking}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
              updateInfo?.update_available
                ? 'bg-amber-500 hover:bg-amber-600 text-white animate-bounce shadow-amber-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
            title="Kiểm tra phiên bản mới phát hành trên GitHub"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-blue-600' : (updateInfo?.update_available ? 'text-white' : 'text-amber-500')}`} />
            <span className="hidden md:inline">
              {isChecking ? 'Đang kiểm tra...' : updateInfo?.update_available ? `Cập nhật v${updateInfo.latest_version}` : 'Check Cập Nhật'}
            </span>
          </button>
        </div>

        <button className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-full border border-slate-200 text-xs sm:text-sm font-medium transition-colors">
          <Filter className="w-3.5 h-3.5" />
          <span>Bộ lọc</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        <button className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>

        <div className="h-5 w-[1px] bg-slate-200 mx-0.5 sm:mx-1"></div>

        {!isLoading && user && (
          <div className="flex items-center gap-3 pl-2 cursor-pointer group relative">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900 leading-tight">
                {profile?.full_name || user.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">{getRoleDisplay()}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold overflow-hidden border border-slate-200">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                (profile?.full_name || user.email)?.charAt(0).toUpperCase()
              )}
            </div>

            {/* Simple Dropdown on hover */}
            <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <div className="p-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
