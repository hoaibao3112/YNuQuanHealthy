'use client'

import { useState } from 'react'
import { CartItem } from './MenuClient'
import { MenuItem } from './page'
import tienGiangData from '@/lib/tien-giang.json'

interface Props {
  cart: CartItem[]
  slug: string
  onAdd: (item: MenuItem) => void
  onRemove: (id: string) => void
  onClear: () => void
  onClose?: () => void
}

type Step = 'cart' | 'form' | 'success'

export default function OrderPanel({ cart, slug, onAdd, onRemove, onClear, onClose }: Props) {
  const [step, setStep] = useState<Step>('cart')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [orderCode, setOrderCode] = useState('')
  const [messengerUrl, setMessengerUrl] = useState('')
  const [error, setError] = useState('')

  const [district, setDistrict] = useState('')
  const [ward, setWard] = useState('')
  const [street, setStreet] = useState('')

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const totalQty = cart.reduce((s, i) => s + i.quantity, 0)

  const wardsList = tienGiangData.find((d) => d.name === district)?.wards || []

  const handleDistrictChange = (value: string) => {
    setDistrict(value)
    setWard('')
  }

  async function handleSubmit() {
    if (!name.trim() || !phone.trim()) {
      setError('Vui lòng nhập tên và số điện thoại')
      return
    }
    if (!district || !ward) {
      setError('Vui lòng chọn Quận/Huyện và Phường/Xã ở Tiền Giang')
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
            address_district: district,
            address_ward: ward,
            address_street: street.trim(),
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
      <div className="flex flex-col h-full bg-white text-slate-800">
        <div className="px-5 py-4.5 border-b border-orange-100/50 flex items-center justify-between">
          <div>
            <h2 className="text-slate-855 font-extrabold text-lg flex items-center gap-2">
              <span>🛒 Đơn hàng của bạn</span>
            </h2>
            {cart.length === 0 && (
              <p className="text-slate-400 text-xs mt-1">Chưa có món nào được chọn</p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="size-8 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full flex items-center justify-center text-xl font-bold cursor-pointer transition-colors"
            >
              ×
            </button>
          )}
        </div>

        {/* Danh sách món đã chọn */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <span className="text-5xl mb-3 select-none">🍽️</span>
              <p className="text-sm font-medium">Chọn món từ menu bên cạnh</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-blue-50/10 p-2 rounded-2xl border border-blue-100/10 hover:border-blue-100/40 transition-colors">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-blue-100/20"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 text-sm font-bold truncate">{item.name}</p>
                  <p className="text-rose-600 text-sm font-black mt-0.5">
                    {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                  </p>
                </div>
                <div className="flex items-center gap-0.5 bg-blue-50 border border-blue-200/50 rounded-xl overflow-hidden flex-shrink-0">
                  <button
                    onClick={() => onRemove(item.id)}
                    className="w-8 h-8 text-blue-950 font-bold hover:bg-blue-100/50 transition-colors cursor-pointer"
                  >
                    −
                  </button>
                  <span className="text-blue-950 text-xs font-black w-5 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onAdd(item)}
                    className="w-8 h-8 text-blue-950 font-bold hover:bg-blue-100/50 transition-colors cursor-pointer"
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
          <div className="px-5 py-4.5 border-t border-blue-50 bg-blue-50/10 space-y-3.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{totalQty} món</span>
              <span className="text-rose-650 font-black text-xl">
                {total.toLocaleString('vi-VN')}đ
              </span>
            </div>
            <button
              onClick={() => setStep('form')}
              className="w-full bg-gradient-to-r from-[#01007f] to-[#120fad] hover:from-[#00008b] hover:to-[#02008f] text-white py-3.5 rounded-2xl font-bold text-base transition-all duration-300 shadow-md shadow-blue-500/10 cursor-pointer"
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
      <div className="flex flex-col h-full bg-white text-slate-800">
        <div className="px-5 py-4 border-b border-blue-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep('cart')}
              className="size-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-650 hover:text-slate-800 text-xl font-bold transition-colors flex items-center justify-center cursor-pointer"
            >
              ←
            </button>
            <h2 className="text-slate-800 font-extrabold text-lg">Thông tin đặt hàng</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="size-8 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full flex items-center justify-center text-xl font-bold cursor-pointer transition-colors"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Tóm tắt đơn */}
          <div className="bg-blue-50/10 border border-blue-100/50 rounded-3xl p-4.5 space-y-2">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-rose-600 font-extrabold">
                  {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                </span>
              </div>
            ))}
            <div className="border-t border-blue-100/40 pt-2.5 flex justify-between items-center">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tổng cộng</span>
              <span className="text-rose-600 font-black text-lg">
                {total.toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>

          {/* Input tên */}
          <div>
            <label className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider block mb-1.5">
              Họ tên *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all duration-200"
            />
          </div>

          {/* Input SĐT */}
          <div>
            <label className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider block mb-1.5">
              Số điện thoại *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0901 234 567"
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all duration-200"
            />
          </div>

          {/* Chọn Quận/Huyện */}
          <div>
            <label className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider block mb-1.5">
              Quận / Huyện (Tiền Giang) *
            </label>
            <select
              value={district}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-all duration-200 cursor-pointer"
            >
              <option value="">-- Chọn Quận/Huyện --</option>
              {tienGiangData.map((d) => (
                <option key={d.code} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chọn Phường/Xã */}
          <div>
            <label className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider block mb-1.5">
              Phường / Xã *
            </label>
            <select
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              disabled={!district}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <option value="">-- Chọn Phường/Xã --</option>
              {wardsList.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          {/* Địa chỉ chi tiết */}
          <div>
            <label className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider block mb-1.5">
              Số nhà, tên đường (tùy chọn)
            </label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Ví dụ: 123 Lê Lợi"
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all duration-200"
            />
          </div>

          {/* Ghi chú */}
          <div>
            <label className="text-slate-500 text-[10px] font-extrabold uppercase tracking-wider block mb-1.5">
              Ghi chú (không bắt buộc)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ít cay, không hành, dị ứng..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all duration-200 resize-none"
            />
          </div>

          {error && (
            <p className="text-red-650 text-xs font-bold bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl">
              ⚠️ {error}
            </p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-blue-50 bg-blue-50/10">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#01007f] to-[#120fad] hover:from-[#00008b] hover:to-[#02008f] disabled:opacity-50 text-white py-3.5 rounded-2xl font-bold text-base transition-all duration-300 shadow-md shadow-blue-500/10 cursor-pointer"
          >
            {loading ? 'Đang gửi đơn...' : `Xác nhận đặt hàng · ${total.toLocaleString('vi-VN')}đ`}
          </button>
        </div>
      </div>
    )
  }

  // ===== BƯỚC 3: THÀNH CÔNG =====
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-5 bg-white text-slate-800 py-10 relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-8 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full flex items-center justify-center text-xl font-bold cursor-pointer transition-colors"
        >
          ×
        </button>
      )}
      <div className="text-6xl animate-bounce">🎉</div>
      <div>
        <h2 className="text-slate-800 font-black text-xl">Đặt hàng thành công!</h2>
        <p className="text-slate-450 text-sm mt-1.5">
          Mã đơn: <span className="text-blue-650 font-extrabold">{orderCode}</span>
        </p>
      </div>
      <p className="text-slate-500 text-xs leading-relaxed max-w-xs">
        Bấm nút bên dưới để mở Messenger — nhà hàng sẽ liên hệ xác nhận đơn cho bạn.
      </p>
      <a
        href={messengerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-[#0084FF] hover:bg-[#006ACC] text-white py-3.5 rounded-2xl font-extrabold text-base transition-all duration-300 shadow-md shadow-blue-500/10 text-center"
      >
        💬 Mở Messenger xác nhận
      </a>
      <button
        onClick={() => setStep('cart')}
        className="text-blue-650 text-xs font-bold underline hover:text-blue-700 transition-colors cursor-pointer"
      >
        Đặt thêm món khác
      </button>
    </div>
  )
}
