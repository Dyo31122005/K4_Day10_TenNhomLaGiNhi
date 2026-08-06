# Frontend — Day 10 Paper RAG Chatbot UI

Next.js (App Router) + Tailwind v4, chat UI đơn giản gọi thẳng vào `backend/` (FastAPI).

## Cài đặt

```bash
cd frontend
npm install
```

## Chạy (cần `backend` đang chạy ở `:8000`)

```bash
npm run dev
```

Mở http://localhost:3000.

## Tính năng

- Chọn `dataset`: `baseline` / `corrupted` / `repaired` — dùng để demo CP6 (hỏi cùng 1 câu trên 3 collection, so sánh câu trả lời).
- Chọn `mode`: `agent` (LLM thật qua LangChain, dùng tool `semantic_search_papers`/`lookup_paper`) hoặc `qa` (rule-based, không cần LLM key, luôn chạy được miễn index đã build).
- Badge trạng thái từng dataset ở header (chấm xanh = đã build xong `data/embeddings/*.json`, xám = chưa) — tự poll `/health` mỗi 5s, không cần refresh tay khi role RAG build xong collection.
- Hiển thị nguồn trích dẫn (paper title + score) dưới mỗi câu trả lời, và provider LLM nào thực sự trả lời (do backend có fallback chain nhiều provider).

## Biến môi trường

`.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```
