'use client'

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

type FormState = {
  name: string
  price: string
  category: string
  customCategory: string
  sub_category: string
  customSubCategory: string
  description: string
  is_active: boolean
  image_url: string
}

interface ProductFormModalProps {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  editId: string | null
  loading: boolean
  uploading: boolean
  dynamicCategories: string[]
  dynamicSubCategoriesMap: Record<string, string[]>
  onSubmit: () => void
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: () => void
  onCancel: () => void
  onDeleteSubCategory: (category: string, subCategory: string) => Promise<void>
}

export default function ProductFormModal({
  form,
  setForm,
  editId,
  loading,
  uploading,
  dynamicCategories,
  dynamicSubCategoriesMap,
  onSubmit,
  onImageUpload,
  onRemoveImage,
  onCancel,
  onDeleteSubCategory,
}: ProductFormModalProps) {
  const [isSubDropdownOpen, setIsSubDropdownOpen] = useState(false)
  const subDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (subDropdownRef.current && !subDropdownRef.current.contains(e.target as Node)) {
        setIsSubDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset dropdown khi category thay đổi
  useEffect(() => {
    setIsSubDropdownOpen(false)
  }, [form.category])

  const currentSubs = dynamicSubCategoriesMap[form.category] || []
  const selectedSubLabel = form.sub_category === '' ? 'Không có' : form.sub_category === 'custom' ? (form.customSubCategory || 'Nhập mới...') : form.sub_category

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300">
      {/* Modal Container: Bottom sheet trên Mobile, Standard Modal trên Desktop */}
      <div className="bg-white w-full max-h-[92vh] sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden border-t sm:border border-slate-200 transform transition-all duration-300 scale-100 flex flex-col">
        
        {/* Thanh drag handle chỉ hiển thị trên Mobile */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto my-3 block sm:hidden flex-shrink-0"></div>

        {/* Modal Header */}
        <div className="px-6 pb-4 sm:pt-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
          <h3 className="font-bold text-slate-900 text-base">
            {editId ? '✏️ Cập nhật thông tin sản phẩm' : 'Thêm sản phẩm mới'}
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
          
          {/* Product Name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Tên sản phẩm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Nhập tên sản phẩm..."
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
            />
          </div>

          {/* Product Price & Quantity Side by Side (50% - 50%) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Giá bán (VNĐ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="0"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Số lượng
              </label>
              <input
                type="number"
                defaultValue="1"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
              />
            </div>
          </div>

          {/* Category Dropdown Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Danh mục <span className="text-red-500">*</span>
            </label>
            <select
              value={form.category}
              onChange={e => setForm({ 
                ...form, 
                category: e.target.value, 
                sub_category: '', 
                customSubCategory: '' 
              })}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200 cursor-pointer"
            >
              {dynamicCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="custom">➕ Thêm nhóm sản phẩm khác...</option>
            </select>

            {/* Custom Category Input */}
            {form.category === 'custom' && (
              <input
                type="text"
                placeholder="Nhập tên nhóm sản phẩm mới"
                value={form.customCategory}
                onChange={e => setForm({ ...form, customCategory: e.target.value })}
                className="w-full mt-3 bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
              />
            )}
          </div>

          {/* Sub-Category Dropdown Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Nhóm phụ (Loại món)
            </label>
            {dynamicCategories.includes(form.category) ? (
              // Custom dropdown có nút xóa từng nhóm phụ
              <div className="relative" ref={subDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsSubDropdownOpen(prev => !prev)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200 cursor-pointer flex items-center justify-between gap-2 text-left"
                >
                  <span className="truncate">{selectedSubLabel}</span>
                  <span className="text-slate-400 text-xs flex-shrink-0">▼</span>
                </button>

                {isSubDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-[60] bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 overflow-hidden max-h-56 overflow-y-auto">
                    {/* Option Không có */}
                    <button
                      type="button"
                      onClick={() => { setForm({ ...form, sub_category: '', customSubCategory: '' }); setIsSubDropdownOpen(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                        form.sub_category === '' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Không có
                    </button>

                    {/* Danh sách nhóm phụ hiện có */}
                    {currentSubs.length > 0 && (
                      <div className="border-t border-slate-100 mt-1 pt-1">
                        {currentSubs.map(sub => (
                          <div
                            key={sub}
                            className={`flex items-center justify-between px-2 py-1 group transition-colors ${
                              form.sub_category === sub ? 'bg-blue-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => { setForm({ ...form, sub_category: sub, customSubCategory: '' }); setIsSubDropdownOpen(false) }}
                              className={`flex-1 text-left px-2 py-1.5 text-sm font-medium truncate transition-colors ${
                                form.sub_category === sub ? 'text-blue-600' : 'text-slate-700'
                              }`}
                            >
                              {sub}
                            </button>
                            <button
                              type="button"
                              onClick={async e => {
                                e.stopPropagation()
                                setIsSubDropdownOpen(false)
                                await onDeleteSubCategory(form.category, sub)
                              }}
                              className="size-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                              title={`Xóa nhóm phụ "${sub}"`}
                            >
                              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Option Thêm nhóm phụ mới */}
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => { setForm({ ...form, sub_category: 'custom', customSubCategory: '' }); setIsSubDropdownOpen(false) }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        ➕ Thêm nhóm phụ khác...
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Nếu danh mục chính là custom, cho phép nhập text tự do
              <input
                type="text"
                placeholder="Nhập nhóm phụ (nếu có)..."
                value={form.sub_category === 'custom' ? form.customSubCategory : form.sub_category}
                onChange={e => setForm({ ...form, sub_category: e.target.value, customSubCategory: e.target.value })}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all duration-200"
              />
            )}

            {/* Custom Sub-Category Input */}
            {dynamicCategories.includes(form.category) && form.sub_category === 'custom' && (
              <input
                type="text"
                placeholder="Nhập tên nhóm phụ mới (ví dụ: mì, súp...)"
                value={form.customSubCategory}
                onChange={e => setForm({ ...form, customSubCategory: e.target.value })}
                className="w-full mt-3 bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
              />
            )}
          </div>

          {/* Product Image */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Hình ảnh sản phẩm
            </label>
            
            {form.image_url ? (
              <div className="relative border border-slate-200 rounded-xl p-2 bg-slate-50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-16 rounded-lg overflow-hidden border border-slate-200 bg-white relative flex-shrink-0">
                    <Image src={form.image_url} alt="Preview" fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">
                      {form.image_url.split('/').pop()}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5">
                      {form.image_url}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onRemoveImage}
                  className="size-8 rounded-full bg-red-50 hover:bg-red-100 text-red-600 transition-colors flex items-center justify-center font-bold text-sm cursor-pointer mr-1"
                  title="Xóa hình ảnh"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/10 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-semibold text-blue-600">Đang tải ảnh lên...</span>
                    </div>
                  ) : (
                    <>
                      <svg className="size-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-semibold text-slate-500">Chọn file ảnh hoặc Kéo thả vào đây</span>
                      <span className="text-[10px] text-slate-400">Hỗ trợ JPG, PNG, WEBP tối đa 5MB</span>
                      <span className="text-[9px] text-amber-600 font-semibold mt-1 max-w-[280px]">💡 Lưu ý trên iPhone: Hãy chọn ảnh từ "Thư viện ảnh" để iOS tự động chuyển đổi sang JPG.</span>
                    </>
                  )}
                </label>
                
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">hoặc</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <input
                  type="text"
                  placeholder="Dán link URL hình ảnh trực tiếp..."
                  value={form.image_url}
                  onChange={e => setForm({ ...form, image_url: e.target.value })}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Mô tả sản phẩm
            </label>
            <textarea
              placeholder="Nhập mô tả chi tiết..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={4}
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
            <span className="text-sm font-semibold text-slate-600">Đang kinh doanh (Hiển thị sản phẩm)</span>
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
            disabled={loading || uploading}
            className="bg-sky-600 hover:bg-sky-700 disabled:opacity-55 disabled:cursor-not-allowed text-white py-2.5 px-6 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-md shadow-sky-600/10"
          >
            {loading ? 'Đang lưu...' : uploading ? 'Đang tải ảnh...' : 'Lưu thông tin'}
          </button>
        </div>

      </div>
    </div>
  )
}
