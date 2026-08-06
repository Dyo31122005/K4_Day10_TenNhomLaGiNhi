# Báo cáo cá nhân — Trần Hoàng Mai Anh

## 1. Thông tin cá nhân

| Thông tin       | Nội dung                                               |
| --------------- | ------------------------------------------------------ |
| Họ và tên       | Trần Hoàng Mai Anh                                     |
| MSSV            | Chưa cung cấp trong repository                         |
| Khóa/Lớp        | K4                                                     |
| Tên nhóm        | TenNhomLaGiNhi                                         |
| Vai trò chính   | Cleaning & corruption (`clean`)                        |
| Repository      | https://github.com/Dyo31122005/K4_Day10_TenNhomLaGiNhi |
| Ngày hoàn thành | 2026-08-06                                             |

## 2. Vai trò và phạm vi công việc

### Phần việc sở hữu

| Module/deliverable     | File/hàm phụ trách                                   | Input                                       | Output bàn giao                                                                   | Trạng thái |
| ---------------------- | ---------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------- | ---------- |
| Cleaning/data contract | `src/ingestion/cleaning.py`, `build_clean_dataframe` | Raw Crossref records                        | `papers_clean.csv/json`, `cleaning_log.json`, schema 16 cột                       | Hoàn thành |
| Corruption injection   | `src/ingestion/corruption.py`                        | Clean dataframe, frozen paper IDs           | Corrupted dataset, 11 operation log và verification                               | Hoàn thành |
| Corruption audit       | `data/corruption_dataset_audit_report.md`            | Corrupted artifact và `corruption_log.json` | Đối chiếu row count, schema, missing/duplicate/near-duplicate và operation checks | Hoàn thành |
| Repair coordination    | `src/pipelines/corruption_flow.py`                   | Raw snapshot sau corruption                 | Rebuilt repaired dataset/index và repaired artifacts                              | Hoàn thành |

### Việc hỗ trợ ngoài phạm vi chính

| Hoạt động                                    | Module được hỗ trợ                                                | Kết quả                                                                         |
| -------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Kiểm tra liên kết ID và smoke test retrieval | `src/retrieval/index.py`, `data/embeddings/`                      | Ground-truth IDs tồn tại trong index; semantic search và exact lookup hoạt động |
| Đối chiếu corruption/repair end-to-end       | `src/pipelines/corruption_flow.py`                                | Xác nhận flow dùng frozen test set và repair không mutate corrupted dataframe   |
| Phân tích query hit/miss                     | `data/results/*_answers.json`, `data/results/corruption_log.json` | Ghi nhận `q_001` miss khi paper Hi-RAG bị drop và hit lại sau repair            |

## 3. Kết quả theo vai trò

| Nhiệm vụ                    | File/hàm/artifact                         | Kết quả bàn giao                                                      | Cách xác minh                                     |
| --------------------------- | ----------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------- |
| Xây clean data contract     | `src/ingestion/cleaning.py`               | 24 raw records → 24 clean records, schema 16 cột và cleaning audit    | `data/clean/cleaning_log.json`                    |
| Tạo corruption có kiểm soát | `src/ingestion/corruption.py`             | 11 operation, corrupted 25 rows, log có verification                  | `data/results/corruption_log.json`                |
| Audit corrupted artifact    | `data/corruption_dataset_audit_report.md` | Đối chiếu schema, row delta, missing/duplicate ID và operation checks | Audit report + corruption log                     |
| Hỗ trợ repair end-to-end    | `src/pipelines/corruption_flow.py`        | Rebuild từ raw snapshot, repaired 24 rows, schema khớp baseline       | `papers_clean_repaired.*`, repaired reports       |
| Đối chiếu kết quả           | `data/results/*_metrics.json`             | Cung cấp bằng chứng baseline/corrupted/repaired cho báo cáo nhóm      | Metrics, quality và freshness artifacts           |
| Audit corrupted artifact    | `data/corruption_dataset_audit_report.md` | Đối chiếu schema, row delta, 11 operations và giới hạn phát hiện      | Audit report + `data/results/corruption_log.json` |

Output tiêu biểu là clean contract, corrupted artifact và corruption audit. Phần evaluation/observability được sử dụng để đối chiếu ba trạng thái: `baseline_metrics.json`, `corrupted_metrics.json` và `repaired_metrics.json` dùng cùng 12 samples. Audit report xác nhận corrupted artifact có 25 rows, schema 16 cột khớp baseline, thiếu 1 baseline ID, có 1 duplicate ID và đủ 11 operation checks. Repair từ raw snapshot phục hồi cả metrics lẫn quality/freshness, nên kết luận không chỉ dựa trên việc pipeline chạy thành công.

