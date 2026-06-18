-- Bảng menu items
create table menu_items (
  id uuid default gen_random_uuid() primary key,
  shop_slug text not null,
  name text not null,
  description text,
  price integer not null,
  image_url text,
  category text default 'Món chính',
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- Bảng đơn hàng
create table orders (
  id uuid default gen_random_uuid() primary key,
  order_code text unique not null,
  shop_slug text not null,
  customer_name text not null,
  customer_phone text not null,
  items jsonb not null,
  total_price integer not null,
  note text default '',
  status text default 'pending', -- pending | confirmed | done | cancelled
  created_at timestamp with time zone default now()
);

-- Index để query nhanh hơn
create index on menu_items(shop_slug);
create index on orders(shop_slug);
create index on orders(status);

-- Dữ liệu mẫu để test
insert into menu_items (shop_slug, name, description, price, category) values
('quan-test', 'Cơm tấm sườn bì chả', 'Cơm tấm thơm, sườn nướng mật ong', 45000, 'Cơm'),
('quan-test', 'Bún bò Huế', 'Bún bò đặc biệt, giò heo', 55000, 'Bún'),
('quan-test', 'Phở bò tái', 'Phở bò tái chín, nước dùng đậm đà', 60000, 'Phở'),
('quan-test', 'Trà đá', 'Trà đá mát lạnh', 5000, 'Đồ uống'),
('quan-test', 'Nước ngọt', 'Pepsi / 7Up / Mirinda', 15000, 'Đồ uống');
