import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MenuModule } from './menu/menu.module'
import { OrderModule } from './order/order.module'
import { SupabaseModule } from './supabase/supabase.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    MenuModule,
    OrderModule,
  ],
})
export class AppModule {}
