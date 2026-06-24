import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

// Route công khai để client-side (Realtime + polling) lấy lại danh sách món
// Proxy tới NestJS /menu/:slug — trả về chỉ các món is_active = true
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const res = await fetch(`${API_URL}/menu/${params.slug}`, {
      headers: { 'Content-Type': 'application/json' },
      // Không dùng cache tại đây — mỗi lần fetch phải lấy dữ liệu mới nhất
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Lỗi từ API NestJS' }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[/api/menu/[slug]] Lỗi:', err)
    return NextResponse.json({ error: 'Lỗi kết nối API' }, { status: 500 })
  }
}
