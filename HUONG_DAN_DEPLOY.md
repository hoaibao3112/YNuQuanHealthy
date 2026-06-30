# Hướng Dẫn Vận Hành & Deploy Hệ Thống YNuQuan
### (Cấu hình chuẩn: Web Vercel - API Render - Database Supabase - Giữ thức bằng UptimeRobot)

Tài liệu này ghi chép lại chi tiết luồng chạy thực tế và các bước thiết lập hệ thống YNuQuan trên các nền tảng đám mây để hệ thống hoạt động **miễn phí, ổn định 24/7 và tải nhanh tức thì**.

---

## I. Mô Hình Kiến Trúc & Luồng Chạy Thực Tế

Hệ thống được vận hành theo mô hình phân tách tối ưu:
*   **Web (Frontend)**: Deploy lên **Vercel** để có tốc độ phản hồi giao diện tải cực nhanh cho khách hàng.
*   **API (Backend)**: Deploy lên **Render** chạy dưới dạng một máy chủ Node.js độc lập.
*   **Cơ sở dữ liệu**: Chạy trên nền tảng **Supabase (PostgreSQL)**.
*   **Giám sát & Đánh thức**: Sử dụng **UptimeRobot** gửi ping tự động mỗi 5 phút để giữ cho cả **Render** và **Supabase** hoạt động liên tục 24/7.

```
                  ┌────────────────────────┐
                  │   Khách hàng lướt web  │
                  └───────────┬────────────┘
                              │
                              ▼
                     [ Next.js - Vercel ]
                              │
                    (Gọi API /menu & /orders)
                              │
                              ▼
                     [ NestJS - Render ] <───(Ping mỗi 5 phút)─── [ UptimeRobot ]
                              │
                 (Truy vấn đọc/ghi database)
                              │
                              ▼
                    [ Supabase Postgres ]
```

---

## II. Cơ Chế Giữ Server & Database Luôn Thức (Anti-Sleep)

### 1. Tại sao Render và Supabase lại đi ngủ?
*   **Render (Free Tier)**: Nếu không nhận được bất kỳ lượt truy cập (request) nào trong vòng **15 phút**, Render sẽ tạm dừng (ngủ đông) server để tiết kiệm tài nguyên. Lượt truy cập tiếp theo sẽ mất tới **50s - 2 phút** để server khởi động lại.
*   **Supabase (Free Tier)**: Nếu cơ sở dữ liệu không ghi nhận bất kỳ thao tác đọc/ghi nào trong vòng **7 ngày liên tục**, dự án Supabase sẽ bị đóng băng (Pause).

