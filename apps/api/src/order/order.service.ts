import { Injectable } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import axios from 'axios'

@Injectable()
export class OrderService {
  constructor(private readonly supabase: SupabaseService) {}

  async createOrder(dto: any) {
    // 1. Tạo mã đơn hàng
    const orderCode = `DH${Date.now()}`
    const total = dto.items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0,
    )

    // 2. Lưu vào Supabase
    const { data: order, error } = await this.supabase.db
      .from('orders')
      .insert({
        order_code: orderCode,
        shop_slug: dto.shop_slug,
        customer_name: dto.customer_name,
        customer_phone: dto.customer_phone,
        items: dto.items,
        total_price: total,
        note: dto.note || '',
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw new Error('Lỗi lưu đơn hàng')

    // 3. Gửi tin nhắn vào inbox Page qua Messenger API
    await this.sendMessengerNotification(dto, orderCode, total)

    // 4. Trả về link mở Messenger cho khách
    const messengerUrl = `https://m.me/${process.env.FB_PAGE_ID}?ref=order_${orderCode}`

    return {
      success: true,
      order_code: orderCode,
      messenger_url: messengerUrl,
    }
  }

  private async sendMessengerNotification(dto: any, orderCode: string, total: number) {
    const itemsList = dto.items
      .map((i: any) => `• ${i.name} x${i.quantity} — ${(i.price * i.quantity).toLocaleString('vi-VN')}đ`)
      .join('\n')

    const message =
      `🛎️ ĐƠN HÀNG MỚI - ${orderCode}\n` +
      `👤 Khách: ${dto.customer_name}\n` +
      `📞 SĐT: ${dto.customer_phone}\n` +
      `───────────────\n` +
      `${itemsList}\n` +
      `───────────────\n` +
      `💰 Tổng: ${total.toLocaleString('vi-VN')}đ\n` +
      (dto.note ? `📝 Ghi chú: ${dto.note}` : '')

    try {
      await axios.post(
        `https://graph.facebook.com/v19.0/me/messages`,
        {
          recipient: { id: process.env.FB_PAGE_ID },
          message: { text: message },
        },
        {
          params: { access_token: process.env.FB_PAGE_ACCESS_TOKEN },
        },
      )
    } catch (err) {
      console.error('Lỗi gửi Messenger:', err.message)
    }
  }
}
