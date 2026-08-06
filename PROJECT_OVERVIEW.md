# Day 10 — Data Pipeline & Data Observability: Tổng quan project

## 1. Mục tiêu

Xây một hệ thống hỏi-đáp AI (RAG — Retrieval-Augmented Generation) trên các bài báo khoa học, sau đó **cố tình làm hỏng dữ liệu** để chứng minh bằng số liệu thật:

> Dữ liệu đầu vào tệ → AI trả lời sai, và nếu sửa lại dữ liệu đúng cách (từ nguồn gốc) → AI hồi phục lại đúng như ban đầu.

Đây là bài học về **Data Observability**: không chỉ xây pipeline chạy được, mà phải có khả năng *quan sát, phát hiện và chứng minh* ảnh hưởng của chất lượng dữ liệu lên hệ thống AI ở cuối chuỗi.

## 2. Kiến trúc pipeline

```text
Crossref API
    │
    ▼
[1] RAW           src/ingestion/crossref.py        data/raw/
    │               (fetch + parse + lưu response gốc để truy vết)
    ▼
[2] CLEAN         src/ingestion/cleaning.py         data/clean/papers_clean.*
    │               (dedupe, parse ngày, chuẩn hoá author/category,
    │                tạo text_for_embedding + age_days)
    ▼
[3] INDEX         src/retrieval/index.py            data/embeddings/ + data/chroma/
    │               (MiniLM embedding → ChromaDB collection "papers-baseline")
    ▼
[4] AGENT         src/retrieval/agent.py            —
    │               (LLM + tool lookup_paper/semantic_search, trả lời kèm nguồn)
    ▼
[5] EVALUATE      src/evaluation/{testset,metrics}.py   data/eval/ + data/results/
    │               (test set cố định → answers + metrics)
    ▼
[6] OBSERVE       src/observability/{quality,reporting}.py  data/quality/ + data/reports/
                    (data quality checks, freshness, report)
```

Sau khi có **baseline** (nhánh trên), pipeline rẽ thêm 2 nhánh chạy song song để so sánh (`src/pipelines/corruption_flow.py`):

```text
                     ┌─▶ CORRUPT (src/ingestion/corruption.py)
                     │      → làm hỏng bản clean có chủ đích, có log
                     │      → build index "papers-corrupted" → agent → evaluate
baseline clean ──────┤
                     └─▶ REPAIR
                            → dựng lại clean **từ RAW gốc** (không sửa tay bản hỏng)
                            → build index "papers-repaired" → agent → evaluate

                     ⇒ So sánh 3 bộ metric: baseline vs corrupted vs repaired
                       → data/reports/corruption_report.md
```

## 3. Đầu vào — Đầu ra

| | Chi tiết |
|---|---|
| **Đầu vào** | Crossref REST API — query `"agentic retrieval augmented generation large language model"`, lọc theo ngày xuất bản + có abstract, lấy tối đa **24 bài báo** (`src/core/config.py`) |
| **Đầu ra trung gian** | 3 bộ dữ liệu sạch song song: **baseline** (24 dòng), **corrupted** (25 dòng, 11 loại lỗi), **repaired** (24 dòng) — mỗi bộ có index vector riêng, collection Chroma riêng |
| **Đầu ra cuối** | `data/reports/corruption_report.md` — báo cáo so sánh 3 trạng thái bằng số liệu thật, kèm ví dụ 1 câu hỏi bị trả lời sai do dữ liệu hỏng và phục hồi sau khi sửa |

## 4. Các chỉ số đánh giá

**a) AI trả lời đúng/sai** (`src/evaluation/metrics.py`)
| Chỉ số | Ý nghĩa |
|---|---|
| Retrieval Hit Rate | Tìm đúng tài liệu nguồn mong đợi không |
| Mean Token F1 | Câu trả lời trùng bao nhiêu từ với đáp án chuẩn |
| Judge Accuracy / Score | LLM khác chấm đúng/sai và điểm 1–5 |

**b) Chất lượng dữ liệu** (`src/observability/quality.py`): đủ số dòng, ID không rỗng/không trùng, tóm tắt đủ dài, dữ liệu còn "tươi" (freshness).

**c) So sánh 3 trạng thái**: baseline vs corrupted vs repaired — chứng minh nhân quả bằng số liệu, không chỉ khẳng định suông.

## 5. Kết quả thực tế đo được (lần chạy gần nhất)

| Metric | Baseline | Corrupted | Repaired |
|---|---:|---:|---:|
| Retrieval Hit Rate | 100.0% | **66.7%** | 100.0% |
| Mean Token F1 | 1.0000 | **0.3495** | 1.0000 |
| Judge Accuracy | 100.0% | **33.3%** | 100.0% |
| Mean Judge Score (1–5) | 5.00 | **2.67** | 5.00 |
| Tổng số dòng dữ liệu | 24 | 25 | 24 |
| Quality Status | PASS | FAIL | PASS |
| Freshness Status | FRESH | STALE | FRESH |

**11 kịch bản corruption** được implement trong `corrupt_clean_dataframe()` (`src/ingestion/corruption.py`), tất cả ở tầng **clean data**:

