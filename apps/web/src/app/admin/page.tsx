'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ProductTable from './components/ProductTable'
import ProductFormModal from './components/ProductFormModal'
import CategoryManager from './components/CategoryManager'
import ProductReorderPanel from './components/ProductReorderPanel'

type MenuItem = {
  id: string
  name: string
  price: number
  category: string
  sub_category?: string | null
  description: string
  is_active: boolean
  shop_slug: string
  image_url?: string
  sort_order?: number
}

type Category = {
  id: string
  shop_slug: string
  name: string
  sort_order: number
}

const PRESET_CATEGORIES = ['Món ăn healthy', 'Món ăn vặt', 'Nước uống']

const SUB_CATEGORIES_MAP: Record<string, string[]> = {
  'Món ăn healthy': ['Cơm', 'Bún', 'Phở', 'Salad'],
  'Món ăn vặt': ['Mì', 'Súp', 'Tobokki', 'Bánh tráng', 'Viên chiên', 'Ăn kèm'],
  'Nước uống': ['Trà sữa', 'Trà trái cây', 'Cà phê', 'Nước ngọt', 'Đá xay'],
}

const emptyForm = {
  name: '',
  price: '',
  category: 'Món ăn healthy',
  customCategory: '',
  sub_category: '',
  customSubCategory: '',
  description: '',
  is_active: true,
  image_url: '',
}

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()

  const [shopSlug, setShopSlug] = useState('')
  const [configLoaded, setConfigLoaded] = useState(false)
  const [items, setItems] = useState<MenuItem[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)

  // State điều hướng tab
  const [activeTab, setActiveTab] = useState<'products' | 'reorder'>('products')
  // Category được chọn trong view Sắp xếp menu
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // States cho Modal, Sidebar di động, Search, và Filters
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  const filterDropdownRef = useRef<HTMLDivElement>(null)

  // State Phân trang
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error'>('success')

  // Danh sách categories thực tế
  const [categoriesList, setCategoriesList] = useState<Category[]>([])

  // Dynamic categories: loaded from backend
  const dynamicCategories = useMemo(() => {
    return categoriesList.map(c => c.name)
  }, [categoriesList])

  // Dynamic subcategories mapping
  const dynamicSubCategoriesMap = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    Object.entries(SUB_CATEGORIES_MAP).forEach(([cat, subs]) => {
      map[cat] = new Set(subs)
    })
    items.forEach(item => {
      if (item.category && item.sub_category) {
        if (!map[item.category]) map[item.category] = new Set()
        map[item.category].add(item.sub_category)
      }
    })
    const result: Record<string, string[]> = {}
    Object.entries(map).forEach(([cat, set]) => {
      result[cat] = Array.from(set)
    })
    return result
  }, [items])

  const fetchItems = async (currentShopSlug = shopSlug) => {
    if (!currentShopSlug) return
    try {
      const res = await fetch(`/api/admin/menu/${currentShopSlug}?all=true`)
      const data = await res.json()
      setItems(data || [])
    } catch (err) {
      console.error('Lỗi khi tải danh sách món:', err)
    }
  }

  const fetchCategories = async (currentShopSlug = shopSlug) => {
    if (!currentShopSlug) return
    try {
      const res = await fetch(`/api/admin/categories/${currentShopSlug}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setCategoriesList(data)
      } else {
        console.error('Lỗi nhận dữ liệu categories (không phải Array):', data)
        setCategoriesList([])
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách category:', err)
      setCategoriesList([])
    }
  }

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch('/api/config')
        const data = await res.json()
        setShopSlug(data.shopSlug)
        setConfigLoaded(true)
      } catch (err) {
        console.error('Lỗi khi tải cấu hình:', err)
        setShopSlug('quan-test')
        setConfigLoaded(true)
      }
    }
    loadConfig()
  }, [])

  useEffect(() => {
    if (configLoaded && shopSlug) {
      fetchItems(shopSlug)
      fetchCategories(shopSlug)
    }
  }, [configLoaded, shopSlug])

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(''), 3000)
  }

  const handleSubmit = async () => {
    const finalCategory = form.category === 'custom' ? form.customCategory.trim() : form.category
    const finalSubCategory = form.sub_category === 'custom' ? form.customSubCategory.trim() : form.sub_category

    if (!form.name.trim() || !form.price || !finalCategory) {
      showMsg('Vui lòng điền đủ tên, giá và danh mục sản phẩm!', 'error')
      return
    }

    setLoading(true)

    // Kiểm tra và tạo category nếu chưa tồn tại
    const finalCategoryNorm = finalCategory.trim().toLowerCase()
    const categoryExists = categoriesList.some(
      c => c.name.trim().toLowerCase() === finalCategoryNorm
    )

    if (!categoryExists) {
      try {
        const createCatRes = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shop_slug: shopSlug, name: finalCategory }),
        })
        if (!createCatRes.ok) {
          const errData = await createCatRes.json().catch(() => ({ message: 'Lỗi tạo nhóm mới' }))
          showMsg(errData.message || 'Không thể tạo nhóm sản phẩm mới!', 'error')
          setLoading(false)
          return
        }
        await fetchCategories(shopSlug)
      } catch (err) {
        showMsg('Có lỗi xảy ra khi tạo nhóm sản phẩm!', 'error')
        console.error(err)
        setLoading(false)
        return
      }
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      category: finalCategory,
      sub_category: finalSubCategory || null,
      is_active: form.is_active,
      shop_slug: shopSlug,
      image_url: form.image_url.trim(),
    }

    try {
      let res
      if (editId) {
        res = await fetch(`/api/admin/menu/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          showMsg('Cập nhật món ăn thành công!')
        } else {
          const errData = await res.json()
          showMsg(errData.message || 'Lỗi khi cập nhật món!', 'error')
        }
      } else {
        res = await fetch(`/api/admin/menu`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        fetchItems(shopSlug)
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

    const fileExt = file.name.split('.').pop()?.toLowerCase()
    if (fileExt === 'heic' || fileExt === 'heif') {
      showMsg('Định dạng HEIC (iPhone) không hỗ trợ trên Web!', 'error')
      alert(
        'LƯU Ý QUAN TRỌNG CHO IPHONE/IPAD (iOS):\n\n' +
          'Ảnh định dạng HEIC trực tiếp từ máy ảnh iPhone không thể hiển thị trên trang web.\n\n' +
          'Cách khắc phục:\n' +
          '1. Vui lòng chọn ảnh từ "Thư viện ảnh" (Photo Library) thay vì mục "Tệp" (Files) để iOS tự động chuyển đổi sang JPG trước khi tải lên.\n' +
          '2. Hoặc chuyển đổi ảnh sang JPG/PNG trước khi tải lên.',
      )
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showMsg('Dung lượng ảnh tối đa là 5MB!', 'error')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('shopSlug', shopSlug)

      const res = await fetch('/api/admin/menu/upload-image', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: 'Lỗi không xác định' }))
        throw new Error(errData.message || `HTTP ${res.status}`)
      }

      const result = await res.json()
      if (!result.url) throw new Error('Không nhận được URL ảnh từ server')

      setForm(prev => ({ ...prev, image_url: result.url }))
      const saved = result.stats?.savedKB
      showMsg(`Tải ảnh thành công!${saved ? ` (tiết kiệm ${saved}KB sau nén)` : ''}`)
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
    const isPreset = dynamicCategories.includes(item.category)
    const subPresets = isPreset ? (dynamicSubCategoriesMap[item.category] || []) : []
    const isSubPreset = item.sub_category ? subPresets.includes(item.sub_category) : true

    setEditId(item.id)
    setForm({
      name: item.name,
      price: String(item.price),
      category: isPreset ? item.category : 'custom',
      customCategory: isPreset ? '' : item.category,
      sub_category: item.sub_category ? (isSubPreset ? item.sub_category : 'custom') : '',
      customSubCategory: item.sub_category && !isSubPreset ? item.sub_category : '',
      description: item.description || '',
      is_active: item.is_active,
      image_url: item.image_url || '',
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa món này?')) return

    try {
      const res = await fetch(`/api/admin/menu/${id}`, { method: 'DELETE' })
      if (res.ok) {
        showMsg('Đã xóa món ăn thành công!')
        fetchItems(shopSlug)
      } else {
        const errData = await res.json()
        showMsg(errData.message || 'Không thể xóa món ăn!', 'error')
      }
    } catch (err) {
      showMsg('Lỗi kết nối khi xóa món!', 'error')
      console.error(err)
    }
  }

  const handleDeleteCategoryFromFilter = async (catName: string) => {
    if (!confirm(`Xóa nhóm "${catName}"?\nChỉ xóa được nếu không còn món nào trong nhóm này.`)) return
    const cat = categoriesList.find(c => c.name === catName)
    if (!cat) return
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        showMsg(err.message || 'Không thể xóa nhóm!', 'error')
        return
      }
      if (categoryFilter === catName) setCategoryFilter('all')
      await fetchCategories(shopSlug)
      await fetchItems(shopSlug)
      showMsg(`Đã xóa nhóm "${catName}"`)
    } catch {
      showMsg('Lỗi kết nối khi xóa nhóm!', 'error')
    }
  }

  const handleDeleteSubCategory = async (category: string, subCategory: string) => {
    if (!confirm(`Xóa nhóm phụ "${subCategory}"?\nTất cả sản phẩm trong nhóm phụ này sẽ không còn được gắn nhóm phụ đó nữa.`)) return
    try {
      const targetItems = items.filter(
        item => item.category === category && item.sub_category === subCategory
      )
      await Promise.all(
        targetItems.map(item =>
          fetch(`/api/admin/menu/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, sub_category: null }),
          })
        )
      )
      await fetchItems(shopSlug)
      if (form.sub_category === subCategory) {
        setForm(prev => ({ ...prev, sub_category: '', customSubCategory: '' }))
      }
      showMsg(`Đã xóa nhóm phụ "${subCategory}" (${targetItems.length} sản phẩm đã được cập nhật)`)
    } catch (err) {
      showMsg('Lỗi khi xóa nhóm phụ!', 'error')
      console.error(err)
    }
  }

  // Đóng filter dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setIsFilterDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    const start = (currentPage - 1) * itemsPerPage
    return filteredItems.slice(start, start + itemsPerPage)
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
        />
      )}

      {/* SIDEBAR (CỘT TRÁI) */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* CONTENT AREA (PHẦN BÊN PHẢI) */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Header */}
        <Header onOpenSidebar={() => setIsSidebarOpen(true)} onOpenAddModal={handleOpenAddModal} />

        {/* Subheader: Tìm kiếm & Filter — chỉ hiện khi ở tab Sản phẩm */}
        {activeTab === 'products' && (
          <>
            <section className="bg-white border-b border-slate-100 px-4 sm:px-8 py-3.5 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              <div className="relative max-w-md w-full">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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

              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {/* Custom Dropdown nhóm sản phẩm có nút xóa */}
                <div className="relative flex-shrink-0" ref={filterDropdownRef}>
                  <button
                    onClick={() => setIsFilterDropdownOpen(prev => !prev)}
                    className="flex items-center gap-2 bg-slate-50 border border-slate-200 hover:bg-slate-100/50 text-slate-700 text-xs font-semibold rounded-lg pl-3 pr-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer min-w-[160px] justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <svg className="size-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                      <span className="truncate max-w-[120px]">
                        {categoryFilter === 'all' ? 'Tất cả nhóm SP' : categoryFilter}
                      </span>
                    </span>
                    <span className="text-slate-400 text-[10px]">▼</span>
                  </button>

                  {isFilterDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-lg min-w-[200px] py-1.5 overflow-hidden">
                      {/* Option "Tất cả" */}
                      <button
                        onClick={() => { setCategoryFilter('all'); setCurrentPage(1); setIsFilterDropdownOpen(false) }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors ${
                          categoryFilter === 'all' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Tất cả nhóm sản phẩm
                      </button>

                      {uniqueCategories.filter(c => c !== 'all').length > 0 && (
                        <div className="border-t border-slate-100 mt-1 pt-1">
                          {uniqueCategories.filter(c => c !== 'all').map(cat => (
                            <div
                              key={cat}
                              className={`flex items-center justify-between px-2 py-1 group transition-colors ${
                                categoryFilter === cat ? 'bg-blue-50' : 'hover:bg-slate-50'
                              }`}
                            >
                              <button
                                onClick={() => { setCategoryFilter(cat); setCurrentPage(1); setIsFilterDropdownOpen(false) }}
                                className={`flex-1 text-left px-2 py-1.5 text-xs font-semibold truncate transition-colors ${
                                  categoryFilter === cat ? 'text-blue-600' : 'text-slate-700'
                                }`}
                              >
                                {cat}
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); setIsFilterDropdownOpen(false); handleDeleteCategoryFromFilter(cat) }}
                                className="size-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                                title={`Xóa nhóm "${cat}"`}
                              >
                                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
              <div className="flex gap-1.5 overflow-x-auto">
                {(['active', 'inactive', 'all'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setCurrentPage(1) }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 flex-shrink-0 ${
                      statusFilter === s
                        ? 'bg-blue-50 border-blue-200 text-blue-600'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100/50'
                    }`}
                  >
                    {s === 'active' ? 'Đang kinh doanh' : s === 'inactive' ? 'Ngừng kinh doanh' : 'Tất cả'}
                  </button>
                ))}
              </div>
              <div className="text-xs text-slate-500 font-bold hidden sm:block">
                {filteredItems.length} sản phẩm đang hiển thị
              </div>
            </section>
          </>
        )}

        {/* Main Content Area */}
        <main className="p-4 sm:p-8 flex-1 flex flex-col min-h-0">
          {activeTab === 'products' ? (
            <>
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
              <ProductTable
                filteredItems={filteredItems}
                paginatedItems={paginatedItems}
                currentPage={currentPage}
                totalPages={totalPages}
                startIndex={startIndex}
                endIndex={endIndex}
                setCurrentPage={setCurrentPage}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </>
          ) : (
            /* View Sắp xếp menu: CategoryManager bên trái, ProductReorderPanel bên phải (Mobile drill-down, Desktop side-by-side) */
            <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
              {/* Cột trái: Quản lý danh mục */}
              <div className={`w-full md:w-80 flex-shrink-0 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col min-h-0 ${
                selectedCategory !== null ? 'hidden md:flex' : 'flex'
              }`}>
                {configLoaded && shopSlug && (
                  <CategoryManager
                    shopSlug={shopSlug}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                    onCategoriesChanged={() => {
                      fetchItems(shopSlug)
                      fetchCategories(shopSlug)
                    }}
                  />
                )}
              </div>

              {/* Cột phải: Sắp xếp món theo category đang chọn */}
              <div className={`flex-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm overflow-y-auto flex flex-col min-h-0 ${
                selectedCategory === null ? 'hidden md:flex' : 'flex'
              }`}>
                {configLoaded && shopSlug && (
                  <ProductReorderPanel
                    shopSlug={shopSlug}
                    categoryName={selectedCategory}
                    onBack={() => setSelectedCategory(null)}
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* STICKY BOTTOM BUTTON CHO MOBILE (chỉ hiện ở tab Sản phẩm) */}
      {activeTab === 'products' && (
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
      )}

      {/* RESPONSIVE MODAL DIALOG */}
      {isModalOpen && (
      <ProductFormModal
          form={form}
          setForm={setForm}
          editId={editId}
          loading={loading}
          uploading={uploading}
          dynamicCategories={dynamicCategories}
          dynamicSubCategoriesMap={dynamicSubCategoriesMap}
          onSubmit={handleSubmit}
          onImageUpload={handleImageUpload}
          onRemoveImage={handleRemoveImage}
          onCancel={handleCancel}
          onDeleteSubCategory={handleDeleteSubCategory}
        />
      )}
    </div>
  )
}



