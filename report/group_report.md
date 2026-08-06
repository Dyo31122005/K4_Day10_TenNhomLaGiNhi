# Báo cáo nhóm — Day 10: Data Pipeline & Data Observability

## 1. Thông tin bài nộp

| Thông tin       | Nội dung                                               |
| --------------- | ------------------------------------------------------ |
| Khóa/Lớp        | K4                                                     |
| Tên nhóm        | TenNhomLaGiNhi                                         |
| Repository      | https://github.com/Dyo31122005/K4_Day10_TenNhomLaGiNhi |
| Ngày hoàn thành | 2026-08-06                                             |

### Thành viên và phân công

| STT | Họ và tên          | MSSV         | Vai trò chính                              | Module/deliverable sở hữu                                   |
| --: | ------------------ | ------------ | ------------------------------------------ | ----------------------------------------------------------- |
|   1 | Nguyễn Minh Đạt    | 2A202601142  | Pipeline integrator (lead)                 | `src/core/` · `src/pipelines/`                              |
|   2 | Nguyễn Hùng Mạnh   | 2A202601256 | Ingestion owner (ingest)                   | `src/ingestion/crossref.py` · `data/raw/`                   |
|   3 | Trần Hoàng Mai Anh | 2A202601324  | Cleaning & corruption owner (clean)        | `src/ingestion/cleaning.py` · `src/ingestion/corruption.py` |
|   4 | Nguyễn Hương Trà   | 2A202601416  | RAG & agent owner (rag)                    | `src/retrieval/` · `data/embeddings/`                       |
|   5 | Hà Anh Tuấn        | 2A202601582  | Evaluation & observability (eval\|observe) | `src/evaluation/` · `src/observability/`                    |

## 2. Tóm tắt kết quả

Viết từ 150–250 từ, trả lời ngắn gọn:

- Nhóm đã hoàn thành những phần nào?

- Baseline pipeline đã tạo ra các artifact nào?
- Corruption nào ảnh hưởng rõ nhất đến data quality hoặc agent?
- Repair đã phục hồi được chỉ số nào?
- Blocker hoặc giới hạn quan trọng nhất còn lại là gì?

**Tóm tắt của nhóm:**

Nhóm đã hoàn thành pipeline end-to-end gồm ingestion từ Crossref, cleaning theo data contract, embedding bằng MiniLM, lập chỉ mục ChromaDB, RAG evaluation và observability. Baseline tạo được raw response/records, cleaned CSV/JSON, embedding manifest, collection vector, frozen evaluation set 12 câu hỏi, answers/metrics, quality-freshness reports và baseline report. Thí nghiệm corruption inject 11 lỗi có chủ đích; tác động rõ nhất là xóa paper mục tiêu, làm rỗng summary và làm stale ngày xuất bản. Trên cùng frozen test set, retrieval hit rate giảm từ 100% xuống 66,7%, mean token F1 từ 1,0000 xuống 0,3495, judge accuracy từ 100% xuống 33,3% và mean judge score từ 5,00 xuống 2,6667. Repair đọc lại raw snapshot, chạy lại cleaning rồi rebuild index, đưa toàn bộ bốn metric về baseline và quality/freshness từ FAIL/STALE về PASS/FRESH. Giới hạn còn lại là API rate limiting, chi phí thời gian embedding/indexing và độ phụ thuộc của LLM judge; Ragas chưa được bật trong lần chạy này.

## 3. Kiến trúc và luồng dữ liệu

```text
Crossref API/snapshot
  -> data/raw/crossref_response.json, crossref_records.json
  -> cleaning + data contract
  -> data/clean/papers_clean.*
  -> MiniLM embedding + ChromaDB
  -> frozen data/eval/test_set.json
  -> baseline evaluation + quality/freshness
  -> deterministic corruption + corruption_log.json
  -> corrupted evaluation/observability
  -> rebuild from raw snapshot
  -> repaired evaluation + comparison report
```

