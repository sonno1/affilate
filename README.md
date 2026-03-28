# AI Affiliate — Shopee Affiliate Link Builder

Công cụ tạo link affiliate Shopee có tracking, shortlink ẩn danh và bảo mật cao.

> **Content Dashboard** (crawl RSS → AI generate → đăng Facebook) được ẩn theo mặc định.  
> Bật bằng cách đặt `VITE_ENABLE_DASHBOARD=true` trong `.env`.

---

## Tính năng chính

### 🛍️ Shopee Affiliate Link Builder
- Dán link `https://s.shopee.vn/...` từ app Shopee → tự động build affiliate URL với `affiliate_id` + `sub_id` (timestamp)
- **Affiliate URL không bao giờ hiển thị** trên giao diện — đảm bảo `affiliate_id` không bị lộ
- Tự động tạo **shortlink ẩn danh** (`/r/{token}`) ngay sau khi paste
- Nút **Copy link** — copy shortlink vào clipboard
- Nút **Truy cập** — mở shortlink, có cooldown 5 giây để tránh click liên tục
- Bảo vệ spam: rate limit 50 request/phút, chặn multi-link, chặn import file, chặn race condition

### 🔗 Shortlink Engine
- `POST /shorten` — nhận affiliate URL, sinh token 8 ký tự hex (`secrets.token_hex`), lưu SQLite
- `GET /r/{token}` — redirect 302 đến affiliate URL; URL gốc không bao giờ trả về response body
- Token là khoá duy nhất, mỗi lần paste link mới tạo token mới

### 🗄️ DB Viewer *(bật khi `VITE_ENABLE_DASHBOARD=true`)*
- Xem toàn bộ bảng `short_links` trong SQLite trực tiếp trên UI
- Hiển thị: ID, token, short URL, affiliate URL (click để mở rộng), thời gian tạo
- Giải thích cơ chế lưu trữ 4 bước

### 📰 Content Dashboard *(bật khi `VITE_ENABLE_DASHBOARD=true`)*
- Crawl RSS tự động (mặc định mỗi 30 phút)
- AI sinh nội dung Facebook từ bài viết crawl được (OpenAI)
- Duyệt / Từ chối / Đăng bài lên Facebook Page

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + SQLAlchemy + SQLite |
| AI | OpenAI (`gpt-4o-mini`) |
| Scheduler | APScheduler |
| Frontend | React (Vite) + Tailwind CSS |

---

## Cấu trúc thư mục

```
AI Affilate/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py          ← Post, ShortLink
│   ├── schemas.py
│   ├── routers/
│   │   ├── shopee.py      ← GET /shopee/config
│   │   ├── shortlink.py   ← POST /shorten · GET /r/{token} · GET /shortlinks
│   │   ├── crawl.py
│   │   ├── generate.py
│   │   ├── posts.py
│   │   └── facebook.py
│   ├── services/
│   │   ├── rss_crawler.py
│   │   ├── ai_service.py
│   │   ├── facebook_service.py
│   │   └── scheduler.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx              ← Tab navigation
│   │   ├── api.js
│   │   └── components/
│   │       ├── Home.jsx         ← Shopee Affiliate Link Builder
│   │       ├── DBViewer.jsx     ← DB Viewer (admin)
│   │       ├── PostCard.jsx
│   │       ├── PostList.jsx
│   │       └── Controls.jsx
│   ├── package.json
│   └── vite.config.js
├── .env
├── .gitignore
├── start-dev.bat
└── README.md
```

---

## Cài đặt & Chạy

### 1. Cấu hình `.env`

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

FB_PAGE_ID=your_page_id
FB_ACCESS_TOKEN=your_page_access_token

RSS_URLS=https://vnexpress.net/rss/tin-moi-nhat.rss
AUTO_CRAWL_INTERVAL_MINUTES=30

DATABASE_URL=sqlite:///./posts.db
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Shopee Affiliate (lấy từ Shopee Affiliate Portal)
SHOPEE_AFFILIATE_ID=your_affiliate_id

