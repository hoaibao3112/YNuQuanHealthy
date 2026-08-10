'use client'

import React from 'react'

export type PromotionFormState = {
  name: string
  code: string
  description: string
  discount_type: 'percent' | 'fixed'
  discount_value: string
  max_discount: string
  min_order_value: string
  start_date: string
  end_date: string
  is_active: boolean
}

interface PromotionFormModalProps {
  form: PromotionFormState
  setForm: React.Dispatch<React.SetStateAction<PromotionFormState>>
  editId: string | null
  loading: boolean
  onSubmit: () => void
  onCancel: () => void
}

export default function PromotionFormModal({
  form,
  setForm,
  editId,
  loading,
  onSubmit,
  onCancel,
}: PromotionFormModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300">
      {/* Modal Container: Bottom sheet trên Mobile, Standard Modal trên Desktop */}
      <div className="bg-white w-full max-h-[92vh] sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden border-t sm:border border-slate-200 transform transition-all duration-300 scale-100 flex flex-col">

        {/* Thanh drag handle chỉ hiển thị trên Mobile */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-3 block sm:hidden flex-shrink-0"></div>

        {/* Modal Header */}
        <div className="px-6 pb-4 sm:pt-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
          <h3 className="font-bold text-slate-900 text-base">
            {editId ? '✏️ Cập nhật khuyến mãi' : 'Tạo khuyến mãi mới'}
          </h3>
          <button
            onClick={onCancel}
            className="size-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center text-xl font-bold cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Modal Form Content */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">

          {/* Tên khuyến mãi */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Tên chương trình <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Giảm giá mừng khai trương"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
            />
          </div>

          {/* Mã khuyến mãi */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Mã khuyến mãi
            </label>
            <input
              type="text"
              placeholder="VD: KHAITRUONG10"
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200 uppercase tracking-wider font-semibold"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">Để trống nếu áp dụng tự động, không cần khách nhập mã.</p>
          </div>

          {/* Loại giảm giá & Giá trị */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Loại giảm giá
              </label>
              <select
                value={form.discount_type}
                onChange={e => setForm({ ...form, discount_type: e.target.value as 'percent' | 'fixed' })}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200 cursor-pointer"
              >
                <option value="percent">Theo phần trăm (%)</option>
                <option value="fixed">Số tiền cố định (VNĐ)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Giá trị giảm <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0"
                  value={form.discount_value}
                  onChange={e => setForm({ ...form, discount_value: e.target.value })}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
                />
                <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400">
                  {form.discount_type === 'percent' ? '%' : 'đ'}
                </span>
              </div>
            </div>
          </div>

          {/* Giảm tối đa (chỉ hiện với loại %) & Đơn tối thiểu */}
          <div className="grid grid-cols-2 gap-4">
            {form.discount_type === 'percent' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Giảm tối đa (VNĐ)
                </label>
                <input
                  type="number"
                  placeholder="Không giới hạn"
                  value={form.max_discount}
                  onChange={e => setForm({ ...form, max_discount: e.target.value })}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
                />
              </div>
            )}
            <div className={form.discount_type === 'percent' ? '' : 'col-span-2'}>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Đơn tối thiểu (VNĐ)
              </label>
              <input
                type="number"
                placeholder="0"
                value={form.min_order_value}
                onChange={e => setForm({ ...form, min_order_value: e.target.value })}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
              />
            </div>
          </div>

          {/* Ngày bắt đầu & kết thúc */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Ngày bắt đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Ngày kết thúc <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
              />
            </div>
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Mô tả chương trình
            </label>
            <textarea
              placeholder="Nhập mô tả, điều kiện áp dụng..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200 resize-none"
            />
          </div>

          {/* Status Toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none mt-1">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-50 border-slate-300 cursor-pointer"
            />
            <span className="text-sm font-semibold text-slate-600">Kích hoạt khuyến mãi (Áp dụng ngay)</span>
          </label>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 py-2.5 px-5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="bg-sky-600 hover:bg-sky-700 disabled:opacity-55 disabled:cursor-not-allowed text-white py-2.5 px-6 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-md shadow-sky-600/10"
          >
            {loading ? 'Đang lưu...' : 'Lưu khuyến mãi'}
          </button>
        </div>

      </div>
    </div>
  )
}