### 2. UptimeRobot giải quyết vấn đề này như thế nào?
Để giải quyết cả hai vấn đề trên cùng lúc, chúng ta đã phát triển một endpoint chuyên dụng tên là `/health` trong mã nguồn [app.controller.ts](file:///d:/freelancer/YNuQuan/apps/api/src/app.controller.ts):
1.  **UptimeRobot** gửi tín hiệu ping tự động mỗi **5 phút/lần** vào đường dẫn `https://<ten-mien-render-cua-ban>/health`.
2.  Mỗi lần nhận tín hiệu ping, server **Render** sẽ hoạt động trở lại $\rightarrow$ **Giúp Render luôn thức**.
3.  Server Render khi xử lý link `/health` sẽ thực hiện truy vấn siêu nhẹ (chỉ đọc ID của 1 món ăn) lên **Supabase** $\rightarrow$ **Giúp Supabase luôn ghi nhận hoạt động đọc và không bao giờ bị khóa sau 7 ngày**.
4.  Vì truy vấn chỉ đọc 1 dòng ID duy nhất nên **không gây tốn băng thông** và chạy cực kỳ nhanh (dưới 10ms).

---

## III. Các Bước Thiết Lập & Deploy Chi Tiết

### Bước 1: Deploy API Backend lên Render
1.  Đăng ký tài khoản trên [Render.com](https://render.com/) bằng một Gmail chưa từng đăng ký Render trước đây (để đảm bảo có đủ 750 giờ chạy miễn phí cho riêng dịch vụ này).
2.  Tại giao diện Render, chọn **New** -> **Web Service** -> Liên kết với tài khoản GitHub chứa code của bạn.
3.  Cấu hình dự án:
    *   **Name**: `ynuquan-api`
    *   **Root Directory**: Nhập **`apps/api`**
    *   **Runtime**: Chọn **`Node`**
    *   **Build Command**: `npm run build`
    *   **Start Command**: `npm run start:prod`
4.  Kéo xuống phần **Advanced** -> chọn **Add Environment Variable** để cấu hình các biến môi trường:
    *   `SUPABASE_URL` = *(Lấy từ cài đặt Supabase của bạn)*
    *   `SUPABASE_KEY` = *(Lấy từ cài đặt Supabase của bạn)*
    *   `DATABASE_URL` = *(Lấy ở mục Connection String trên Supabase - dạng postgresql://...)*
    *   `DIRECT_URL` = *(Lấy ở mục Connection String trên Supabase)*
    *   `TELEGRAM_BOT_TOKEN` = *(Lấy từ BotFather trên Telegram)*
    *   `TELEGRAM_CHAT_ID` = *(ID nhóm Telegram nhận thông báo đơn hàng)*
    *   `FB_PAGE_ACCESS_TOKEN` = *(Lấy từ Facebook Developer Portal)*
    *   `FB_PAGE_ID` = *(ID của Facebook Page)*
    *   `FB_ADMIN_PSID` = *(PSID của tài khoản admin nhận tin nhắn)*
    *   `FB_VERIFY_TOKEN` = *(Chuỗi bất kỳ tự đặt, dùng để xác minh Webhook với Facebook)*
5.  Ấn **Create Web Service**. Đợi vài phút để Render biên dịch và khởi chạy thành công. Copy đường dẫn ứng dụng do Render cấp, ví dụ: `https://ynuquan-api.onrender.com`.

---

### Bước 2: Thiết lập Ping tự động trên UptimeRobot
1.  Truy cập trang web: [UptimeRobot.com](https://uptimerobot.com/) và đăng ký tài khoản miễn phí.
2.  Tại màn hình Dashboard, bấm vào nút màu xanh **`+ Add New Monitor`**.
3.  Cấu hình như sau:
    *   **Monitor Type**: Chọn **`HTTP(s)`**
    *   **Friendly Name**: Điền `Giu thuc API YNuQuan`
    *   **URL (or IP)**: Dán link Render của bạn kèm theo `/health` (Ví dụ: `https://ynuquan-api.onrender.com/health`)
    *   **Monitoring Interval**: Chọn **`Every 5 minutes`** (Cứ 5 phút ping một lần).
4.  Bấm **Create Monitor** và bấm tiếp xác nhận lần nữa để hoàn thành.

*(Kể từ lúc này, hệ thống giám sát sẽ tự động đánh thức server của bạn liên tục).*

---

### Bước 3: Deploy Web Frontend lên Vercel
1.  Truy cập [Vercel.com](https://vercel.com/) và đăng nhập bằng tài khoản GitHub của bạn.
2.  Bấm **Add New** -> **Project** -> Chọn Git Repository chứa code dự án của bạn.
3.  Cấu hình dự án:
    *   **Project Name**: `ynuquan-web`
    *   **Framework Preset**: Chọn **`Next.js`**
    *   **Root Directory**: Click Edit và chọn **`apps/web`**
4.  Mở rộng phần **Environment Variables** và cấu hình 3 biến quan trọng cho Frontend:
    *   `NEXT_PUBLIC_API_URL`: Dán link API Render bạn vừa copy ở Bước 1 vào đây (Ví dụ: `https://ynuquan-api.onrender.com` - *Lưu ý không có dấu gạch chéo `/` ở cuối*).
    *   `NEXT_PUBLIC_SUPABASE_URL`: Nhập URL Supabase của bạn.
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Nhập Anon Key Supabase của bạn.
5.  Ấn nút **Deploy**.

Sau khi Vercel build xong, bạn sẽ có đường link trang Web bán hàng chính thức dạng `https://ynuquan-web.vercel.app`. Đường dẫn đặt món của khách hàng sẽ là `https://ynuquan-web.vercel.app/menu/quan-test`.

---

### Bước 4: Tích hợp với Botcake.io (Thay thế cho Webhook Facebook thủ công)
Vì hệ thống sử dụng Botcake.io làm chatbot (để bỏ qua thủ tục xét duyệt ứng dụng với Facebook), bạn **KHÔNG cần** tạo ứng dụng Facebook Developer hay cấu hình Webhook thủ công trên Developer Portal nữa.

Thay vào đó, bạn chỉ cần cấu hình Botcake liên kết với server API theo tài liệu hướng dẫn tại [BOTCAKE_GUIDE.md](file:///d:/freelancer/YNuQuan/BOTCAKE_GUIDE.md):
1. Tạo công cụ **Messenger Ref URL** trên Botcake.
2. Cấu hình kịch bản **Opt-in Message** tự động gọi **JSON API Webhook** trỏ về: `https://<ten-mien-render-cua-ban>/orders/botcake-webhook` với tham số `ref={{order_code}}`.
3. Bật nút **"Bắt đầu"** ở Cấu hình chung của Botcake và bấm **Làm mới quyền** để đồng bộ với Facebook.

---

## IV. Cách Kiểm Tra Hoạt Động (Verify)

1.  **Kiểm tra UptimeRobot**: Trên trang UptimeRobot, dòng monitor của bạn sẽ báo trạng thái **Up** (Màu xanh).
2.  **Kiểm tra trên Telegram**: Khi khách hàng đặt đơn trên web, một tin nhắn báo đơn mới dạng HTML chi tiết sẽ gửi ngay lập tức vào nhóm Telegram **`đặt món`** mà không gặp bất kỳ sự chậm trễ nào.
3.  **Kiểm tra kết nối Facebook**: Tin nhắn thông báo đơn hàng cũng sẽ đồng thời gửi vào Messenger Admin của bạn.
4.  **Kiểm tra Chatbot tự động gửi đơn cho Khách**: Dùng tài khoản Facebook khách hàng bấm vào nút "Mở Messenger xác nhận" sau khi đặt đơn trên Web. Chatbot của Page sẽ tự động inbox ngay lập tức chi tiết đơn hàng cho khách đó.

