'use client'

interface SidebarProps {
  isSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void
  onLogout: () => void
  activeTab: 'products' | 'reorder'
  setActiveTab: (tab: 'products' | 'reorder') => void
}

export default function Sidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  onLogout,
  activeTab,
  setActiveTab,
}: SidebarProps) {
  const handleNav = (tab: 'products' | 'reorder') => {
    setActiveTab(tab)
    setIsSidebarOpen(false)
  }

  return (
    <aside className={`transform fixed inset-y-0 left-0 w-64 bg-blue-50/95 lg:bg-blue-50/40 border-r border-slate-200 flex flex-col justify-between p-6 z-50 transition-transform duration-300 lg:static lg:translate-x-0 ${
      isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    }`}>
      <div className="flex flex-col gap-8">
        {/* Logo / Title */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Admin Panel</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Quản lý kho vận</p>
          </div>
          {/* Nút đóng Sidebar trên Mobile */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-2">
          {/* Tab Sản phẩm */}
          <button
            onClick={() => handleNav('products')}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 text-left w-full cursor-pointer ${
              activeTab === 'products'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/10 hover:bg-sky-600'
                : 'bg-white/60 text-slate-600 hover:bg-white/90 border border-slate-200'
            }`}
          >
            {/* Product Box Icon */}
            <svg className="size-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>Sản phẩm</span>
          </button>

          {/* Tab Sắp xếp menu */}
          <button
            onClick={() => handleNav('reorder')}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 text-left w-full cursor-pointer ${
              activeTab === 'reorder'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/10 hover:bg-sky-600'
                : 'bg-white/60 text-slate-600 hover:bg-white/90 border border-slate-200'
            }`}
          >
            {/* Reorder / Drag icon */}
            <svg className="size-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span>Sắp xếp menu</span>
          </button>
        </nav>
      </div>

      {/* Bottom Sidebar Action buttons */}
      <div className="flex flex-col gap-4">
        <button className="flex items-center justify-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors duration-200 rounded-xl py-3 px-4 text-xs font-semibold cursor-pointer">
          {/* Support Info Icon */}
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Hỗ trợ kỹ thuật</span>
        </button>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-red-500 hover:text-red-700 transition-colors duration-200 text-sm font-semibold pl-4 cursor-pointer"
        >
          {/* Logout Icon */}
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  )
}