| Khối              | Input                     | Xử lý chính                                                  | Output                                          | Owner              |
| ----------------- | ------------------------- | ------------------------------------------------------------ | ----------------------------------------------- | ------------------ |
| Ingestion         | Crossref works            | Fetch/parse/cache raw snapshot                               | `data/raw/`                                     | Nguyễn Hùng Mạnh   |
| Cleaning          | Raw records               | Normalize, strip markup, validate, dedupe, tính tuổi dữ liệu | `data/clean/`                                   | Trần Hoàng Mai Anh |
| Embedding/index   | Clean dataframe           | `all-MiniLM-L6-v2`, Chroma cosine, cross-encoder rerank      | `data/embeddings/`, `data/chroma/`              | Nguyễn Hương Trà   |
| Evaluation        | Frozen test set + index   | Retrieval hit, token F1, LLM judge                           | `data/results/*_metrics.json`, `*_answers.json` | Hà Anh Tuấn        |
| Observability     | Dataframe + settings      | 6 quality checks và freshness threshold 180 ngày             | `data/quality/`                                 | Hà Anh Tuấn        |
| Corruption/repair | Clean data + raw snapshot | Inject 11 lỗi; rebuild clean từ raw                          | corrupted/repaired artifacts                    | Trần Hoàng Mai Anh |
| Orchestration     | Settings và artifacts     | Chạy baseline/corruption flow theo thứ tự                    | reports/metrics                                 | Nguyễn Minh Đạt    |

## 4. Cách tái hiện kết quả

### Cấu hình không chứa secret

| Biến/cấu hình             | Giá trị sử dụng                                                 |
| ------------------------- | --------------------------------------------------------------- |
| `LLM_PROVIDER`            | `openai`                                                        |
| `LLM_MODEL`               | `gpt-5`                                                         |
| Embedding model           | `sentence-transformers/all-MiniLM-L6-v2`                        |
| Reranker model            | `cross-encoder/ms-marco-MiniLM-L-6-v2`                          |
| Vector store/metric       | ChromaDB PersistentClient, HNSW cosine                          |
| Collections               | `papers-baseline`, `papers-corrupted`, `papers-repaired`        |
| Số lượng Crossref records | 24 raw records; 24 clean baseline records                       |
| Số câu hỏi evaluation     | 12 câu hỏi trong frozen test set                                |
| Retrieval `top_k`         | 4; candidate set reranking tối đa `top_k × 4`                   |
| Freshness threshold       | 180 ngày                                                        |
| Random seed, nếu có       | Không sử dụng RNG; corruption chọn record theo quy tắc xác định |

Không dán nội dung API key hoặc file `.env` vào báo cáo.

### Lệnh cài đặt

Chỉ giữ lại cách nhóm đã dùng.

```powershell
uv sync
uv run python script/run_phase1.py
uv run python script/run_corruption_flow.py
```

| Flow                | Trạng thái | Bằng chứng                                                                             |
| ------------------- | ---------- | -------------------------------------------------------------------------------------- |
| Baseline            | Thành công | `data/reports/phase1_report.md`, `data/results/baseline_metrics.json`                  |
| Corruption + repair | Thành công | `data/results/corruption_log.json`, các artifact corrupted/repaired và quality reports |

## 5. Ingestion, cleaning và data contract

Nguồn là Crossref REST API với query `agentic retrieval augmented generation large language model`, filter `from-pub-date:<ngày chạy - 180 ngày>,has-abstract:true`, snapshot 24 records. `build_clean_dataframe` dùng `paper_id` viết thường làm khóa, chuẩn hóa title/summary/list metadata, strip HTML/XML, loại record thiếu ID/title/summary hợp lệ/ngày publish, dedupe theo ID, tạo `authors_joined`, `categories_joined`, `summary_chars`, `age_days` và `text_for_embedding`.

Clean schema gồm: `paper_id`, `title`, `summary`, `authors`, `categories`, `primary_category`, `published`, `updated`, `abs_url`, `pdf_url`, `comment`, `authors_joined`, `categories_joined`, `summary_chars`, `age_days`, `text_for_embedding`. `text_for_embedding` có dạng `Title: ... | Authors: ... | Summary: ...`; document ID của index có dạng `paper_id::row_index`.

Cleaning audit ghi `input_rows=24`, `output_rows=24`, `filtered_or_deduplicated_rows=0`. Đây là bằng chứng raw snapshot và clean dataset khớp nhau.

## 6. Evaluation setup

Evaluation set `data/eval/test_set.json` có 12 samples: 3 paper × 4 question types. Mỗi sample có `question`, `ground_truth`, `ground_truth_doc_ids`; ground-truth IDs là DOI của paper được hỏi. Index dùng `sentence-transformers/all-MiniLM-L6-v2`, ChromaDB cosine, candidate retrieval kết hợp cross-encoder rerank, `top_k=4`. Metrics gồm retrieval hit rate, mean token F1, judge accuracy và mean judge score; Ragas được ghi là skipped vì không bật `RUN_RAGAS=1`.

Test set được giữ nguyên giữa baseline, corrupted và repaired để mọi thay đổi chỉ phản ánh trạng thái dữ liệu/index, không phải thay đổi câu hỏi hoặc ground truth. `corruption_log.json` xác nhận cả 11 operations đều overlap với 3 paper trong frozen test set.