## 4. Giải thích phần kỹ thuật đã thực hiện

### Vấn đề cần giải quyết

Cleaning phải tạo ra data contract ổn định từ raw records, còn corruption phải tạo lỗi có chủ đích nhưng vẫn giữ được artifact để đo impact. Sau đó repair phải quay lại raw snapshot, không sửa trực tiếp corrupted dataframe, rồi rebuild và bàn giao dữ liệu sạch cho bước so sánh ba trạng thái.

### Cách triển khai

`build_clean_dataframe` chuẩn hóa text/list/date, loại record không hợp lệ, deduplicate theo `paper_id`, tạo các field dẫn xuất và validate schema 16 cột. `corrupt_clean_dataframe` làm việc trên bản sao của clean dataframe, áp dụng 11 operation deterministic, rebuild derived fields và ghi `corruption_log.json` kèm verification. Trong repair flow, dữ liệu được đọc lại từ `data/raw/crossref_records.json`, clean lại bằng cùng data contract, validate schema rồi mới lưu `papers_clean_repaired.*` và rebuild index. Các module evaluation/observability được dùng để kiểm tra rằng artifact sau repair thực sự phục hồi metrics và quality/freshness.

### Input, output và contract

| Thành phần            | Mô tả                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Input                 | Clean dataframe có `paper_id`, `title`, `summary`, `published`, `age_days`; frozen `test_set.json`; index và `Settings` |
| Output                | Metrics JSON, answer JSON, quality/freshness JSON và Markdown reports                                                   |
| Module phụ thuộc      | `src/core/config.py`, `src/evaluation/testset.py`, `src/retrieval/agent.py`, `src/retrieval/index.py`                   |
| Module sử dụng output | `src/pipelines/phase1.py`, `src/pipelines/corruption_flow.py`, báo cáo nhóm                                             |
| Điều kiện lỗi         | Thiếu test set/index, ground-truth ID không tồn tại, dataframe thiếu cột, duplicate/null/short summary, stale date      |

### Cách xác minh

```powershell
uv run python script/run_phase1.py
uv run python script/run_corruption_flow.py
```

- **Kết quả mong đợi:** baseline và repaired đạt metrics tối đa; corrupted giảm metrics và quality/freshness chuyển FAIL/STALE.
- **Kết quả thực tế:** baseline/repaired: 100%, F1 1.0000, judge 100%, score 5.00; corrupted: 66.7%, F1 0.3495, judge 33.3%, score 2.6667; quality corrupted FAIL, freshness corrupted STALE với 2 stale rows.
- **Artifact/log:** `data/results/*.json`, `data/quality/*.json`, `data/results/corruption_log.json`, `data/reports/*.md`.

## 5. Một quyết định kỹ thuật quan trọng

- **Bối cảnh:** Baseline, corrupted và repaired phải được so sánh công bằng.
- **Các phương án:** (1) tạo lại test set sau mỗi flow; (2) giữ một test set frozen và chỉ thay index/dataset.
- **Phương án đã chọn:** Giữ `data/eval/test_set.json` cố định; corruption flow không regenerate test set.
- **Lý do:** Cùng câu hỏi, ground truth và paper IDs giúp thay đổi metrics quy về dữ liệu/index; cách này reproducible và tránh leakage.
- **Bằng chứng:** `corruption_log.json` có `frozen_test_set.all_operations_overlap=true`; cả ba metrics JSON đều có `samples=12`.

## 6. Một lỗi hoặc blocker đã xử lý

- **Triệu chứng:** Corrupted dataframe có duplicate `paper_id` và summary rỗng/ngắn, nên không thể đi qua strict validation dành cho clean data.
- **Bước tái hiện:** Chạy corruption flow sau khi tạo corrupted artifact; kiểm tra `data/quality/corrupted_quality_report.json`.
- **Nguyên nhân gốc:** Đây là lỗi được inject có chủ đích để đo impact; nếu dùng cùng validation strict như baseline thì pipeline dừng trước bước index/evaluation, không đo được tác động của dữ liệu lỗi.
- **Cách xử lý:** Cho phép `LocalEmbeddingIndex.build` dùng `strict_validation=False` chỉ với corrupted collection; vẫn chạy quality checks riêng để ghi nhận FAIL. Repaired dataset phải validate strict trước khi index.
- **Cách xác minh:** Corrupted flow hoàn tất và ghi metrics/quality/freshness; corrupted có 25 rows, quality FAIL, freshness STALE với 2 stale rows; audit report xác nhận `verification.is_consistent=true`; repaired có 24 rows, quality PASS và freshness FRESH.
- **Điều học được:** Validation gate cần phân biệt pipeline production và thí nghiệm fault injection; nới gate phải có phạm vi rõ ràng và luôn đi kèm observability.

