import { Controller, Post, Body } from '@nestjs/common'
import { OrderService } from './order.service'

export class CreateOrderDto {
  shop_slug: string
  customer_name: string
  customer_phone: string
  items: { menu_item_id: string; quantity: number; name: string; price: number }[]
  note?: string
}

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  createOrder(@Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(dto)
  }
}
