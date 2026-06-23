import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Body,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { ApiKeyGuard } from '../common/guards/api-key.guard'
import { ImageUploadService, MulterFile } from './image-upload.service'

@Controller('menu')
export class ImageUploadController {
  constructor(private readonly imageUploadService: ImageUploadService) {}

  /**
   * POST /menu/upload-image
   * Admin upload ảnh món ăn — được xử lý server-side (resize + compress + lưu Supabase)
   * Yêu cầu header: x-api-key
   * Body: multipart/form-data với field "file" và "shopSlug"
   */
  @Post('upload-image')
  @UseGuards(ApiKeyGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // giữ trong RAM để sharp xử lý, không ghi ra disk
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB hard limit ở tầng multer
    }),
  )
  async uploadImage(
    @UploadedFile() file: MulterFile,
    @Body('shopSlug') shopSlug: string,
  ) {
    if (!shopSlug) throw new BadRequestException('Thiếu shopSlug trong body')

    const result = await this.imageUploadService.uploadMenuImage(file, shopSlug)

    const savedKB = ((result.originalSize - result.compressedSize) / 1024).toFixed(0)
    const ratio = ((result.compressedSize / result.originalSize) * 100).toFixed(0)

    console.log(
      `[ImageUpload] ${shopSlug}: ${(result.originalSize / 1024).toFixed(0)}KB → ` +
      `${(result.compressedSize / 1024).toFixed(0)}KB (${ratio}%) — tiết kiệm ${savedKB}KB`,
    )

    return {
      success: true,
      url: result.url,
      stats: {
        originalKB: Math.round(result.originalSize / 1024),
        compressedKB: Math.round(result.compressedSize / 1024),
        savedKB: Number(savedKB),
      },
    }
  }
}
