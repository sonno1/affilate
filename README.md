# AI Affiliate — Value Content & Shopee Affiliate System

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