# Bật Content Dashboard + DB Viewer (chỉ dùng khi local)
VITE_ENABLE_DASHBOARD=false
```

### 2. Chạy nhanh (Windows)

```bat
start-dev.bat
```

Script tự động: dừng Google Drive sync, cài `npm install` nếu chưa có, khởi động Vite + Uvicorn.

### 3. Chạy thủ công

**Backend:**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Mở trình duyệt: [http://localhost:5173](http://localhost:5173)  
API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/shopee/config` | Trả về `affiliate_id` (không nhạy cảm) |
| POST | `/shorten` | Tạo shortlink từ affiliate URL |
| GET | `/r/{token}` | Redirect 302 đến affiliate URL |
| GET | `/shortlinks` | Liệt kê tất cả shortlink (admin) |
| GET | `/crawl` | Crawl RSS thủ công |
| POST | `/generate` | Generate content AI |
| GET | `/posts` | Danh sách bài viết |
| POST | `/posts/approve/{id}` | Duyệt bài |
| POST | `/posts/publish/{id}` | Đăng Facebook |

---

## Luồng Shortlink

```
Paste link Shopee
    → build affiliate URL (an_redir + affiliate_id + sub_id)
    → POST /shorten → token (8 hex chars) lưu SQLite
    → Copy / Truy cập dùng https://domain/r/{token}
    → GET /r/{token} → 302 redirect → affiliate URL
                         (affiliate_id không bao giờ lộ ra ngoài)
```

---

## Bảo mật

- `affiliate_id` chỉ tồn tại trong `SHOPEE_AFFILIATE_ID` env + DB server, không bao giờ trả về frontend
- Shortlink dùng `secrets.token_hex` (cryptographically secure)
- Rate limit: 50 request/phút mỗi client
- Chặn paste nhiều link, import file, kéo thả
- Cooldown 5 giây sau mỗi lần bấm "Truy cập"


Hệ thống gồm 2 tính năng chính:
- 🛍️ **Shopee Affiliate Link Builder** — tạo link affiliate tracking từ link sản phẩm Shopee
- 📰 **Content Dashboard** — Crawl RSS → AI Generate content → Duyệt bài → Đăng Facebook

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + SQLAlchemy + SQLite |
| AI | OpenAI (gpt-4o-mini) |
| Scheduler | APScheduler |
| Frontend | ReactJS (Vite) + Tailwind CSS |

---

## Cấu trúc thư mục

```
AI Affilate/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── routers/
│   │   ├── crawl.py
│   │   ├── generate.py
│   │   ├── posts.py
│   │   ├── facebook.py
│   │   ├── shopee.py          ← Shopee Affiliate config endpoint
│   │   └── github.py          ← GitHub push endpoint
│   ├── services/
│   │   ├── rss_crawler.py
│   │   ├── ai_service.py
│   │   ├── facebook_service.py
│   │   ├── github_service.py  ← Git operations
│   │   └── scheduler.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx            ← Tab navigation (Home + Dashboard)
│   │   ├── components/
│   │   │   ├── Home.jsx       ← Shopee Affiliate Link Builder
│   │   │   ├── PostCard.jsx
│   │   │   ├── PostList.jsx
│   │   │   ├── Controls.jsx
│   │   │   └── GitHubPanel.jsx
│   │   └── api.js
│   ├── package.json
│   └── vite.config.js
├── .env.example
├── .gitignore
└── README.md
```

---

## Cài đặt & Chạy

### 1. Tạo file `.env`

```bash
cp .env.example .env
```

Điền các giá trị vào `.env`:

```env
OPENAI_API_KEY=sk-...
FB_PAGE_ID=your_page_id
FB_ACCESS_TOKEN=your_page_access_token
RSS_URLS=https://vnexpress.net/rss/tin-moi-nhat.rss

# Shopee Affiliate (lấy từ Shopee Affiliate Portal)
SHOPEE_AFFILIATE_ID=your_affiliate_id

# GitHub Push (PAT với scope repo + workflow)
GITHUB_USERNAME=your_username
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_REPO=your-repo-name
GITHUB_BRANCH=main
```

