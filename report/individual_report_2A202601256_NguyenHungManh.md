# Báo cáo cá nhân — Day 10: Data Pipeline & Data Observability

## 1. Thông tin cá nhân

| Thông tin | Nội dung |
|---|---|
| Họ và tên | Nguyễn Hùng Mạnh |
| MSSV | 2A202601256 |
| Khóa/Lớp | K4 |
| Tên nhóm | TenNhomLaGiNhi |
| Vai trò chính | Ingestion owner (ingest) |
| Repository | `https://github.com/Dyo31122005/K4_Day10_TenNhomLaGiNhi` |
| Nhánh thực hiện | `main` |
| Ngày hoàn thành | 2026-08-06 |

## 2. Vai trò và phạm vi công việc

### Phần việc sở hữu

| Module/deliverable | File/hàm phụ trách | Input nhận vào | Output bàn giao | Trạng thái |
|---|---|---|---|---|
| Crossref fetch + retry/backoff | `src/ingestion/crossref.py` (`fetch_source_records`) | `Settings.source_query`, `source_filter`, `max_results` | `data/raw/crossref_response.json` (raw API snapshot) | Hoàn thành |
| Parse payload → record | `parse_crossref_payload`, `PaperRecord` | Raw Crossref `/works` JSON | `data/raw/crossref_records.json` (24 `PaperRecord`) | Hoàn thành |
| Reload snapshot cho repair | `load_raw_records` | `crossref_records.json` đã khóa | `list[PaperRecord]` để pha corruption/repair dùng lại, không fetch mới | Hoàn thành |
| Bàn giao cho cleaning | `data/raw/HANDOFF_TO_CLEANING.md` | Kết quả đối chiếu raw ↔ parsed | Field coverage table, cảnh báo tag HTML trong `summary`, sample record | Hoàn thành |

### Việc hỗ trợ ngoài phạm vi chính

| Hoạt động | Thành viên/module được hỗ trợ | Kết quả |
|---|---|---|
| Chatbot demo scaffold (FastAPI backend + Next.js frontend) | Toàn nhóm — demo trực quan cho pipeline | Backend `/chat`, `/health` phục vụ 3 dataset (baseline/corrupted/repaired); frontend chat UI gọi API |
| Sửa lỗi Chroma path/LLM fallback, thêm popup chi tiết paper, rebrand chat UI | Backend/frontend | Fix đường dẫn Chroma khi chạy từ thư mục khác nhau; multi-provider LLM fallback không còn crash khi provider đầu lỗi |
| Dọn Chroma vector segment mồ côi, siết `.gitignore` | Toàn nhóm (tránh commit rác binary) | Loại các segment Chroma không còn được collection nào tham chiếu; ngăn commit nhầm file build tạm |
| Redesign landing page, tách RAG demo UI sang route `/chat`, thêm pipeline trace logging | Toàn nhóm (báo cáo, thuyết trình) | Trang chủ academic mới cho phần thuyết trình; log trace theo request (dataset/collection, LLM fallback attempts, tool calls) hiển thị trực tiếp trên terminal uvicorn để debug agent |
| Đồng bộ code từ GitHub, resolve conflict, merge các bản cập nhật báo cáo mới nhất | Toàn nhóm | Merge sạch `origin/main` (report role 5, individual report của Tuấn và Trà) vào `main` cục bộ |

## 3. Kết quả theo vai trò

| Nhiệm vụ đã thực hiện | File/hàm/artifact liên quan | Kết quả bàn giao | Cách xác minh |
|---|---|---|---|
| CP0 — implement ingestion, fetch snapshot | `crossref.py`; `data/raw/crossref_response.json`, `data/raw/crossref_records.json` | Crossref trả `total-results` ~101.047 (index sống, thay đổi liên tục); lấy đúng 24 record theo `max_results=24` | Commit `8c94345`; đếm `len(items)` trong response = 24 |
| CP1 — đối chiếu raw ↔ parsed | `HANDOFF_TO_CLEANING.md` | Raw items = 24, `PaperRecord` parse được = 24, 0 record bị drop (không thiếu DOI/title/abstract, không trùng DOI) | Commit `55a2dd5`; bảng field coverage trong handoff |
| CP2 — xác minh raw → clean traceability | Đối chiếu `crossref_records.json` với `papers_clean.json`, `cleaning_log.json` do Mai Anh bàn giao | Tập `paper_id` raw và clean khớp tuyệt đối (24/24, không mất, không sinh thêm); `cleaning_log.json` báo `input_rows=24, output_rows=24, filtered_or_deduplicated_rows=0` | Commit `9365d27`; `validate_clean_dataframe(df, strict_content=True)` chạy trên `papers_clean.csv` → PASS |

