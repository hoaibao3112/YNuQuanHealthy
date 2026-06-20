'use client'

import { useState, useEffect } from 'react'
import { CartItem } from './MenuClient'
import { MenuItem } from './page'
import tienGiangData from '@/lib/tien-giang.json'
import Image from 'next/image'

interface Props {
  cart: CartItem[]
  slug: string
  onAdd: (item: MenuItem) => void
  onRemove: (id: string) => void
  onClear: () => void
  onClose?: () => void
}

type Step = 'cart' | 'success'

export default function OrderPanel({ cart, slug, onAdd, onRemove, onClear, onClose }: Props) {
  const [step, setStep] = useState<Step>('cart')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [orderCode, setOrderCode] = useState('')
  const [messengerUrl, setMessengerUrl] = useState('')
  const [error, setError] = useState('')

  const [deliveryMethod, setDeliveryMethod] = useState<'ship' | 'pickup'>('ship')
  const [district, setDistrict] = useState('')
  const [ward, setWard] = useState('')
  const [street, setStreet] = useState('')

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const totalQty = cart.reduce((s, i) => s + i.quantity, 0)

  const wardsList = tienGiangData.find((d) => d.name === district)?.wards || []

  // Load customer details from localStorage on client mount
  useEffect(() => {
    try {
      const storedName = localStorage.getItem('ynq_customer_name')
      const storedPhone = localStorage.getItem('ynq_customer_phone')
      const storedDistrict = localStorage.getItem('ynq_customer_district')
      const storedWard = localStorage.getItem('ynq_customer_ward')
      const storedStreet = localStorage.getItem('ynq_customer_street')

      if (storedName) setName(storedName)
      if (storedPhone) setPhone(storedPhone)
      if (storedDistrict) setDistrict(storedDistrict)
      if (storedWard) setWard(storedWard)
      if (storedStreet) setStreet(storedStreet)
    } catch (e) {
      console.error('Error loading customer details from localStorage', e)
    }
  }, [])

  const handleDistrictChange = (value: string) => {
    setDistrict(value)
    setWard('')
  }

  async function handleSubmit() {
      if (deliveryMethod === 'ship' && (!district || !ward)) {
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
              address_district: deliveryMethod === 'ship' ? district : 'Tới quán lấy',
              address_ward: deliveryMethod === 'ship' ? ward : 'Tới quán lấy',
              address_street: deliveryMethod === 'ship' ? street.trim() : '',
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
  
        // Save customer details to localStorage
        try {
          localStorage.setItem('ynq_customer_name', name.trim())
          localStorage.setItem('ynq_customer_phone', phone.trim())
          if (deliveryMethod === 'ship') {
            localStorage.setItem('ynq_customer_district', district)
            localStorage.setItem('ynq_customer_ward', ward)
            localStorage.setItem('ynq_customer_street', street.trim())
          }
        } catch (e) {
          console.error('Error saving customer details to localStorage', e)
        }
  
        setStep('success')
        onClear()
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setLoading(false)
    }
  }

  // ===== BƯỚC 1: GIỎ HÀNG + FORM THÔNG TIN =====
  if (step === 'cart') {
    return (
      <div className="flex flex-col h-full bg-white text-slate-800">
        <div className="px-5 py-4 border-b border-orange-100/50 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-slate-800 font-extrabold text-lg flex items-center gap-2">
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

        {/* Nội dung chính cuộn dọc */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[350px] text-slate-400">
              <span className="text-5xl mb-3 select-none">🍽️</span>
              <p className="text-sm font-medium">Chọn món từ menu bên cạnh</p>
            </div>
          ) : (
            <>
              {/* Danh sách món đã chọn */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 bg-blue-50/10 p-2 rounded-2xl border border-blue-100/10 hover:border-blue-100/40 transition-colors">
                    {item.image_url && (
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-blue-100/20">
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-sm font-bold truncate">{item.name}</p>
                      <p className="text-rose-655 text-sm font-black mt-0.5">
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
                ))}
              </div>

              {/* Form nhập thông tin */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <h3 className="text-slate-800 font-extrabold text-sm flex items-center gap-2">
                  📍 Thông tin giao hàng
                </h3>

                {/* Nút chọn hình thức nhận hàng */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-100/30">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('ship')}
                    className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all active:scale-[0.98] cursor-pointer ${
                      deliveryMethod === 'ship'
                        ? 'bg-[#F97316] text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    🛵 Quán đi ship
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('pickup')}
                    className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all active:scale-[0.98] cursor-pointer ${
                      deliveryMethod === 'pickup'
                        ? 'bg-[#F97316] text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    🏪 Tới quán lấy
                  </button>
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

                {deliveryMethod === 'ship' && (
                  <>
                    {/* Chọn Quận/Huyện */}
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
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
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
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
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="text-slate-550 text-[10px] font-extrabold uppercase tracking-wider block mb-1.5">
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
                  </>
                )}

                {/* Ghi chú */}
                <div>
                  <label className="text-slate-555 text-[10px] font-extrabold uppercase tracking-wider block mb-1.5">
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
            </>
          )}
        </div>

        {/* Tổng tiền + nút đặt */}
        {cart.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100 bg-[#FAFAFA]/50 space-y-3 shrink-0">
            <div className="flex justify-between items-center text-xs font-extrabold">
              <span className="text-slate-400 uppercase tracking-widest">{totalQty} món</span>
              <span className="text-rose-650 text-xl font-black">
                {total.toLocaleString('vi-VN')}đ
              </span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-[#F97316] hover:bg-[#ea580c] disabled:opacity-50 text-white py-3.5 rounded-2xl font-bold text-base transition-all duration-300 shadow-md active:scale-[0.98] cursor-pointer"
            >
              {loading ? 'Đang gửi đơn...' : `Xác nhận đặt hàng · ${total.toLocaleString('vi-VN')}đ`}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ===== BƯỚC 2: THÀNH CÔNG =====
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
      <div className="size-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 animate-bounce shadow-sm">
        <svg className="size-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
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
        onClick={() => {
          if (onClose) {
            onClose()
          } else {
            setStep('cart')
          }
        }}
        className="text-blue-650 text-xs font-bold underline hover:text-blue-700 transition-colors cursor-pointer"
      >
        Đặt thêm món khác
      </button>
    </div>
  )
}
