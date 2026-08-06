# Báo cáo cá nhân — Day 10: Data Pipeline & Data Observability

## 1. Thông tin cá nhân

| Thông tin | Nội dung |
|---|---|
| Họ và tên | Nguyễn Hương Trà |
| MSSV | Chưa cung cấp |
| Khóa/Lớp | K4 |
| Tên nhóm | Tên Nhóm Là Gì Nhỉ |
| Vai trò chính | RAG & agent owner |
| Repository | `https://github.com/Dyo31122005/K4_Day10_TenNhomLaGiNhi` |
| Nhánh thực hiện | `tea` |
| Ngày hoàn thành | 2026-08-06 |

## 2. Vai trò và phạm vi công việc

### Phần việc sở hữu

| Module/deliverable | File/hàm phụ trách | Input nhận vào | Output bàn giao | Trạng thái |
|---|---|---|---|---|
| Embedding backend | `src/retrieval/embeddings.py` | `text_for_embedding`, query text | Vector MiniLM đã L2-normalize | Hoàn thành |
| Vector index | `src/retrieval/index.py` | Clean DataFrame và `Settings` | Chroma collections, manifest, `SearchResult` | Hoàn thành |
| Reranking | `src/retrieval/reranker.py` | Query và candidates từ Chroma | CrossEncoder relevance scores, top-k mới | Hoàn thành |
| Search và lookup | `LocalEmbeddingIndex.search()`, `lookup()` | Query tự do hoặc paper ID/title chính xác | Semantic results hoặc một exact document | Hoàn thành |
| Agent tools và grounding | `src/retrieval/agent.py` | Index và câu hỏi factual | Agent answer, tool trace, audit result | Hoàn thành |
| Multi-provider LLM | `src/retrieval/llm.py` | Provider/model trong `Settings` | LangChain chat model tương ứng | Hoàn thành |
| Build/verification workflow | `src/retrieval/workflow.py`, `cli.py` | Baseline/corrupted/repaired clean artifacts | Ba collection, build logs, smoke results và report | Hoàn thành |
| Tài liệu kỹ thuật | `src/retrieval/README.md` | Implementation retrieval thực tế | Mô tả flow, thuật toán, lệnh chạy và giới hạn | Hoàn thành |

### Việc hỗ trợ ngoài phạm vi chính

| Hoạt động | Thành viên/module được hỗ trợ | Kết quả |
|---|---|---|
| Tích hợp main vào nhánh `tea` | Nhóm tích hợp | Rebase lên main mới, xử lý add/add conflict ở SQLite/manifests và cập nhật `origin/tea` an toàn bằng `--force-with-lease`. |
| Kiểm tra popup nguồn trên corrupted data | Backend/frontend | Phát hiện Pandas `NaN` bị ép thành chuỗi `"nan"`; sửa retrieval metadata thành chuỗi rỗng và xác minh không còn marker giả. |
| Chuẩn bị bằng chứng CP5–CP6 | Evaluation/observability và nhóm báo cáo | Sinh build logs, agent audit và báo cáo so sánh collection từ workflow chuyên dụng. |

## 3. Kết quả theo vai trò

| Nhiệm vụ đã thực hiện | File/hàm/artifact liên quan | Kết quả bàn giao | Cách xác minh |
|---|---|---|---|
| Build MiniLM + Chroma baseline | `LocalEmbeddingIndex.build()`; `papers_embeddings.json` | `papers-baseline` với 24 documents | Build log: clean/manifest/Chroma đều 24, verification pass |
| Thêm CrossEncoder reranker | `reranker.py`; `index.search()` | Two-stage retrieval: HNSW candidates → rerank → top-k | So sánh `rerank=True` và `rerank=False` bằng test giả lập |
| Semantic search kiểm chứng | `run_smoke_check()` | Hi-RAG đứng rank 1 ở baseline | `papers_embeddings_build_log.json` |
| Exact lookup kiểm chứng | `lookup()` | DOI `10.1111/exsy.70341` trả đúng paper ở baseline/repaired | Build logs và agent audit |
| Tách ba trạng thái | `build_verify_all_indexes()` | `papers-baseline`, `papers-corrupted`, `papers-repaired` độc lập | Chroma counts và manifest verification |
| Chứng minh baseline không bị mutate | `collection_signature()` | Count và SHA-256 baseline không đổi sau build corrupted | `retrieval_collections.md` ghi `True` |
| Agent grounding | `run_agent_question_audited()`, `validate_agent_audit()` | Agent baseline/repaired đều gọi `lookup_paper`, nhận đúng collection và paper ID | `data/results/retrieval_agent_audit.json` |
| Sửa NaN metadata | `_clean_scalar_text()` | Missing value trong CSV trở thành `""`, không thành `"nan"` | Targeted test trên blank-summary corrupted records |