Output tiêu biểu của phần việc ingestion là cặp artifact `crossref_response.json`/`crossref_records.json` được khóa lại làm baseline snapshot ngay từ CP2, và được dùng lại nguyên vẹn (qua `load_raw_records`) ở bước repair thay vì gọi lại API — đây là điều kiện để repair có ý nghĩa "phục hồi" thay vì chỉ lấy dữ liệu mới ngẫu nhiên.

## 4. Giải thích phần kỹ thuật đã thực hiện

### Vấn đề cần giải quyết

Crossref `/works` là một index sống, luôn thay đổi (đã thấy `total-results` dao động quanh 101k ngay ở lần fetch CP0). Nhóm cần một cách lấy dữ liệu có retry khi API rate-limit, chuẩn hóa payload thô thành schema phẳng ổn định cho cleaning, và — quan trọng nhất cho các pha sau — phải "đóng băng" được đúng 24 record đã lấy để baseline, corrupted và repaired luôn nói về cùng một tập dữ liệu.

### Cách triển khai

1. **Fetch có retry/backoff:** gọi `GET /works` với `query`, `filter=from-pub-date:...,has-abstract:true` và `rows=max_results`. Nếu request lỗi mạng hoặc trả về status `429`/`503`, retry tối đa 5 lần với backoff nhân đôi bắt đầu từ 2 giây.
2. **Lưu raw response trước khi parse:** `write_json(settings.paths.raw_api_response, payload)` chạy trước `parse_crossref_payload`, để nếu parsing có lỗi vẫn còn payload gốc để audit/re-parse mà không tốn thêm 1 lần gọi API.
3. **Parse an toàn:** bỏ qua item thiếu `DOI`, `title` hoặc `abstract`; `paper_id` = DOI viết thường, dedupe theo `paper_id` bằng `seen_ids`.
4. **Fallback field để tránh rỗng ở downstream:** `categories` ưu tiên Crossref `subject` (ASJC), nhưng field này gần như luôn rỗng trên thực tế nên fallback sang `type` (vd. `journal-article` → `"journal article"`); `published`/`updated` dùng `_extract_date` thử lần lượt nhiều key Crossref (`published-print → published-online → published → issued` cho published; `indexed → deposited → created` cho updated, fallback về `published` nếu vẫn rỗng).
5. **Khóa snapshot sau CP2:** từ CP2 trở đi, không ai được gọi lại `fetch_source_records()`; các bước corruption/repair đọc lại đúng 24 record qua `load_raw_records(path)`.

### Input, output và contract

| Thành phần | Mô tả |
|---|---|
| Input | `Settings.source_query`, `source_filter` (từ `freshness_threshold_days=180` → `from-pub-date`), `max_results=24` |
| Output | `data/raw/crossref_response.json` (payload gốc), `data/raw/crossref_records.json` (24 `PaperRecord` đã parse) |
| Module sử dụng output | `ingestion.cleaning` (build DataFrame sạch), pha corruption/repair (đọc lại raw qua `load_raw_records`) |
| Điều kiện lỗi cần xử lý | Timeout/lỗi mạng, `429`/`503` rate-limit, item thiếu DOI/title/abstract, DOI trùng lặp, ngày xuất bản thiếu ở mọi field ứng viên |

### Cách xác minh

```bash
uv run python -c "from ingestion.crossref import load_raw_records; from core.config import load_settings; s = load_settings(); print(len(load_raw_records(s.paths.raw_records_json)))"
```

- **Kết quả mong đợi:** trả về 24 (đúng số record đã khóa từ CP0–CP2).
- **Kết quả thực tế:** `crossref_records.json` chứa 24 `PaperRecord`; đối chiếu `paper_id` với `papers_clean.json` khớp tuyệt đối, không lệch.
- **Artifact/log:** `data/raw/crossref_response.json`, `data/raw/crossref_records.json`, `data/raw/HANDOFF_TO_CLEANING.md`.

## 5. Một quyết định kỹ thuật quan trọng