## 7. Kết quả baseline

### Artifact checklist

| Artifact                 | Đường dẫn thực tế                                                                 | Trạng thái | Ghi chú                                                                       |
| ------------------------ | --------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| Raw response/records     | `data/raw/crossref_response.json`, `data/raw/crossref_records.json`               | Có         | Có snapshot API gốc và 24 records đã parse để truy vết/repair.                |
| Cleaned dataset          | `data/clean/papers_clean.csv`, `data/clean/papers_clean.json`                     | Có         | 24 records sạch; có `paper_id`, metadata, `age_days` và `text_for_embedding`. |
| Embedding manifest/index | `data/embeddings/papers_embeddings.json`, `data/chroma/`                          | Có         | Manifest dùng MiniLM; collection Chroma `papers-baseline` lưu 24 documents.   |
| Evaluation set           | `data/eval/test_set.json`                                                         | Có         | Frozen test set gồm 12 câu hỏi với ground-truth document IDs.                 |
| Baseline metrics         | `data/results/baseline_metrics.json`                                              | Có         | Có đủ hit rate, token F1, judge accuracy và mean judge score.                 |
| Quality/freshness        | `data/quality/baseline_quality_report.json`, `data/quality/freshness_report.json` | Có         | Baseline quality PASS, freshness FRESH và 0 stale rows.                       |
| Baseline report          | `data/reports/phase1_report.md`                                                   | Có         | Tổng hợp source count, metrics, quality và freshness từ artifact thực tế.     |

### Baseline metrics

| Metric               |      Baseline | Diễn giải                                   |
| -------------------- | ------------: | ------------------------------------------- |
| `retrieval_hit_rate` | 1.0000 (100%) | Tìm được đúng document ID cho cả 12 câu hỏi |
| `mean_token_f1`      |        1.0000 | Answer trùng ground truth trong bộ test     |
| `judge_accuracy`     | 1.0000 (100%) | Tất cả answer được judge đánh giá đúng      |
| `mean_judge_score`   |        5.00/5 | Điểm judge trung bình tối đa                |
| Ragas                |       Skipped | Không bật `RUN_RAGAS=1`                     |

## 8. Data quality và freshness

Baseline có 24 rows, quality `PASS`, freshness `FRESH`, latest published `2026-08-01`, oldest `2026-02-12`, stale rows 0. Sáu checks đều PASS: row count, non-null paper ID, unique paper ID, non-null title, summary tối thiểu 100 ký tự và freshness không quá 180 ngày.

## 9. Corruption scenarios và repair

### Yêu cầu repair của bài lab

Theo yêu cầu trong `README.md` và `Guide.md`, repair không chỉ là làm cho flow chạy tiếp hoặc sửa trực tiếp corrupted dataframe. Sau khi đo impact của corruption, nhóm phải phục hồi dữ liệu từ raw source đáng tin cậy (`data/raw/crossref_records.json`), chạy lại cleaning/data contract, rebuild embedding/index, đánh giá lại trên **cùng frozen evaluation set**, rồi tạo comparison report cho ba trạng thái `baseline`, `corrupted` và `repaired`. Vì vậy, phần phân tích bên dưới chỉ được kết luận sau khi repaired artifact, repaired metrics và repaired quality/freshness reports đã được tạo và đối chiếu; mục tiêu là chứng minh đồng thời dữ liệu lỗi làm giảm chất lượng agent và repair đúng cách khôi phục chất lượng.

`corruption_log.json` ghi và verify thành công 11 operation: `drop_latest`, `blank_summary`, `inject_summary_noise`, `truncate_title`, `make_published_stale`, `swap_categories`, `swap_authors`, `html_markup_leakage`, `make_published_future`, `duplicate_row`, `semantic_near_duplicate`. Kết quả cấu trúc là input 24 rows → output 25 rows; missing baseline ID `10.1111/exsy.70341`, duplicate ID `10.2118/234689-pa`, near-duplicate ID `10.1007/s10278-026-02086-9#near-duplicate`.

Quality report hiện hành phát hiện duplicate ID, 2 summary ngắn và 2 stale rows nên `FAIL`; freshness report là `STALE` với 2 stale rows. Audit report bổ sung xác nhận schema 16 cột khớp baseline, đủ 11 operation-level checks và `verification.is_consistent=true`. Các lỗi swap attribution, noise, HTML leakage, future date, record bị xóa và semantic near-duplicate vẫn là lỗi ngữ nghĩa cần log hoặc kiểm tra nâng cao để tự phát hiện.