Output tiêu biểu của phần việc là bộ ba collection và audit trail. Với query title Hi-RAG, baseline trả `10.1111/exsy.70341` ở rank 1; corrupted không còn paper này nên search chuyển sang paper Deep RAG và exact lookup trả `None`; repaired phục hồi lại đúng rank 1 và exact lookup. Đây là bằng chứng trực tiếp rằng thay đổi dữ liệu tác động đến retrieval, không chỉ là thay đổi một quality flag bên ngoài hệ thống RAG.

## 4. Giải thích phần kỹ thuật đã thực hiện

### Vấn đề cần giải quyết

Phần retrieval phải biến clean paper records thành một index chạy local, cho phép tìm theo ý nghĩa và tra cứu chính xác, đồng thời cung cấp nguồn có thể audit cho agent. Index của baseline, corrupted và repaired phải tách biệt để việc rebuild một trạng thái không làm biến đổi trạng thái khác. Kết quả cần tái lập bằng manifest/build log thay vì chỉ dựa vào output terminal.

### Cách triển khai

1. **Data contract:** kiểm tra các cột `paper_id`, `title`, `text_for_embedding`, `published`, `authors_joined`, `categories_joined`, `summary`. Baseline/repaired dùng strict validation; corrupted cho phép lỗi nội dung có chủ đích nhưng vẫn cần schema và ID/title tối thiểu.
2. **Embedding:** `sentence-transformers/all-MiniLM-L6-v2` encode document và query thành vector 384 chiều. `normalize_embeddings=True` chuẩn hóa L2 để cosine similarity ổn định.
3. **Candidate retrieval:** ChromaDB `PersistentClient` lưu vector trong HNSW collection với `space="cosine"`. Search lấy tối đa `top_k × 4` candidates.
4. **Reranking:** `cross-encoder/ms-marco-MiniLM-L-6-v2` chấm từng cặp `(query, document)`. Candidates được sort theo raw relevance logit; sigmoid logit được dùng làm display score.
5. **Exact lookup:** khi load index, tạo dictionary theo lowercase `paper_id` và title. Lookup có độ phức tạp trung bình O(1), không cần embedding.
6. **Agent:** expose hai tools `semantic_search_papers` và `lookup_paper`. System prompt buộc agent gọi tool trước câu hỏi factual, chỉ dựa vào tool output và cite `paper_id`.
7. **Audit:** lưu tool names, raw tool outputs, collection marker và cờ `used_retrieval_tool`. Workflow kiểm tra row count, IDs, SHA-256 document content, model names, collection count và baseline immutability.

### Input, output và contract

| Thành phần | Mô tả |
|---|---|
| Input | Clean CSV/JSON có stable `paper_id`, title, summary, metadata và `text_for_embedding` |
| Output | Chroma collection, embedding manifest, `SearchResult`, build log, smoke result và agent audit |
| Module phụ thuộc | `core.config`, `ingestion.cleaning`, Sentence Transformers, ChromaDB, LangChain |
| Module sử dụng output | `retrieval.qa`, `evaluation.metrics`, pipeline, FastAPI backend và frontend source popup |
| Điều kiện lỗi cần xử lý | Thiếu artifact, schema thiếu/rỗng, duplicate ở strict data, missing embedding weights, provider credential lỗi, collection/manifest lệch count, Pandas NaN và branch artifact conflict |

### Cách xác minh

```bash
PYTHONPATH=src .venv/bin/python -m retrieval.cli --variant all --agent-smoke
```

- **Kết quả mong đợi:** ba collection build độc lập; mọi verification pass; cùng baseline query thay đổi ở corrupted và phục hồi ở repaired; baseline signature không đổi; agent gọi retrieval tool từ đúng collection.
- **Kết quả thực tế:** baseline 24/24/24 pass, corrupted build-log ở lần audit retrieval là 23/23/23 pass, repaired 24/24/24 pass; baseline immutable; agent baseline/repaired đều gọi `lookup_paper` và trả đúng DOI. Pipeline corruption mới nhất sau đó mở rộng corrupted dataset thành 25 rows và evaluation artifacts đã được chạy lại ở mốc này.
- **Artifact/log:** `data/embeddings/*_build_log.json`, `data/results/retrieval_agent_audit.json`, `data/reports/retrieval_collections.md`.

