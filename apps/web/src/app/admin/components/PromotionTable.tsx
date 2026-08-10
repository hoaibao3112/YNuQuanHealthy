'use client'

export type Promotion = {
  id: string
  shop_slug: string
  name: string
  code: string
  description: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  max_discount: number | null
  min_order_value: number | null
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

interface PromotionTableProps {
  filteredItems: Promotion[]
  paginatedItems: Promotion[]
  currentPage: number
  totalPages: number
  startIndex: number
  endIndex: number
  setCurrentPage: (page: number | ((prev: number) => number)) => void
  onEdit: (item: Promotion) => void
  onDelete: (id: string) => void
  onToggleActive: (item: Promotion) => void
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('vi-VN')
}

function getStatus(item: Promotion): { label: string; className: string } {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const start = item.start_date ? new Date(item.start_date) : null
  const end = item.end_date ? new Date(item.end_date) : null

  if (!item.is_active) {
    return { label: 'Tạm dừng', className: 'bg-slate-100 text-slate-500 border-slate-200' }
  }
  if (end && now > end) {
    return { label: 'Đã kết thúc', className: 'bg-red-50 text-red-600 border-red-150' }
  }
  if (start && now < start) {
    return { label: 'Sắp diễn ra', className: 'bg-amber-50 text-amber-700 border-amber-150' }
  }
  return { label: 'Đang diễn ra', className: 'bg-emerald-50 text-emerald-700 border-emerald-150' }
}

function formatDiscount(item: Promotion) {
  if (item.discount_type === 'percent') {
    const max = item.max_discount ? ` (tối đa ${item.max_discount.toLocaleString('vi-VN')}đ)` : ''
    return `${item.discount_value}%${max}`
  }
  return `${item.discount_value.toLocaleString('vi-VN')}đ`
}

export default function PromotionTable({
  filteredItems,
  paginatedItems,
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  setCurrentPage,
  onEdit,
  onDelete,
  onToggleActive,
}: PromotionTableProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col justify-between overflow-hidden">

      {/* 1. PC: BẢNG KHUYẾN MÃI (Hiển thị trên màn hình >= md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider">
              <th className="py-4 px-6">Chương trình</th>
              <th className="py-4 px-6">Ưu đãi</th>
              <th className="py-4 px-6">Thời gian áp dụng</th>
              <th className="py-4 px-6 text-center">Trạng thái</th>
              <th className="py-4 px-6 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <span className="text-4xl block mb-2">🏷️</span>
                  <p className="text-sm font-medium">Chưa có chương trình khuyến mãi nào.</p>
                </td>
              </tr>
            ) : (
              paginatedItems.map(item => {
                const status = getStatus(item)
                return (
                  <tr
                    key={item.id}
                    onClick={() => onEdit(item)}
                    className="hover:bg-slate-50/50 transition-colors duration-150 cursor-pointer"
                  >
                    <td className="py-3.5 px-6">
                      <div>
                        <p className="font-bold text-slate-800 text-sm leading-snug">{item.name}</p>
                        {item.code ? (
                          <p className="text-[10px] text-blue-600 font-black mt-0.5 tracking-wider">MÃ: {item.code}</p>
                        ) : (
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5 tracking-wider">Áp dụng tự động</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full border bg-sky-50 text-sky-700 border-sky-150 whitespace-nowrap">
                        Giảm {formatDiscount(item)}
                      </span>
                      {item.min_order_value ? (
                        <p className="text-[10px] text-slate-400 mt-1">Đơn tối thiểu {item.min_order_value.toLocaleString('vi-VN')}đ</p>
                      ) : null}
                    </td>
                    <td className="py-3.5 px-6 text-xs font-semibold text-slate-600 whitespace-nowrap">
                      {formatDate(item.start_date)} → {formatDate(item.end_date)}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full border whitespace-nowrap ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggleActive(item); }}
                          className="p-2 text-slate-500 hover:bg-slate-100 transition-colors rounded-lg cursor-pointer"
                          title={item.is_active ? 'Tạm dừng' : 'Kích hoạt'}
                        >
                          {item.is_active ? (
                            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                          className="p-2 text-blue-600 hover:bg-blue-55 transition-colors rounded-lg cursor-pointer"
                          title="Sửa"
                        >
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                          className="p-2 text-red-500 hover:bg-red-55 transition-colors rounded-lg cursor-pointer"
                          title="Xóa"
                        >
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 2. MOBILE: DANH SÁCH CARD RESPONSIVE (Hiển thị trên màn hình < md) */}
      <div className="block md:hidden overflow-y-auto max-h-[60vh] p-4 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <span className="text-4xl block mb-2">🏷️</span>
            <p className="text-sm font-medium">Chưa có chương trình khuyến mãi nào.</p>
          </div>
        ) : (
          paginatedItems.map(item => {
            const status = getStatus(item)
            return (
              <div
                key={item.id}
                onClick={() => onEdit(item)}
                className="border border-slate-100 rounded-2xl bg-white p-3.5 flex flex-col gap-2 shadow-xs cursor-pointer hover:border-blue-200 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm leading-snug truncate">{item.name}</h4>
                    {item.code ? (
                      <p className="text-[10px] text-blue-600 font-black mt-0.5 tracking-wider">MÃ: {item.code}</p>
                    ) : (
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5 tracking-wider">Áp dụng tự động</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap flex-shrink-0 ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-sky-50 text-sky-700 border-sky-150">
                    Giảm {formatDiscount(item)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {formatDate(item.start_date)} → {formatDate(item.end_date)}
                  </span>
                </div>

                <div className="flex gap-1 justify-end mt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleActive(item); }}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-full cursor-pointer"
                    title={item.is_active ? 'Tạm dừng' : 'Kích hoạt'}
                  >
                    {item.is_active ? (
                      <svg className="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                    className="p-2 text-blue-600 hover:bg-blue-55 rounded-full cursor-pointer"
                    title="Sửa"
                  >
                    <svg className="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    className="p-2 text-red-500 hover:bg-red-55 rounded-full cursor-pointer"
                    title="Xóa"
                  >
                    <svg className="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination footer */}
      <div className="h-16 px-6 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 bg-white select-none">
        <div>
          {filteredItems.length > 0 ? (
            <span>Hiển thị {startIndex} - {endIndex} của {filteredItems.length} chương trình</span>
          ) : (
            <span>0 chương trình</span>
          )}
        </div>

        {/* Nút Phân Trang */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              className="size-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ‹
            </button>
            <button
              className="size-7 flex items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs"
            >
              {currentPage}
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              className="size-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ›
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
