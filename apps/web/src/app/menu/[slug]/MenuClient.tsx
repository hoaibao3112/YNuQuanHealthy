'use client'

import { useState, useMemo } from 'react'
import { MenuItem } from './page'
import OrderPanel from './OrderPanel'

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
    const cats = Array.from(new Set(items.map((i) => i.category)))
    return cats
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
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Desktop: 2 cột | Mobile: 1 cột */}
      <div className="flex flex-col lg:flex-row min-h-screen">

        {/* ===== CỘT TRÁI: MENU ===== */}
        <div className="flex-1 lg:max-w-[65%] flex flex-col">

          {/* Header */}
          <div
            className="text-white text-center py-6 px-4"
            style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b00 100%)' }}
          >
            <h1 className="text-3xl font-black tracking-wide uppercase">
              🍣 Menu Nhà Hàng
            </h1>
            <p className="text-gray-400 text-sm mt-1">Chọn món yêu thích của bạn</p>
          </div>

          {/* Tab categories */}
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide bg-[#111]">
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                activeCategory === 'all'
                  ? 'bg-[#E85D24] text-white'
                  : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]'
              }`}
            >
              Tất cả
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  activeCategory === cat
                    ? 'bg-[#E85D24] text-white'
                    : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid món ăn */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filtered.map((item) => {
                const qty = getQty(item.id)
                return (
                  <div
                    key={item.id}
                    className="bg-[#111] rounded-2xl overflow-hidden border border-[#2a2a2a] flex flex-col"
                  >
                    {/* Ảnh món */}
                    <div className="relative aspect-[4/3] bg-[#222]">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          🍽️
                        </div>
                      )}
                      {/* Badge category */}
                      <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                        {item.category}
                      </span>
                    </div>

                    {/* Thông tin */}
                    <div className="p-3 flex flex-col flex-1">
                      <p className="text-white font-bold text-sm leading-tight line-clamp-2">
                        {item.name}
                      </p>
                      {item.description && (
                        <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <p className="text-[#E85D24] font-black text-base mt-2">
                        {item.price.toLocaleString('vi-VN')}đ
                      </p>

                      {/* Nút chọn */}
                      <div className="mt-3">
                        {qty === 0 ? (
                          <button
                            onClick={() => addToCart(item)}
                            className="w-full bg-[#E85D24] hover:bg-[#C44A18] text-white text-sm font-bold py-2 rounded-xl transition-colors"
                          >
                            + Chọn món
                          </button>
                        ) : (
                          <div className="flex items-center justify-between bg-[#2a2a2a] rounded-xl overflow-hidden">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="w-10 h-9 text-white text-xl font-bold hover:bg-[#3a3a3a] transition-colors"
                            >
                              −
                            </button>
                            <span className="text-white font-bold text-sm">{qty}</span>
                            <button
                              onClick={() => addToCart(item)}
                              className="w-10 h-9 text-white text-xl font-bold hover:bg-[#3a3a3a] transition-colors"
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
            <div className="lg:hidden sticky bottom-0 p-4 bg-[#1a1a1a] border-t border-[#2a2a2a]">
              <button
                onClick={() => setShowOrderPanel(true)}
                className="w-full bg-[#E85D24] text-white py-3.5 rounded-2xl font-bold text-base flex items-center justify-between px-5"
              >
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {totalQty} món
                </span>
                <span>Xem đơn hàng</span>
                <span className="font-black">{totalPrice.toLocaleString('vi-VN')}đ</span>
              </button>
            </div>
          )}
        </div>

        {/* ===== CỘT PHẢI: FORM ĐẶT HÀNG (Desktop) ===== */}
        <div className="hidden lg:flex lg:w-[35%] border-l border-[#2a2a2a] bg-[#111] flex-col sticky top-0 h-screen">
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
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 flex flex-col justify-end">
          <div className="bg-[#111] rounded-t-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
              <h2 className="text-white font-bold text-lg">Đơn hàng</h2>
              <button
                onClick={() => setShowOrderPanel(false)}
                className="text-gray-400 text-2xl leading-none"
              >
                ×
              </button>
            </div>
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
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