## 7. Hiểu biết về luồng end-to-end

1. Crossref được cache thành raw response/records; cleaning chuẩn hóa record, tạo `text_for_embedding` và `age_days`; embedding được lưu vào ChromaDB; agent query index và trả answer.
2. Test set giữ câu hỏi, ground truth và document IDs. Retrieval hit đo đúng paper có được lấy về không; token F1 đo độ giống answer; judge accuracy/score đánh giá correctness và chất lượng answer.
3. Quality checks kiểm tra tính hợp lệ hiện tại của dataframe như null, duplicate, độ dài summary và ngưỡng row count. Freshness monitoring tập trung vào tuổi/ngày publish và số stale rows.
4. Dùng cùng test set loại bỏ biến số do câu hỏi hoặc ground truth thay đổi, giúp so sánh nhân quả hơn giữa clean, corrupted và repaired.
5. Repair thành công khi dataset repaired trở về 24 rows, quality PASS, freshness FRESH với 0 stale rows, và cả retrieval hit, token F1, judge accuracy, judge score trở về baseline.

## 8. Phân tích kết quả

| Metric/signal        | Baseline | Corrupted | Repaired | Nhận xét                                                            |
| -------------------- | -------: | --------: | -------: | ------------------------------------------------------------------- |
| `retrieval_hit_rate` |   100.0% |     66.7% |   100.0% | Mất paper ground truth làm giảm hit rate; repair phục hồi hoàn toàn |
| `mean_token_f1`      |   1.0000 |    0.3495 |   1.0000 | Summary/title lỗi làm answer lệch ground truth                      |
| `judge_accuracy`     |   100.0% |     33.3% |   100.0% | Corruption tạo nhiều câu trả lời sai                                |
| `mean_judge_score`   |     5.00 |    2.6667 |     5.00 | Chất lượng answer giảm mạnh rồi phục hồi                            |
| Quality checks       |     PASS |      FAIL |     PASS | Corrupted có duplicate và 2 summary ngắn                            |
| Freshness status     |    FRESH |     STALE |    FRESH | Corrupted có 2 stale rows                                           |

1. `drop_latest` mất `10.1111/exsy.70341`, đồng thời title/summary/metadata corruption làm quality/freshness xấu đi; agent metrics giảm rõ rệt.
2. Repair đọc lại raw snapshot và clean lại từ đầu; quality/freshness cùng bốn metric trở lại baseline.

Corruption ảnh hưởng rõ nhất là `drop_latest` vì nó loại hẳn document mà frozen test set yêu cầu. Với `q_001`, baseline tìm đúng Hi-RAG và judge 5/5; corrupted miss, lấy paper Deep RAG không liên quan và judge 2/5; repaired hit lại và đạt 5/5.

Kết quả cần lưu ý là corrupted có 25 rows dù mất 1 baseline record: `drop_latest` xóa 1 dòng, rồi `duplicate_row` và `semantic_near_duplicate` mỗi operation thêm 1 dòng. Vì vậy row count một mình không đủ kết luận dataset tốt; phải kết hợp uniqueness, content và freshness checks. Audit report cũng chỉ ra quality checks chuẩn chưa tự phát hiện được các lỗi ngữ nghĩa âm thầm như title truncation, summary noise, HTML leakage, swap author/category và near-duplicate.

## 9. Điều học được và hướng cải thiện

### Ba điều quan trọng nhất

1. Data contract và raw snapshot giúp traceability, reproducibility và repair đáng tin cậy.
2. Observability không chỉ là một cờ PASS/FAIL; cần lưu chi tiết từng check, freshness range và corruption log.
3. RAG có thể đạt score tuyệt đối trên clean data nhưng suy giảm mạnh khi context bị thiếu, sai hoặc nhiễu; chất lượng dữ liệu là một phần của answer quality.

### Nếu có thêm thời gian

Thêm baseline-aware validation: chuẩn hóa title/summary, hash nội dung, so sánh authors/categories với raw và dùng embedding similarity để bắt near-duplicate. Đo bằng precision/recall trên một bộ corruption có nhãn; đồng thời bật Ragas để bổ sung faithfulness và context precision.

## 10. Cam kết của thành viên

- [x] Nội dung báo cáo phản ánh đúng phần việc Cleaning & corruption.
- [x] Có thể giải thích luồng end-to-end.
- [x] Kết luận đều có artifact hoặc metric đối chiếu.
- [x] Không ghi thành công cho phần chưa được kiểm chứng.
- [x] Không chứa `.env`, API key, token hoặc secret.
- [x] Không sao chép nguyên văn báo cáo nhóm.

**Họ và tên:** Trần Hoàng Mai Anh

**Ngày xác nhận:** 2026-08-06
