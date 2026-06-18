'use client'

import { useState } from 'react'
import { CartItem, MenuItem } from './MenuClient'

interface Props {
  cart: CartItem[]
  slug: string
  onAdd: (item: MenuItem) => void
  onRemove: (id: string) => void
  onClear: () => void
}

type Step = 'cart' | 'form' | 'success'

export default function OrderPanel({ cart, slug, onAdd, onRemove, onClear }: Props) {
  const [step, setStep] = useState<Step>('cart')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [orderCode, setOrderCode] = useState('')
  const [messengerUrl, setMessengerUrl] = useState('')
  const [error, setError] = useState('')

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const totalQty = cart.reduce((s, i) => s + i.quantity, 0)

  async function handleSubmit() {
    if (!name.trim() || !phone.trim()) {
      setError('Vui lòng nhập tên và số điện thoại')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/orders`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shop_slug: slug,
            customer_name: name.trim(),
            customer_phone: phone.trim(),
            note: note.trim(),
            items: cart.map((c) => ({
              menu_item_id: c.id,
              name: c.name,
              price: c.price,
              quantity: c.quantity,
            })),
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Lỗi đặt hàng')
      setOrderCode(data.order_code)
      setMessengerUrl(data.messenger_url)
      setStep('success')
      onClear()
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setLoading(false)
    }
  }

  // ===== BƯỚC 1: GIỎ HÀNG =====
  if (step === 'cart') {
    return (
      <div className="flex flex-col h-full">
        <div className="px-5 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-white font-bold text-lg">🛒 Đơn hàng của bạn</h2>
          {cart.length === 0 && (
            <p className="text-gray-500 text-sm mt-1">Chưa có món nào được chọn</p>
          )}
        </div>

        {/* Danh sách món đã chọn */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-600">
              <span className="text-5xl mb-3">🍽️</span>
              <p className="text-sm">Chọn món từ menu bên cạnh</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{item.name}</p>
                  <p className="text-[#E85D24] text-sm font-bold">
                    {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-[#2a2a2a] rounded-xl overflow-hidden flex-shrink-0">
                  <button
                    onClick={() => onRemove(item.id)}
                    className="w-8 h-8 text-white font-bold hover:bg-[#3a3a3a] transition-colors"
                  >
                    −
                  </button>
                  <span className="text-white text-sm font-bold w-5 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onAdd(item)}
                    className="w-8 h-8 text-white font-bold hover:bg-[#3a3a3a] transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tổng tiền + nút đặt */}
        {cart.length > 0 && (
          <div className="px-5 py-4 border-t border-[#2a2a2a] space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">{totalQty} món</span>
              <span className="text-white font-black text-xl">
                {total.toLocaleString('vi-VN')}đ
              </span>
            </div>
            <button
              onClick={() => setStep('form')}
              className="w-full bg-[#E85D24] hover:bg-[#C44A18] text-white py-3.5 rounded-2xl font-bold text-base transition-colors"
            >
              Đặt hàng ngay →
            </button>
          </div>
        )}
      </div>
    )
  }

  // ===== BƯỚC 2: FORM THÔNG TIN =====
  if (step === 'form') {
    return (
      <div className="flex flex-col h-full">
        <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center gap-3">
          <button
            onClick={() => setStep('cart')}
            className="text-gray-400 hover:text-white text-xl transition-colors"
          >
            ←
          </button>
          <h2 className="text-white font-bold text-lg">Thông tin đặt hàng</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Tóm tắt đơn */}
          <div className="bg-[#1a1a1a] rounded-2xl p-4 space-y-2">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-300">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-white font-semibold">
                  {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                </span>
              </div>
            ))}
            <div className="border-t border-[#2a2a2a] pt-2 flex justify-between">
              <span className="text-gray-400 text-sm">Tổng cộng</span>
              <span className="text-[#E85D24] font-black">
                {total.toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>

          {/* Input tên */}
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide block mb-1.5">
              Họ tên *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl px-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-[#E85D24] transition-colors"
            />
          </div>

          {/* Input SĐT */}
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide block mb-1.5">
              Số điện thoại *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901 234 567"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl px-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-[#E85D24] transition-colors"
            />
          </div>

          {/* Ghi chú */}
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide block mb-1.5">
              Ghi chú (không bắt buộc)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ít cay, không hành, dị ứng..."
              rows={3}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl px-4 py-3 text-sm placeholder-gray-600 focus:outline-none focus:border-[#E85D24] transition-colors resize-none"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-xl">
              {error}
            </p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-[#2a2a2a]">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#E85D24] hover:bg-[#C44A18] disabled:opacity-50 text-white py-3.5 rounded-2xl font-bold text-base transition-colors"
          >
            {loading ? 'Đang gửi đơn...' : `Xác nhận đặt hàng · ${total.toLocaleString('vi-VN')}đ`}
          </button>
        </div>
      </div>
    )
  }

  // ===== BƯỚC 3: THÀNH CÔNG =====
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-5">
      <div className="text-6xl">🎉</div>
      <div>
        <h2 className="text-white font-black text-xl">Đặt hàng thành công!</h2>
        <p className="text-gray-400 text-sm mt-1">
          Mã đơn: <span className="text-[#E85D24] font-bold">{orderCode}</span>
        </p>
      </div>
      <p className="text-gray-400 text-sm leading-relaxed">
        Bấm nút bên dưới để mở Messenger — nhà hàng sẽ liên hệ xác nhận đơn cho bạn.
      </p>
      <a
        href={messengerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-[#0084FF] hover:bg-[#006ACC] text-white py-3.5 rounded-2xl font-bold text-base transition-colors text-center"
      >
        💬 Mở Messenger xác nhận
      </a>
      <button
        onClick={() => setStep('cart')}
        className="text-gray-500 text-sm underline hover:text-gray-300 transition-colors"
      >
        Đặt thêm món khác
      </button>
    </div>
  )
}