Repair đọc lại `data/raw/crossref_records.json`, chạy lại `build_clean_dataframe`, validate schema, ghi `papers_clean_repaired.*`, rebuild index và evaluate trên frozen test set. Cách này phục hồi từ nguồn tin cậy, không che lỗi bằng cách chỉnh trực tiếp corrupted dataframe.

## 10. So sánh baseline, corrupted và repaired

| Metric/signal        | Baseline | Corrupted | Repaired |         Thay đổi do corruption | Mức phục hồi |
| -------------------- | -------: | --------: | -------: | -----------------------------: | -----------: |
| `retrieval_hit_rate` |   100.0% |     66.7% |   100.0% |                   -33.3 điểm % |         100% |
| `mean_token_f1`      |   1.0000 |    0.3495 |   1.0000 |                        -0.6505 |         100% |
| `judge_accuracy`     |   100.0% |     33.3% |   100.0% |                   -66.7 điểm % |         100% |
| `mean_judge_score`   |     5.00 |    2.6667 |     5.00 |                        -2.3333 |         100% |
| Total rows           |       24 |        25 |       24 | +1 net (mất 1, thêm 2 bản sao) |  Về baseline |
| Quality              |     PASS |      FAIL |     PASS |                              — |    Hoàn toàn |
| Freshness            |    FRESH |     STALE |    FRESH |                              — |    Hoàn toàn |

Hai chuỗi nguyên nhân–bằng chứng chính:

1. `drop_latest` làm mất paper ground truth và các lỗi title/summary/metadata làm hỏng context → quality FAIL/freshness STALE → hit rate giảm 100% xuống 66.7%, judge accuracy giảm xuống 33.3%.
2. Rebuild từ raw snapshot → 24 rows, không duplicate, summary đủ dài, 0 stale rows → quality/freshness PASS/FRESH và cả bốn agent metrics trở về baseline. `data/corruption_dataset_audit_report.md` xác nhận thêm rằng corrupted artifact khớp corruption log trước khi repair.

Ví dụ `q_001`: baseline truy xuất đúng `10.1111/exsy.70341` và đạt 5/5; corrupted không còn paper này nên miss và lấy paper không liên quan; repaired truy xuất lại đúng paper và đạt 5/5.

## 11. Vấn đề tích hợp quan trọng

- **Triệu chứng:** corrupted dataset có lỗi có chủ đích nhưng vẫn phải được index để đo impact.
- **Nguyên nhân:** strict clean validation sẽ chặn duplicate/blank content, trong khi thí nghiệm cần giữ lỗi để quan sát.
- **Cách xử lý:** `LocalEmbeddingIndex.build` dùng `strict_validation=False` cho corrupted collection; quality checks chạy độc lập để ghi nhận FAIL; repaired flow validate strict trước khi index.
- **Cách xác minh:** `data/results/corruption_log.json`, `corrupted_quality_report.json`, `repaired_quality_report.json` và ba file metrics.

## 12. Giới hạn và hướng cải thiện

| Giới hạn                                            | Ảnh hưởng                                                                      | Cải thiện kiểm chứng được                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Quality checks chủ yếu là schema/null/length và age | Chưa phát hiện tốt swap author/category, noise, title truncation, HTML leakage | Thêm rule đối chiếu raw-clean, field consistency và HTML/temporal validation |
| Semantic near-duplicate có ID khác                  | Exact uniqueness không phát hiện được                                          | Thêm normalized-title hash và cosine similarity threshold                    |
| Ragas chưa chạy                                     | Chưa có faithfulness/context precision độc lập                                 | Bật `RUN_RAGAS=1`, lưu report và so sánh cùng frozen set                     |
| LLM judge phụ thuộc provider/cache                  | Có thể thay đổi theo model hoặc cache                                          | Pin model/version, lưu judge config và seed trong metadata                   |

## 13. Checklist trước khi nộp

- [x] Thông tin nhóm, phân công và ngày hoàn thành đã điền.
- [x] Baseline, corrupted và repaired dùng chung `data/eval/test_set.json`.
- [x] Metrics trong báo cáo đối chiếu trực tiếp với `data/results/*.json`.
- [x] Quality/freshness kết luận đối chiếu với `data/quality/*.json`.
- [x] Corruption log có verification và frozen-test overlap.
- [x] Repair được mô tả là rebuild từ raw snapshot.
- [x] Có artifact và lệnh tái hiện.
- [x] Không đưa `.env`, API key, token hoặc secret vào báo cáo.
- [x] Báo cáo cá nhân của từng thành viên cần được hoàn thiện riêng.