- **Bối cảnh:** Crossref index thay đổi liên tục; nếu mỗi thành viên hoặc mỗi lần chạy lại đều fetch mới, 24 record baseline có thể đổi giữa các pha, làm baseline/corrupted/repaired không còn cùng một tập dữ liệu để so sánh.
- **Các phương án đã cân nhắc:** (a) luôn fetch mới mỗi lần chạy pipeline để dữ liệu "tươi" nhất; (b) fetch một lần, khóa snapshot raw, mọi bước sau chỉ đọc lại qua `load_raw_records`.
- **Phương án đã chọn:** (b) — khóa `crossref_response.json`/`crossref_records.json` làm baseline snapshot cố định ngay từ CP2, ghi rõ lý do và điều kiện fetch lại (phải báo cả nhóm) trong `HANDOFF_TO_CLEANING.md`.
- **Lý do:** repair ở CP6 chỉ có ý nghĩa nếu nó phục hồi đúng dữ liệu gốc đã bị corrupt, không phải dữ liệu mới lấy ngẫu nhiên từ một index đang đổi; so sánh baseline vs corrupted vs repaired cũng cần cùng 24 record xuyên suốt.
- **Bằng chứng quyết định phù hợp:** ở CP2, tập `paper_id` giữa raw và clean khớp tuyệt đối (24/24); về sau repair (theo `group_report.md`) phục hồi `retrieval_hit_rate`, `mean_token_f1`, `judge_accuracy`, `mean_judge_score` đều về đúng mức baseline (1.0 / 1.0000 / 1.0 / 5.00) — điều này chỉ khả thi vì repair đọc lại đúng raw snapshot đã khóa, không phải dữ liệu mới.

## 6. Một lỗi hoặc blocker đã xử lý

- **Triệu chứng:** `pdf_url` chỉ có ở 8/24 record (33%) — nhiều item Crossref không kèm link `content-type: application/pdf` trong mảng `link`.
- **Lệnh hoặc bước tái hiện:** đối chiếu field coverage thủ công trên `crossref_records.json` sau CP1.
- **Nguyên nhân gốc:** đây là giới hạn của nguồn dữ liệu (Crossref) chứ không phải lỗi parse — nhiều publisher không khai báo link PDF trực tiếp trong metadata.
- **Cách xử lý:** không coi `pdf_url` là bắt buộc; ghi rõ tỷ lệ coverage 33% trong `HANDOFF_TO_CLEANING.md` để cleaning/evaluation không giả định field này luôn có giá trị.
- **Cách xác minh sau khi sửa:** không có record nào bị loại vì thiếu `pdf_url` (bộ lọc bắt buộc trong `parse_crossref_payload` chỉ áp dụng cho DOI/title/abstract); 24/24 record vẫn được giữ.
- **Điều học được:** không phải field nào thiếu cũng là lỗi cần "sửa" — cần phân biệt field bắt buộc cho tính đúng đắn của pipeline (DOI, title, abstract) với field có thể thiếu ở nguồn và chỉ cần ghi nhận coverage trung thực cho downstream.

## 7. Hiểu biết về luồng end-to-end

1. Ingestion gọi Crossref, lưu raw response, parse thành `PaperRecord` và khóa snapshot. Cleaning nhận `crossref_records.json`, strip tag HTML/XML trong `summary`, dedupe theo `paper_id`, tạo `text_for_embedding` và `age_days`. Retrieval validate DataFrame sạch, encode bằng MiniLM, nạp vào ba collection Chroma tách biệt (baseline/corrupted/repaired).
2. Evaluation dùng `test_set.json` với `ground_truth_doc_ids` trích từ `paper_id` sạch — vì `paper_id` xuất phát trực tiếp từ DOI ở bước ingestion và được giữ nguyên xuyên suốt, kết quả hit/miss có thể truy ngược lại đúng bài báo gốc.
3. Quality/freshness đo trên cùng schema mà ingestion đảm bảo luôn đủ field (kể cả khi phải fallback `categories`/`published`); một record thiếu field bắt buộc sẽ bị loại ngay từ `parse_crossref_payload`, không lọt xuống các bước sau.
4. Corruption/repair phụ thuộc trực tiếp vào quyết định khóa raw snapshot ở ingestion: repair đọc lại `load_raw_records()` từ đúng 24 record ban đầu, không fetch mới, nên "phục hồi" là tái tạo từ nguồn đáng tin cậy chứ không phải lấy dữ liệu khác rồi báo cáo là đã sửa.
5. Cùng một `test_set.json` được dùng cho cả ba trạng thái để đảm bảo thay đổi metric chỉ do chất lượng dữ liệu thay đổi, không phải do câu hỏi khác nhau — điều này chỉ có ý nghĩa khi 24 record nền tảng (do ingestion cung cấp) là bất biến giữa các lần chạy.

