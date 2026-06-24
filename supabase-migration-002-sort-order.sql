-- 1. Thêm cột sort_order vào bảng menu_items nếu chưa tồn tại
alter table menu_items add column if not exists sort_order integer not null default 0;

-- 2. Tạo bảng categories mới
create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  shop_slug text not null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamp with time zone default now(),
  unique(shop_slug, name)
);

-- Index để query nhanh theo shop_slug
create index if not exists categories_shop_slug_idx on categories(shop_slug);

-- 3. Cấu hình bảo mật Row Level Security (RLS)
-- Kích hoạt RLS cho categories và tạo policy SELECT anon
alter table categories enable row level security;

create policy "Allow public read access on categories" 
on categories for select 
using (true);

-- Kích hoạt RLS cho menu_items và tạo policy SELECT anon (CHỈ xem món đang active để đảm bảo bảo mật)
-- Lưu ý: Việc giới hạn policy SELECT cho món active ảnh hưởng tới Realtime UPDATE sync.
-- Khi chuyển is_active sang false, row mới không pass policy SELECT của anon, nên Supabase Realtime sẽ KHÔNG gửi event UPDATE này cho client dùng anon key — client sẽ không biết món bị ẩn cho tới khi polling fallback (60s) chạy lại.
alter table menu_items enable row level security;

create policy "Allow public read active menu_items" 
on menu_items for select 
using (is_active = true);

-- 4. Cấu hình REPLICA IDENTITY FULL phục vụ Realtime DELETE
-- Logical replication mặc định chỉ gửi primary key khi DELETE. 
-- Cần REPLICA IDENTITY FULL để gửi đầy đủ cột (bao gồm shop_slug), giúp client-side filter realtime theo shop_slug chính xác.
alter table menu_items replica identity full;
alter table categories replica identity full;

-- 5. Script backfill dữ liệu cho categories và menu_items
-- Tạo danh mục từ các món ăn hiện có cho từng shop, sắp xếp alphabet
insert into categories (shop_slug, name, sort_order)
select 
  shop_slug, 
  trim(category) as name, 
  row_number() over (partition by shop_slug order by trim(category)) - 1 as sort_order
from (
  select distinct on (shop_slug, lower(trim(category))) 
    shop_slug, 
    category 
  from menu_items 
  where category is not null and trim(category) != ''
  order by shop_slug, lower(trim(category)), id asc
) as distinct_cats
on conflict (shop_slug, name) do nothing;

-- Cập nhật baseline sort_order cho menu_items theo thứ tự tạo hiện có trong từng nhóm category của shop
with ranked_items as (
  select 
    id,
    row_number() over (partition by shop_slug, category order by id, created_at) - 1 as new_sort_order
  from menu_items
)
update menu_items m
set sort_order = r.new_sort_order
from ranked_items r
where m.id = r.id;

-- 6. Bật Supabase Realtime cho 2 bảng menu_items và categories
-- Cần vào Supabase Dashboard > Database > Replication để enable, hoặc dùng lệnh dưới nếu có quyền superuser
-- alter publication supabase_realtime add table menu_items, categories;
