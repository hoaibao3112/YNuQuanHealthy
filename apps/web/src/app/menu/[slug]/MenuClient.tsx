'use client'

import { useState, useMemo } from 'react'
import { MenuItem } from './page'
import OrderPanel from './OrderPanel'
import Image from 'next/image'

export interface CartItem extends MenuItem {
  quantity: number
}

export default function MenuClient({
  items,
  slug,
}: {
  items: MenuItem[]
  slug: string
}) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [showOrderPanel, setShowOrderPanel] = useState(false)

  const categories = useMemo(() => {
    const order = ['Món ăn healthy', 'Món ăn vặt', 'Nước uống']
    const cats = Array.from(new Set(items.map((i) => i.category)))
    return cats.sort((a, b) => {
      const idxA = order.indexOf(a)
      const idxB = order.indexOf(b)
      if (idxA === -1 && idxB === -1) return a.localeCompare(b)
      if (idxA === -1) return 1
      if (idxB === -1) return -1
      return idxA - idxB
    })
  }, [items])

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return items
    return items.filter((i) => i.category === activeCategory)
  }, [items, activeCategory])

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
    <div className="min-h-screen bg-[#FFF2E6] text-slate-800">
      {/* Desktop: 2 cột | Mobile: 1 cột */}
      <div className="flex flex-col lg:flex-row min-h-screen">

        {/* ===== CỘT TRÁI: MENU ===== */}
        <div className="flex-1 lg:max-w-[65%] flex flex-col">

          {/* Header */}
          <div className="flex flex-col items-center justify-center py-6 px-4 border-b border-orange-600/20 bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md">
            <div className="relative flex flex-col items-center">
              <span 
                className="text-[10px] font-extrabold tracking-[0.25em] uppercase text-[#01007f] mb-1.5 select-none"
                style={{ textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff' }}
              >
                Link Menu
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center justify-center">
                <div className="relative h-10 md:h-12 w-40 md:w-48 select-none">
                  <Image
                    src="/images/logo.png"
                    alt="Ý Nù Quán"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </h1>
            </div>
            <p 
              className="text-[#01007f] text-[10px] md:text-xs font-extrabold tracking-wider uppercase mt-2"
              style={{ textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff' }}
            >
              Món ăn healthy - món ăn vặt - nước uống
            </p>
          </div>

          {/* Tab categories */}
          <div className="flex gap-2.5 px-4 py-3.5 overflow-x-auto scrollbar-hide bg-[#FFF2E6] border-b border-blue-100/40 sticky top-0 z-20">
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
                activeCategory === 'all'
                  ? 'bg-gradient-to-r from-[#01007f] to-[#120fad] text-white shadow-md shadow-blue-500/20 scale-105'
                  : 'bg-blue-50/30 text-blue-950/70 border border-blue-100/40 hover:bg-blue-50/80'
              }`}
            >
              Tất cả
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
                  activeCategory === cat
                    ? 'bg-gradient-to-r from-[#01007f] to-[#120fad] text-white shadow-md shadow-blue-500/20 scale-105'
                    : 'bg-blue-50/30 text-blue-950/70 border border-blue-100/40 hover:bg-blue-50/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid món ăn */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6">
            <div className="grid grid-cols-4 md:grid-cols-3 gap-2 sm:gap-4 md:gap-6">
              {filtered.map((item, index) => {
                const qty = getQty(item.id)
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl sm:rounded-3xl overflow-hidden shadow-[0_4px_20px_-4px_rgba(1,0,127,0.06)] hover:shadow-[0_10px_30px_-6px_rgba(1,0,127,0.12)] border border-blue-100/20 hover:border-blue-200/40 transition-all duration-300 transform hover:-translate-y-1 flex flex-col group"
                  >
                    {/* Ảnh món */}
                    <div className="relative aspect-[4/3] bg-blue-50/10 overflow-hidden">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          width={300}
                          height={225}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          priority={index < 6}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl bg-blue-50/30 select-none">
                          🥗
                        </div>
                      )}
                      {/* Badge category - hidden on mobile for cleaner look in 4 columns */}
                      <span className="hidden sm:inline-block absolute top-2 left-2 bg-blue-100/80 text-blue-850 text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-xs select-none shadow-xs border border-blue-200/20">
                        {item.category}
                      </span>
                    </div>

                    {/* Thông tin */}
                    <div className="p-2 sm:p-3.5 flex flex-col flex-1">
                      <p className="text-slate-800 font-extrabold text-[11px] sm:text-sm md:text-base leading-snug line-clamp-2 flex-1">
                        {item.name}
                      </p>
                      {item.description && (
                        <p className="hidden sm:block text-slate-500 text-xs mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                      <p className="text-rose-600 font-black text-xs sm:text-base md:text-lg mt-1 sm:mt-2.5">
                        {item.price.toLocaleString('vi-VN')}đ
                      </p>

                      {/* Nút chọn */}
                      <div className="mt-2 sm:mt-3.5">
                        {qty === 0 ? (
                          <button
                            onClick={() => addToCart(item)}
                            className="w-full bg-gradient-to-r from-[#01007f] to-[#120fad] hover:from-[#00008b] hover:to-[#02008f] text-white text-[10px] sm:text-xs font-extrabold py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-300 shadow-sm shadow-blue-500/10 cursor-pointer"
                          >
                            + Chọn
                          </button>
                        ) : (
                          <div className="flex items-center justify-between bg-blue-50/60 border border-blue-200/40 rounded-lg sm:rounded-xl overflow-hidden shadow-xs">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="w-6 sm:w-10 h-7 sm:h-9 text-blue-950 text-xs sm:text-lg font-bold hover:bg-blue-100/50 transition-colors cursor-pointer flex items-center justify-center"
                            >
                              −
                            </button>
                            <span className="text-blue-950 font-extrabold text-xs sm:text-sm">{qty}</span>
                            <button
                              onClick={() => addToCart(item)}
                              className="w-6 sm:w-10 h-7 sm:h-9 text-blue-950 text-xs sm:text-lg font-bold hover:bg-blue-100/50 transition-colors cursor-pointer flex items-center justify-center"
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


          {/* Mobile: nút xem giỏ hàng cố định dưới */}
          {totalQty > 0 && (
            <div className="lg:hidden sticky bottom-0 p-4 bg-[#FFF2E6]/90 backdrop-blur-md border-t border-blue-100 shadow-lg">
              <button
                onClick={() => setShowOrderPanel(true)}
                className="w-full bg-gradient-to-r from-[#01007f] to-[#120fad] text-white py-3.5 rounded-2xl font-bold text-base flex items-center justify-between px-5 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform"
              >
                <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  {totalQty} món
                </span>
                <span>Xem đơn hàng</span>
                <span className="font-extrabold">{totalPrice.toLocaleString('vi-VN')}đ</span>
              </button>
            </div>
          )}
        </div>

        {/* ===== CỘT PHẢI: FORM ĐẶT HÀNG (Desktop) ===== */}
        <div className="hidden lg:flex lg:w-[35%] border-l border-orange-100 bg-white flex-col sticky top-0 h-screen">
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
                  setShowOrderPanel(false)
                }}
                onClose={() => setShowOrderPanel(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


