import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common'
import { MenuService } from './menu.service'

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get(':slug')
  getMenu(@Param('slug') slug: string) {
    return this.menuService.getMenuBySlug(slug)
  }

  @Post()
  createItem(@Body() body: any) {
    return this.menuService.createItem(body)
  }

  @Put(':id')
  updateItem(@Param('id') id: string, @Body() body: any) {
    return this.menuService.updateItem(id, body)
  }

  @Delete(':id')
  deleteItem(@Param('id') id: string) {
    return this.menuService.deleteItem(id)
  }
}
