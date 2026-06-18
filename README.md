# YNuQuan - Hệ thống đặt món online

## Cấu trúc dự án
```
YNuQuan/
├── apps/
│   ├── web/          # Next.js - Trang menu + đặt hàng (deploy Vercel)
│   └── api/          # NestJS - Backend API (deploy Vercel hoặc Railway)
├── package.json
└── README.md
```

## Setup

### 1. Cài dependencies
```bash
# Frontend
cd apps/web && npm install

# Backend
cd apps/api && npm install
```

### 2. Tạo file .env

**apps/web/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**apps/api/.env**
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
FB_PAGE_ACCESS_TOKEN=your_facebook_page_token
FB_PAGE_ID=your_page_id
PORT=3001
```

### 3. Chạy dev
```bash
# Terminal 1 - Frontend
cd apps/web && npm run dev

# Terminal 2 - Backend
cd apps/api && npm run start:dev
```

## Deploy
- **Frontend**: Push lên GitHub → import vào Vercel → auto deploy
- **Backend**: Deploy lên Railway hoặc Render (free tier)
