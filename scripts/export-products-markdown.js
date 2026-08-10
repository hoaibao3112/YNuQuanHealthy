const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables from the root .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_KEY trong .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to format currency
function formatVND(amount) {
  if (amount === undefined || amount === null) return '0đ';
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

async function run() {
  try {
    console.log("🔌 Đang kết nối tới Supabase REST API...");
    
    // 1. Query categories
    console.log("🔍 Đang lấy dữ liệu từ bảng 'categories'...");
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, shop_slug, name, sort_order, created_at')
      .order('shop_slug', { ascending: true })
      .order('sort_order', { ascending: true });

    if (catError) {
      throw catError;
    }
    console.log(`📊 Tìm thấy ${categories.length} danh mục.`);

    // 2. Query menu_items (products)
    console.log("🔍 Đang lấy dữ liệu từ bảng 'menu_items'...");
    const { data: menuItems, error: itemError } = await supabase
      .from('menu_items')
      .select('id, shop_slug, name, description, price, image_url, category, sub_category, is_active, sort_order, created_at')
      .order('shop_slug', { ascending: true })
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });

    if (itemError) {
      throw itemError;
    }
    console.log(`📊 Tìm thấy ${menuItems.length} sản phẩm.`);

    // 3. Process & Group Data
    // Group categories by shop_slug
    const categoriesByShop = {};
    categories.forEach(cat => {
      if (!categoriesByShop[cat.shop_slug]) {
        categoriesByShop[cat.shop_slug] = [];
      }
      categoriesByShop[cat.shop_slug].push(cat);
    });

    // Group menu_items by shop_slug, and then by category
    const productsByShop = {};
    menuItems.forEach(item => {
      const shop = item.shop_slug;
      const cat = item.category || 'Khác';

      if (!productsByShop[shop]) {
        productsByShop[shop] = {};
      }
      if (!productsByShop[shop][cat]) {
        productsByShop[shop][cat] = [];
      }
      productsByShop[shop][cat].push(item);
    });

    // Get list of all unique shops from both tables
    const allShops = Array.from(new Set([
      ...Object.keys(categoriesByShop),
      ...Object.keys(productsByShop)
    ])).sort();

    // 4. Generate Markdown Content
    let md = `# 📋 BÁO CÁO CHI TIẾT DANH SÁCH SẢN PHẨM\n\n`;
    md += `*Xuất bản lúc: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (Giờ Việt Nam)*\n\n`;
    md += `## 📊 THỐNG KÊ CHUNG\n\n`;
    md += `- **Tổng số Cửa hàng (Shop):** ${allShops.length}\n`;
    md += `- **Tổng số Danh mục:** ${categories.length}\n`;
    md += `- **Tổng số Sản phẩm:** ${menuItems.length}\n\n`;
    
    // Summary table per shop
    md += `### 🏪 Tóm tắt theo Cửa hàng\n\n`;
    md += `| Tên Shop (Slug) | Số Danh mục | Số Sản phẩm | Trạng thái hoạt động |\n`;
    md += `| :--- | :---: | :---: | :---: |\n`;
    
    allShops.forEach(shop => {
      const catCount = categoriesByShop[shop] ? categoriesByShop[shop].length : 0;
      let prodCount = 0;
      if (productsByShop[shop]) {
        Object.values(productsByShop[shop]).forEach(list => {
          prodCount += list.length;
        });
      }
      md += `| **${shop}** | ${catCount} | ${prodCount} | [Xem chi tiết](#-shop-${shop}) |\n`;
    });
    md += `\n---\n\n`;

    // Detailed products per shop
    allShops.forEach(shop => {
      md += `## 🏪 SHOP: \`${shop}\`\n\n`;

      const shopCats = categoriesByShop[shop] || [];
      const shopProducts = productsByShop[shop] || {};

      // Get all categories in this shop (including ones that only exist in menu_items but not in categories table)
      const categoriesInShop = Array.from(new Set([
        ...shopCats.map(c => c.name),
        ...Object.keys(shopProducts)
      ]));

      // Sort categories: items in categories table sorted by sort_order first, then others alphabetically
      categoriesInShop.sort((a, b) => {
        const catA = shopCats.find(c => c.name === a);
        const catB = shopCats.find(c => c.name === b);
        if (catA && catB) {
          return catA.sort_order - catB.sort_order;
        }
        if (catA) return -1;
        if (catB) return 1;
        return a.localeCompare(b);
      });

      if (categoriesInShop.length === 0) {
        md += `*Không có dữ liệu danh mục hay sản phẩm nào cho cửa hàng này.*\n\n`;
        return;
      }

      categoriesInShop.forEach(catName => {
        const items = shopProducts[catName] || [];
        const catObj = shopCats.find(c => c.name === catName);
        const catOrderText = catObj !== undefined ? `(Thứ tự sắp xếp: ${catObj.sort_order})` : `*(Chưa cấu hình thứ tự)*`;
        
        md += `### 📁 Danh mục: ${catName} ${catOrderText}\n\n`;

        if (items.length === 0) {
          md += `*Không có sản phẩm nào thuộc danh mục này.*\n\n`;
          return;
        }

        md += `| Ảnh | Tên Sản phẩm | Giá | Phân loại phụ (Sub-category) | Trạng thái | Thứ tự | Mô tả / Ghi chú | ID |\n`;
        md += `| :---: | :--- | :---: | :---: | :---: | :---: | :--- | :--- |\n`;

        // Sort items inside category by sort_order, then name
        items.sort((a, b) => {
          if (a.sort_order !== b.sort_order) {
            return (a.sort_order || 0) - (b.sort_order || 0);
          }
          return a.name.localeCompare(b.name);
        });

        items.forEach(item => {
          // Format image
          let imgCell = '-';
          if (item.image_url) {
            // Use small HTML image tag to keep layout clean in Markdown previewers
            imgCell = `<img src="${item.image_url}" width="60" height="60" style="object-fit: cover; border-radius: 4px;" alt="${item.name}" />`;
          }

          // Format status
          const statusCell = item.is_active ? '🟢 Bật' : '🔴 Tắt';
          
          // Format sub_category
          const subCatCell = item.sub_category ? `\`${item.sub_category}\`` : '-';

          // Format description
          const descCell = item.description ? item.description.replace(/\r?\n/g, ' ') : '-';

          md += `| ${imgCell} | **${item.name}** | \`${formatVND(item.price)}\` | ${subCatCell} | ${statusCell} | \`${item.sort_order ?? 0}\` | ${descCell} | \`${item.id}\` |\n`;
        });
        md += `\n`;
      });

      md += `\n---\n\n`;
    });

    // 5. Write to File
    const outputPath = path.join(__dirname, '../PRODUCT_DATA.md');
    fs.writeFileSync(outputPath, md, 'utf8');
    console.log(`🎉 Xuất dữ liệu sản phẩm thành công ra file: ${outputPath}`);

  } catch (err) {
    console.error("❌ Lỗi khi thực hiện export sản phẩm:", err);
  }
}

run();
