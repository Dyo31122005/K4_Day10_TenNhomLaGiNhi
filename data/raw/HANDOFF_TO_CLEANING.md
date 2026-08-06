# Bàn giao Ingestion → Cleaning (CP1)

Từ: Mạnh (role 2 – ingest) — Đến: Mai Anh (role 3 – clean)

## Artifact

- Raw records (input cho `build_clean_dataframe`): `data/raw/crossref_records.json`
- Raw response gốc (chỉ để audit/repair, không cần đọc để cleaning): `data/raw/crossref_response.json`
- Code parse: `src/ingestion/crossref.py` (`PaperRecord`, `parse_crossref_payload`, `fetch_source_records`, `load_raw_records`)

## Đối chiếu raw ↔ parsed (CP1 reconciliation)

- Raw items trong response: 24
- Parsed `PaperRecord`: 24
- Record bị drop: 0 (không có item thiếu DOI/title/abstract, không có DOI trùng)

## Field coverage trên 24 record (để cleaning biết field nào tin được, field nào phải xử lý)

| Field | Coverage | Ghi chú |
| --- | --- | --- |
| `paper_id` | 24/24 (100%) | = DOI viết thường, unique, dùng làm khóa chính xuyên suốt pipeline |
| `title` | 24/24 (100%) | Text thường, đã normalize whitespace |
| `summary` | 24/24 (100%) | **Còn nguyên tag HTML/XML kiểu JATS** (`<jats:p>...</jats:p>`) — cleaning phải strip tag. Sau khi strip, 0/24 record có summary < 100 ký tự nên không lo bị lọc hết. |
| `authors` | 24/24 (100%) | List string `"Given Family"`, không record nào rỗng |
| `categories` | 24/24 (100%) | Crossref `subject` (ASJC) hầu như luôn rỗng thực tế → đã fallback dùng `type` (vd. `journal-article` → `"journal article"`) nên field này không bao giờ rỗng |
| `published` / `updated` | 24/24 (100%) | ISO date string `YYYY-MM-DD`, đã parse sẵn từ `date-parts`, có fallback chuỗi field nếu field chính thiếu |
| `abs_url` | 24/24 (100%) | |
| `pdf_url` | 8/24 (33%) | Nhiều record không có link PDF trực tiếp — không bắt buộc theo Guide, có thể để rỗng |

## Việc cleaning cần làm (theo Guide bước 4)

1. Strip tag HTML/XML khỏi `summary` trước khi dùng.
2. Không cần tự nghĩ fallback cho `categories` — đã có sẵn từ bước ingestion.
3. `published`/`updated` đã là ISO string sẵn, parse thẳng bằng `datetime.strptime(value, "%Y-%m-%d")`.
4. Dedupe nên khóa theo `paper_id` (đã đảm bảo unique ở raw, nhưng giữ dedupe ở cleaning cho an toàn khi nối nhiều nguồn sau này).

## Sample record

```json
{
  "paper_id": "10.36227/techrxiv.177272838.89432844/v1",
  "title": "A Survey of (Deep RAG) Deep Retrieval Augmented Generation and Reasoning in Large Language Models",
  "summary": "<jats:p>Retrieval-Augmented Generation (RAG) has emerged...</jats:p>",
  "authors": ["Lihui Liu"],
  "categories": ["posted content"],
  "primary_category": "posted content",
  "published": "",
  "updated": "2026-...",
  "abs_url": "https://...",
  "pdf_url": "",
  "comment": ""
}
```

Lưu ý: record mẫu này có `published` rỗng ở raw thô ban đầu (posted-content chưa có published-print), nhưng sau fallback trong `_extract_date` (`published-print → published-online → published → issued`) đã được lấp — 0/24 record có `published` rỗng trong `crossref_records.json` cuối cùng.

## Baseline snapshot đã khóa (kể từ CP2)

`data/raw/crossref_response.json` và `data/raw/crossref_records.json` được coi là **cố định** kể từ CP2 trở đi — không ai được chạy lại `fetch_source_records()` cho tới khi cả nhóm hoàn tất baseline/corruption/repair (CP6), vì:

- Crossref index thay đổi liên tục (`total-results` đã thấy dao động ~101k ở lần fetch CP0) — fetch lại có thể đổi 24 record, phá vỡ khả năng so sánh baseline vs corrupted vs repaired.
- Repair ở CP6 phải dùng đúng snapshot này qua `load_raw_records()`, không fetch mới — nếu source đổi giữa chừng, "phục hồi" sẽ không còn ý nghĩa.

Nếu thực sự cần fetch lại (ví dụ raw data lỗi), phải báo cho cả nhóm trước, vì mọi test set/index/metrics đang tính từ 24 record hiện tại.

## CP2 verification — raw → clean traceability (Mạnh, role 2)

Sau khi Mai Anh push `data/clean/papers_clean.csv/json` + `cleaning_log.json`, đã đối chiếu lại từ phía ingestion:

- **`paper_id` traceability**: tập hợp 24 `paper_id` ở `crossref_records.json` (raw) và `papers_clean.json` (clean) **khớp tuyệt đối** — không mất, không sinh thêm record nào (`raw_ids == clean_ids` → `True`).
- **`cleaning_log.json`**: `input_rows=24`, `output_rows=24`, `filtered_or_deduplicated_rows=0` — khớp với kết quả đối chiếu thủ công ở trên.
- **Schema clean đủ mọi cột retrieval cần**: `paper_id, title, text_for_embedding, published, authors_joined, categories_joined, summary, age_days` đều có mặt.
- **Vấn đề đã cảnh báo ở trên** (tag `<scp>RAG</scp>` dính trong title bài Hi-RAG) — Mai Anh đã xử lý: title giờ là `Hi-RAG: A Hierarchical Retrieval-Augmented Generation Framework...`, sạch tag.
- **Chạy thử `retrieval.index.validate_clean_dataframe(df, strict_content=True)`** (hàm Trà dùng để gate trước khi build ChromaDB) trên `papers_clean.csv` → **PASS**, không có lỗi. Nghĩa là khi Trà build index, không nên gặp lỗi validation từ phía data.

Kết luận: raw → clean đã traceable đầy đủ, sẵn sàng cho bước build embedding/index.
