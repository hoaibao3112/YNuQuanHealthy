import { Module } from '@nestjs/common'
import { MenuController } from './menu.controller'
import { MenuService } from './menu.service'
import { ImageUploadController } from './image-upload.controller'
import { ImageUploadService } from './image-upload.service'

@Module({
  controllers: [MenuController, ImageUploadController],
  providers: [MenuService, ImageUploadService],
  exports: [MenuService],
})
export class MenuModule {}
