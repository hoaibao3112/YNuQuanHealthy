'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { MenuItem } from './page'
import OrderPanel from './OrderPanel'
import Image from 'next/image'
import { createClient } from '@/lib/supabase-client'

export interface CartItem extends MenuItem {
  quantity: number
}

export default function MenuClient({
  items: initialItems,
  slug,
}: {
  items: MenuItem[]
  slug: string
}) {
  const supabase = createClient()

  // State cục bộ — khởi tạo từ SSR props, cập nhật qua Realtime / polling
  const [items, setItems] = useState<MenuItem[]>(initialItems)
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('Món ăn healthy')
  const [activeSubCategory, setActiveSubCategory] = useState<string>('all')
  const [showOrderPanel, setShowOrderPanel] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)

  // Ref cho debounce timer
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ref cho fallback polling
  const pollingTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Hàm tải lại danh sách món từ API (dùng chung cho Realtime + polling)
  const refetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/menu/${slug}`)
      if (!res.ok) return
      const data: MenuItem[] = await res.json()
      setItems(data)
    } catch (err) {
      console.error('[MenuClient] Lỗi refetch:', err)
    }
  }, [slug])

  // Debounce refetch để gom nhiều event Realtime liên tiếp thành 1 lần gọi
  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current)
    refetchTimer.current = setTimeout(() => {
      refetchItems()
    }, 400) // debounce 400ms
  }, [refetchItems])

  useEffect(() => {
    // Subscribe Realtime cho cả menu_items và categories
    const channel = supabase
      .channel(`menu-realtime-${slug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items',
          filter: `shop_slug=eq.${slug}`,
        },
        () => scheduleRefetch(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `shop_slug=eq.${slug}`,
        },
        () => scheduleRefetch(),
      )
      .subscribe()

    // Fallback polling 60s — bù khi event UPDATE bị RLS chặn (is_active false)
    pollingTimer.current = setInterval(refetchItems, 60_000)

    return () => {
      supabase.removeChannel(channel)
      if (refetchTimer.current) clearTimeout(refetchTimer.current)
      if (pollingTimer.current) clearInterval(pollingTimer.current)
    }
  }, [slug, scheduleRefetch, refetchItems])

  // Sắp xếp categories theo sort_order của item đầu tiên trong nhóm
  // (đại diện cho sort_order của category được gán từ bảng categories)
  const categories = useMemo(() => {
    const seen = new Set<string>()
    const ordered: string[] = []
    items.forEach(item => {
      if (!seen.has(item.category)) {
        seen.add(item.category)
        ordered.push(item.category)
      }
    })
    return ordered
  }, [items])

  const subCategories = useMemo(() => {
    if (activeCategory === 'all') return []
    const itemsInCat = items.filter((i) => i.category === activeCategory)
    const subs = itemsInCat
      .map((i) => i.sub_category?.trim())
      .filter((s): s is string => !!s)

    // Normalize: Capitalize first letter to merge e.g., 'bánh tráng' and 'Bánh tráng'
    const normalized = subs.map(
      (s) => s.charAt(0).toUpperCase() + s.slice(1)
    )
    return Array.from(new Set(normalized)).sort((a, b) => a.localeCompare(b))
  }, [items, activeCategory])

  const hasNullSubCategory = useMemo(() => {
    if (activeCategory === 'all') return false
    const itemsInCat = items.filter((i) => i.category === activeCategory)
    return itemsInCat.some((i) => !i.sub_category)
  }, [items, activeCategory])

  const filtered = useMemo(() => {
    let result = items
    if (activeCategory !== 'all') {
      result = result.filter((i) => i.category === activeCategory)

      if (activeSubCategory !== 'all') {
        if (activeSubCategory === 'other') {
          result = result.filter((i) => !i.sub_category)
        } else {
          result = result.filter((i) => {
            const sub = i.sub_category?.trim()
            if (!sub) return false
            const normalizedSub = sub.charAt(0).toUpperCase() + sub.slice(1)
            return normalizedSub === activeSubCategory
          })
        }
      }
    }
    return result
  }, [items, activeCategory, activeSubCategory])

  const totalQty = cart.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = cart.reduce((s, i) => s + i.price * i.quantity, 0)

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const exists = prev.find((c) => c.id === item.id)
      if (exists) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  function removeFromCart(id: string) {
    setCart((prev) => {
      const exists = prev.find((c) => c.id === id)
      if (!exists) return prev
      if (exists.quantity === 1) return prev.filter((c) => c.id !== id)
      return prev.map((c) =>
        c.id === id ? { ...c, quantity: c.quantity - 1 } : c
      )
    })
  }

  function getQty(id: string) {
    return cart.find((c) => c.id === id)?.quantity || 0
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#FAFAFA] text-slate-800 flex flex-col">
      {/* Desktop: 2 cột | Mobile: 1 cột */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-screen min-h-[100dvh]">

        {/* ===== CỘT TRÁI: MENU ===== */}
        <div className="flex-1 lg:max-w-[65%] flex flex-col">

          {/* Header */}
          <div className="flex flex-col items-center justify-center py-5 px-4 border-b border-[#F3F4F6] bg-white text-slate-800 shadow-sm">
            <div className="relative flex flex-col items-center">
              <span className="text-[10px] font-extrabold tracking-[0.25em] uppercase text-[#F97316] mb-1.5 select-none">
                Link Menu
              </span>
              <div className="relative h-10 md:h-12 w-40 md:w-48 select-none flex items-center justify-center">
                <Image
                  src="/images/logo.png"
                  alt="Ý Nù Quán"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <p className="text-[#F97316] text-[10px] md:text-xs font-bold tracking-wider uppercase mt-2">
              Món ăn healthy - món ăn vặt - nước uống
            </p>
          </div>

          {/* Group sticky bộ lọc */}
          <div className="sticky top-0 z-20 bg-white shadow-xs">
            {/* Tab categories (Pill style - Fixed buttons across viewport on mobile) */}
            <div className="flex justify-between gap-1.5 sm:gap-2.5 px-2 sm:px-4 py-3 bg-white border-b border-[#F3F4F6]">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat)
                    setActiveSubCategory('all')
                  }}
                  className={`flex-1 text-center py-1.5 sm:py-2 px-0.5 rounded-full text-[10px] sm:text-xs font-extrabold transition-all duration-300 ${activeCategory === cat
                      ? 'bg-[#1D4ED8] text-white shadow-xs'
                      : 'bg-white text-[#6B7280] border border-[#F3F4F6] hover:bg-slate-50'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Tab subcategories (Scrollable horizontally on mobile, subtle layout) */}
            {subCategories.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none px-3 py-2.5 bg-slate-50/80 backdrop-blur-xs border-b border-[#F3F4F6] transition-all duration-300">
                <button
                  onClick={() => setActiveSubCategory('all')}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-extrabold transition-all duration-200 ${activeSubCategory === 'all'
                      ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] shadow-xs'
                      : 'bg-white text-[#6B7280] border border-[#E5E7EB]/50 hover:bg-slate-50'
                    }`}
                >
                  Tất cả
                </button>
                {subCategories.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setActiveSubCategory(sub)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-extrabold transition-all duration-200 ${activeSubCategory === sub
                        ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] shadow-xs'
                        : 'bg-white text-[#6B7280] border border-[#E5E7EB]/50 hover:bg-slate-50'
                      }`}
                  >
                    {sub}
                  </button>
                ))}
                {hasNullSubCategory && (
                  <button
                    onClick={() => setActiveSubCategory('other')}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-extrabold transition-all duration-200 ${activeSubCategory === 'other'
                        ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] shadow-xs'
                        : 'bg-white text-[#6B7280] border border-[#E5E7EB]/50 hover:bg-slate-50'
                      }`}
                  >
                    Món khác
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Grid món ăn (Cố định 4 cột trên mobile, 3 cột trên desktop) */}
          <div className="flex-1 overflow-y-auto p-1.5 sm:p-6 bg-[#FAFAFA]">
            <div className="grid grid-cols-4 md:grid-cols-3 gap-1.5 sm:gap-6">
              {filtered.map((item, index) => {
                const qty = getQty(item.id)
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="bg-white rounded-lg sm:rounded-[16px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-[#F3F4F6] hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 flex flex-col group p-1.5 sm:p-3 cursor-pointer"
                  >
                    {/* Ảnh món (Bo góc, 4/3 aspect ratio) */}
                    <div className="relative aspect-[4/3] w-full rounded-md sm:rounded-[12px] overflow-hidden bg-[#FAFAFA] shadow-xs">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 25vw, (max-width: 1024px) 33vw, 20vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          priority={index < 8}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl select-none bg-[#FAFAFA]">
                          🥗
                        </div>
                      )}
                    </div>

                    {/* Thông tin */}
                    <div className="mt-1.5 sm:mt-3 flex flex-col flex-1">
                      {/* Tên món - font đậm, màu #111827, tối đa 2 dòng */}
                      <p className="text-[#111827] font-bold text-[9px] sm:text-sm leading-tight line-clamp-2 min-h-[1.5rem] sm:min-h-[2.5rem] flex-1">
                        {item.name}
                      </p>

                      {item.description && (
                        <p className="hidden sm:block text-[#6B7280] text-xs mt-1.5 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      {/* Giá tiền - màu cam #F97316, font đậm */}
                      <p className="text-[#F97316] font-extrabold text-[10px] sm:text-base mt-1 sm:mt-2">
                        {item.price.toLocaleString('vi-VN')}đ
                      </p>

                      {/* Nút đặt món (Chiều cao 28px trên mobile, 40px trên desktop) */}
                      <div className="mt-1.5 sm:mt-3" onClick={(e) => e.stopPropagation()}>
                        {qty === 0 ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              addToCart(item)
                            }}
                            className="w-full h-[26px] sm:h-[40px] bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-[9px] sm:text-xs font-bold rounded-md sm:rounded-[12px] active:scale-[0.95] transition-all cursor-pointer flex items-center justify-center shadow-xs"
                          >
                            + Chọn
                          </button>
                        ) : (
                          <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-md sm:rounded-[12px] overflow-hidden h-[26px] sm:h-[40px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                removeFromCart(item.id)
                              }}
                              className="w-5 sm:w-10 h-full text-slate-650 hover:text-[#1D4ED8] font-bold hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center text-[9px] sm:text-base"
                            >
                              −
                            </button>
                            <span className="text-[#111827] font-extrabold text-[9px] sm:text-xs">{qty}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                addToCart(item)
                              }}
                              className="w-5 sm:w-10 h-full text-slate-650 hover:text-[#1D4ED8] font-bold hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center text-[9px] sm:text-base"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>


          {/* Mobile: Thanh giỏ hàng cố định phía dưới (Sticky bottom bar, nền cam, bo góc lớn, đổ bóng trên) */}
          {totalQty > 0 && (
            <div className="lg:hidden sticky bottom-0 p-3 bg-[#FAFAFA]/90 backdrop-blur-md border-t border-[#F3F4F6] z-40">
              <div className="h-16 bg-[#F97316] text-white rounded-[20px] flex items-center justify-between px-5 shadow-[0_-4px_20px_rgba(0,0,0,0.12)]">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <svg className="size-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="absolute -top-1.5 -right-1.5 bg-[#1D4ED8] text-white text-[9px] font-black size-4.5 rounded-full flex items-center justify-center border border-white">
                      {totalQty}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-orange-100/90 font-bold uppercase tracking-wider leading-none mb-0.5">Giỏ hàng</span>
                    <span className="text-xs font-bold leading-none">{totalQty} món</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowOrderPanel(true)}
                  className="bg-white text-[#F97316] hover:bg-orange-50/90 px-4 py-2 rounded-[12px] font-black text-xs transition-all duration-300 shadow-sm active:scale-[0.96] cursor-pointer"
                >
                  Xem đơn hàng
                </button>

                <div className="text-right">
                  <span className="text-[10px] text-orange-100/90 font-bold uppercase tracking-wider block leading-none mb-0.5">Tổng cộng</span>
                  <span className="text-sm font-black text-white">
                    {totalPrice.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== CỘT PHẢI: FORM ĐẶT HÀNG (Desktop) ===== */}
        <div className="hidden lg:flex lg:w-[35%] border-l border-[#F3F4F6] bg-white flex-col sticky top-0 h-screen">
          <OrderPanel
            cart={cart}
            slug={slug}
            onAdd={addToCart}
            onRemove={removeFromCart}
            onClear={() => setCart([])}
          />
        </div>
      </div>

      {/* Mobile: Order Panel dạng bottom sheet */}
      {showOrderPanel && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-[2.5rem] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <OrderPanel
                cart={cart}
                slug={slug}
                onAdd={addToCart}
                onRemove={removeFromCart}
                onClear={() => {
                  setCart([])
                }}
                onClose={() => setShowOrderPanel(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Chi tiết sản phẩm Modal / Bottom Sheet */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 transition-opacity duration-300"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full sm:max-w-[480px] bg-white rounded-t-[2rem] sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Thanh kéo nhỏ chỉ hiện trên mobile */}
            <div className="mx-auto my-3 w-12 h-1 rounded-full bg-slate-200 sm:hidden shrink-0" />

            {/* Nút đóng */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 z-10 size-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Cuộn nội dung */}
            <div className="flex-1 overflow-y-auto pb-6">
              {/* Hình ảnh */}
              <div className="relative w-full aspect-[4/3] max-h-[360px] bg-slate-50 flex justify-center items-center overflow-hidden shrink-0">
                {selectedItem.image_url ? (
                  <Image
                    src={selectedItem.image_url}
                    alt={selectedItem.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 480px"
                    className="object-contain"
                  />
                ) : (
                  <div className="aspect-video w-full flex items-center justify-center text-5xl bg-slate-100 select-none">
                    🥗
                  </div>
                )}
              </div>

              {/* Thông tin */}
              <div className="px-5 sm:px-6 mt-4 flex flex-col">
                <span className="self-start px-2.5 py-1 bg-blue-50 text-[#1D4ED8] text-[10px] sm:text-xs font-extrabold rounded-full uppercase tracking-wider">
                  {selectedItem.category}
                </span>

                <h3 className="text-lg sm:text-2xl font-extrabold text-[#111827] mt-2.5 leading-tight">
                  {selectedItem.name}
                </h3>

                <p className="text-[#F97316] font-extrabold text-lg sm:text-2xl mt-2">
                  {selectedItem.price.toLocaleString('vi-VN')}đ
                </p>

                <div className="mt-4 sm:mt-5 border-t border-slate-100 pt-4">
                  <h4 className="text-[10px] sm:text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                    Chi tiết món ăn
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {selectedItem.description ||
                      'Món ăn healthy thơm ngon, giàu dinh dưỡng, được chế biến từ nguyên liệu tươi sạch, đảm bảo vệ sinh an toàn thực phẩm.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom action bar */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-white shrink-0">
              {getQty(selectedItem.id) === 0 ? (
                <button
                  onClick={() => addToCart(selectedItem)}
                  className="w-full h-12 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-sm font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Thêm vào đơn - {selectedItem.price.toLocaleString('vi-VN')}đ
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden h-12 px-1">
                    <button
                      onClick={() => removeFromCart(selectedItem.id)}
                      className="w-10 h-full text-slate-600 hover:text-[#1D4ED8] font-bold hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center justify-center text-lg"
                    >
                      −
                    </button>
                    <span className="text-[#111827] font-black text-sm px-4 select-none min-w-[2rem] text-center">
                      {getQty(selectedItem.id)}
                    </span>
                    <button
                      onClick={() => addToCart(selectedItem)}
                      className="w-10 h-full text-slate-600 hover:text-[#1D4ED8] font-bold hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center justify-center text-lg"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="flex-1 h-12 bg-[#F97316] hover:bg-orange-600 text-white text-sm font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer shadow-md"
                  >
                    Đã chọn {getQty(selectedItem.id)} món - Xem giỏ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Nút Facebook nổi ở góc phải dưới */}
      <a
        href="https://www.facebook.com/profile.php?id=61587297699068"
        target="_blank"
        rel="noopener noreferrer"
        className={`fixed ${totalQty > 0 ? 'bottom-24 lg:bottom-6' : 'bottom-6'
          } right-6 z-50 bg-[#1877F2] hover:bg-[#166FE5] text-white p-3 rounded-full shadow-[0_4px_16px_rgba(24,119,242,0.4)] hover:shadow-[0_6px_20px_rgba(24,119,242,0.6)] hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center size-12 sm:size-14`}
        aria-label="Facebook Page"
      >
        <svg className="size-6 sm:size-7 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>
    </div>
  )
}


