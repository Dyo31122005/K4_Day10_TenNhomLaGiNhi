# Member Role Report — Day 10: Data Pipeline & Data Observability

## 1. Thông tin cá nhân

| Thông tin         | Nội dung                  |
| ------------------ | -------------------------- |
| Họ và tên       | Nguyễn Minh Đạt             |
| MSSV               | 2A202601142                     |
| Khóa/Lớp         | K4              |
| Tên nhóm         | TenNhomLaGiNhi     |
| Vai trò chính    | Vai trò 1: Điều phối Pipeline (Pipeline Integrator / Lead)                 |
| Repository         | [github.com/Dyo31122005/K4_Day10_TenNhomLaGiNhi](https://github.com/Dyo31122005/K4_Day10_TenNhomLaGiNhi) |
| Ngày hoàn thành | 2026-08-06               |

## 2. Vai trò và phạm vi công việc

### Phần việc sở hữu

| Module/deliverable | File/hàm phụ trách | Input nhận vào | Output bàn giao  | Trạng thái |
| ------------------ | --------------------- | ---------------- | ----------------- | -------------------------------------------- |
| Cấu hình dùng chung toàn hệ thống | `src/core/config.py`: `Settings`, `Paths`, `load_settings` | `.env`, thư mục dự án | Đường dẫn artifact, tên collection, tham số pipeline (`top_k`, `freshness_threshold_days`...) dùng chung cho mọi module | Hoàn thành |
| Orchestrator baseline | `src/pipelines/phase1.py`, `script/run_phase1.py` | Raw records → clean → index → test set | `baseline_metrics.json`, `phase1_report.md` | Hoàn thành |
| Orchestrator corruption/repair | `src/pipelines/corruption_flow.py`, `script/run_corruption_flow.py` | Clean baseline + raw snapshot | `corrupted_*`, `repaired_*`, `corruption_report.md` | Hoàn thành |
| Điều phối merge & release | Toàn bộ nhánh `main`/`day10-pipeline-dev`, `backend/main.py` (điểm giao giữa các module) | Commit từ 4 role còn lại | Lịch sử git sạch, `main` luôn ở trạng thái artifact khớp report | Hoàn thành |

---

### Việc hỗ trợ ngoài phạm vi chính

| Hoạt động                         | Thành viên/module được hỗ trợ | Kết quả                    |
| ------------------------------------ | ------------------------------------ | ---------------------------- |
| Chạy lại `run_corruption_flow.py` sau khi corruption mở rộng | Mai Anh (clean/corruption) | Đồng bộ `corrupted_metrics/answers/quality/freshness` và `corruption_report.md` theo đúng dataset 25 dòng (11 corruption), thay vì để report "đông cứng" theo dataset 23 dòng cũ. |
| Rà soát và audit commit của từng thành viên trước khi merge | Mạnh, Mai Anh, Trà, Anh Tuấn | Phát hiện bug `"nan"` rò rỉ metadata (CSV round-trip), bug "Total Rows" sai trong `corruption_report.md`, và xác nhận baseline không bị ghi đè qua từng lần merge. |
| Resolve conflict merge nhánh `tea` vào `main` | Trà (RAG owner), Mạnh (backend) | Giữ đúng fix gốc (`LocalEmbeddingIndex.load()` của Mạnh) và fix bổ sung (`_metadata_text()` của Trà) trong `backend/main.py` mà không loại bỏ công sức của ai. |

---

## 3. Kết quả theo vai trò

| Nhiệm vụ đã thực hiện | File/hàm/artifact liên quan | Kết quả bàn giao       | Cách xác minh         |
| --------------------------- | ----------------------------- | ------------------------- | ----------------------- |
| Chạy baseline end-to-end | `run_phase1.py` | `baseline_metrics.json` (hit rate 100%, F1 1.0) | Đối chiếu `phase1_report.md` với JSON gốc |
| Implement + chạy corruption flow (CP5) | `corruption_flow.py` | `corrupted_metrics.json`, `corruption_log.json`, 3 collection Chroma tách biệt | `papers-baseline` không đổi count/hash trước và sau khi build `papers-corrupted` |
| Checklist cuối CP6 | Toàn bộ `data/results/`, `data/quality/`, `data/reports/` | Xác nhận đủ artifact, không secret, không hard-code path | `git log --diff-filter=A -- "*.env"` trả về rỗng |
| Đồng bộ lại pipeline sau khi corruption mở rộng 6→11 loại lỗi | `run_corruption_flow.py` (chạy lại lần 2) | `corruption_report.md` đổi đúng từ `Total Rows: 24\|23\|24` sang `24\|25\|24` | So `len(papers_clean_corrupted.json)` với `corrupted_quality_report.json.total_rows` |

Nêu một output cụ thể mà phần việc của bạn tạo ra hoặc giúp xác minh:
Commit `6db803d` (`Re-run corruption flow to sync artifacts with the 25-row corrupted dataset`) — sau khi Mai Anh mở rộng `corruption.py` từ 6 lên 11 kịch bản lỗi, tôi là người phát hiện `corrupted_metrics.json`/`corruption_report.md` vẫn còn mô tả dataset 23 dòng cũ, rồi chạy lại toàn bộ `run_corruption_flow.py` và verify bằng tay (byte-size, document count, hash) rằng baseline hoàn toàn không bị ảnh hưởng trước khi push.

---

## 4. Giải thích phần kỹ thuật đã thực hiện

### Vấn đề cần giải quyết

Với 5 người cùng sửa song song trên các module khác nhau (ingestion, cleaning/corruption, retrieval, evaluation/observability), rủi ro lớn nhất không phải là code không chạy được, mà là **artifact "đông cứng"**: một module bị sửa (ví dụ `corruption.py` thêm loại lỗi mới) nhưng các artifact đánh giá phụ thuộc vào nó (metrics, quality report, comparison report) không được chạy lại, khiến báo cáo mô tả sai trạng thái dữ liệu thật. Vai trò Lead phải đảm bảo tại bất kỳ thời điểm nào, `main` cũng ở trạng thái mà report khớp 100% với artifact JSON/CSV thật.

### Cách triển khai

1. **Config tập trung**: `src/core/config.py` định nghĩa toàn bộ đường dẫn (`Paths`) và tham số (`Settings`) — mọi module khác chỉ đọc từ đây, không tự ý hard-code path, đảm bảo baseline/corrupted/repaired luôn có path và tên collection Chroma tách biệt (`papers-baseline`, `papers-corrupted`, `papers-repaired`).
2. **Orchestrator hai tầng**: `phase1.py` chạy chuỗi baseline (ingest → clean → index → test set → evaluate → quality/freshness → report); `corruption_flow.py` chạy tiếp chuỗi corrupt → rebuild index → evaluate → quality/freshness → repair từ raw → rebuild index → evaluate → quality/freshness → so sánh — mỗi bước ghi log ra console để dễ debug khi fail giữa chừng.
3. **Quy trình review trước khi merge**: trước khi đưa bất kỳ nhánh nào (`tea`, `tuanha`, nhánh cá nhân) vào `main`, tôi luôn đối chiếu artifact mới với artifact baseline hiện có (byte size, document count trong Chroma, hash) để đảm bảo không có thao tác merge nào vô tình ghi đè hoặc làm hỏng baseline.

### Input, output và contract

| Thành phần                   | Mô tả                                     |
| ------------------------------ | ------------------------------------------- |
| Input                          | `.env` (config runtime), toàn bộ artifact do 4 role khác tạo ra qua các checkpoint |
| Output                         | `baseline_metrics.json`/`phase1_report.md` (từ `run_phase1.py`); `corrupted_*`/`repaired_*`/`corruption_report.md` (từ `run_corruption_flow.py`) |
| Module phụ thuộc             | Toàn bộ `src/ingestion`, `src/retrieval`, `src/evaluation`, `src/observability` — orchestrator chỉ gọi lại các hàm public của từng module, không cài lại logic |
| Module sử dụng output        | `backend/main.py` (chat UI demo đọc thẳng `data/embeddings/*`), báo cáo nhóm `report/group_report.md` |
| Điều kiện lỗi cần xử lý | Nếu thiếu artifact tiền đề (`clean_json`, `baseline_metrics`, `corrupted_clean_csv`, `corruption_log`), `corruption_flow.py` raise `FileNotFoundError` sớm thay vì chạy tiếp với dữ liệu rỗng/giả |

### Cách xác minh

```bash
python -m pip install -e .
python script/run_phase1.py
python script/run_corruption_flow.py
```

- **Kết quả mong đợi:** cả hai script chạy hết các bước in log, không traceback; `data/reports/phase1_report.md` và `data/reports/corruption_report.md` sinh ra với số liệu khớp file JSON cùng thời điểm.
- **Kết quả thực tế:** Baseline (Hit rate 100%, F1 1.0) → Corrupted (Hit rate 66.7%, F1 0.3495, 25 dòng, 11 loại lỗi) → Repaired (Hit rate 100%, F1 1.0).
- **Artifact/log:** `data/reports/corruption_report.md`, `data/results/corruption_log.json` (có `verification.is_consistent: true`).

---

## 5. Một quyết định kỹ thuật quan trọng

- **Bối cảnh:** Trong lúc merge nhánh `tea` (Trà) vào `main`, `backend/main.py` xung đột trực tiếp: `main` đã có fix root-cause của Mạnh (`LocalEmbeddingIndex.load()` tự resolve `persist_path` local, bỏ hẳn hàm `_load_index_local()` workaround), trong khi `tea` vẫn giữ `_load_index_local()` cũ **và** thêm mới `_metadata_text()` (lớp phòng thủ chặn chuỗi `"nan"` ở tầng API) — hàm này lại được `get_paper()` bên dưới sử dụng.
- **Các phương án đã cân nhắc:**
  * *Phương án 1*: Lấy nguyên trạng thái của `main` (bỏ toàn bộ thay đổi của Trà trong file này) vì fix root-cause đã đủ.
  * *Phương án 2*: Lấy nguyên trạng thái của `tea`, chấp nhận quay lại dùng workaround `_load_index_local()` đã lỗi thời.
  * *Phương án 3*: Giữ `_metadata_text()` (vẫn còn giá trị làm lớp phòng thủ thứ hai cho manifest cũ), nhưng bỏ `_load_index_local()` vì đã dư thừa so với fix trong `retrieval/index.py`.
- **Phương án đã chọn:** Phương án 3.
- **Lý do:** `_load_index_local()` và fix của Mạnh trong `LocalEmbeddingIndex.load()` giải quyết cùng một vấn đề (path tuyệt đối cross-machine) — giữ cả hai là dư thừa code, còn bỏ cả `_metadata_text()` sẽ làm mất lớp phòng thủ hợp lệ cho các manifest cũ đã lỡ ghi chuỗi `"nan"` trước khi `src/retrieval/index.py` được vá tận gốc.
- **Bằng chứng quyết định phù hợp:** `backend/main.py` compile sạch (`py_compile`) sau merge; `get_paper()` vẫn hoạt động đúng vì `_metadata_text()` không đổi hành vi, chỉ còn 1 cơ chế resolve path (không còn 2 cách tồn tại song song gây khó bảo trì).

---

## 6. Một lỗi hoặc blocker đã xử lý

- **Triệu chứng/lỗi nguyên văn:**
  Sau khi Mai Anh mở rộng `corrupt_clean_dataframe()` từ 6 lên 11 loại lỗi (dataset corrupted tăng từ 23 lên 25 dòng) và Mạnh resync lại embeddings tương ứng, `data/results/corrupted_metrics.json`, `data/quality/corrupted_quality_report.json` và `data/reports/corruption_report.md` **vẫn hiển thị số liệu của lần chạy 23-dòng cũ** (bảng "Total Rows" ghi `24 | 23 | 24` dù dataset thật đã là `24 | 25 | 24`).
- **Lệnh hoặc bước tái hiện:**
  So sánh `len(json.load(open('data/clean/papers_clean_corrupted.json')))` (= 25) với giá trị `total_rows` trong `data/reports/corruption_report.md` (vẫn ghi 23) tại cùng một thời điểm trên `main`.
- **Nguyên nhân gốc:**
  Nhiều thành viên cùng cập nhật `corruption.py`/embeddings trên các nhánh khác nhau nhưng chưa ai chạy lại `run_corruption_flow.py` end-to-end sau khi merge các thay đổi đó vào `main` — artifact đánh giá (metrics/quality/report) không tự động theo kịp thay đổi của dữ liệu đầu vào.
- **Cách xử lý:**
  1. Với vai trò Lead, tôi chạy lại toàn bộ `python script/run_corruption_flow.py` trên đúng code mới nhất đã merge (gồm cả `corruption.py` mở rộng của Mai Anh, fix NaN của Trà, fix path của Mạnh).
  2. Trước khi commit, verify bằng tay: baseline (`papers_clean.json`, `baseline_metrics.json`, `baseline_quality_report.json`) không đổi hash/mtime; collection `papers-baseline` trong Chroma vẫn đúng 24 document, cùng kích thước byte.
  3. Commit `6db803d` với message mô tả rõ nguyên nhân đồng bộ lại, để lịch sử git tự giải thích được vì sao artifact thay đổi dù không sửa logic corruption.
- **Cách xác minh sau khi sửa:**
  `data/reports/corruption_report.md` hiện đúng `Total Rows: 24 | 25 | 24`; `data/results/corrupted_metrics.json` phản ánh đúng 11 loại lỗi (Hit rate 66.7%, F1 0.3495) thay vì số liệu của bộ 6-loại-lỗi cũ.
- **Điều học được:**
  Trong pipeline nhiều người cùng sửa song song, **code đúng không đảm bảo artifact đúng** — vai trò điều phối phải chủ động đối chiếu report với dữ liệu thật mỗi lần merge, không chỉ tin vào "script chạy exit code 0".

---

## 7. Hiểu biết về luồng end-to-end

1. **Dữ liệu đi từ Crossref đến vector index ra sao?**
   Crossref trả JSON thô → `crossref.py` parse thành `PaperRecord` (đồng thời lưu raw response gốc để truy vết) → `cleaning.py` chuẩn hoá schema, dedupe, tính `age_days`, dựng `text_for_embedding` → `retrieval/index.py` nhúng bằng MiniLM và ghi vào ChromaDB thành 1 trong 3 collection (`papers-baseline/-corrupted/-repaired`), mỗi collection có manifest JSON riêng lưu lại `persist_path`, `collection_name` và toàn bộ `documents`.

2. **Evaluation set và ground-truth document IDs dùng để đo chất lượng tìm kiếm/trả lời như thế nào?**
   `test_set.json` cố định 12 câu hỏi trên 3 bài báo thật (4 loại câu hỏi/bài). Mỗi câu có `ground_truth_doc_ids` — `paper_id` thật trong bản clean. `evaluate_pipeline()` so `retrieved_doc_ids` của agent với `ground_truth_doc_ids` để tính `retrieval_hit_rate`, đồng thời so `answer` với `ground_truth` bằng Token F1 và LLM Judge.

3. **Quality checks khác freshness monitoring ở điểm nào trong bài lab?**
   Quality checks (`row_count`, `paper_id_not_null/unique`, `title_not_null`, `summary_length`) đo tính toàn vẹn cấu trúc của bảng dữ liệu tại một thời điểm. Freshness monitoring đo tính thời sự — so `published`/`age_days` với ngưỡng 180 ngày — một dataset có thể PASS toàn bộ quality check nhưng vẫn STALE nếu dữ liệu quá cũ, và ngược lại.

4. **Vì sao phải dùng cùng test set cho baseline, corrupted và repaired?**
   Vì đây là thí nghiệm so sánh có kiểm soát (controlled comparison): chỉ có biến số dữ liệu đầu vào được phép thay đổi giữa 3 lần chạy. Nếu đổi câu hỏi/ground truth giữa các lần, không thể khẳng định phần chênh lệch số liệu là do dữ liệu hỏng hay do đổi đề bài.

5. **Repair được xem là thành công dựa trên artifact và metric nào?**
   `repaired_quality_report.json.is_valid = true` (6/6 PASS) và `repaired_freshness_report.json.is_fresh = true`, cộng với cả 4 metric agent (`retrieval_hit_rate`, `mean_token_f1`, `judge_accuracy`, `mean_judge_score`) quay lại đúng giá trị baseline (không chỉ "gần bằng"). Quan trọng hơn, `papers_clean_repaired.*` phải được dựng lại từ `crossref_records.json` gốc — không phải sửa tay bản `corrupted` — mới được tính là repair hợp lệ.

---

## 8. Phân tích kết quả

### Metrics chính

| Metric/signal          | Baseline | Corrupted | Repaired | Nhận xét của cá nhân |
| ---------------------- | -------: | --------: | -------: | ------------------------- |
| `retrieval_hit_rate` |      1.0 |    0.6667 |      1.0 | Sau khi mở rộng lên 11 loại lỗi, hit rate giảm ít hơn lần chạy 6-loại-lỗi đầu (33.3%) vì phần lớn lỗi mới (swap author/category, HTML leakage) không trực tiếp phá retrieval mà phá nội dung/metadata. |
| `mean_token_f1`      |      1.0 |    0.3495 |      1.0 | Giảm mạnh nhất trong 4 metric — nhạy với cả lỗi nội dung (blank/noise summary) lẫn lỗi retrieval. |
| `judge_accuracy`     |      1.0 |    0.3333 |      1.0 | Giảm sâu hơn cả hit rate — chứng tỏ corruption ảnh hưởng chất lượng ngữ nghĩa câu trả lời, không chỉ việc tìm đúng tài liệu. |
| `mean_judge_score`   |      5.0 |    2.6667 |      5.0 | Điểm rơi hơn một nửa thang điểm. |
| Quality checks         |     PASS |  **FAIL** (3/6: `paper_id_unique`, `summary_length`, `freshness`) |     PASS | Đúng 3 check tương ứng với `duplicate_row`/`semantic_near_duplicate`, `blank_summary`, `make_published_stale`. |
| Freshness status       |    FRESH | **STALE** (2 stale rows) |    FRESH | Do cả `make_published_stale` (lùi 730 ngày) và `make_published_future` (làm range ngày bất thường). |

### Kết luận từ số liệu

1. **Corruption (`drop_latest` + 10 loại khác)** → Quality FAIL, Freshness STALE, tổng dòng dữ liệu đổi 24→25 (mất 1, thêm 2) → Cả 4 metric agent giảm 33–67% tuỳ chỉ số, rõ nhất ở `judge_accuracy` (-66.7 điểm %).
2. **Repair từ raw gốc** (không sửa tay bản hỏng) → Quality/Freshness PASS/FRESH, dữ liệu về đúng 24 dòng → Cả 4 metric agent phục hồi **100%** về đúng giá trị baseline — chứng minh nguyên nhân suy giảm nằm ở dữ liệu, không phải ở model/agent.

- **Corruption nào ảnh hưởng rõ nhất và vì sao?**
  `drop_latest` vẫn là loại ảnh hưởng trực tiếp và dễ truy vết nhất: xoá đúng `paper_id` là ground truth của câu `q_001`, khiến retrieval miss hoàn toàn — có thể lần theo từng bước từ `corruption_log.json` → `corrupted_answers.json` → `corruption_report.md`.
- **Kết quả nào khác với kỳ vọng ban đầu?**
  Tôi kỳ vọng việc mở rộng từ 6 lên 11 loại lỗi sẽ làm các metric giảm sâu hơn (vì có nhiều loại lỗi tác động đồng thời hơn), nhưng thực tế `retrieval_hit_rate` lại **cao hơn** (66.7% so với 33.3% ở lần chạy cũ) vì các loại lỗi mới (`swap_categories`, `swap_authors`, `html_markup_leakage`) chủ yếu phá nội dung/metadata chứ không xoá tài liệu khỏi index — cho thấy không phải cứ "nhiều loại lỗi hơn" là retrieval càng tệ hơn, phải xét đúng loại lỗi nào tác động đến bước nào của pipeline.

---

## 9. Điều học được và hướng cải thiện

### Ba điều quan trọng nhất

1. **Về data pipeline:** Một orchestrator tốt không chỉ "chạy được" mà phải fail sớm và rõ ràng (raise lỗi ngay khi thiếu artifact tiền đề) thay vì âm thầm chạy tiếp với dữ liệu rỗng/giả.
2. **Về data quality/observability:** Report tự động (script sinh ra) vẫn có thể sai nếu logic tính sai trường dữ liệu (như bug "Total Rows" lấy nhầm `samples` thay vì `total_rows`) — luôn phải đối chiếu ngược report với JSON gốc, không tin tưởng mù quáng vào output đã được "làm đẹp".
3. **Về làm việc nhóm trên cùng 1 pipeline:** Khi nhiều người cùng sửa các module phụ thuộc lẫn nhau, vai trò điều phối phải chủ động chạy lại toàn bộ chuỗi sau mỗi lần merge lớn — artifact "đúng tại thời điểm tạo ra" không có nghĩa là "vẫn đúng sau khi người khác đổi input của nó".

### Nếu có thêm thời gian

Tôi sẽ thêm một bước kiểm tra tự động (trước khi cho phép merge vào `main`) đối chiếu `total_rows` giữa `corruption_report.md` và dataset JSON thật, để phát hiện ngay tình trạng "artifact đông cứng" thay vì phải phát hiện thủ công như lần này.

---

## 10. Cam kết của thành viên

Đánh dấu sau khi tự kiểm tra:

- [x] Nội dung báo cáo phản ánh đúng phần việc và mức hiểu của tôi.
- [x] Tôi có thể giải thích luồng end-to-end, không chỉ module mình phụ trách.
- [x] Mọi kết luận về kết quả đều có artifact hoặc metric để đối chiếu.
- [x] Tôi không ghi "đã chạy thành công" cho phần chưa được kiểm chứng.
- [x] Báo cáo không chứa `.env`, API key, token hoặc secret.
- [x] Báo cáo này không phải bản sao nguyên văn của báo cáo nhóm hoặc báo cáo thành viên khác.

**Họ và tên:** Nguyễn Minh Đạt
**Ngày xác nhận:** 2026-08-06
