import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'

@Injectable()
export class MenuService {
  private cache = new Map<string, { data: any; expiresAt: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor(private readonly supabase: SupabaseService) {}

  clearCache() {
    this.cache.clear()
  }

  private async getMaxItemSortOrder(shop_slug: string, category: string): Promise<number> {
    const { data, error } = await this.supabase.db
      .from('menu_items')
      .select('sort_order, category')
      .eq('shop_slug', shop_slug)

    if (error || !data) return 0

    const targetCat = category.trim().toLowerCase()
    const filtered = data.filter(
      item => (item.category || '').trim().toLowerCase() === targetCat
    )

    if (filtered.length === 0) return -1 // Sẽ cộng thêm 1 thành 0 cho phần tử đầu tiên
    return Math.max(...filtered.map(item => item.sort_order || 0))
  }

  async getMenuBySlug(slug: string, includeInactive = false) {
    const cacheKey = `${slug}:${includeInactive}`
    const cached = this.cache.get(cacheKey)
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }

    // 1. Lấy danh sách categories trước để map tên -> sort_order
    const { data: categoriesData, error: catError } = await this.supabase.db
      .from('categories')
      .select('name, sort_order')
      .eq('shop_slug', slug)

    const categoryOrderMap = new Map<string, number>()
    if (categoriesData) {
      categoriesData.forEach(cat => {
        categoryOrderMap.set(cat.name.trim().toLowerCase(), cat.sort_order)
      })
    }

    // 2. Lấy danh sách menu items
    let query = this.supabase.db
      .from('menu_items')
      .select('*')
      .eq('shop_slug', slug)

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: itemsData, error: itemsError } = await query

    if (itemsError) throw new NotFoundException('Không tìm thấy menu')
    
    // 3. Sắp xếp trong JS:
    // - Sắp xếp theo sort_order của categories chứa món ăn đó (so sánh trim + lowercase)
    // - Nếu cùng category thì sắp xếp theo sort_order của món ăn đó
    const sortedData = [...(itemsData || [])].sort((a, b) => {
      const catA = (a.category || '').trim().toLowerCase()
      const catB = (b.category || '').trim().toLowerCase()

      const orderCatA = categoryOrderMap.has(catA) ? categoryOrderMap.get(catA)! : 99999
      const orderCatB = categoryOrderMap.has(catB) ? categoryOrderMap.get(catB)! : 99999

      if (orderCatA !== orderCatB) {
        return orderCatA - orderCatB
      }

      const sortOrderA = a.sort_order || 0
      const sortOrderB = b.sort_order || 0
      return sortOrderA - sortOrderB
    })

    this.cache.set(cacheKey, {
      data: sortedData,
      expiresAt: Date.now() + this.CACHE_TTL,
    })

    return sortedData
  }

  async createItem(body: any) {
    const shop_slug = body.shop_slug
    const category = body.category || 'Món chính'
    
    // Món mới tạo phải rơi xuống cuối nhóm, không nhảy lên đầu
    const maxSort = await this.getMaxItemSortOrder(shop_slug, category)
    body.sort_order = maxSort + 1

    const { data, error } = await this.supabase.db
      .from('menu_items')
      .insert(body)
      .select()
      .single()

    if (error) throw new Error(error.message)
    this.clearCache()
    return data
  }

  async updateItem(id: string, body: any) {
    const { data, error } = await this.supabase.db
      .from('menu_items')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    this.clearCache()
    return data
  }

  async deleteItem(id: string) {
    const { error } = await this.supabase.db
      .from('menu_items')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    this.clearCache()
    return { success: true }
  }

  async reorderItems(shop_slug: string, order: { id: string; sort_order: number }[]) {
    const results = await Promise.allSettled(
      order.map(item =>
        this.supabase.db
          .from('menu_items')
          .update({ sort_order: item.sort_order })
          .eq('id', item.id)
          .eq('shop_slug', shop_slug)
      )
    )

    const failedIds: string[] = []
    results.forEach((res, index) => {
      if (res.status === 'rejected' || (res.value && res.value.error)) {
        failedIds.push(order[index].id)
      }
    })

    this.clearCache()

    if (failedIds.length > 0) {
      throw new BadRequestException(
        `Lưu thứ tự chưa đầy đủ, vui lòng thử lại. Các ID lỗi: ${failedIds.join(', ')}`
      )
    }

    return { success: true }
  }
}
