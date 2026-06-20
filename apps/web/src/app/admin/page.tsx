'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

// API and SHOP_SLUG are loaded dynamically from /api/config at runtime

type MenuItem = {
  id: string
  name: string
  price: number
  category: string
  description: string
  is_active: boolean
  shop_slug: string
  image_url?: string
}

const PRESET_CATEGORIES = ['Món ăn healthy', 'Món ăn vặt', 'Nước uống']

const emptyForm = {
  name: '',
  price: '',
  category: 'Món ăn healthy',
  customCategory: '',
  description: '',
  is_active: true,
  image_url: '',
}

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [apiUrl, setApiUrl] = useState('')
  const [shopSlug, setShopSlug] = useState('')
  const [adminApiKey, setAdminApiKey] = useState('')
  const [configLoaded, setConfigLoaded] = useState(false)
  const [items, setItems] = useState<MenuItem[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  
  // States cho Modal, Sidebar di động, Search, và Filters
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  
  // State Phân trang
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error'>('success')

  const fetchItems = async (currentApiUrl = apiUrl, currentShopSlug = shopSlug) => {
    if (!currentApiUrl || !currentShopSlug) return
    try {
      const res = await fetch(`${currentApiUrl}/menu/${currentShopSlug}?all=true`)
      const data = await res.json()
      setItems(data || [])
    } catch (err) {
      console.error('Lỗi khi tải danh sách món:', err)
    }
  }

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/config')
        const data = await res.json()
        setApiUrl(data.apiUrl)
        setShopSlug(data.shopSlug)
        setAdminApiKey(data.adminApiKey)
        setConfigLoaded(true)
      } catch (err) {
        console.error('Lỗi khi tải cấu hình:', err)
        setApiUrl('http://localhost:3001')
        setShopSlug('quan-test')
        setAdminApiKey('ynuquan_secret_api_key_2026')
        setConfigLoaded(true)
      }
    }
    loadConfig()
  }, [])

  useEffect(() => {
    if (configLoaded && apiUrl && shopSlug) {
      fetchItems(apiUrl, shopSlug)
    }
  }, [configLoaded, apiUrl, shopSlug])

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(''), 3000)
  }

  const handleSubmit = async () => {
    const finalCategory = form.category === 'custom' ? form.customCategory.trim() : form.category
    
    if (!form.name.trim() || !form.price || !finalCategory) {
      showMsg('Vui lòng điền đủ tên, giá và danh mục sản phẩm!', 'error')
      return
    }

    setLoading(true)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      category: finalCategory,
      is_active: form.is_active,
      shop_slug: shopSlug,
      image_url: form.image_url.trim(),
    }

    const apiKey = adminApiKey || 'ynuquan_secret_api_key_2026'

    try {
      let res
      if (editId) {
        res = await fetch(`${apiUrl}/menu/${editId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          showMsg('Cập nhật món ăn thành công!')
        } else {
          const errData = await res.json()
          showMsg(errData.message || 'Lỗi khi cập nhật món!', 'error')
        }
      } else {
        res = await fetch(`${apiUrl}/menu`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          showMsg('Thêm món mới thành công!')
        } else {
          const errData = await res.json()
          showMsg(errData.message || 'Lỗi khi thêm món mới!', 'error')
        }
      }
      
      if (res.ok) {
        setForm(emptyForm)
        setEditId(null)
        setIsModalOpen(false)
        fetchItems(apiUrl, shopSlug)
      }
    } catch (err) {
      showMsg('Có lỗi kết nối xảy ra!', 'error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Kiểm tra định dạng HEIC/HEIF từ iOS
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    if (fileExt === 'heic' || fileExt === 'heif') {
      showMsg('Định dạng HEIC (iPhone) không hỗ trợ trên Web!', 'error')
      alert(
        'LƯU Ý QUAN TRỌNG CHO IPHONE/IPAD (iOS):\n\n' +
        'Ảnh định dạng HEIC trực tiếp từ máy ảnh iPhone không thể hiển thị trên trang web.\n\n' +
        'Cách khắc phục:\n' +
        '1. Vui lòng chọn ảnh từ "Thư viện ảnh" (Photo Library) thay vì mục "Tệp" (Files) để iOS tự động chuyển đổi sang JPG trước khi tải lên.\n' +
        '2. Hoặc chuyển đổi ảnh sang JPG/PNG trước khi tải lên.'
      )
      return
    }

    // Kiểm tra dung lượng file (tối đa 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMsg('Dung lượng ảnh tối đa là 5MB!', 'error')
      return
    }

    setUploading(true)
    try {
      const randomStr = Math.random().toString(36).substring(2, 9)
      const fileName = `${shopSlug}/${Date.now()}-${randomStr}.${fileExt}`

      // Xác định Content-Type chính xác cho Supabase (đặc biệt quan trọng trên Safari/iOS)
      let contentType = file.type
      if (!contentType) {
        if (fileExt === 'jpg' || fileExt === 'jpeg') contentType = 'image/jpeg'
        else if (fileExt === 'png') contentType = 'image/png'
        else if (fileExt === 'webp') contentType = 'image/webp'
        else if (fileExt === 'gif') contentType = 'image/gif'
        else contentType = 'application/octet-stream'
      }

      const { data, error } = await supabase.storage
        .from('menu-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: contentType
        })

      if (error) {
        throw error
      }

      const { data: urlData } = supabase.storage
        .from('menu-images')
        .getPublicUrl(fileName)

      if (!urlData || !urlData.publicUrl) {
        throw new Error('Không lấy được link ảnh công khai')
      }

      setForm(prev => ({ ...prev, image_url: urlData.publicUrl }))
      showMsg('Tải ảnh lên thành công!')
    } catch (err: any) {
      showMsg(err.message || 'Lỗi khi tải ảnh lên!', 'error')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setForm(prev => ({ ...prev, image_url: '' }))
  }

  const handleEdit = (item: MenuItem) => {
    const isPreset = PRESET_CATEGORIES.includes(item.category)
    setEditId(item.id)
    setForm({
      name: item.name,
      price: String(item.price),
      category: isPreset ? item.category : 'custom',
      customCategory: isPreset ? '' : item.category,
      description: item.description || '',
      is_active: item.is_active,
      image_url: item.image_url || '',
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa món này?')) return
    const apiKey = adminApiKey || 'ynuquan_secret_api_key_2026'
    
    try {
      const res = await fetch(`${apiUrl}/menu/${id}`, { 
        method: 'DELETE',
        headers: {
          'x-api-key': apiKey
        }
      })
      if (res.ok) {
        showMsg('Đã xóa món ăn thành công!')
        fetchItems(apiUrl, shopSlug)
      } else {
        const errData = await res.json()
        showMsg(errData.message || 'Không thể xóa món ăn!', 'error')
      }
    } catch (err) {
      showMsg('Lỗi kết nối khi xóa món!', 'error')
      console.error(err)
    }
  }

  const handleOpenAddModal = () => {
    setForm(emptyForm)
    setEditId(null)
    setIsModalOpen(true)
  }

  const handleCancel = () => {
    setForm(emptyForm)
    setEditId(null)
    setIsModalOpen(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/dangnhap')
    router.refresh()
  }

  // Danh sách các danh mục thực tế để hiển thị bộ lọc
  const uniqueCategories = useMemo(() => {
    const cats = new Set(items.map(item => item.category))
    return ['all', ...Array.from(cats)]
  }, [items])

  // Lọc và Tìm kiếm sản phẩm
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && item.is_active) ||
        (statusFilter === 'inactive' && !item.is_active)

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [items, searchTerm, categoryFilter, statusFilter])

  // Phân trang
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredItems.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredItems, currentPage])

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage + 1
  const endIndex = Math.min(currentPage * itemsPerPage, filteredItems.length)

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans relative overflow-x-hidden">
      
      {/* Backdrop overlay khi Sidebar di động mở */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* ================= SIDEBAR (CỘT TRÁI) ================= */}
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
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="flex items-center gap-3 bg-sky-500 text-white rounded-xl px-4 py-3 text-sm font-semibold shadow-md shadow-sky-500/10 hover:bg-sky-600 transition-all duration-200 text-left w-full"
            >
              {/* Product Box Icon */}
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>Sản phẩm</span>
            </button>
          </nav>
        </div>

        {/* Bottom Sidebar Action buttons */}
        <div className="flex flex-col gap-4">
          <button className="flex items-center justify-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors duration-200 rounded-xl py-3 px-4 text-xs font-semibold">
            {/* Support Info Icon */}
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Hỗ trợ kỹ thuật</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-500 hover:text-red-700 transition-colors duration-200 text-sm font-semibold pl-4"
          >
            {/* Logout Icon */}
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* ================= CONTENT AREA (PHẦN BÊN PHẢI) ================= */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          {/* Menu Button + Title */}
          <div className="flex items-center gap-3">
            {/* Hamburger Button cho Mobile */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <svg className="size-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 whitespace-nowrap">Quản lý sản phẩm</h1>
          </div>
          
          {/* Add product button and notifications */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Nút Thêm sản phẩm ẩn trên Mobile, hiển thị từ lg (Sử dụng nút floating ở cuối trang cho Mobile) */}
            <button
              onClick={handleOpenAddModal}
              className="hidden lg:flex bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full px-5 py-2.5 items-center gap-2 transition-all duration-200 shadow-md shadow-blue-600/10 cursor-pointer"
            >
              {/* Plus Icon */}
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Thêm sản phẩm</span>
            </button>

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

        {/* Subheader: Tìm kiếm sản phẩm di động & PC */}
        <section className="bg-white border-b border-slate-100 px-4 sm:px-8 py-3.5 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative max-w-md w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {/* Search Icon */}
              <svg className="size-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full bg-slate-100/80 focus:bg-white text-sm pl-10 pr-4 py-2.5 rounded-full border border-transparent focus:border-slate-300 focus:outline-none transition-all duration-200 text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
            {/* Dropdown nhóm sản phẩm */}
            <div className="relative flex-shrink-0">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="size-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </span>
              <select
                value={categoryFilter}
                onChange={e => {
                  setCategoryFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="appearance-none bg-slate-50 border border-slate-200 hover:bg-slate-100/50 text-slate-700 text-xs font-semibold rounded-lg pl-9 pr-8 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="all">Tất cả nhóm sản phẩm</option>
                {uniqueCategories.filter(c => c !== 'all').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                ▼
              </span>
            </div>

            {/* Toast message */}
            {msg && (
              <div className={`text-[10px] sm:text-xs font-bold px-2.5 py-1.5 rounded-lg border shadow-sm ${
                msgType === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
              }`}>
                {msg}
              </div>
            )}
          </div>
        </section>

        {/* Filter bar: Tabs trạng thái */}
        <section className="bg-white px-4 sm:px-8 py-2.5 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => {
                setStatusFilter('active')
                setCurrentPage(1)
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 flex-shrink-0 ${
                statusFilter === 'active'
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100/50'
              }`}
            >
              Đang kinh doanh
            </button>
            <button
              onClick={() => {
                setStatusFilter('inactive')
                setCurrentPage(1)
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 flex-shrink-0 ${
                statusFilter === 'inactive'
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100/50'
              }`}
            >
              Ngừng kinh doanh
            </button>
            <button
              onClick={() => {
                setStatusFilter('all')
                setCurrentPage(1)
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 flex-shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100/50'
              }`}
            >
              Tất cả
            </button>
          </div>
          
          <div className="text-xs text-slate-500 font-bold hidden sm:block">
            {filteredItems.length} sản phẩm đang hiển thị
          </div>
        </section>

        {/* Main Content Area */}
        <main className="p-4 sm:p-8 flex-1 flex flex-col min-h-0">
          
          {/* Label hiển thị tổng số sản phẩm cho Mobile */}
          <div className="flex justify-between items-center mb-3 sm:hidden px-1">
            <span className="text-xs text-slate-500 font-bold">{filteredItems.length} sản phẩm đang hiển thị</span>
            <span className="text-xs text-blue-600 font-bold flex items-center gap-1">
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Lọc
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col justify-between overflow-hidden">
            
            {/* 1. PC: BẢNG SẢN PHẨM (Hiển thị trên màn hình >= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Hình ảnh</th>
                    <th className="py-4 px-6">Tên sản phẩm</th>
                    <th className="py-4 px-6">Nhóm sản phẩm</th>
                    <th className="py-4 px-6 text-right">Giá (VNĐ)</th>
                    <th className="py-4 px-6 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <span className="text-4xl block mb-2">🍽️</span>
                        <p className="text-sm font-medium">Không tìm thấy sản phẩm nào phù hợp.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map(item => {
                      const categoryCode = item.category === 'Món ăn healthy' ? 'HLT' : item.category === 'Nước uống' ? 'DRK' : 'FOD'
                      const itemSku = `SKU: ${categoryCode}-${item.id.slice(0, 4).toUpperCase()}`
                      
                      return (
                        <tr 
                          key={item.id} 
                          onClick={() => handleEdit(item)}
                          className="hover:bg-slate-50/50 transition-colors duration-150 cursor-pointer"
                        >
                          <td className="py-3.5 px-6">
                            <div className="size-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl overflow-hidden relative">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="size-full object-cover" />
                              ) : (
                                item.category === 'Món ăn healthy' ? '🥗' : item.category === 'Nước uống' ? '🥤' : '🍿'
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-6">
                            <div>
                              <p className="font-bold text-slate-800 text-sm leading-snug">{item.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5 tracking-wider">{itemSku}</p>
                            </div>
                          </td>
                          <td className="py-3.5 px-6">
                            <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                              item.category === 'Món ăn healthy'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-150'
                                : item.category === 'Nước uống'
                                ? 'bg-blue-50 text-blue-700 border-blue-150'
                                : 'bg-amber-50 text-amber-700 border-amber-150'
                            }`}>
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right font-extrabold text-slate-800 text-sm">
                            {item.price.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-3.5 px-6">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                                className="p-2 text-blue-600 hover:bg-blue-50 transition-colors rounded-lg cursor-pointer"
                                title="Sửa"
                              >
                                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                className="p-2 text-red-500 hover:bg-red-50 transition-colors rounded-lg cursor-pointer"
                                title="Xóa"
                              >
                                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 2. MOBILE: DANH SÁCH CARD RESPONSIVE (Hiển thị trên màn hình < md) */}
            <div className="block md:hidden overflow-y-auto max-h-[60vh] p-4 space-y-3">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <span className="text-4xl block mb-2">🍽️</span>
                  <p className="text-sm font-medium">Không tìm thấy sản phẩm nào phù hợp.</p>
                </div>
              ) : (
                paginatedItems.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => handleEdit(item)}
                    className="border border-slate-100 rounded-2xl bg-white p-3.5 flex items-center justify-between gap-4 shadow-xs cursor-pointer hover:border-blue-200 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Thumbnail ảnh */}
                      <div className="size-14 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-3xl overflow-hidden flex-shrink-0 relative">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="size-full object-cover" />
                        ) : (
                          item.category === 'Món ăn healthy' ? '🥗' : item.category === 'Nước uống' ? '🥤' : '🍿'
                        )}
                      </div>

                      {/* Thông tin */}
                      <div className="min-w-0">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          item.category === 'Món ăn healthy'
                            ? 'bg-emerald-50 text-emerald-700'
                            : item.category === 'Nước uống'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {item.category}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm leading-snug mt-1 truncate">{item.name}</h4>
                        <p className="text-blue-600 font-extrabold text-xs mt-0.5">
                          {item.price.toLocaleString('vi-VN')}đ
                        </p>
                      </div>
                    </div>

                    {/* Menu Actions nhỏ gọn cho Mobile */}
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                        className="p-2 text-blue-600 hover:bg-blue-55 rounded-full cursor-pointer"
                        title="Sửa"
                      >
                        <svg className="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        className="p-2 text-red-500 hover:bg-red-55 rounded-full cursor-pointer"
                        title="Xóa"
                      >
                        <svg className="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination footer */}
            <div className="h-16 px-6 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 bg-white">
              <div>
                {filteredItems.length > 0 ? (
                  <span>Hiển thị {startIndex} - {endIndex} của {filteredItems.length} món</span>
                ) : (
                  <span>0 sản phẩm</span>
                )}
              </div>
              
              {/* Nút Phân Trang */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    className="size-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ‹
                  </button>
                  <button
                    className="size-7 flex items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs"
                  >
                    {currentPage}
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    className="size-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* ========================================================== */}
      {/* ============ STICKY BOTTOM BUTTON CHO MOBILE ============ */}
      {/* ========================================================== */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-3.5 flex justify-center lg:hidden z-30 shadow-lg">
        <button
          onClick={handleOpenAddModal}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-md shadow-blue-600/10 cursor-pointer"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Thêm sản phẩm</span>
        </button>
      </div>

      {/* ========================================================== */}
      {/* ================= RESPONSIVE MODAL DIALOG ================= */}
      {/* ========================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300">
          {/* Modal Container: Bottom sheet trên Mobile, Standard Modal trên Desktop */}
          <div className="bg-white w-full max-h-[92vh] sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden border-t sm:border border-slate-200 transform transition-all duration-300 scale-100 flex flex-col">
            
            {/* Thanh drag handle chỉ hiển thị trên Mobile */}
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-3 block sm:hidden flex-shrink-0"></div>

            {/* Modal Header */}
            <div className="px-6 pb-4 sm:pt-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
              <h3 className="font-bold text-slate-900 text-base">
                {editId ? '✏️ Cập nhật thông tin sản phẩm' : 'Thêm sản phẩm mới'}
              </h3>
              <button
                onClick={handleCancel}
                className="size-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center text-xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">
              
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Tên sản phẩm <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nhập tên sản phẩm..."
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
                />
              </div>

              {/* Product Price & Quantity Side by Side (50% - 50%) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    Giá bán (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    Số lượng
                  </label>
                  <input
                    type="number"
                    defaultValue="1"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
                  />
                </div>
              </div>

              {/* Category Dropdown Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Danh mục <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200 cursor-pointer"
                >
                  {PRESET_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="custom">➕ Thêm nhóm sản phẩm khác...</option>
                </select>

                {/* Custom Category Input */}
                {form.category === 'custom' && (
                  <input
                    type="text"
                    placeholder="Nhập tên nhóm sản phẩm mới"
                    value={form.customCategory}
                    onChange={e => setForm({ ...form, customCategory: e.target.value })}
                    className="w-full mt-3 bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
                  />
                )}
              </div>

              {/* Product Image */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Hình ảnh sản phẩm
                </label>
                
                {form.image_url ? (
                  <div className="relative border border-slate-200 rounded-xl p-2 bg-slate-50 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-16 rounded-lg overflow-hidden border border-slate-200 bg-white relative flex-shrink-0">
                        <img 
                          src={form.image_url} 
                          alt="Preview" 
                          className="size-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">
                          {form.image_url.split('/').pop()}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5">
                          {form.image_url}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="size-8 rounded-full bg-red-50 hover:bg-red-100 text-red-600 transition-colors flex items-center justify-center font-bold text-sm cursor-pointer mr-1"
                      title="Xóa hình ảnh"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/10 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                      {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="size-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs font-semibold text-blue-600">Đang tải ảnh lên...</span>
                        </div>
                      ) : (
                        <>
                          <svg className="size-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs font-semibold text-slate-500">Chọn file ảnh hoặc Kéo thả vào đây</span>
                          <span className="text-[10px] text-slate-400">Hỗ trợ JPG, PNG, WEBP tối đa 5MB</span>
                          <span className="text-[9px] text-amber-600 font-semibold mt-1 max-w-[280px]">💡 Lưu ý trên iPhone: Hãy chọn ảnh từ "Thư viện ảnh" để iOS tự động chuyển đổi sang JPG.</span>
                        </>
                      )}
                    </label>
                    
                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">hoặc</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <input
                      type="text"
                      placeholder="Dán link URL hình ảnh trực tiếp..."
                      value={form.image_url}
                      onChange={e => setForm({ ...form, image_url: e.target.value })}
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Mô tả sản phẩm
                </label>
                <textarea
                  placeholder="Nhập mô tả chi tiết..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200 resize-none"
                />
              </div>

              {/* Status Toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none mt-1">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-50 border-slate-300 cursor-pointer"
                />
                <span className="text-sm font-semibold text-slate-600">Đang kinh doanh (Hiển thị sản phẩm)</span>
              </label>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={handleCancel}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 py-2.5 px-5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || uploading}
                className="bg-sky-600 hover:bg-sky-700 disabled:opacity-55 disabled:cursor-not-allowed text-white py-2.5 px-6 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-md shadow-sky-600/10"
              >
                {loading ? 'Đang lưu...' : uploading ? 'Đang tải ảnh...' : 'Lưu thông tin'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
