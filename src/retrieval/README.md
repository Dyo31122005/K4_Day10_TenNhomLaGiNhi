# Retrieval module

Module `src/retrieval` phụ trách biến dữ liệu paper đã làm sạch thành vector, lưu vector trong ChromaDB, truy xuất paper và cung cấp các retrieval tools cho agent.

## Thành phần

| File | Trách nhiệm |
|---|---|
| `embeddings.py` | Nạp Sentence Transformer và tạo embedding cho document/query. |
| `index.py` | Kiểm tra clean schema, build/load Chroma collection, semantic search và exact lookup. |
| `agent.py` | Tạo hai LangChain tools, tạo agent và audit việc agent sử dụng tool. |
| `llm.py` | Provider abstraction cho Gemini, OpenAI, Anthropic, OpenRouter, Ollama và custom OpenAI-compatible endpoint. |
| `qa.py` | Trả lời xác định từ retrieval result cho evaluation, không cần gọi LLM. |
| `workflow.py` | Build, smoke test, verify manifest và kiểm tra ba collection không mutate lẫn nhau. |
| `cli.py` | CLI để chạy workflow retrieval. |

## Luồng xử lý

```text
clean CSV/JSON
    │
    ├─ validate schema và chất lượng text
    │
    ├─ text_for_embedding
    │       │
    │       └─ all-MiniLM-L6-v2 → normalized dense vector
    │
    ├─ ChromaDB PersistentClient
    │       ├─ papers-baseline
    │       ├─ papers-corrupted
    │       └─ papers-repaired
    │
    ├─ embedding manifest + build log
    │
    └─ query
            ├─ semantic search → MiniLM → cosine/HNSW → top-k
            └─ exact lookup → normalized paper_id/title → dictionary lookup
                    │
                    └─ agent tools → grounded answer + tool audit
```

Ba collection dùng chung thư mục persistence `data/chroma`, nhưng có tên, manifest và build log riêng. Khi rebuild một variant, code chỉ xóa collection có đúng tên của variant đó.

| Variant | Clean input | Collection | Manifest |
|---|---|---|---|
| Baseline | `data/clean/papers_clean.csv` | `papers-baseline` | `data/embeddings/papers_embeddings.json` |
| Corrupted | `data/clean/papers_clean_corrupted.csv` | `papers-corrupted` | `data/embeddings/papers_embeddings_corrupted.json` |
| Repaired | `data/clean/papers_clean_repaired.csv` | `papers-repaired` | `data/embeddings/papers_embeddings_repaired.json` |

## Schema document

DataFrame đầu vào phải có các cột:

```text
paper_id, title, text_for_embedding, published,
authors_joined, categories_joined, summary
```

Mỗi row được chuyển thành một document:

```python
{
    "record_id": f"{paper_id}::{row_index}",
    "paper_id": paper_id,
    "title": title,
    "content": text_for_embedding,
    "metadata": {
        "paper_id": paper_id,
        "title": title,
        "published": published,
        "authors_joined": authors_joined,
        "categories_joined": categories_joined,
        "summary": summary,
        # abs_url và pdf_url là optional
    },
}
```

Baseline và repaired dùng strict validation: ID/title/content/summary không rỗng, `paper_id` unique, embedding text không trùng và chứa title lẫn summary. Corrupted chỉ kiểm tra schema cùng ID/title tối thiểu để dữ liệu lỗi có chủ đích vẫn được index và dùng để đo suy giảm retrieval.

## Embedding model

Model đang dùng là:

```text
sentence-transformers/all-MiniLM-L6-v2
```

Đây là bi-encoder Sentence Transformer: document và query được encode độc lập thành dense vector. Model trả vector 384 chiều. Code gọi `SentenceTransformer.encode(..., normalize_embeddings=True)`, vì vậy mỗi vector được chuẩn hóa L2:

```text
v_normalized = v / ||v||₂
```

Model được cache bằng `lru_cache`, tránh load lại weights khi nhiều index dùng cùng model trong một process.

### Vì sao dùng MiniLM?

- Nhẹ và phù hợp chạy local.
- Encode nhanh hơn các encoder lớn.
- Cùng model được dùng cho document và query nên hai loại vector nằm trong cùng semantic space.
- Phù hợp corpus nhỏ của bài lab và smoke test retrieval.

## ChromaDB và thuật toán tìm kiếm

Index dùng `chromadb.PersistentClient` và collection được cấu hình:

```python
configuration={"hnsw": {"space": "cosine"}}
```

Chroma dùng HNSW (Hierarchical Navigable Small World) để tìm approximate nearest neighbors. Thay vì so query tuần tự với toàn bộ vector, HNSW duyệt graph nhiều tầng để tìm nhanh các vector gần query.

Khoảng cách cosine được hiểu là:

```text
cosine_similarity(q, d) = (q · d) / (||q||₂ ||d||₂)
cosine_distance(q, d)   = 1 - cosine_similarity(q, d)
```

Do vector đã chuẩn hóa L2, cosine similarity tương đương dot product. Chroma trả `distance`; module đổi sang score dễ đọc:

```text
score = max(0, 1 - distance)
```

Kết quả được giữ theo thứ tự Chroma trả về, tức thứ tự cosine gần nhất. `top_k` mặc định lấy từ `Settings.top_k` và hiện là 4.

## Semantic search

Semantic search dùng khi người dùng mô tả chủ đề hoặc ý nghĩa nhưng không nhất thiết nhập đúng title/ID.

Thuật toán:

