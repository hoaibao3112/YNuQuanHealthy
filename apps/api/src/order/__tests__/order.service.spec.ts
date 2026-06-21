import { Test, TestingModule } from '@nestjs/testing'
import { OrderService } from '../order.service'
import { SupabaseService } from '../../supabase/supabase.service'
import { CreateOrderDto } from '../dto/create-order.dto'
import { BadRequestException } from '@nestjs/common'
import axios from 'axios'

jest.mock('axios')

describe('OrderService', () => {
  let service: OrderService
  let mockSupabaseClient: any

  beforeEach(async () => {
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
      eq: jest.fn().mockReturnThis(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: SupabaseService,
          useValue: {
            db: mockSupabaseClient,
          },
        },
      ],
    }).compile()

    service = module.get<OrderService>(OrderService)

    jest.clearAllMocks()
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token'
    process.env.TELEGRAM_CHAT_ID = 'test-chat-id'
    process.env.FB_PAGE_ACCESS_TOKEN = 'test-fb-token'
    process.env.FB_ADMIN_PSID = 'test-fb-psid'
    process.env.FB_PAGE_ID = 'test-fb-page-id'
  })

  const mockDto: CreateOrderDto = {
    shop_slug: 'quan-test',
    customer_name: 'Nguyen Van A',
    customer_phone: '0901234567',
    note: 'It cay',
    address_district: 'Thanh pho My Tho',
    address_ward: 'Phuong 1',
    address_street: '123 Le Loi',
    items: [
      {
        menu_item_id: 'e4a5fdc8-1111-2222-3333-444444444444',
        name: 'Com tam',
        price: 45000,
        quantity: 2,
      },
    ],
  }


  it('[HAPPY PATH] tạo đơn hàng thành công, gửi tin nhắn Telegram & FB', async () => {
    const mockOrder = {
      id: 'order-uuid',
      order_code: 'DH12345',
      shop_slug: 'quan-test',
      customer_name: 'Nguyen Van A',
      customer_phone: '0901234567',
      items: mockDto.items,
      total_price: 90000,
      note: 'It cay',
      status: 'pending',
    }

    mockSupabaseClient.single.mockResolvedValue({ data: mockOrder, error: null })
    ;(axios.post as jest.Mock).mockResolvedValue({ data: {} })

    const result = await service.createOrder(mockDto)

    expect(result.success).toBe(true)
    expect(result.order_code).toBeDefined()
    expect(result.total_price).toBe(90000)
    expect(result.messenger_url).toContain('test-fb-page-id')
    expect(result.messenger_url).toContain(`ref=2567308--order=${result.order_code}`)

    // Chờ một khoảng thời gian ngắn để các tác vụ bất đồng bộ fire-and-forget chạy xong
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Kiểm tra tin nhắn Facebook đã gửi
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('graph.facebook.com'),
      expect.any(Object),
      expect.any(Object),
    )

    // Kiểm tra tin nhắn Telegram đã gửi
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('api.telegram.org/bottest-bot-token/sendMessage'),
      expect.objectContaining({
        chat_id: 'test-chat-id',
        parse_mode: 'HTML',
        text: expect.stringContaining('Nguyen Van A'),
      }),
    )
  })

  it('[ERROR HANDLING] gửi Telegram/FB lỗi nhưng đơn hàng vẫn được lưu thành công', async () => {
    const mockOrder = {
      id: 'order-uuid',
      order_code: 'DH12345',
      total_price: 90000,
    }

    mockSupabaseClient.single.mockResolvedValue({ data: mockOrder, error: null })
    // Giả lập Telegram API bị lỗi
    ;(axios.post as jest.Mock).mockRejectedValue(new Error('Telegram API connection timeout'))

    const result = await service.createOrder(mockDto)

    expect(result.success).toBe(true)
    expect(result.order_code).toBeDefined()

    await new Promise((resolve) => setTimeout(resolve, 50))
    // Luồng đặt hàng không bị chặn và vẫn chạy thành công
  })

  it('[EDGE CASE] ném lỗi BadRequestException khi giỏ hàng rỗng', async () => {
    const invalidDto = { ...mockDto, items: [] }

    await expect(service.createOrder(invalidDto)).rejects.toThrow(BadRequestException)
    expect(mockSupabaseClient.insert).not.toHaveBeenCalled()
  })

  describe('verifyWebhook', () => {
    beforeEach(() => {
      process.env.FB_VERIFY_TOKEN = 'secure-token-123'
    })

    it('[HAPPY PATH] verifyWebhook trả về challenge khi mode và token đúng', async () => {
      const challenge = 'challenge-code'
      const result = await service.verifyWebhook('subscribe', 'secure-token-123', challenge)
      expect(result).toBe(challenge)
    })

    it('[ERROR HANDLING] verifyWebhook ném lỗi BadRequestException khi token sai', async () => {
      await expect(
        service.verifyWebhook('subscribe', 'wrong-token', 'challenge'),
      ).rejects.toThrow(BadRequestException)
    })

    it('[ERROR HANDLING] verifyWebhook ném lỗi BadRequestException khi mode sai', async () => {
      await expect(
        service.verifyWebhook('invalid_mode', 'secure-token-123', 'challenge'),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('handleWebhookPayload', () => {
    const mockOrder = {
      order_code: 'DH123456',
      customer_name: 'Nguyen Van A',
      customer_phone: '0901234567',
      total_price: 90000,
      note: '[Địa chỉ: 123 Le Loi, Phuong 1, My Tho, Tiền Giang] - Ghi chú: It cay',
      items: [
        {
          name: 'Com tam',
          price: 45000,
          quantity: 2,
        },
      ],
    }

    beforeEach(() => {
      process.env.FB_PAGE_ACCESS_TOKEN = 'test-token'
      ;(axios.post as jest.Mock).mockResolvedValue({ data: {} })
    })

    it('[HAPPY PATH] handleWebhookPayload xử lý thành công tin nhắn chứa referral trực tiếp', async () => {
      mockSupabaseClient.single.mockResolvedValue({ data: mockOrder, error: null })

      const payload = {
        object: 'page',
        entry: [
          {
            messaging: [
              {
                sender: { id: 'user-psid-1' },
                referral: {
                  ref: 'order--DH123456',
                },
              },
            ],
          },
        ],
      }

      await service.handleWebhookPayload(payload)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('orders')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('order_code', 'DH123456')
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('graph.facebook.com'),
        expect.objectContaining({
          recipient: { id: 'user-psid-1' },
          message: expect.objectContaining({
            text: expect.stringContaining('Com tam (x2)'),
          }),
        }),
        expect.any(Object),
      )
    })

    it('[HAPPY PATH] handleWebhookPayload xử lý thành công tin nhắn chứa referral với định dạng order=', async () => {
      mockSupabaseClient.single.mockResolvedValue({ data: mockOrder, error: null })

      const payload = {
        object: 'page',
        entry: [
          {
            messaging: [
              {
                sender: { id: 'user-psid-1' },
                referral: {
                  ref: '2567308--order=DH123456',
                },
              },
            ],
          },
        ],
      }

      await service.handleWebhookPayload(payload)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('orders')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('order_code', 'DH123456')
    })

    it('[HAPPY PATH] handleWebhookPayload xử lý thành công postback chứa referral', async () => {
      mockSupabaseClient.single.mockResolvedValue({ data: mockOrder, error: null })

      const payload = {
        object: 'page',
        entry: [
          {
            messaging: [
              {
                sender: { id: 'user-psid-2' },
                postback: {
                  referral: {
                    ref: 'order--DH123456',
                  },
                },
              },
            ],
          },
        ],
      }

      await service.handleWebhookPayload(payload)

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('graph.facebook.com'),
        expect.objectContaining({
          recipient: { id: 'user-psid-2' },
          message: expect.objectContaining({
            text: expect.stringContaining('Mã đơn hàng: DH123456'),
          }),
        }),
        expect.any(Object),
      )
    })

    it('[EDGE CASE] handleWebhookPayload bỏ qua khi body object không phải page', async () => {
      const payload = {
        object: 'user',
      }

      await service.handleWebhookPayload(payload)
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('[EDGE CASE] handleWebhookPayload bỏ qua khi không có referral', async () => {
      const payload = {
        object: 'page',
        entry: [
          {
            messaging: [
              {
                sender: { id: 'user-psid-1' },
                message: { text: 'hello' },
              },
            ],
          },
        ],
      }

      await service.handleWebhookPayload(payload)
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('[ERROR HANDLING] handleFacebookReferralOrder log cảnh báo khi không tìm thấy đơn hàng', async () => {
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })

      const payload = {
        object: 'page',
        entry: [
          {
            messaging: [
              {
                sender: { id: 'user-psid-1' },
                referral: {
                  ref: 'order_DH_NOT_EXIST',
                },
              },
            ],
          },
        ],
      }

      await service.handleWebhookPayload(payload)
      expect(axios.post).not.toHaveBeenCalledWith(
        expect.stringContaining('graph.facebook.com'),
        expect.any(Object),
        expect.any(Object),
      )
    })
  })

  describe('handleBotcakeWebhook', () => {
    const mockOrder = {
      order_code: 'DH123456',
      customer_name: 'Nguyen Van A',
      customer_phone: '0901234567',
      total_price: 90000,
      note: '[Địa chỉ: 123 Le Loi, Phuong 1, My Tho, Tiền Giang] - Ghi chú: It cay',
      items: [
        {
          name: 'Com tam',
          price: 45000,
          quantity: 2,
        },
      ],
    }

    it('[HAPPY PATH] handleBotcakeWebhook trả về thông tin đơn hàng đầy đủ từ ref', async () => {
      mockSupabaseClient.single.mockResolvedValue({ data: mockOrder, error: null })

      const result = await service.handleBotcakeWebhook({ ref: 'order--DH123456' })

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('orders')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('order_code', 'DH123456')
      expect(result.version).toBe('v2')
      expect(result.content.messages[0].type).toBe('text')
      
      const messageText = result.content.messages[0].text
      expect(messageText).toContain('Nguyen Van A')
      expect(messageText).toContain('0901234567')
      expect(messageText).toContain('DH123456')
      expect(messageText).toContain('90.000đ')
      expect(messageText).toContain('123 Le Loi, Phuong 1, My Tho, Tiền Giang')
      expect(messageText).toContain('It cay')
      expect(messageText).toContain('Com tam (x2)')
    })

    it('[HAPPY PATH] handleBotcakeWebhook xử lý khi ref có tiền tố order_', async () => {
      mockSupabaseClient.single.mockResolvedValue({ data: mockOrder, error: null })

      const result = await service.handleBotcakeWebhook({ ref: 'order_DH123456' })

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('order_code', 'DH123456')
      expect(result.content.messages[0].text).toContain('DH123456')
    })

    it('[HAPPY PATH] handleBotcakeWebhook xử lý khi ref có tiền tố order=', async () => {
      mockSupabaseClient.single.mockResolvedValue({ data: mockOrder, error: null })

      const result = await service.handleBotcakeWebhook({ ref: 'order=DH123456' })

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('order_code', 'DH123456')
      expect(result.content.messages[0].text).toContain('DH123456')
    })

    it('[HAPPY PATH] handleBotcakeWebhook xử lý khi ref có tiền tố tool ID và order=', async () => {
      mockSupabaseClient.single.mockResolvedValue({ data: mockOrder, error: null })

      const result = await service.handleBotcakeWebhook({ ref: '2567308--order=DH123456' })

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('order_code', 'DH123456')
      expect(result.content.messages[0].text).toContain('DH123456')
    })

    it('[HAPPY PATH] handleBotcakeWebhook xử lý khi ref có tiền tố order-', async () => {
      mockSupabaseClient.single.mockResolvedValue({ data: mockOrder, error: null })

      const result = await service.handleBotcakeWebhook({ ref: 'order-DH123456' })

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('order_code', 'DH123456')
      expect(result.content.messages[0].text).toContain('DH123456')
    })

    it('[HAPPY PATH] handleBotcakeWebhook xử lý khi ref không có tiền tố', async () => {
      mockSupabaseClient.single.mockResolvedValue({ data: mockOrder, error: null })

      const result = await service.handleBotcakeWebhook({ ref: 'DH123456' })

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('order_code', 'DH123456')
      expect(result.content.messages[0].text).toContain('DH123456')
    })

    it('[ERROR HANDLING] handleBotcakeWebhook trả về tin nhắn báo lỗi khi thiếu ref', async () => {
      const result = await service.handleBotcakeWebhook({})
      expect(result.version).toBe('v2')
      expect(result.content.messages[0].text).toContain('Không nhận được tham số ref')
    })

    it('[ERROR HANDLING] handleBotcakeWebhook trả về tin nhắn báo lỗi khi không tìm thấy đơn hàng', async () => {
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })

      const result = await service.handleBotcakeWebhook({ ref: 'DH_INVALID' })
      expect(result.version).toBe('v2')
      expect(result.content.messages[0].text).toContain('Không tìm thấy thông tin đơn hàng')
    })
  })
})

