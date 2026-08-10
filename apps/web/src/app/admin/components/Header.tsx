'use client'

interface HeaderProps {
  onOpenSidebar: () => void
  onOpenAddModal: () => void
  title?: string
  addButtonLabel?: string
  showAddButton?: boolean
}

export default function Header({
  onOpenSidebar,
  onOpenAddModal,
  title = 'Quản lý sản phẩm',
  addButtonLabel = 'Thêm sản phẩm',
  showAddButton = true,
}: HeaderProps) {
  return (
    <header className="h-20 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
      {/* Menu Button + Title */}
      <div className="flex items-center gap-3">
        {/* Hamburger Button cho Mobile */}
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <svg className="size-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg sm:text-xl font-bold text-slate-800 whitespace-nowrap">{title}</h1>
      </div>
      
      {/* Add button and notifications */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* Nút Thêm ẩn trên Mobile, hiển thị từ lg */}
        {showAddButton && (
          <button
            onClick={onOpenAddModal}
            className="hidden lg:flex bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full px-5 py-2.5 items-center gap-2 transition-all duration-200 shadow-md shadow-blue-600/10 cursor-pointer"
          >
            {/* Plus Icon */}
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{addButtonLabel}</span>
          </button>
        )}

        <div className="hidden lg:block w-px h-6 bg-slate-200"></div>

        {/* Notification Bell */}
        <div className="relative">
          <svg className="size-6 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-0 right-0 size-2 bg-red-500 rounded-full"></span>
        </div>

        {/* Profile Avatar */}
        <div className="size-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold border border-slate-200 overflow-hidden">
          <span className="uppercase">YN</span>
        </div>
      </div>
    </header>
  )
}