1. Chuẩn hóa query thành embedding bằng MiniLM.
2. Gửi query vector tới Chroma `collection.query()`.
3. HNSW tìm `top_k` vector có cosine distance nhỏ nhất.
4. Chuyển distance thành score và trả `paper_id`, title, content, metadata.

Ví dụ chạy sau khi đã build baseline:

```python
from core.config import load_settings
from retrieval.index import LocalEmbeddingIndex

settings = load_settings()
index = LocalEmbeddingIndex.load(settings, settings.paths.embeddings_json)

results = index.search(
    "agentic retrieval augmented generation for scholarly papers",
    top_k=4,
)
for result in results:
    print(result.paper_id, result.title, round(result.score, 4))
```

Ví dụ dạng kết quả trình bày cho team:

```text
Query: agentic retrieval augmented generation for scholarly papers

1. <paper_id từ clean data> | <title> | score=<cosine score>
2. <paper_id từ clean data> | <title> | score=<cosine score>
```

Các giá trị thực không được hard-code trong README. Sau khi chạy workflow, query và kết quả thật được ghi vào `data/reports/retrieval_collections.md` và build log tương ứng.

## Exact lookup

Exact lookup dùng khi đã biết chính xác `paper_id` hoặc title. Khi load index, module tạo hai dictionary:

```python
documents_by_paper_id[paper_id.lower()] = document
documents_by_title[title.lower()] = document
```

Input được `strip().lower()` rồi tra dictionary. Đây là phép lookup trung bình O(1), không tạo embedding và không phụ thuộc cosine similarity.

```python
record = index.lookup("<paper_id lấy từ clean data>")
if record:
    print(record["paper_id"])
    print(record["title"])
    print(record["content"])
```

Ví dụ trình bày:

```text
Lookup input: <paper_id chính xác>
Matched paper_id: <cùng paper_id>
Matched title: <title trong clean data>
```

Khác biệt quan trọng:

| Semantic search | Exact lookup |
|---|---|
| Tìm theo ý nghĩa. | Tìm theo khóa chính xác. |
| Dùng MiniLM và Chroma HNSW. | Dùng dictionary trong bộ nhớ. |
| Trả top-k cùng score. | Trả một document hoặc `None`. |
| Có thể có false positive/false negative. | Không có approximate matching. |

## Reranking

Hiện module **không có reranker tầng hai**.

Pipeline hiện tại chỉ có một ranking stage:

```text
MiniLM query embedding → Chroma cosine/HNSW → top-k
```

Không có CrossEncoder, LLM reranker, BM25 hybrid score hay reciprocal-rank fusion. Vì vậy không nên trình bày score hiện tại là “rerank score”; nó chỉ là cosine score được chuyển từ Chroma distance.

Nếu bổ sung reranking sau này, flow phù hợp là lấy top 10–20 candidates từ Chroma, dùng CrossEncoder chấm điểm từng cặp `(query, document)`, sort lại và chỉ trả top 4. Bước này có thể tăng độ chính xác nhưng làm tăng latency và hiện chưa nằm trong implementation.

## Agent và grounding

Agent có hai tools:

- `semantic_search_papers(query, top_k)` cho truy vấn theo ngữ nghĩa.
- `lookup_paper(paper_id_or_title)` cho tra cứu chính xác.

System prompt yêu cầu agent phải gọi một retrieval tool trước mọi câu hỏi factual, chỉ dùng nội dung tool trả về, cite `paper_id` và từ chối khi corpus không đủ bằng chứng.

`run_agent_question_audited()` lưu:

- câu trả lời cuối;
- tên tools đã gọi;
- raw tool outputs;
- collection được sử dụng;
- cờ `used_retrieval_tool`.

`validate_agent_audit()` fail nếu agent không gọi retrieval tool hoặc tool output không mang đúng marker collection. Kiểm tra này chứng minh đường đi của dữ kiện; nó không thay thế một semantic factuality evaluator cho từng câu trong answer.

## Build, smoke test và verification

Build toàn bộ collection:

```bash
.venv/bin/python -m retrieval.cli --variant all
```

Build và audit agent baseline/repaired:

```bash
.venv/bin/python -m retrieval.cli --variant all --agent-smoke
```

Build riêng baseline:

```bash
.venv/bin/python -m retrieval.cli --variant baseline
```

Workflow thực hiện các kiểm tra sau:

1. Clean row count bằng số document trong manifest và Chroma.
2. Thứ tự/danh sách `paper_id` của clean data và manifest khớp nhau.
3. SHA-256 của title/content khớp nhau.
4. Embedding model trong manifest đúng config.
5. Semantic search tìm thấy expected paper trong top-k.
6. Exact lookup trả đúng expected `paper_id`.
7. Sau khi build corrupted, chữ ký baseline vẫn không đổi.
8. Cùng baseline query được chạy trên baseline, corrupted và repaired để quan sát thay đổi ranking.

Các artifact được sinh tự động:

```text
data/embeddings/papers_embeddings_build_log.json
data/embeddings/papers_embeddings_corrupted_build_log.json
data/embeddings/papers_embeddings_repaired_build_log.json
data/results/retrieval_agent_audit.json
data/reports/retrieval_collections.md
```

## Trạng thái dữ liệu đầu vào

Workflow chỉ build khi clean artifact tương ứng tồn tại. Nếu thiếu clean data, CLI dừng bằng `FileNotFoundError`; module không tự tạo paper giả. MiniLM cũng cần tải model ở lần chạy đầu tiên nếu weights chưa có trong local cache.
