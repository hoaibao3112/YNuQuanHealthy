import { Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards, Query, Headers } from '@nestjs/common'
import { MenuService } from './menu.service'
import { ApiKeyGuard } from '../common/guards/api-key.guard'

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // Public: khách hàng xem menu (hoặc admin xem tất cả nếu truyền thêm ?all=true kèm API key hợp lệ)
  @Get(':slug')
  getMenu(
    @Param('slug') slug: string,
    @Query('all') all?: string,
    @Headers('x-api-key') apiKey?: string,
  ) {
    const validKey = process.env.ADMIN_API_KEY || 'ynuquan_secret_api_key_2026'
    const includeInactive = all === 'true' && apiKey === validKey
    return this.menuService.getMenuBySlug(slug, includeInactive)
  }

  // Admin only: cần header x-api-key
  @Post()
  @UseGuards(ApiKeyGuard)
  createItem(@Body() body: any) {
    return this.menuService.createItem(body)
  }

  @Put(':id')
  @UseGuards(ApiKeyGuard)
  updateItem(@Param('id') id: string, @Body() body: any) {
    return this.menuService.updateItem(id, body)
  }

  @Patch('reorder')
  @UseGuards(ApiKeyGuard)
  reorderItems(@Body() body: { shop_slug: string; order: { id: string; sort_order: number }[] }) {
    return this.menuService.reorderItems(body.shop_slug, body.order)
  }

  @Delete(':id')
  @UseGuards(ApiKeyGuard)
  deleteItem(@Param('id') id: string) {
    return this.menuService.deleteItem(id)
  }
}