## 5. Một quyết định kỹ thuật quan trọng

- **Bối cảnh:** Chroma cosine search nhanh nhưng bi-encoder encode query/document độc lập nên đôi khi thứ tự top-k chưa phản ánh tương tác token chi tiết.
- **Các phương án đã cân nhắc:** chỉ dùng MiniLM cosine; dùng LLM để rerank; dùng Sentence Transformers CrossEncoder làm tầng hai.
- **Phương án đã chọn:** Chroma lấy candidate set, sau đó `cross-encoder/ms-marco-MiniLM-L-6-v2` rerank.
- **Lý do:** vector search giữ latency thấp và scale tốt; CrossEncoder chỉ chạy trên tối đa `top_k × 4` documents nên chi phí có giới hạn nhưng tăng độ chính xác ranking. LLM reranking phức tạp hơn, tốn API cost và khó tái lập.
- **Bằng chứng quyết định phù hợp:** code giữ cả `vector_score` và `rerank_score`; test cho thấy reranker có thể đổi thứ tự candidate, còn `rerank=False` vẫn cung cấp vector-only fallback. Smoke query Hi-RAG đạt rank 1 với rerank display score xấp xỉ 0.999965.

## 6. Một lỗi hoặc blocker đã xử lý

- **Triệu chứng/lỗi nguyên văn:** metadata của paper có blank summary hiển thị `"nan"` trong nguồn kiểm chứng của corrupted dataset.
- **Lệnh hoặc bước tái hiện:** đọc `papers_clean_corrupted.csv` bằng Pandas, chạy `_build_documents(..., strict_validation=False)`, rồi kiểm tra `document["metadata"]["summary"]`.
- **Nguyên nhân gốc:** `pd.read_csv()` biểu diễn ô rỗng bằng `NaN`; code cũ gọi `str(row[field]).strip()`, biến missing value thành chuỗi thật `"nan"` trước khi ghi manifest/Chroma.
- **Cách xử lý:** thêm `_clean_scalar_text()` để đổi `None` hoặc `pd.isna(value)` thành chuỗi rỗng; áp dụng thống nhất cho content, ID/title và metadata.
- **Cách xác minh sau khi sửa:** test tất cả blank-summary IDs trong corrupted DataFrame đều có metadata summary `""`; đếm toàn bộ metadata value bằng `"nan"` cho kết quả 0; `compileall` và full retrieval workflow đều pass.
- **Điều học được:** schema validation chỉ kiểm tra cột tồn tại là chưa đủ; ranh giới CSV → Pandas → JSON/vector store cần chuẩn hóa missing-value semantics rõ ràng.

Ngoài ra, khi rebase `tea` lên main, SQLite và ba manifests phát sinh add/add conflict. Tôi không ghép binary SQLite; thay vào đó bỏ generated-artifact commit cũ, giữ artifacts mới từ main, tái chạy audit và chỉ force-push bằng `--force-with-lease` sau khi kiểm tra lịch sử.

## 7. Hiểu biết về luồng end-to-end

1. Crossref response được lưu raw trước khi parse thành `PaperRecord`. Cleaning chuẩn hóa title, abstract, tác giả, category và ngày; tạo stable `paper_id`, `age_days` và `text_for_embedding`. Retrieval validate DataFrame, encode text bằng MiniLM, nạp vector/metadata vào collection Chroma và ghi manifest.
2. Evaluation set chứa question, ground truth answer và `ground_truth_doc_ids` lấy từ clean `paper_id`. Retrieval hit khi expected ID xuất hiện trong top-k; answer quality được đo bằng token F1 và LLM judge. Vì ID xuất phát từ clean artifact nên có thể truy ngược kết quả hit/miss.
3. Quality checks đo tính đầy đủ, unique, validity và schema/content tại một snapshot. Freshness monitoring tập trung vào thời gian xuất bản/`age_days`, số stale rows và ngưỡng 180 ngày. Một dataset có thể đúng schema nhưng stale, hoặc fresh nhưng có duplicate/blank content.
4. Cùng test set phải được đóng băng cho cả ba trạng thái để biến độc lập là chất lượng data/index. Nếu đổi câu hỏi sau corruption, metric không còn so sánh công bằng và có thể che mất paper đã bị drop.
5. Repair thành công khi clean/repaired artifact trở lại schema hợp lệ, quality PASS, freshness FRESH, đúng document IDs xuất hiện lại trong collection, và retrieval/answer metrics phục hồi về baseline. Ở lần chạy hiện tại, repaired đạt lại hit rate 1.0, token F1 1.0, judge accuracy 1.0 và judge score 5.0.

