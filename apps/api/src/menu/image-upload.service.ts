import { Injectable, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'
import sharp from 'sharp'

export interface MulterFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  size: number
  buffer: Buffer
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const MAX_DIMENSION = 800 // px — đủ hiển thị menu, giảm dung lượng đáng kể

@Injectable()
export class ImageUploadService {
  constructor(private readonly supabase: SupabaseService) {}

  async uploadMenuImage(
    file: MulterFile,
    shopSlug: string,
  ): Promise<{ url: string; originalSize: number; compressedSize: number }> {
    // --- Validate ---
    if (!file) throw new BadRequestException('Không có file được gửi lên')

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Định dạng không hỗ trợ: ${file.mimetype}. Chỉ chấp nhận JPG, PNG, WEBP, GIF`,
      )
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException(
        `Ảnh quá lớn: ${(file.size / 1024 / 1024).toFixed(1)}MB. Tối đa 5MB`,
      )
    }

    if (!shopSlug || shopSlug.length > 60) {
      throw new BadRequestException('shopSlug không hợp lệ')
    }

    // --- Compress + Resize bằng sharp (server-side) ---
    const originalSize = file.size

    let compressedBuffer: Buffer

    // GIF giữ nguyên (sharp không hỗ trợ animated GIF tốt)
    if (file.mimetype === 'image/gif') {
      compressedBuffer = file.buffer
    } else {
      compressedBuffer = await sharp(file.buffer)
        .resize(MAX_DIMENSION, MAX_DIMENSION, {
          fit: 'inside',         // giữ tỉ lệ, không crop
          withoutEnlargement: true, // không phóng to ảnh nhỏ
        })
        .webp({ quality: 82 })  // convert sang WebP, chất lượng tốt mà nhẹ
        .toBuffer()
    }

    const compressedSize = compressedBuffer.length

    // --- Upload lên Supabase Storage (dùng service_role key phía server) ---
    const randomStr = Math.random().toString(36).substring(2, 9)
    const ext = file.mimetype === 'image/gif' ? 'gif' : 'webp'
    const fileName = `${shopSlug}/${Date.now()}-${randomStr}.${ext}`
    const contentType = file.mimetype === 'image/gif' ? 'image/gif' : 'image/webp'

    const { error } = await this.supabase.db.storage
      .from('menu-images')
      .upload(fileName, compressedBuffer, {
        contentType,
        cacheControl: '2592000', // 30 ngày
        upsert: true,
      })

    if (error) throw new BadRequestException('Lỗi upload lên Supabase: ' + error.message)

    const { data: urlData } = this.supabase.db.storage
      .from('menu-images')
      .getPublicUrl(fileName)

    if (!urlData?.publicUrl) {
      throw new BadRequestException('Không lấy được public URL sau khi upload')
    }

    return {
      url: urlData.publicUrl,
      originalSize,
      compressedSize,
    }
  }
}
