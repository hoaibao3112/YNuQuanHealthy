import { Injectable, NotFoundException } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'

@Injectable()
export class MenuService {
  constructor(private readonly supabase: SupabaseService) {}

  async getMenuBySlug(slug: string) {
    const { data, error } = await this.supabase.db
      .from('menu_items')
      .select('*')
      .eq('shop_slug', slug)
      .eq('is_active', true)
      .order('category')

    if (error) throw new NotFoundException('Không tìm thấy menu')
    return data
  }

  async createItem(body: any) {
    const { data, error } = await this.supabase.db
      .from('menu_items')
      .insert(body)
      .select()
      .single()

    if (error) throw new Error(error.message)
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
    return data
  }

  async deleteItem(id: string) {
    const { error } = await this.supabase.db
      .from('menu_items')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    return { success: true }
  }
}