## 8. Phân tích kết quả

### Metrics chính

| Metric/signal | Baseline | Corrupted | Repaired | Nhận xét của cá nhân |
|---|---:|---:|---:|---|
| `retrieval_hit_rate` | 1.0000 | 0.6667 | 1.0000 | Corruption làm mất 1/3 retrieval hits; repair phục hồi toàn bộ. |
| `mean_token_f1` | 1.0000 | 0.3495 | 1.0000 | Nội dung sai/rỗng và attribution swap ảnh hưởng mạnh hơn chỉ ranking. |
| `judge_accuracy` | 1.0000 | 0.3333 | 1.0000 | Chỉ khoảng 1/3 corrupted answers được judge chấp nhận. |
| `mean_judge_score` | 5.00 | 2.50 | 5.00 | Corrupted giảm trung bình 2.5 điểm trên thang 5. |
| Quality checks | PASS (24 rows) | FAIL (25 rows) | PASS (24 rows) | Corrupted có duplicate, 2 summary ngắn và 2 stale rows. |
| Freshness status | FRESH | STALE | FRESH | Corrupted có 2 stale rows; repair đưa về 0. |

### Kết luận từ số liệu

1. Drop paper Hi-RAG, blank/noisy summary, metadata swap và duplicate → quality chuyển PASS thành FAIL, freshness chuyển FRESH thành STALE → hit rate giảm từ 1.0 xuống 0.6667, token F1 xuống 0.3495 và judge accuracy xuống 0.3333.
2. Rebuild clean data từ raw snapshot tin cậy → duplicate/blank/stale signals trở về 0 và quality/freshness trở lại PASS/FRESH → cả bốn agent metrics phục hồi đúng mức baseline.

Corruption ảnh hưởng rõ nhất tới ví dụ kiểm chứng là `drop_latest` loại `10.1111/exsy.70341`. Ở baseline, Hi-RAG đứng rank 1 và exact lookup thành công; ở corrupted, Deep RAG đứng đầu và lookup Hi-RAG thất bại; repaired khôi phục lại đúng document. Với answer metrics tổng thể, blank/noisy summary và author/category swap tiếp tục làm giảm F1/judge ngay cả khi retrieval vẫn tìm thấy một paper liên quan.

Điểm khác kỳ vọng ban đầu là corrupted row count mới nhất tăng từ 24 lên 25 dù có drop record. Nguyên nhân là flow mới vừa thêm duplicate row vừa thêm semantic near-duplicate, nên tổng delta là +1. Corruption log xác nhận từng before/after count và `verification.is_consistent=true`; do đó row count đơn lẻ không đủ kết luận chất lượng, cần kết hợp unique/content/freshness checks.

## 9. Điều học được và hướng cải thiện

### Ba điều quan trọng nhất

1. Artifact lineage quan trọng ngang code: clean rows, manifest documents và Chroma count phải khớp, model names và content digest phải audit được.
2. Data quality lỗi có thể không làm pipeline crash nhưng vẫn làm retrieval/agent trả lời sai; cần frozen test set và before/corrupted/repaired evidence.
3. Agent grounding không thể chỉ dựa vào system prompt. Cần lưu và kiểm tra tool messages, raw tool output, collection marker và citation ID.

### Nếu có thêm thời gian

Tôi sẽ thêm evaluation riêng cho lợi ích của reranker: chạy cùng frozen queries với `rerank=False` và `rerank=True`, đo hit rate/MRR/nDCG cùng latency p50/p95. Điều này giúp chứng minh CrossEncoder cải thiện ranking bao nhiêu thay vì chỉ xác nhận nó chạy đúng, đồng thời chọn `candidate_multiplier` theo số liệu thay vì cố định bằng 4.

## 10. Cam kết của thành viên

- [x] Nội dung báo cáo phản ánh đúng phần việc và mức hiểu của tôi.
- [x] Tôi có thể giải thích luồng end-to-end, không chỉ module mình phụ trách.
- [x] Mọi kết luận về kết quả đều có artifact hoặc metric để đối chiếu.
- [x] Tôi không ghi “đã chạy thành công” cho phần chưa được kiểm chứng.
- [x] Báo cáo không chứa `.env`, API key, token hoặc secret.
- [x] Báo cáo này không phải bản sao nguyên văn của báo cáo nhóm hoặc báo cáo thành viên khác.

**Họ và tên:** Nguyễn Hương Trà

**Ngày xác nhận:** 2026-08-06
