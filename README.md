# Value Content Automation System

Hệ thống tự động: **Crawl RSS → AI Generate content → Duyệt bài → Đăng Facebook**.

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
│   │   └── facebook.py
│   ├── services/
│   │   ├── rss_crawler.py
│   │   ├── ai_service.py
│   │   ├── facebook_service.py
│   │   └── scheduler.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── PostCard.jsx
│   │   │   ├── PostList.jsx
│   │   │   └── Controls.jsx
│   │   └── api.js
│   ├── package.json
│   └── vite.config.js
├── .env.example
└── README.md
```

---

## Cài đặt & Chạy

### 1. Tạo file `.env`

```bash
cp .env.example .env
# Điền OPENAI_API_KEY, FB_PAGE_ID, FB_ACCESS_TOKEN, RSS_URLS
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

Dashboard: http://localhost:5173

---

## Luồng sử dụng

1. **Crawl Now** — lấy bài từ các RSS feed đã cấu hình
2. **Generate All** — OpenAI tạo nội dung Facebook cho các bài `pending`
3. Xem từng bài trong dashboard — nhấn **Duyệt** hoặc **Từ chối**
4. Nhấn **Đăng Facebook** để publish bài `approved` lên Page

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
