import { Injectable, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import { CreateOrderDto } from './dto/create-order.dto'
import axios from 'axios'

@Injectable()
export class OrderService {
  constructor(private readonly supabase: SupabaseService) {}

  async createOrder(dto: CreateOrderDto) {
    // 1. Validate items không rỗng
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Đơn hàng phải có ít nhất 1 món')
    }

    // 2. Tạo mã đơn hàng
    const orderCode = `DH${Date.now()}`
    const total = dto.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    )

    // Ghép địa chỉ chi tiết
    const fullAddress = `${dto.address_street ? dto.address_street + ', ' : ''}${dto.address_ward}, ${dto.address_district}, Tiền Giang`
    const noteWithAddress = `[Địa chỉ: ${fullAddress}]${dto.note ? ' - Ghi chú: ' + dto.note : ''}`

    // 3. Lưu vào Supabase
    const { data: order, error } = await this.supabase.db
      .from('orders')
      .insert({
        order_code: orderCode,
        shop_slug: dto.shop_slug,
        customer_name: dto.customer_name,
        customer_phone: dto.customer_phone,
        items: dto.items,
        total_price: total,
        note: noteWithAddress,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw new BadRequestException('Lỗi lưu đơn hàng: ' + error.message)

    // 4. Gửi thông báo Messenger (fire-and-forget, không block response)
    this.sendMessengerNotification(dto, orderCode, total).catch((err) =>
      console.error('Messenger notification failed:', err.message),
    )

    // Gửi thông báo Telegram (fire-and-forget, không block response)
    this.sendTelegramNotification(dto, orderCode, total).catch((err) =>
      console.error('Telegram notification failed:', err.message),
    )

    // 5. Trả về link mở Messenger cho khách
    const messengerUrl = `https://m.me/${process.env.FB_PAGE_ID}?ref=order_${orderCode}`

    return {
      success: true,
      order_code: orderCode,
      total_price: total,
      messenger_url: messengerUrl,
    }
  }

  private async sendMessengerNotification(
    dto: CreateOrderDto,
    orderCode: string,
    total: number,
  ) {
    const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN
    const pageInboxPsid = process.env.FB_ADMIN_PSID // PSID của tài khoản admin nhận thông báo

    if (!pageAccessToken || !pageInboxPsid) {
      console.warn('Thiếu FB_PAGE_ACCESS_TOKEN hoặc FB_ADMIN_PSID — bỏ qua gửi Messenger')
      return
    }

    const itemsList = dto.items
      .map(
        (i) =>
          `• ${i.name} x${i.quantity} — ${(i.price * i.quantity).toLocaleString('vi-VN')}đ`,
      )
      .join('\n')

    const fullAddress = `${dto.address_street ? dto.address_street + ', ' : ''}${dto.address_ward}, ${dto.address_district}, Tiền Giang`

    const message =
      `🔔 Y NÙ QUÁN - ĐƠN HÀNG MỚI 🔔\n\n` +
      `📌 Mã đơn: ${orderCode}\n` +
      `👤 Khách hàng: ${dto.customer_name}\n` +
      `📞 Số điện thoại: ${dto.customer_phone}\n` +
      `📍 Địa chỉ: ${fullAddress}\n\n` +
      `📋 CHI TIẾT ĐƠN HÀNG:\n` +
      `${itemsList}\n\n` +
      `💰 TỔNG CỘNG: ${total.toLocaleString('vi-VN')}đ\n` +
      (dto.note ? `📝 Ghi chú: ${dto.note}` : '')

    await axios.post(
      `https://graph.facebook.com/v19.0/me/messages`,
      {
        recipient: { id: pageInboxPsid }, // Phải là PSID của admin, không phải Page ID
        message: { text: message },
      },
      {
        params: { access_token: pageAccessToken },
      },
    )
  }

  private async sendTelegramNotification(
    dto: CreateOrderDto,
    orderCode: string,
    total: number,
  ) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!botToken || !chatId) {
      console.warn('Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID — bỏ qua gửi Telegram')
      return
    }

    const escapeHtml = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    }

    const nameEscaped = escapeHtml(dto.customer_name)
    const phoneEscaped = escapeHtml(dto.customer_phone)
    const noteEscaped = dto.note ? escapeHtml(dto.note) : ''
    
    const fullAddress = `${dto.address_street ? dto.address_street + ', ' : ''}${dto.address_ward}, ${dto.address_district}, Tiền Giang`
    const addressEscaped = escapeHtml(fullAddress)

    const itemsList = dto.items
      .map(
        (i) =>
          `• ${escapeHtml(i.name)} x${i.quantity} — <b>${(i.price * i.quantity).toLocaleString('vi-VN')}đ</b>`,
      )
      .join('\n')

    const message =
      `🛎️ <b>ĐƠN HÀNG MỚI - ${orderCode}</b>\n` +
      `👤 <b>Khách:</b> ${nameEscaped}\n` +
      `📞 <b>SĐT:</b> ${phoneEscaped}\n` +
      `📍 <b>Địa chỉ:</b> ${addressEscaped}\n` +
      `───────────────\n` +
      `${itemsList}\n` +
      `───────────────\n` +
      `💰 <b>Tổng:</b> ${total.toLocaleString('vi-VN')}đ\n` +
      (noteEscaped ? `📝 <b>Ghi chú:</b> <i>${noteEscaped}</i>` : '')

    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    })
  }

  async verifyWebhook(mode: string, token: string, challenge: string): Promise<string> {
    const verifyToken = process.env.FB_VERIFY_TOKEN
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge
    }
    throw new BadRequestException('Forbidden')
  }

  async handleWebhookPayload(body: any): Promise<void> {
    if (body.object !== 'page') {
      return
    }

    const entries = body.entry || []
    for (const entry of entries) {
      const messagingEvents = entry.messaging || []
      for (const event of messagingEvents) {
        const senderPsid = event.sender?.id
        if (!senderPsid) continue

        let ref: string | undefined

        // 1. Check direct referral event (if user already had chat history)
        if (event.referral && event.referral.ref) {
          ref = event.referral.ref
        }
        // 2. Check referral inside postback event (e.g. "Get Started" click)
        else if (event.postback && event.postback.referral && event.postback.referral.ref) {
          ref = event.postback.referral.ref
        }

        if (ref && ref.startsWith('order_')) {
          const orderCode = ref.replace('order_', '')
          await this.handleFacebookReferralOrder(senderPsid, orderCode)
        }
      }
    }
  }

  private async handleFacebookReferralOrder(senderPsid: string, orderCode: string) {
    try {
      console.log(`Nhận sự kiện referral từ FB PSID: ${senderPsid} cho mã đơn: ${orderCode}`)

      // 1. Truy vấn đơn hàng từ Supabase
      const { data: order, error } = await this.supabase.db
        .from('orders')
        .select('*')
        .eq('order_code', orderCode)
        .single()

      if (error || !order) {
        console.warn(`Không tìm thấy đơn hàng với mã ${orderCode} hoặc lỗi DB:`, error?.message)
        return
      }

      // 2. Trích xuất địa chỉ và ghi chú từ cột `note`
      let address = 'Không xác định'
      let note = ''
      if (order.note) {
        const addressMatch = order.note.match(/\[Địa chỉ: (.*?)\]/)
        if (addressMatch) {
          address = addressMatch[1]
        } else {
          address = order.note
        }
        
        const noteMatch = order.note.match(/ - Ghi chú: (.*)$/)
        if (noteMatch) {
          note = noteMatch[1]
        }
      }

      // 3. Tạo danh sách các món ăn
      const items = (order.items || []) as any[]
      const itemsList = items
        .map(
          (i) =>
            `• ${i.name} (x${i.quantity}) — ${(i.price * i.quantity).toLocaleString('vi-VN')}đ`,
        )
        .join('\n')

      // 4. Định dạng tin nhắn gửi cho khách hàng
      const message =
        `Ý Nù Quán xác nhận đơn hàng của Anh/Chị ${order.customer_name} ạ\n\n` +
        `📌 THÔNG TIN ĐƠN HÀNG:\n` +
        `• Mã đơn hàng: ${order.order_code}\n` +
        `• Số điện thoại: ${order.customer_phone}\n` +
        `• Địa chỉ giao hàng: ${address}\n\n` +
        `📋 CHI TIẾT MÓN ĂN:\n` +
        `${itemsList}\n\n` +
        `💰 TỔNG TIỀN: ${order.total_price.toLocaleString('vi-VN')}đ\n` +
        (note ? `📝 Ghi chú: ${note}` : '')

      // 5. Gửi tin nhắn
      await this.sendMessengerMessage(senderPsid, message)
      console.log(`Đã gửi tin nhắn xác nhận đơn ${orderCode} tới FB PSID ${senderPsid}`)
    } catch (err) {
      console.error(`Lỗi xử lý Facebook Referral cho đơn ${orderCode}:`, err.message)
    }
  }

  private async sendMessengerMessage(recipientPsid: string, text: string) {
    const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN
    if (!pageAccessToken) {
      console.warn('Thiếu FB_PAGE_ACCESS_TOKEN — bỏ qua gửi tin nhắn Messenger')
      return
    }

    await axios.post(
      `https://graph.facebook.com/v19.0/me/messages`,
      {
        recipient: { id: recipientPsid },
        message: { text },
      },
      {
        params: { access_token: pageAccessToken },
      },
    )
  }
}
