'use client'

import { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Toast from './Toast'

type Category = {
  id: string
  shop_slug: string
  name: string
  sort_order: number
}

interface CategoryManagerProps {
  shopSlug: string
  selectedCategory: string | null
  onSelectCategory: (name: string | null) => void
  onCategoriesChanged?: () => void
}

// Component từng dòng category kéo thả
function SortableCategoryItem({
  category,
  isSelected,
  onSelect,
  onDelete,
  isPlaceholder = false,
}: {
  category: Category
  isSelected: boolean
  onSelect: () => void
  onDelete: (id: string) => void
  isPlaceholder?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  if (isDragging || isPlaceholder) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-14 w-full border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 flex-shrink-0"
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`flex items-center justify-between h-14 w-full rounded-xl border transition-all duration-150 cursor-pointer select-none flex-shrink-0 ${
        isSelected
          ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm shadow-blue-50'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-1.5 flex-1 min-w-0 h-full">
        {/* Tay nắm kéo: 44x44px touch target */}
        <button
          {...attributes}
          {...listeners}
          className="size-11 flex items-center justify-center text-slate-400 hover:text-slate-600 active:text-slate-800 cursor-grab active:cursor-grabbing touch-none focus:outline-none flex-shrink-0"
          onClick={e => e.stopPropagation()}
          aria-label="Kéo để sắp xếp"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
          </svg>
        </button>

        <span className="flex-1 text-sm font-semibold truncate py-2 pr-2">{category.name}</span>
      </div>

      {/* Nút xóa: touch target 44x44px */}
      <button
        onClick={e => {
          e.stopPropagation()
          onDelete(category.id)
        }}
        className="size-11 flex items-center justify-center text-slate-300 hover:text-red-500 active:text-red-700 transition-colors flex-shrink-0 focus:outline-none cursor-pointer"
        aria-label={`Xóa danh mục ${category.name}`}
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default function CategoryManager({
  shopSlug,
  selectedCategory,
  onSelectCategory,
  onCategoriesChanged,
}: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newCatName, setNewCatName] = useState('')
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cấu hình sensor cho mobile và desktop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  )

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/admin/categories/${shopSlug}`)
      const data = await res.json()
      setCategories(data || [])
    } catch {
      showToast('Không thể tải danh sách nhóm sản phẩm', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (shopSlug) fetchCategories()
  }, [shopSlug])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = categories.findIndex(c => c.id === active.id)
    const newIndex = categories.findIndex(c => c.id === over.id)

    // Optimistic update: cập nhật UI ngay
    const prevCategories = [...categories]
    const reordered = arrayMove(categories, oldIndex, newIndex).map((cat, i) => ({
      ...cat,
      sort_order: i,
    }))
    setCategories(reordered)

    try {
      const order = reordered.map(c => ({ id: c.id, sort_order: c.sort_order }))
      const res = await fetch('/api/admin/categories/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_slug: shopSlug, order }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Lỗi lưu thứ tự')
      }

      showToast('Đã cập nhật thứ tự danh mục')
      onCategoriesChanged?.()
    } catch (err: any) {
      // Rollback về trạng thái cũ
      setCategories(prevCategories)
      showToast(err.message || 'Lỗi lưu thứ tự, vui lòng thử lại', 'error')
    }
  }

  const handleAddCategory = async () => {
    const name = newCatName.trim()
    if (!name) return
    setAdding(true)

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_slug: shopSlug, name }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Lỗi tạo nhóm')
      }

      setNewCatName('')
      setIsAddModalOpen(false)
      await fetchCategories()
      showToast(`Đã thêm nhóm "${name}"`)
      onCategoriesChanged?.()
    } catch (err: any) {
      showToast(err.message || 'Lỗi tạo nhóm mới', 'error')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    const cat = categories.find(c => c.id === id)
    if (!cat) return
    if (!confirm(`Xóa nhóm "${cat.name}"?\nChỉ xóa được nếu không còn món nào trong nhóm này.`)) return

    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Lỗi xóa nhóm')
      }
      await fetchCategories()
      // Nếu category đang xóa trùng với category được chọn, reset selection
      if (selectedCategory === cat.name) {
        onSelectCategory(null)
      }
      showToast(`Đã xóa nhóm "${cat.name}"`)
      onCategoriesChanged?.()
    } catch (err: any) {
      showToast(err.message || 'Không thể xóa nhóm', 'error')
    }
  }

  useEffect(() => {
    if (isAddModalOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isAddModalOpen])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 h-64">
        <div className="size-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const activeCategory = categories.find(c => c.id === activeId)

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">📂</span>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Danh mục</h3>
        </div>
        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
          {categories.length} nhóm
        </span>
      </div>

      {categories.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center text-center p-6 py-12 flex-1 min-h-[300px] gap-4">
          <div className="size-20 rounded-full bg-slate-100 flex items-center justify-center text-4xl shadow-inner">
            🍽️
          </div>
          <p className="text-sm font-semibold text-slate-600 max-w-xs leading-relaxed">
            Chưa có danh mục nào, thêm danh mục đầu tiên để bắt đầu sắp xếp menu
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer h-12"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Thêm nhóm đầu tiên</span>
          </button>
        </div>
      ) : (
        /* Category list scroll area */
        <div className="flex-1 overflow-y-auto pb-20 md:pb-4 pr-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
            autoScroll={true}
          >
            <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {categories.map(cat => (
                  <SortableCategoryItem
                    key={cat.id}
                    category={cat}
                    isSelected={selectedCategory === cat.name}
                    onSelect={() => onSelectCategory(cat.name)}
                    onDelete={handleDeleteCategory}
                  />
                ))}
              </div>
            </SortableContext>

            {/* Custom Drag Overlay for visual scale/shadow feedback */}
            <DragOverlay adjustScale={false}>
              {activeId && activeCategory ? (
                <div className="flex items-center justify-between h-14 w-full rounded-xl border border-blue-300 bg-blue-50 text-blue-700 shadow-xl scale-[1.03] opacity-90 select-none cursor-grabbing">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 h-full">
                    <div className="size-11 flex items-center justify-center text-blue-500 flex-shrink-0">
                      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                    <span className="flex-1 text-sm font-semibold truncate py-2">{activeCategory.name}</span>
                  </div>
                  <div className="size-11 flex items-center justify-center text-slate-300 flex-shrink-0">
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Sticky Bottom button on mobile, inline button on desktop */}
          <div className="fixed bottom-0 inset-x-0 bg-white/90 border-t border-slate-200 p-3.5 flex justify-center md:hidden z-30 shadow-lg">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white h-14 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/10 cursor-pointer"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Thêm nhóm</span>
            </button>
          </div>

          <div className="hidden md:flex mt-4 pt-2 border-t border-slate-100">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Thêm nhóm mới</span>
            </button>
          </div>
        </div>
      )}

      {/* dialog popup modal thêm danh mục */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsAddModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl p-5 shadow-xl max-w-sm w-full border border-slate-100 z-10 flex flex-col gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Thêm danh mục mới</h4>
              <p className="text-xs text-slate-500 mt-1">Nhập tên cho nhóm sản phẩm/danh mục của cửa hàng bạn.</p>
            </div>
            <div>
              <input
                ref={inputRef}
                type="text"
                placeholder="Ví dụ: Món ăn healthy, Nước uống..."
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
              />
            </div>
            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="h-11 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleAddCategory}
                disabled={adding || !newCatName.trim()}
                className="h-11 px-5 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {adding ? (
                  <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Thêm</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