| # | Loại | Cơ chế |
|---|---|---|
| 1 | `drop_latest` | Xóa 10% paper mới nhất (ít nhất 1 dòng, luôn chừa lại ít nhất 1 dòng). |
| 2 | `blank_summary` | Xóa toàn bộ `summary` của một paper. |
| 3 | `inject_summary_noise` | Chèn hậu tố `[CORRUPTED-NOISE]` vào summary. |
| 4 | `truncate_title` | Cắt `title` còn tối đa 24 ký tự. |
| 5 | `make_published_stale` | Lùi `published` 730 ngày và tăng `age_days` tương ứng, tạo paper stale. |
| 6 | `swap_categories` | Hoán đổi `categories` và `primary_category` giữa hai paper. Schema vẫn hợp lệ nhưng nhãn phân loại sai. |
| 7 | `swap_authors` | Hoán đổi danh sách `authors` giữa hai paper, mô phỏng lỗi attribution/merge. |
| 8 | `html_markup_leakage` | Chèn HTML thô (`<i>...</i>`) vào summary, làm nhiễu dữ liệu embedding mà không phá schema. |
| 9 | `make_published_future` | Đẩy ngày xuất bản lên tương lai 365 ngày và giảm `age_days`, tạo tuổi dữ liệu âm. |
| 10 | `duplicate_row` | Thêm lại một dòng y hệt, tạo trùng `paper_id` và nội dung. |
| 11 | `semantic_near_duplicate` | Tạo một bản sao gần trùng về ngữ nghĩa, `paper_id` mới với hậu tố `#near-duplicate`, title/summary chỉ thay đổi nhẹ. |

Các corruption phụ thuộc vào số dòng còn lại **sau** `drop_latest`; corpus nhỏ sẽ chỉ kích hoạt những loại đủ điều kiện theo index dòng (corpus 24 dòng hiện tại kích hoạt được đủ cả 11). Mỗi thao tác được ghi vào `data/results/corruption_log.json` (kèm `record_ids`, `parameters`, `before_count`/`after_count`) và tự-verify lại (`_verify_corruption`) — nên report chỉ mô tả đúng những corruption **thực sự đã được inject**, không liệt kê khống.

**Ví dụ cụ thể** (câu hỏi `q_001` — tóm tắt paper "Hi-RAG"): baseline trả lời đúng 5/5 điểm → corrupted tìm nhầm sang paper "Deep RAG" không liên quan, chỉ 2/5 điểm (vì paper đúng đã bị `drop_latest` xoá) → repaired trả lời đúng lại 5/5, y hệt baseline.

**Kết luận rút ra**: dữ liệu hỏng làm agent giảm ~33–67% hiệu năng tuỳ chỉ số; repair từ raw gốc phục hồi **100%** về đúng baseline — chứng minh pipeline có khả năng tự chữa lành nếu dữ liệu gốc còn nguyên vẹn.

## 6. Cấu trúc thư mục chính

```
src/
  core/          settings, config dùng chung (Đạt — Role 1)
  pipelines/     orchestrate phase1.py (baseline) + corruption_flow.py (Đạt — Role 1)
  ingestion/     crossref.py (Mạnh — Role 2) · cleaning.py, corruption.py (Mai Anh — Role 3)
  retrieval/     index.py, agent.py, workflow.py, reranker.py (Trà — Role 4)
  evaluation/    testset.py, metrics.py (Anh Tuấn — Role 5)
  observability/ quality.py, reporting.py (Anh Tuấn — Role 5)
backend/ + frontend/   demo chat UI (Next.js + FastAPI) dùng lại pipeline trên để hỏi-đáp trực quan
data/
  raw/, clean/, embeddings/, chroma/   3 phiên bản: gốc / corrupted / repaired
  eval/          test set cố định (không đổi khi so sánh 3 trạng thái)
  results/       answers + metrics của cả 3 trạng thái
  quality/, reports/   quality/freshness report + corruption_report.md
```

## 7. Phân công 5 role

| Role | Người phụ trách | Phạm vi |
|---|---|---|
| 1 — Lead | Đạt | Điều phối, `src/core/` · `src/pipelines/`, chạy end-to-end, đối chiếu report với artifact thật |
| 2 — Ingest | Mạnh | Lấy dữ liệu Crossref, giữ lineage raw → clean |
| 3 — Clean | Mai Anh | Làm sạch schema + thiết kế 11 loại corruption có log/before-after |
| 4 — RAG | Trà | Embedding, ChromaDB, agent, audit baseline không bị đè khi build corrupted |
| 5 — Eval/Observe | Anh Tuấn | Test set, metrics, quality/freshness, viết report so sánh |

## 8. Nguyên tắc xuyên suốt

- Chỉ corrupt sau khi baseline đã có đủ artifact.
- Dùng chung 1 test set cố định khi so sánh cả 3 trạng thái (không đổi ground truth giữa chừng).
- Baseline/corrupted/repaired dùng path và Chroma collection riêng — không ghi đè lẫn nhau.
- Repair bằng cách chạy lại từ raw gốc, không sửa tay số liệu.
- Report phải trỏ tới artifact thật, không hard-code hay tô vẽ số liệu.
