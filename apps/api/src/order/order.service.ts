import { Injectable, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import { CreateOrderDto } from './dto/create-order.dto'
import axios from 'axios'

// ─── Helper functions dùng chung ─────────────────────────────────────────────

/**
 * Ghép địa chỉ đầy đủ từ các trường của DTO.
 * Tập trung logic tại đây để tránh copy-paste ở nhiều nơi.
 */
function buildFullAddress(dto: {
  address_district: string
  address_ward: string
  address_street?: string
}): string {
  const isPickup =
    dto.address_district === 'Tới quán lấy' || dto.address_ward === 'Tới quán lấy'
  if (isPickup) return 'Khách tự tới quán lấy (Không giao hàng)'
  return `${dto.address_street ? dto.address_street + ', ' : ''}${dto.address_ward}, ${dto.address_district}, Tiền Giang`
}

/**
 * Parse mã đơn hàng từ chuỗi ref (Facebook Messenger / Botcake).
 * Tách bỏ các prefix như '2567308--', 'order=', 'order-', ...
 */
function parseOrderRefCode(ref: string): string {
  let code = ref
  // Bỏ prefix số
  if (code.startsWith('w2578106--')) code = code.replace('w2578106--', '')
  else if (code.startsWith('2578106--')) code = code.replace('2578106--', '')
  else if (code.startsWith('w2567571--')) code = code.replace('w2567571--', '')
  else if (code.startsWith('2567571--')) code = code.replace('2567571--', '')
  // Bỏ prefix 'order'
  if (code.startsWith('order=')) code = code.replace('order=', '')
  else if (code.startsWith('order--')) code = code.replace('order--', '')
  else if (code.startsWith('order_')) code = code.replace('order_', '')
  else if (code.startsWith('order-')) code = code.replace('order-', '')
  return code
}

/**
 * Trích xuất địa chỉ và ghi chú từ cột `note` trong bảng orders.
 * Format lưu: "[Địa chỉ: ...] - Ghi chú: ..."
 */
function parseOrderNote(note: string | null): { address: string; note: string } {
  if (!note) return { address: 'Không xác định', note: '' }
  const addressMatch = note.match(/\[Địa chỉ: (.*?)\]/)
  const noteMatch = note.match(/ - Ghi chú: (.*)$/)
  return {
    address: addressMatch ? addressMatch[1] : note,
    note: noteMatch ? noteMatch[1] : '',
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class OrderService {
  constructor(private readonly supabase: SupabaseService) {}

  private static webhookLogs: any[] = []

  logBotcakeWebhook(body: any, headers: any, query: any) {
    OrderService.webhookLogs.push({
      timestamp: new Date().toISOString(),
      body,
      headers,
      query,
    })
    if (OrderService.webhookLogs.length > 10) {
      OrderService.webhookLogs.shift()
    }
  }

  getBotcakeLogs() {
    return OrderService.webhookLogs
  }

  async createOrder(dto: CreateOrderDto) {
    // 1. Validate items không rỗng
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Đơn hàng phải có ít nhất 1 món')
    }

    // 2. Validate giá tiền server-side — KHÔNG tin giá từ client
    const itemIds = dto.items.map((i) => i.menu_item_id)
    const { data: menuItems, error: menuError } = await this.supabase.db
      .from('menu_items')
      .select('id, price, is_active')
      .in('id', itemIds)

    if (menuError) {
      throw new BadRequestException('Lỗi kiểm tra giá món ăn: ' + menuError.message)
    }

    const priceMap = new Map<string, number>(
      (menuItems || []).map((m: { id: string; price: number }) => [m.id, m.price]),
    )

    // Kiểm tra tất cả món có tồn tại và còn active không
    for (const item of dto.items) {
      if (!priceMap.has(item.menu_item_id)) {
        throw new BadRequestException(`Món "${item.name}" không tồn tại hoặc đã bị xoá`)
      }
    }

    // 3. Tính tổng theo giá server — bỏ qua giá client gửi lên
    const orderCode = `DH${Date.now()}`
    const total = dto.items.reduce((sum, item) => {
      const serverPrice = priceMap.get(item.menu_item_id)!
      return sum + serverPrice * item.quantity
    }, 0)

    // Ghi đè price trong items bằng giá server để lưu vào DB
    const verifiedItems = dto.items.map((item) => ({
      ...item,
      price: priceMap.get(item.menu_item_id)!,
    }))

    // 4. Ghép địa chỉ
    const fullAddress = buildFullAddress(dto)
    const noteWithAddress = `[Địa chỉ: ${fullAddress}]${dto.note ? ' - Ghi chú: ' + dto.note : ''}`

    // 5. Lưu vào Supabase
    const { error } = await this.supabase.db
      .from('orders')
      .insert({
        order_code: orderCode,
        shop_slug: dto.shop_slug,
        customer_name: dto.customer_name,
        customer_phone: dto.customer_phone,
        items: verifiedItems,
        total_price: total,
        note: noteWithAddress,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw new BadRequestException('Lỗi lưu đơn hàng: ' + error.message)

    // 6. Gửi thông báo (fire-and-forget)
    this.sendMessengerNotification(dto, verifiedItems, orderCode, total).catch((err) =>
      console.error('Messenger notification failed:', err.message),
    )
    this.sendTelegramNotification(dto, verifiedItems, orderCode, total).catch((err) =>
      console.error('Telegram notification failed:', err.message),
    )

    // 7. Trả về link mở Messenger cho khách
    const messengerUrl = `https://m.me/${process.env.FB_PAGE_ID}?ref=2578106--order=${orderCode}`
    return {
      success: true,
      order_code: orderCode,
      total_price: total,
      messenger_url: messengerUrl,
    }
  }

  private async sendMessengerNotification(
    dto: CreateOrderDto,
    verifiedItems: any[],
    orderCode: string,
    total: number,
  ) {
    const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN
    const pageInboxPsid = process.env.FB_ADMIN_PSID

    if (!pageAccessToken || !pageInboxPsid) {
      console.warn('Thiếu FB_PAGE_ACCESS_TOKEN hoặc FB_ADMIN_PSID — bỏ qua gửi Messenger')
      return
    }

    const itemsList = verifiedItems
      .map((i) => `• ${i.name} x${i.quantity} — ${(i.price * i.quantity).toLocaleString('vi-VN')}đ`)
      .join('\n')

    const fullAddress = buildFullAddress(dto)

    const message =
      `Ý Nù Quán xác nhận đơn hàng của Anh/Chị ${dto.customer_name} ạ\n\n` +
      `📌 Mã đơn: ${orderCode}\n` +
      `👤 Khách hàng: ${dto.customer_name}\n` +
      `📞 Số điện thoại: ${dto.customer_phone}\n` +
      `📍 Địa chỉ: ${fullAddress}\n\n` +
      `📋 CHI TIẾT ĐƠN HÀNG:\n${itemsList}\n\n` +
      `💰 TỔNG CỘNG: ${total.toLocaleString('vi-VN')}đ\n` +
      (dto.note ? `📝 Ghi chú: ${dto.note}` : '')

    await axios.post(
      `https://graph.facebook.com/v19.0/me/messages`,
      { recipient: { id: pageInboxPsid }, message: { text: message } },
      { params: { access_token: pageAccessToken } },
    )
  }

  private async sendTelegramNotification(
    dto: CreateOrderDto,
    verifiedItems: any[],
    orderCode: string,
    total: number,
  ) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!botToken || !chatId) {
      console.warn('Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID — bỏ qua gửi Telegram')
      return
    }

    const escapeHtml = (text: string) =>
      text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const fullAddress = buildFullAddress(dto)

    const itemsList = verifiedItems
      .map(
        (i) =>
          `• ${escapeHtml(i.name)} x${i.quantity} — <b>${(i.price * i.quantity).toLocaleString('vi-VN')}đ</b>`,
      )
      .join('\n')

    const message =
      `🛎️ <b>ĐƠN HÀNG MỚI - ${orderCode}</b>\n` +
      `👤 <b>Khách:</b> ${escapeHtml(dto.customer_name)}\n` +
      `📞 <b>SĐT:</b> ${escapeHtml(dto.customer_phone)}\n` +
      `📍 <b>Địa chỉ:</b> ${escapeHtml(fullAddress)}\n` +
      `───────────────\n${itemsList}\n───────────────\n` +
      `💰 <b>Tổng:</b> ${total.toLocaleString('vi-VN')}đ\n` +
      (dto.note ? `📝 <b>Ghi chú:</b> <i>${escapeHtml(dto.note)}</i>` : '')

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
    if (body.object !== 'page') return

    const entries = body.entry || []
    for (const entry of entries) {
      for (const event of entry.messaging || []) {
        const senderPsid = event.sender?.id
        if (!senderPsid) continue

        let ref: string | undefined
        if (event.referral?.ref) {
          ref = event.referral.ref
        } else if (event.postback?.referral?.ref) {
          ref = event.postback.referral.ref
        }

        if (ref) {
          const orderCode = parseOrderRefCode(ref)
          if (orderCode) {
            await this.handleFacebookReferralOrder(senderPsid, orderCode)
          }
        }
      }
    }
  }

  private async handleFacebookReferralOrder(senderPsid: string, orderCode: string) {
    try {
      console.log(`Nhận sự kiện referral từ FB PSID: ${senderPsid} cho mã đơn: ${orderCode}`)

      const { data: order, error } = await this.supabase.db
        .from('orders')
        .select('*')
        .eq('order_code', orderCode)
        .single()

      if (error || !order) {
        console.warn(`Không tìm thấy đơn hàng ${orderCode}:`, error?.message)
        return
      }

      const { address, note } = parseOrderNote(order.note)
      const items = (order.items || []) as any[]
      const itemsList = items
        .map((i) => `• ${i.name} (x${i.quantity}) — ${(i.price * i.quantity).toLocaleString('vi-VN')}đ`)
        .join('\n')

      const message =
        `Ý Nù Quán xác nhận đơn hàng của Anh/Chị ${order.customer_name} ạ\n\n` +
        `📌 THÔNG TIN ĐƠN HÀNG:\n` +
        `• Mã đơn hàng: ${order.order_code}\n` +
        `• Số điện thoại: ${order.customer_phone}\n` +
        `• Địa chỉ giao hàng: ${address}\n\n` +
        `📋 CHI TIẾT MÓN ĂN:\n${itemsList}\n\n` +
        `💰 TỔNG TIỀN: ${order.total_price.toLocaleString('vi-VN')}đ\n` +
        (note ? `📝 Ghi chú: ${note}` : '')

      await this.sendMessengerMessage(senderPsid, message)
      console.log(`Đã gửi xác nhận đơn ${orderCode} tới PSID ${senderPsid}`)
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
      { recipient: { id: recipientPsid }, message: { text } },
      { params: { access_token: pageAccessToken } },
    )
  }

  async handleBotcakeWebhook(body: { ref?: string }) {
    const ref = body.ref
    console.log('[Botcake Webhook] Nhận ref:', ref)

    if (!ref) {
      return {
        version: 'v2',
        content: { messages: [{ type: 'text', text: '⚠️ Không nhận được tham số ref đơn hàng từ Botcake.' }] },
      }
    }

    const orderCode = parseOrderRefCode(ref)

    const { data: order, error } = await this.supabase.db
      .from('orders')
      .select('*')
      .eq('order_code', orderCode)
      .single()

    if (error || !order) {
      return {
        version: 'v2',
        content: {
          messages: [{ type: 'text', text: `⚠️ Không tìm thấy đơn hàng với mã ${orderCode}.` }],
        },
      }
    }

    const { address, note } = parseOrderNote(order.note)
    const items = (order.items || []) as any[]
    const itemsList = items
      .map((i) => `• ${i.name} (x${i.quantity}) — ${(i.price * i.quantity).toLocaleString('vi-VN')}đ`)
      .join('\n')

    const message =
      `Ý Nù Quán xác nhận đơn hàng của Anh/Chị ${order.customer_name} ạ\n\n` +
      `📌 THÔNG TIN ĐƠN HÀNG:\n` +
      `• Mã đơn hàng: ${order.order_code}\n` +
      `• Số điện thoại: ${order.customer_phone}\n` +
      `• Địa chỉ giao hàng: ${address}\n\n` +
      `📋 CHI TIẾT MÓN ĂN:\n${itemsList}\n\n` +
      `💰 TỔNG TIỀN: ${order.total_price.toLocaleString('vi-VN')}đ\n` +
      (note ? `📝 Ghi chú: ${note}` : '')

    return {
      version: 'v2',
      content: { messages: [{ type: 'text', text: message }] },
    }
  }
}
