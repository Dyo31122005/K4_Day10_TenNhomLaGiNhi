# Group Report — Day 10: Data Pipeline & Data Observability

> Dùng mẫu này cho báo cáo chung của nhóm 3–5 thành viên. Thay toàn bộ nội dung trong dấu `[ ]` bằng thông tin và kết quả thực tế. Xóa các dòng hướng dẫn không còn cần thiết trước khi nộp.

## 1. Thông tin bài nộp

| Thông tin         | Nội dung                  |
| ------------------ | -------------------------- |
| Khóa/Lớp         | K4             |
| Tên nhóm         | TenNhomLaGiNhi     |
| Repository         | https://github.com/Dyo31122005/K4_Day10_TenNhomLaGiNhi |
| Ngày hoàn thành | 2026-08-06              |

### Thành viên và phân công

| STT | Họ và tên | MSSV | Vai trò chính | Module/deliverable sở hữu |
| --: | --- | --- | --- | --- |
| 1 | Nguyễn Minh Đạt | [MSSV] | Pipeline integrator (lead) | `src/core/` · `src/pipelines/` |
| 2 | Nguyễn Hùng Mạnh | [MSSV] | Ingestion owner (ingest) | `src/ingestion/crossref.py` · `data/raw/` |
| 3 | Trần Hoàng Mai Anh | [MSSV] | Cleaning & corruption owner (clean) | `src/ingestion/cleaning.py` · `src/ingestion/corruption.py` |
| 4 | Nguyễn Hương Trà | 2A202601416 | RAG & agent owner (rag) | `src/retrieval/` · `data/embeddings/` |
| 5 | Hà Anh Tuấn | 2A202601582 | Evaluation & observability (eval\|observe) | `src/evaluation/` · `src/observability/` |

## 2. Tóm tắt kết quả

Viết từ 150–250 từ, trả lời ngắn gọn:

- Nhóm đã hoàn thành những phần nào?

- Baseline pipeline đã tạo ra các artifact nào?
- Corruption nào ảnh hưởng rõ nhất đến data quality hoặc agent?
- Repair đã phục hồi được chỉ số nào?
- Blocker hoặc giới hạn quan trọng nhất còn lại là gì?

**Tóm tắt của nhóm:**

Nhóm đã hoàn thành toàn bộ pipeline end-to-end từ ingestion, cleaning, embedding, đến evaluation và observability. Baseline pipeline tạo ra các artifact chính: raw records từ Crossref API, cleaned dataset, embedding index trên ChromaDB, evaluation metrics, và quality/freshness reports. Corruption chính ảnh hưởng rõ nhất là missing embedding vectors và stale document timestamps, làm giảm retrieval_hit_rate và answer quality đáng kể. Repair process đã phục hồi documents từ nguồn Crossref, khôi phục được embedding vectors và timestamp hợp lệ, với mục tiêu khôi phục các metrics gần về baseline. Blocker chính là API rate limiting và hiệu suất embedding indexing trên dataset lớn; giới hạn khác là khó khăn trong việc tạo ground-truth relevance labels hoàn toàn chính xác cho evaluation set.

## 3. Kiến trúc và luồng dữ liệu

### Luồng end-to-end

Điều chỉnh sơ đồ dưới đây nếu cách triển khai thực tế của nhóm khác starter:

```text
Crossref API
    -> raw response/raw records
    -> cleaning và data modeling
    -> embedding + ChromaDB index
    -> evaluation baseline
    -> quality/freshness reports
    -> corruption
    -> re-index và re-evaluate
    -> repair từ dữ liệu nguồn
    -> comparison report
```

### Trách nhiệm của từng khối

| Khối             | Input          | Xử lý chính             | Output/artifact          | Owner          |
| ----------------- | -------------- | -------------------------- | ------------------------ | -------------- |
| Ingestion         | [Nguồn/input] | [Fetch, retry, parse...]   | [Đường dẫn artifact] | [Thành viên] |
| Cleaning          | [Input]        | [Các quy tắc chính]     | [Đường dẫn artifact] | [Thành viên] |
| Embedding/index   | [Input]        | [Model/index config]       | [Đường dẫn artifact] | [Thành viên] |
| Evaluation        | `test_set.json`, ChromaDB index | Đo lường Hit rate, Token F1 và gọi LLM Judge đánh giá ngữ nghĩa | `baseline_metrics.json`, `baseline_answers.json`, v.v. | Hà Anh Tuấn |
| Observability     | Cleaned/corrupted/repaired Dataframe | Kiểm tra tính toàn vẹn (row count, PK, null) và thời gian (stale) | Quality & Freshness reports | Hà Anh Tuấn |
| Corruption/repair | [Input]        | [Corruption và repair]    | [Đường dẫn artifact] | [Thành viên] |
| Orchestration     | [Input]        | [Thứ tự chạy]           | [Reports/metrics]        | [Thành viên] |

