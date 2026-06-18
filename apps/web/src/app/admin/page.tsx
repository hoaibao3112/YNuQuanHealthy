'use client'

import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const SHOP_SLUG = process.env.NEXT_PUBLIC_SHOP_SLUG || 'demo'

type MenuItem = {
  id: string
  name: string
  price: number
  category: string
  description: string
  is_active: boolean
  shop_slug: string
}

const emptyForm = {
  name: '',
  price: '',
  category: '',
  description: '',
  is_active: true,
}

export default function AdminPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const fetchItems = async () => {
    const res = await fetch(`${API}/menu/${SHOP_SLUG}`)
    const data = await res.json()
    setItems(data || [])
  }

  useEffect(() => { fetchItems() }, [])

  const showMsg = (text: string) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 2500)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.price || !form.category) {
      showMsg('Vui lòng điền đủ tên, giá và danh mục!')
      return
    }
    setLoading(true)
    const payload = {
      ...form,
      price: Number(form.price),
      shop_slug: SHOP_SLUG,
    }
    if (editId) {
      await fetch(`${API}/menu/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      showMsg('Đã cập nhật món!')
    } else {
      await fetch(`${API}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      showMsg('Đã thêm món mới!')
    }
    setForm(emptyForm)
    setEditId(null)
    setLoading(false)
    fetchItems()
  }

  const handleEdit = (item: MenuItem) => {
    setEditId(item.id)
    setForm({
      name: item.name,
      price: String(item.price),
      category: item.category,
      description: item.description || '',
      is_active: item.is_active,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Xoá món này?')) return
    await fetch(`${API}/menu/${id}`, { method: 'DELETE' })
    showMsg('Đã xoá!')
    fetchItems()
  }

  const handleCancel = () => {
    setForm(emptyForm)
    setEditId(null)
  }

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        🍽️ Quản lý thực đơn
      </h1>

      {/* Form thêm / sửa */}
      <div style={{ background: '#f9f9f9', borderRadius: 12, padding: 20, marginBottom: 32, border: '1px solid #eee' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          {editId ? '✏️ Cập nhật món' : '➕ Thêm món mới'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            placeholder="Tên món *"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="Giá (VNĐ) *"
            type="number"
            value={form.price}
            onChange={e => setForm({ ...form, price: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="Danh mục * (vd: Đồ ăn, Đồ uống)"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="Mô tả (tuỳ chọn)"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            style={inputStyle}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
            />
            Hiển thị trên menu
          </label>

          {msg && (
            <p style={{ color: '#16a34a', fontWeight: 500, fontSize: 14 }}>{msg}</p>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSubmit} disabled={loading} style={btnPrimary}>
              {loading ? 'Đang lưu...' : editId ? 'Cập nhật' : 'Thêm món'}
            </button>
            {editId && (
              <button onClick={handleCancel} style={btnSecondary}>Huỷ</button>
            )}
          </div>
        </div>
      </div>

      {/* Danh sách món */}
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
        📋 Danh sách món ({items.length})
      </h2>

      {items.length === 0 && (
        <p style={{ color: '#999', fontSize: 14 }}>Chưa có món nào. Thêm món đầu tiên đi!</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(item => (
          <div key={item.id} style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>{item.name}</p>
              <p style={{ color: '#e85d04', fontSize: 14, margin: '2px 0 0' }}>
                {item.price.toLocaleString('vi-VN')}đ · <span style={{ color: '#6b7280' }}>{item.category}</span>
              </p>
              {!item.is_active && (
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Ẩn khỏi menu</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => handleEdit(item)} style={btnEdit}>Sửa</button>
              <button onClick={() => handleDelete(item.id)} style={btnDelete}>Xoá</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const btnPrimary: React.CSSProperties = {
  background: '#e85d04',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '10px 20px',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 14,
}

const btnSecondary: React.CSSProperties = {
  background: '#f3f4f6',
  color: '#374151',
  border: 'none',
  borderRadius: 8,
  padding: '10px 20px',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 14,
}

const btnEdit: React.CSSProperties = {
  background: '#f3f4f6',
  border: 'none',
  borderRadius: 6,
  padding: '6px 14px',
  fontSize: 13,
  cursor: 'pointer',
}

const btnDelete: React.CSSProperties = {
  background: '#fee2e2',
  color: '#dc2626',
  border: 'none',
  borderRadius: 6,
  padding: '6px 14px',
  fontSize: 13,
  cursor: 'pointer',
}
