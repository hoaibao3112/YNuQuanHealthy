'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
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

type MenuItem = {
  id: string
  name: string
  price: number
  category: string
  image_url?: string
  sort_order: number
}

interface ProductReorderPanelProps {
  shopSlug: string
  categoryName: string | null
  onBack?: () => void
}

// Component từng dòng sản phẩm kéo thả
function SortableProductItem({
  item,
  isPlaceholder = false,
}: {
  item: MenuItem
  isPlaceholder?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

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
      className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl h-14 w-full px-3 select-none flex-shrink-0"
    >
      {/* Tay nắm kéo: 44x44px touch target */}
      <button
        {...attributes}
        {...listeners}
        className="size-11 flex items-center justify-center text-slate-400 hover:text-slate-600 active:text-slate-800 cursor-grab active:cursor-grabbing touch-none focus:outline-none flex-shrink-0"
        aria-label="Kéo để sắp xếp"
      >
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
        </svg>
      </button>

      {/* Ảnh thu nhỏ: size-10 (40px) */}
      <div className="size-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 relative">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            sizes="40px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-base">🥗</div>
        )}
      </div>

      {/* Tên và giá */}
      <div className="flex-1 min-w-0 pr-2">
        <p className="text-sm font-semibold text-slate-800 truncate leading-snug">{item.name}</p>
        <p className="text-xs text-slate-500 font-medium leading-none mt-0.5">{item.price.toLocaleString('vi-VN')}đ</p>
      </div>
    </div>
  )
}

export default function ProductReorderPanel({
  shopSlug,
  categoryName,
  onBack,
}: ProductReorderPanelProps) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

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

  const fetchItems = async () => {
    if (!shopSlug || !categoryName) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/menu/${shopSlug}?all=true`)
      const data: MenuItem[] = await res.json()
      // Lọc theo category (trim + lowercase để tránh lệch nhóm)
      const catLower = categoryName.trim().toLowerCase()
      const filtered = (data || [])
        .filter(item => (item.category || '').trim().toLowerCase() === catLower)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      setItems(filtered)
    } catch {
      showToast('Không thể tải danh sách món ăn', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [shopSlug, categoryName])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex(i => i.id === active.id)
    const newIndex = items.findIndex(i => i.id === over.id)

    // Optimistic update: cập nhật UI ngay
    const prevItems = [...items]
    const reordered = arrayMove(items, oldIndex, newIndex).map((item, i) => ({
      ...item,
      sort_order: i,
    }))
    setItems(reordered)

    try {
      const order = reordered.map(item => ({ id: item.id, sort_order: item.sort_order }))
      const res = await fetch('/api/admin/menu/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_slug: shopSlug, order }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Lỗi lưu thứ tự')
      }

      showToast('Đã lưu thứ tự món ăn')
    } catch (err: any) {
      // Rollback về trạng thái cũ
      setItems(prevItems)
      showToast(err.message || 'Lỗi lưu thứ tự, vui lòng thử lại', 'error')
    }
  }

  if (!categoryName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-400 gap-3 p-6 text-center">
        <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center text-3xl">
          📂
        </div>
        <p className="text-sm font-semibold text-slate-600">Chọn một danh mục để sắp xếp món</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 h-64">
        <div className="size-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const activeItem = items.find(i => i.id === activeId)

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

      {/* Header controls bar */}
      <div className="flex flex-col gap-2.5 pb-3 border-b border-slate-100 flex-shrink-0">
        {/* Nút Quay lại - Chỉ hiển thị trên mobile */}
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden flex items-center gap-1.5 text-slate-500 hover:text-slate-800 active:text-slate-900 font-bold text-sm h-11 px-3 -ml-3 rounded-xl hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer w-fit"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Quay lại</span>
          </button>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="text-lg flex-shrink-0">🍔</span>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider truncate">
              Món ăn: <span className="text-blue-600 normal-case font-bold">{categoryName}</span>
            </h3>
          </div>
          <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0">
            {items.length} món
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center text-center p-6 py-12 flex-1 min-h-[300px] gap-4">
          <div className="size-20 rounded-full bg-slate-100 flex items-center justify-center text-4xl shadow-inner">
            🍽️
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-bold text-slate-700">Danh mục này chưa có món nào</p>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Quay lại tab Sản phẩm để thêm món vào danh mục này.
            </p>
          </div>
        </div>
      ) : (
        /* Draggable List container */
        <div className="flex-1 overflow-y-auto pr-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
            autoScroll={true}
          >
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {items.map(item => (
                  <SortableProductItem
                    key={item.id}
                    item={item}
                  />
                ))}
              </div>
            </SortableContext>

            {/* Custom Drag Overlay for visual scale/shadow feedback */}
            <DragOverlay adjustScale={false}>
              {activeId && activeItem ? (
                <div className="flex items-center gap-3 bg-white border border-blue-300 rounded-xl h-14 w-full px-3 select-none shadow-xl scale-[1.03] opacity-90 cursor-grabbing">
                  <div className="size-11 flex items-center justify-center text-blue-500 flex-shrink-0">
                    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                  <div className="size-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 relative">
                    {activeItem.image_url ? (
                      <Image
                        src={activeItem.image_url}
                        alt={activeItem.name}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-base">🥗</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-semibold text-slate-800 truncate leading-snug">{activeItem.name}</p>
                    <p className="text-xs text-slate-500 font-medium leading-none mt-0.5">{activeItem.price.toLocaleString('vi-VN')}đ</p>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          <p className="text-[10px] text-slate-400 text-center py-4">
            Kéo biểu tượng <span className="font-bold">⠿</span> để đổi vị trí · Tự động lưu sau khi thả
          </p>
        </div>
      )}
    </div>
  )
}
