"use client";

import React, { useState } from "react";
import {
  Layers,
  Globe,
  Database,
  Filter,
  Cpu,
  BarChart,
  Code2,
  CheckCircle,
  FileJson,
  ArrowRight,
} from "lucide-react";

export default function PipelineArchitecture() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: "ingest",
      num: "01",
      title: "Crossref Ingestion & Immutable Raw Store",
      subtitle: "Thu thập & Lưu trữ dữ liệu thô",
      author: "Nguyễn Hùng Mạnh",
      file: "src/ingestion/crossref.py",
      icon: Globe,
      color: "from-blue-600 to-indigo-700",
      description:
        "Gọi Crossref REST API (có retry/backoff cho 429/503) để lấy 24 bài báo khoa học. Response thô được lưu bất biến vào data/raw/crossref_response.json, records đã parse lưu vào crossref_records.json để phục vụ audit trail và repair khi gặp sự cố.",
      codeSnippet: `def fetch_source_records(settings: Settings) -> list[PaperRecord]:
    """Call the Crossref API with retry/backoff and persist raw artifacts."""
    params = {"query": settings.source_query, "filter": settings.source_filter,
              "rows": settings.max_results}
    response = requests.get(CROSSREF_API_URL, params=params, timeout=30)
    payload = response.json()
    write_json(settings.paths.raw_api_response, payload)   # bằng chứng thô

    records = parse_crossref_payload(payload)
    write_json(settings.paths.raw_records_json,
               [asdict(r) for r in records])
    return records`,
      metrics: [
        { label: "Số lượng paper", val: "24 bài báo" },
        { label: "Nguồn dữ liệu", val: "Crossref REST API" },
        { label: "Định dạng lưu", val: "Immutable JSON" },
      ],
    },
    {
      id: "clean",
      num: "02",
      title: "Data Cleansing & Schema Normalization",
      subtitle: "Bóc tách XML JATS, làm sạch Abstract & DOI",
      author: "Trần Hoàng Mai Anh",
      file: "src/ingestion/cleaning.py",
      icon: Filter,
      color: "from-sky-600 to-blue-700",
      description:
        "Loại record thiếu title/summary/ngày hợp lệ, strip tag JATS XML khỏi title/summary, dedupe theo paper_id, tính age_days và ghép title+summary thành text_for_embedding — output ra papers_clean.csv/json.",
      codeSnippet: `def build_clean_dataframe(records: list[PaperRecord],
                           run_date: datetime) -> pd.DataFrame:
    for record in records:
        title = _strip_tags(record.title)
        summary = _strip_tags(record.summary)
        if not title or len(summary) < _MIN_SUMMARY_CHARS:
            continue  # loại record không hợp lệ, có log

        text_for_embedding = (
            f"Title: {title} | Authors: {authors_joined} | "
            f"Summary: {summary}"
        )
    # ... dedupe theo paper_id, sort theo published`,
      metrics: [
        { label: "Input → Output", val: "24 → 24 rows" },
        { label: "Xử lý XML", val: "Strip JATS tags" },
        { label: "File đầu ra", val: "papers_clean.csv" },
      ],
    },
    {
      id: "vector",
      num: "03",
      title: "ChromaDB Vector Embeddings & Indexing",
      subtitle: "Sinh vector 384 chiều & chỉ mục ChromaDB",
      author: "Nguyễn Hương Trà",
      file: "src/retrieval/index.py",
      icon: Cpu,
      color: "from-teal-600 to-cyan-700",
      description:
        "Dùng sentence-transformers/all-MiniLM-L6-v2 sinh vector 384 chiều từ text_for_embedding, lưu vào 3 collection ChromaDB riêng biệt (papers-baseline, papers-corrupted, papers-repaired), sau đó rerank kết quả bằng cross-encoder ms-marco-MiniLM-L-6-v2.",
      codeSnippet: `embedding_model = MiniLMEmbeddings(settings.embedding_model)
client = chromadb.PersistentClient(path=str(persist_path))
collection = client.create_collection(
    name=collection_name,
    configuration={"hnsw": {"space": "cosine"}},
)
embeddings = embedding_model.embed_documents(
    [doc["content"] for doc in documents]
)
collection.add(ids=[...], embeddings=embeddings,
                documents=[...], metadatas=[...])`,
      metrics: [
        { label: "Embedding Dim", val: "384 (MiniLM-L6-v2)" },
        { label: "Vector DB", val: "ChromaDB Persistent" },
        { label: "Similarity Metric", val: "Cosine Distance" },
      ],
    },
    {
      id: "corrupt",
      num: "04",
      title: "Deliberate Corruption Injection Engine",
      subtitle: "Gây nhiễu và phá hủy có chủ đích",
      author: "Trần Hoàng Mai Anh",
      file: "src/ingestion/corruption.py",
      icon: Database,
      color: "from-rose-600 to-red-700",
      description:
        "Áp dụng 11 phép biến đổi có kiểm soát (drop_latest, blank_summary, inject_summary_noise, truncate_title, make_published_stale, swap_categories, swap_authors, html_markup_leakage, make_published_future, duplicate_row, semantic_near_duplicate) — mỗi phép đều ghi log record_id/before-after count vào corruption_log.json.",
      codeSnippet: `def corrupt_clean_dataframe(
    df: pd.DataFrame, rng: random.Random,
) -> tuple[pd.DataFrame, list[dict]]:
    operations_log = []
    df = _operation(df, "drop_latest", ..., operations_log)
    df = _operation(df, "blank_summary", ..., operations_log)
    df = _operation(df, "truncate_title", ..., operations_log)
    # ... 11 operations total, mỗi cái đều verify + log
    return df, operations_log`,
      metrics: [
        { label: "Số phép biến đổi", val: "11 operations" },
        { label: "Input → Output", val: "24 → 25 rows" },
        { label: "Collection", val: "papers-corrupted" },
      ],
    },
    {
      id: "eval",
      num: "05",
      title: "Automated LLM Judge & Benchmark Matrix",
      subtitle: "Đánh giá định lượng & Giám định tự động",
      author: "Hà Anh Tuấn",
      file: "src/evaluation/metrics.py",
      icon: BarChart,
      color: "from-amber-600 to-orange-700",
      description:
        "Chạy 12 câu hỏi test set cố định trên cả 3 trạng thái ChromaDB. LLM Judge (Gemini) tự động chấm điểm 1-5, đo Token F1 và Retrieval Hit Rate, kết quả ghi ra baseline/corrupted/repaired_metrics.json.",
      codeSnippet: `def evaluate_pipeline(
    settings: Settings, index: LocalEmbeddingIndex,
    test_set: list[dict],
) -> dict:
    for sample in test_set:
        result = answer_question(sample["question"], settings, index)
        f1 = _token_f1(sample["ground_truth"], result.answer)
        verdict = _judge_answer(settings, sample["question"],
                                 sample["ground_truth"], result.answer)
    return {"retrieval_hit_rate": ..., "mean_token_f1": ...,
            "judge_accuracy": ..., "mean_judge_score": ...}`,
      metrics: [
        { label: "Thang điểm Judge", val: "1.0 - 5.0 Points" },
        { label: "Số trạng thái so sánh", val: "3 States (Base/Corrupt/Repair)" },
        { label: "Test set", val: "12 câu hỏi cố định" },
      ],
    },
  ];

  const current = steps[activeStep];
  const CurrentIcon = current.icon;

  return (
    <section id="architecture" className="py-20 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#124f8c]/10 text-[#124f8c] text-xs font-bold uppercase tracking-wider mb-3">
            <Layers className="w-3.5 h-3.5" />
            End-to-End System Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0b192c] tracking-tight">
            Kiến Trúc 5 Bước Của Data Pipeline
          </h2>
          <p className="text-slate-600 mt-3 text-base">
            Mỗi giai đoạn được phụ trách bởi một kỹ sư chuyên trách, kết nối chặt chẽ từ khâu Raw Ingestion đến RAG Inference.
          </p>
        </div>

        {/* Step Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = activeStep === idx;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(idx)}
                className={`p-4 rounded-2xl text-left transition-all border cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? "bg-white border-[#124f8c] shadow-md ring-2 ring-[#124f8c]/20"
                    : "bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-mono font-bold ${isActive ? "text-[#124f8c]" : "text-slate-400"}`}>
                    {step.num}
                  </span>
                  <div className={`p-1.5 rounded-lg ${isActive ? "bg-blue-100 text-[#124f8c]" : "bg-slate-100 text-slate-500"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <h3 className={`text-xs font-bold line-clamp-1 ${isActive ? "text-[#0b192c]" : "text-slate-600"}`}>
                  {step.title.split("&")[0]}
                </h3>
              </button>
            );
          })}
        </div>

        {/* Active Step Deep Dive Card */}
        <div className="academic-card p-6 sm:p-8 rounded-3xl bg-white shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Explanations & Responsibilities */}
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${current.color} text-white flex items-center justify-center shadow-md`}>
                  <CurrentIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#124f8c]">
                      BƯỚC {current.num}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                      Module Owner: {current.author}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#0b192c] tracking-tight">
                    {current.title}
                  </h3>
                </div>
              </div>

              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                {current.description}
              </p>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                {current.metrics.map((m, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      {m.label}
                    </div>
                    <div className="text-xs font-bold text-[#0b192c] mt-0.5">
                      {m.val}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center gap-2 text-xs font-mono text-slate-500">
                <FileJson className="w-4 h-4 text-[#124f8c]" />
                <span>Source implementation: </span>
                <code className="text-[#124f8c] font-bold">{current.file}</code>
              </div>
            </div>

            {/* Right: Code Snippet Preview */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl">
                {/* Code Header */}
                <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-sky-400 font-mono">
                    <Code2 className="w-4 h-4" />
                    <span>{current.file}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  </div>
                </div>

                {/* Code Content */}
                <pre className="p-5 font-mono text-xs text-sky-200 overflow-x-auto leading-relaxed">
                  <code>{current.codeSnippet}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
