# Backend — Day 10 Paper RAG Chatbot API

FastAPI service mỏng bọc quanh `src/retrieval/agent.py` và `src/retrieval/qa.py` đã có sẵn trong lab — không viết lại logic RAG, chỉ expose qua HTTP để `frontend/` gọi.

## Cài đặt (dùng chung `.venv` ở root project)

```bash
# từ root project, venv đã có sẵn pandas/chromadb/langchain... qua `uv sync`
uv pip install -r backend/requirements.txt
```

## Chạy

```bash
uv run uvicorn backend.main:app --reload --port 8000
```

Hoặc nếu venv đã activate:

```bash
uvicorn backend.main:app --reload --port 8000
```

## Endpoints

- `GET /health` — kiểm tra provider LLM đang cấu hình và dataset nào (`baseline` / `corrupted` / `repaired`) đã build xong (`data/embeddings/*.json` tồn tại).
- `POST /chat` — body:
  ```json
  { "question": "...", "dataset": "baseline", "mode": "agent" }
  ```
  - `dataset`: `baseline` | `corrupted` | `repaired` — dùng để demo CP6 (so sánh 3 trạng thái cùng 1 câu hỏi).
  - `mode`: `agent` (LLM thật + tool `semantic_search_papers`/`lookup_paper`, cần API key) hoặc `qa` (rule-based, không cần LLM key, luôn chạy được miễn có index).

## LLM provider fallback

`mode: "agent"` không dùng 1 provider cố định — `llm_fallback.py` thử theo thứ tự, dùng provider đầu tiên có credential/reachable:

1. **OpenRouter** (`OPENROUTER_API_KEY`)
2. **Ollama** (probe `OLLAMA_BASE_URL`, mặc định `http://localhost:11434`; cần Ollama chạy local)
3. **Gemini** (`GOOGLE_API_KEY`/`GEMINI_API_KEY`, model theo `GEMINI_MODEL`)
4. **DeepSeek** (`DEEPSEEK_API_KEY`, model theo `DEEPSEEK_MODEL`, endpoint OpenAI-compatible `https://api.deepseek.com`)
5. **OpenAI `gpt-4o`** (`OPENAI_API_KEY`)

Provider thực sự được dùng trả về trong field `provider` của response `/chat` — hữu ích để demo/debug xem câu trả lời đến từ đâu. Lưu ý: đây là fallback theo **credential có sẵn hay không**, không gọi thử API để xác minh key còn valid — nếu key bị revoke, lỗi sẽ xuất hiện ở lần gọi thật (không tự động rớt xuống provider kế tiếp giữa chừng).

## Lưu ý phụ thuộc

Endpoint sẽ trả lỗi `503` rõ ràng nếu dataset được hỏi chưa có `data/embeddings/*.json` — tức là role RAG (Trà) chưa build collection tương ứng (`papers-baseline` ở CP2, `papers-corrupted`/`papers-repaired` ở CP5/CP6). Đây là hành vi cố ý, không phải bug — backend không tự fetch/tạo data giả.