## 8. Phân tích kết quả

### Metrics chính (theo `group_report.md`, tính trên cùng 24 record ingestion đã khóa)

| Metric/signal | Baseline | Corrupted | Repaired | Nhận xét của cá nhân (góc nhìn ingestion) |
|---|---:|---:|---:|---|
| `retrieval_hit_rate` | 1.0000 | 0.3333 | 1.0000 | Repaired quay lại đúng 1.0 vì dữ liệu phục hồi bắt nguồn từ cùng raw snapshot đã khóa, không phải một tập record khác. |
| `mean_token_f1` | 1.0000 | 0.4600 | 1.0000 | Vì `paper_id`/nội dung gốc ổn định từ ingestion, so sánh trước/sau corruption phản ánh đúng tác động của corruption, không lẫn nhiễu do đổi dữ liệu nguồn. |
| `judge_accuracy` | 1.0000 | 0.4167 | 1.0000 | Việc `paper_id` không đổi qua các pha giúp LLM Judge và ground truth luôn tham chiếu đúng bài báo cần so sánh. |
| `mean_judge_score` | 5.00 | 3.08 | 5.00 | Phục hồi hoàn toàn về baseline củng cố rằng khóa raw snapshot ở CP2 là quyết định đúng. |
| Số record raw/clean | 24/24 | — | — | Không có record nào bị drop ở ingestion (0 thiếu DOI/title/abstract, 0 DOI trùng) — mọi biến động quality/freshness ở các pha sau đều do bước cleaning/corruption, không phải do ingestion làm mất dữ liệu. |

### Kết luận từ số liệu

1. Vì ingestion đảm bảo 24 record raw không đổi và có thể đọc lại nguyên vẹn (`load_raw_records`), corruption ở các bước sau chỉ tác động cục bộ (xóa/làm hỏng một số record) mà không kéo theo sai lệch do nguồn dữ liệu bị thay đổi ngoài ý muốn.
2. Repair phục hồi 100% các metric về đúng baseline — đây là bằng chứng gián tiếp rằng quyết định khóa snapshot raw ngay từ CP2 (thay vì fetch lại mỗi lần) là điều kiện cần để "repair" có ý nghĩa thực sự, không chỉ là lấy dữ liệu mới rồi báo cáo là đã sửa lỗi.

## 9. Điều học được và hướng cải thiện

### Ba điều quan trọng nhất

1. Với một nguồn dữ liệu sống (Crossref), việc khóa snapshot sớm và ghi rõ lý do/điều kiện fetch lại quan trọng ngang việc code parse đúng — nếu không, mọi so sánh baseline/corrupted/repaired ở các bước sau đều mất ý nghĩa.
2. Field coverage cần được đo và ghi nhận trung thực (ví dụ `pdf_url` 33%) thay vì cố "vá" cho đủ 100%, để các module downstream biết field nào tin được, field nào phải có fallback riêng.
3. Bàn giao giữa các bước ingestion → cleaning cần đi kèm bằng chứng đối chiếu cụ thể (số lượng, coverage, sample record), không chỉ báo "đã xong", để người nhận việc kiểm tra lại được ngay.

### Nếu có thêm thời gian

Tôi sẽ thêm một bước kiểm tra tự động (script hoặc test) chạy `parse_crossref_payload` trên vài payload Crossref mẫu có field thiếu (không DOI, không abstract, DOI trùng) để xác nhận hành vi drop/dedupe đúng như tài liệu mô tả, thay vì chỉ kiểm chứng thủ công trên đúng một lần fetch thực tế.

## 10. Cam kết của thành viên

- [x] Nội dung báo cáo phản ánh đúng phần việc và mức hiểu của tôi.
- [x] Tôi có thể giải thích luồng end-to-end, không chỉ module mình phụ trách.
- [x] Mọi kết luận về kết quả đều có artifact hoặc metric để đối chiếu.
- [x] Tôi không ghi "đã chạy thành công" cho phần chưa được kiểm chứng.
- [x] Báo cáo không chứa `.env`, API key, token hoặc secret.
- [x] Báo cáo này không phải bản sao nguyên văn của báo cáo nhóm hoặc báo cáo thành viên khác.

**Họ và tên:** Nguyễn Hùng Mạnh

**Ngày xác nhận:** 2026-08-06