## 4. Cách tái hiện kết quả

### Cấu hình không chứa secret

| Biến/cấu hình             | Giá trị sử dụng |
| ---------------------------- | ------------------- |
| `LLM_PROVIDER`             | `openai` |
| `LLM_MODEL`                | `gpt-5` |
| Embedding model              | `sentence-transformers/all-MiniLM-L6-v2` |
| Reranker model               | `cross-encoder/ms-marco-MiniLM-L-6-v2` |
| Vector store/metric          | ChromaDB PersistentClient, HNSW cosine |
| Collections                  | `papers-baseline`, `papers-corrupted`, `papers-repaired` |
| Số lượng Crossref records | 24 raw records; 24 clean baseline records |
| Số câu hỏi evaluation     | 12 câu hỏi trong frozen test set |
| Retrieval `top_k`           | 4; candidate set reranking tối đa `top_k × 4` |
| Freshness threshold          | 180 ngày |
| Random seed, nếu có        | Không sử dụng RNG; corruption chọn record theo quy tắc xác định |

Không dán nội dung API key hoặc file `.env` vào báo cáo.

### Lệnh cài đặt

Chỉ giữ lại cách nhóm đã dùng.

```bash
uv sync
```

Hoặc:

```bash
python -m pip install -e .
```

### Lệnh chạy

Baseline:

```bash
uv run python script/run_phase1.py
```

Hoặc với môi trường `pip` đã kích hoạt:

```bash
python script/run_phase1.py
```

Corruption flow:

```bash
uv run python script/run_corruption_flow.py
```

Hoặc với môi trường `pip` đã kích hoạt:

```bash
python script/run_corruption_flow.py
```

### Kết quả tái hiện

| Lệnh             | Trạng thái                                    | Thời điểm chạy gần nhất | Bằng chứng                         |
| ----------------- | ----------------------------------------------- | ----------------------------- | ------------------------------------ |
| Baseline pipeline | [Thành công/Thất bại một phần/Thất bại] | [Thời gian]                  | [Artifact hoặc log đã che secret] |
| Corruption flow   | [Thành công/Thất bại một phần/Thất bại] | [Thời gian]                  | [Artifact hoặc log đã che secret] |

## 5. Ingestion, cleaning và data contract

### Nguồn dữ liệu

| Thuộc tính                | Giá trị                             |
| --------------------------- | ------------------------------------- |
| Source                      | [Crossref endpoint/dataset thực tế] |
| Query/filter                | [Query hoặc filter]                  |
| Thời điểm lấy dữ liệu | [Timestamp]                           |
| Số record nhận được    | [Số lượng]                         |
| Cơ chế retry/backoff      | [Mô tả ngắn]                       |

### Raw và clean schema

| Trường        | Kiểu dữ liệu | Bắt buộc?  | Ý nghĩa   | Xử lý khi thiếu/sai |
| --------------- | --------------- | ------------ | ----------- | ---------------------- |
| [Tên trường] | [Kiểu]         | [Có/Không] | [Ý nghĩa] | [Cách xử lý]        |
| [Tên trường] | [Kiểu]         | [Có/Không] | [Ý nghĩa] | [Cách xử lý]        |

### Quy tắc cleaning

| Quy tắc                                 | Quality dimension liên quan | Số record bị tác động | Cách xác minh      |
| ---------------------------------------- | ---------------------------- | -------------------------: | -------------------- |
| [Ví dụ: loại record không có title] | [Completeness/Validity/...]  |              [Số lượng] | [Artifact/kiểm tra] |
| [Quy tắc thực tế]                     | [Dimension]                  |              [Số lượng] | [Artifact/kiểm tra] |

Giải thích cách nhóm tạo `text_for_embedding`, document ID và `age_days`:

[Mô tả tại đây.]

## 6. Evaluation setup

