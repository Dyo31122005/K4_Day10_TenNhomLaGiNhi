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
