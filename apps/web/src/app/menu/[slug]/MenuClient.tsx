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
    <div className="min-h-screen bg-[#F4F7FA] text-slate-800">
      {/* Desktop: 2 cột | Mobile: 1 cột */}
      <div className="flex flex-col lg:flex-row min-h-screen">

        {/* ===== CỘT TRÁI: MENU ===== */}
        <div className="flex-1 lg:max-w-[65%] flex flex-col">

          {/* Header */}
          <div className="flex flex-col items-center justify-center py-7 px-4 border-b border-sky-100 bg-gradient-to-b from-sky-50/40 to-white/90">
            <div className="relative">
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl animate-bounce">🥗</span>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight flex flex-col sm:flex-row items-center gap-2">
                <span className="uppercase text-2xl font-black text-slate-700 tracking-wider">Menu</span>
                <span className="font-playball text-4xl md:text-5xl text-sky-600 font-normal select-none italic tracking-wider drop-shadow-sm px-2">
                  Ý Nù Quán
                </span>
              </h1>
            </div>
            <p className="text-sky-850/60 text-xs font-bold tracking-wider uppercase mt-1">
              Món ăn healthy - món ăn vặt - nước uống
            </p>
          </div>

          {/* Tab categories */}
          <div className="flex gap-2.5 px-4 py-3.5 overflow-x-auto scrollbar-hide bg-white border-b border-sky-50/50 sticky top-0 z-20">
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
                activeCategory === 'all'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-md shadow-sky-500/20 scale-105'
                  : 'bg-sky-50/30 text-sky-900/70 border border-sky-100/40 hover:bg-sky-50/80'
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
                    ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-md shadow-sky-500/20 scale-105'
                    : 'bg-sky-50/30 text-sky-900/70 border border-sky-100/40 hover:bg-sky-50/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid món ăn */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {filtered.map((item, index) => {
                const qty = getQty(item.id)
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl overflow-hidden shadow-[0_4px_20px_-4px_rgba(14,165,233,0.06)] hover:shadow-[0_10px_30px_-6px_rgba(14,165,233,0.12)] border border-sky-100/30 hover:border-sky-200/50 transition-all duration-300 transform hover:-translate-y-1 flex flex-col group"
                  >
                    {/* Ảnh món */}
                    <div className="relative aspect-[4/3] bg-sky-50/10 overflow-hidden">
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
                        <div className="w-full h-full flex items-center justify-center text-4xl bg-sky-50/30 select-none">
                          🥗
                        </div>
                      )}
                      {/* Badge category */}
                      <span className="absolute top-2.5 left-2.5 bg-sky-100/80 text-sky-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-xs select-none shadow-xs border border-sky-200/20">
                        {item.category}
                      </span>
                    </div>

                    {/* Thông tin */}
                    <div className="p-3.5 flex flex-col flex-1">
                      <p className="text-slate-800 font-extrabold text-sm md:text-base leading-snug line-clamp-2 flex-1">
                        {item.name}
                      </p>
                      {item.description && (
                        <p className="text-slate-500 text-xs mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                      <p className="text-rose-600 font-black text-base md:text-lg mt-2.5">
                        {item.price.toLocaleString('vi-VN')}đ
                      </p>

                      {/* Nút chọn */}
                      <div className="mt-3.5">
                        {qty === 0 ? (
                          <button
                            onClick={() => addToCart(item)}
                            className="w-full bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white text-xs font-extrabold py-2.5 rounded-xl transition-all duration-300 shadow-sm shadow-sky-500/10 cursor-pointer"
                          >
                            + Chọn món
                          </button>
                        ) : (
                          <div className="flex items-center justify-between bg-sky-50/60 border border-sky-200/40 rounded-xl overflow-hidden shadow-xs">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="w-10 h-9 text-sky-950 text-lg font-bold hover:bg-sky-100/50 transition-colors cursor-pointer"
                            >
                              −
                            </button>
                            <span className="text-sky-950 font-extrabold text-sm">{qty}</span>
                            <button
                              onClick={() => addToCart(item)}
                              className="w-10 h-9 text-sky-950 text-lg font-bold hover:bg-sky-100/50 transition-colors cursor-pointer"
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
            <div className="lg:hidden sticky bottom-0 p-4 bg-white/90 backdrop-blur-md border-t border-sky-100 shadow-lg">
              <button
                onClick={() => setShowOrderPanel(true)}
                className="w-full bg-gradient-to-r from-sky-500 to-blue-500 text-white py-3.5 rounded-2xl font-bold text-base flex items-center justify-between px-5 shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-transform"
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
        <div className="hidden lg:flex lg:w-[35%] border-l border-sky-100 bg-white flex-col sticky top-0 h-screen">
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