### 2. Backend

```bash
cd backend

# Tạo virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# Cài dependencies
pip install -r requirements.txt

# Chạy server
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend

# Cài dependencies
npm install

# Chạy dev server
npm run dev
```

Mở trình duyệt: http://localhost:5173

---

## Tính năng 1 — Shopee Affiliate Link Builder

Trang chủ (tab **🛍️ Shopee Affiliate**):

1. Mở ứng dụng Shopee → chọn sản phẩm → **Chia sẻ → Sao chép liên kết**
2. Dán link `https://s.shopee.vn/xxxxxx` vào ô nhập liệu
3. Nhấn một trong hai nút:
   - **Copy link** — copy link affiliate vào clipboard
   - **Truy cập** — mở link affiliate trực tiếp trên trình duyệt

### Định dạng link tạo ra

```
https://s.shopee.vn/an_redir
  ?origin_link={encoded_product_url}
  &affiliate_id={SHOPEE_AFFILIATE_ID}
  &sub_id=fb-reel-{yyyy-MM-dd HH:mm:ss}
```

`sub_id` được gắn timestamp tại thời điểm nhấn nút giúp phân biệt từng lần click.

---

## Tính năng 2 — Content Dashboard

Tab **📰 Content Dashboard**:

1. **Crawl Now** — lấy bài từ các RSS feed đã cấu hình
2. **Generate All** — OpenAI tạo nội dung Facebook cho các bài `pending`
3. Xem từng bài — nhấn **Duyệt** hoặc **Từ chối**
4. Nhấn **🚀 Đăng Facebook** để publish bài `approved` lên Page

---

## Tính năng 3 — GitHub Push

Nhấn nút **GitHub** trên header để mở panel:

1. Nhập GitHub Username, Personal Access Token (scope: `repo` + `workflow`), Repository, Branch
2. Nhấn **Lưu cấu hình**
3. Nhập commit message → nhấn **Push to GitHub**

---

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|---------|-------|
| `GET` | `/crawl` | Trigger crawl RSS |
| `POST` | `/generate` | Generate AI content cho pending posts |
| `GET` | `/posts` | Lấy danh sách bài (filter: `?status=pending`) |
| `GET` | `/posts/{id}` | Chi tiết 1 bài |
| `POST` | `/posts/approve/{id}` | Duyệt bài |
| `POST` | `/posts/reject/{id}` | Từ chối bài |
| `POST` | `/posts/publish/{id}` | Đăng lên Facebook |
| `GET` | `/shopee/config` | Lấy Shopee affiliate config |
| `GET` | `/github/config` | Lấy GitHub config |
| `POST` | `/github/config` | Lưu GitHub credentials |
| `GET` | `/github/status` | Git status của project |
| `POST` | `/github/push` | Stage + commit + push lên GitHub |

---

## Status Flow

```
pending → approved → published
       ↘ rejected
```

---

## Biến môi trường

| Biến | Mô tả | Mặc định |
|------|-------|---------|
| `OPENAI_API_KEY` | OpenAI API key | _(bắt buộc)_ |
| `OPENAI_MODEL` | Model dùng | `gpt-4o-mini` |
| `FB_PAGE_ID` | Facebook Page ID | _(bắt buộc để publish)_ |
| `FB_ACCESS_TOKEN` | Facebook Page Access Token | _(bắt buộc để publish)_ |
| `RSS_URLS` | Danh sách RSS URL (phân cách bằng dấu phẩy) | _(bắt buộc để crawl)_ |
| `AUTO_CRAWL_INTERVAL_MINUTES` | Interval tự động crawl | `30` |
| `DATABASE_URL` | SQLAlchemy DB URL | `sqlite:///./posts.db` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:5173` |