| Thành phần                             | Cấu hình thực tế          |
| ---------------------------------------- | ----------------------------- |
| Số câu hỏi                            | 12                         |
| Các`question_type`                    | `summary`, `authors`, `date`, `categories` |
| Ground-truth document ID                 | Trích xuất từ metadata của bài báo trong dataframe sạch |
| Embedding model                          | `sentence-transformers/all-MiniLM-L6-v2` |
| Vector store/collection                  | ChromaDB PersistentClient |
| Retrieval`top_k`                       | 4; candidate set reranking tối đa 16 |
| LLM provider/model                       | OpenAI `gpt-4o-mini` |
| Test set dùng chung cho ba trạng thái | [test_set.json](file:///d:/Anh%20Tuan/VinAI/K4_Day10_TenNhomLaGiNhi/data/eval/test_set.json) |

Giải thích vì sao test set được giữ nguyên khi đánh giá baseline, corrupted và repaired:

Để đảm bảo tính khoa học và tính so sánh của thí nghiệm. Bằng cách giữ nguyên tập câu hỏi, chúng ta đảm bảo rằng sự thay đổi về điểm số và chỉ số của Agent hoàn toàn là do tác động của chất lượng dữ liệu thay đổi ở các pha, chứ không phải do độ khó dễ khác nhau của câu hỏi.

## 7. Kết quả baseline

### Artifact checklist

| Artifact                 | Đường dẫn thực tế                | Trạng thái | Ghi chú   |
| ------------------------ | -------------------------------------- | ------------ | ---------- |
| Raw response/records     | `data/raw/crossref_response.json`, `data/raw/crossref_records.json` | Có | Có snapshot API gốc và 24 records đã parse để truy vết/repair. |
| Cleaned dataset          | `data/clean/papers_clean.csv`, `data/clean/papers_clean.json` | Có | 24 records sạch; có `paper_id`, metadata, `age_days` và `text_for_embedding`. |
| Embedding manifest/index | `data/embeddings/papers_embeddings.json`, `data/chroma/` | Có | Manifest dùng MiniLM; collection Chroma `papers-baseline` lưu 24 documents. |
| Evaluation set           | `data/eval/test_set.json` | Có | Frozen test set gồm 12 câu hỏi với ground-truth document IDs. |
| Baseline metrics         | `data/results/baseline_metrics.json` | Có | Có đủ hit rate, token F1, judge accuracy và mean judge score. |
| Quality/freshness        | `data/quality/baseline_quality_report.json`, `data/quality/freshness_report.json` | Có | Baseline quality PASS, freshness FRESH và 0 stale rows. |
| Baseline report          | `data/reports/phase1_report.md` | Có | Tổng hợp source count, metrics, quality và freshness từ artifact thực tế. |

### Baseline metrics

| Metric                 |       Giá trị | Diễn giải                             |
| ---------------------- | --------------: | --------------------------------------- |
| `retrieval_hit_rate` |     1.0 | 100% câu hỏi tìm thấy đúng bài báo gốc. |
| `mean_token_f1`      |     1.0000 | Các trường thông tin trả về hoàn toàn khớp chuẩn với Ground Truth. |
| `judge_accuracy`     |     1.0 | GPT-4o-mini đánh giá toàn bộ câu trả lời là chính xác (Correct: True). |
| `mean_judge_score`   |     5.00 | Điểm số trung bình đạt mức tối đa 5.00 / 5.00. |
| Ragas, nếu có        | N/A | Không sử dụng trong phạm vi bài lab này. |

## 8. Data quality và freshness

### Quality checks

| Check        | Quality dimension | Ngưỡng/kỳ vọng | Kết quả baseline      | Bằng chứng |
| ------------ | ----------------- | ------------------ | ----------------------- | ------------ |
| Row Count | Completeness | >= 20 dòng | PASS (24 dòng) | `baseline_quality_report.json` |
| Primary Key | Uniqueness | paper_id không trùng lặp và không null | PASS (0 duplicate, 0 null) | `baseline_quality_report.json` |
| Text Field Length | Validity | summary >= 100 kí tự | PASS (0 vi phạm) | `baseline_quality_report.json` |

### Freshness

| Thuộc tính               | Giá trị                           |
| -------------------------- | ----------------------------------- |
| Freshness được đo tại | Cột `published` trong tập dữ liệu |
| Timestamp mới nhất       | 2026-08-01 |
| Ngưỡng freshness         | <= 180 ngày so với hiện tại |
| Trạng thái baseline      | FRESH |
| Lý do                     | Tất cả các bản ghi đều nằm trong khoảng thời gian cho phép. |

## 9. Corruption scenarios và repair

| Corruption         | Cách tạo | Record bị tác động | Quality signal kỳ vọng | Tác động thực tế | Cách repair   |
| ------------------ | ---------- | ---------------------: | ------------------------ | --------------------- | -------------- |
| Drop Latest | Xóa records mới nhất | 4 | FAIL (Freshness) | Stale data | Fetch lại API |
| Corrupt Metadata | Xóa title, ID | 2 | FAIL (Completeness) | Null values | Re-ingest từ raw |

Corruption log:

- Đường dẫn: `data/results/corruption_log.json`
- Trạng thái: Có
- Nhận xét: Log ghi lại chính xác các lỗi tạo ra.

Giải thích cách repair đảm bảo dữ liệu được phục hồi từ nguồn đáng tin cậy thay vì chỉ che kết quả lỗi:

Nhóm sử dụng lại file `raw_records.json` từ pha Ingestion gốc để tái cấu trúc dữ liệu bị lỗi, đảm bảo dữ liệu phục hồi phản ánh chính xác nguồn API.

## 10. So sánh baseline, corrupted và repaired

| Metric/signal            | Baseline | Corrupted | Repaired | Thay đổi do corruption | Mức phục hồi | Nhận xét   |
| ------------------------ | -------: | --------: | -------: | -----------------------: | --------------: | ------------ |
| `retrieval_hit_rate`     |      1.0 |    0.3333 |      1.0 |                  -0.6667 |            100% | RAG mất khả năng tìm thấy tài liệu khi bị xóa. |
| `mean_token_f1`          |   1.0000 |    0.4600 |   1.0000 |                  -0.5400 |            100% | Nội dung sinh ra bị giảm sút do tóm tắt bị hỏng/nhiễu. |
| `judge_accuracy`         |      1.0 |    0.4167 |      1.0 |                  -0.5833 |            100% | Tỷ lệ trả lời đúng giảm nghiêm trọng xuống 41.7%. |
| `mean_judge_score`       |     5.00 |      3.08 |     5.00 |                    -1.92 |            100% | Điểm trung bình của LLM Judge bị kéo giảm. |
| Quality checks pass/fail |     PASS |      FAIL |     PASS |               FAIL check |            100% | Phát hiện trùng lặp khóa và thiếu trường dữ liệu. |
| Freshness status         |    FRESH |     STALE |    FRESH |              STALE check |            100% | Cảnh báo đúng khi ngày xuất bản bị lùi quá hạn. |

Nêu ít nhất hai kết luận có quan hệ nhân quả được hỗ trợ bởi artifacts:

1. Dữ liệu lỗi (`drop_latest`, `truncate_title`) → Quality check báo FAIL, Hit rate của Agent giảm từ 1.0 xuống 0.3333 → LLM Judge chấm câu trả lời sai lệch (Score giảm từ 5.0 xuống 3.08).
2. Tác vụ sửa lỗi (`repair` từ nguồn raw) → Quality check phục hồi PASS, dữ liệu có đủ 24 dòng → Chỉ số Hit rate và điểm LLM Judge của Agent khôi phục hoàn hảo 100% về mức baseline ban đầu.

Không kết luận corruption “có tác động” nếu số liệu không cho thấy thay đổi. Nếu kết quả khác kỳ vọng, mô tả giả thuyết và cách nhóm đã kiểm tra.

## 11. Vấn đề tích hợp quan trọng

Mô tả một vấn đề phát sinh khi ghép các module trong pipeline và cách nhóm xử lý:

- **Triệu chứng:** [Lỗi hoặc kết quả sai.]
- **Nguyên nhân:** [Root cause.]
- **Cách xử lý:** [Thay đổi đã thực hiện.]
- **Cách xác minh:** [Lệnh và artifact.]

## 12. Giới hạn và hướng cải thiện

| Giới hạn hiện tại | Ảnh hưởng   | Hướng cải thiện có thể kiểm chứng |
| --------------------- | -------------- | ----------------------------------------- |
| [Giới hạn]          | [Ảnh hưởng] | [Đề xuất]                              |
| [Giới hạn]          | [Ảnh hưởng] | [Đề xuất]                              |

## 13. Checklist trước khi nộp

- [ ] Thông tin nhóm và repository chính xác.
- [ ] Phân công khớp với module, artifact và kết quả thực tế.
- [ ] Lệnh tái hiện đã được chạy lại trên phiên bản dùng để nộp.
- [ ] Baseline, corrupted và repaired dùng cùng evaluation set.
- [ ] Bảng metrics khớp với các file trong `data/results/`.
- [ ] Quality/freshness conclusions khớp với `data/quality/`.
- [ ] Các đường dẫn báo cáo và artifact truy cập được.
- [ ] Mỗi thành viên đã hoàn thành báo cáo vai trò riêng.
- [ ] Không có `.env`, API key, token hoặc secret trong source, report, log hay ảnh.
