"use client";

import React from "react";
import { Users, Award, GitBranch, Database, ShieldCheck, Cpu, BarChart } from "lucide-react";

export default function ResearchTeam() {
  const members = [
    {
      name: "Nguyễn Minh Đạt",
      role: "Team Lead & Architecture Orchestrator",
      icon: Award,
      badge: "Lead Author",
      color: "from-blue-600 to-indigo-700",
      duties: [
        "Hoạch định kiến trúc tổng thể Data Pipeline & Observability",
        "Thiết kế khung thực nghiệm 3-State Benchmark Matrix",
        "Tổng hợp và biên soạn báo cáo nghiên cứu Group Report",
      ],
      module: "src/core/ · src/pipelines/",
    },
    {
      name: "Nguyễn Hùng Mạnh",
      role: "Data Ingestion & Crossref API Lead",
      icon: Database,
      badge: "Ingestion Module",
      color: "from-[#124f8c] to-blue-800",
      duties: [
        "Xây dựng đường ống thu thập 24 bài báo từ Crossref REST API",
        "Lưu trữ và quản lý Immutable Raw Provenance (crossref_response.json)",
        "Đối chiếu raw ↔ clean, bàn giao raw snapshot dùng để repair",
      ],
      module: "src/ingestion/crossref.py",
    },
    {
      name: "Trần Hoàng Mai Anh",
      role: "Data Cleansing & Corruption Modeler",
      icon: ShieldCheck,
      badge: "Quality & Repair",
      color: "from-rose-600 to-red-700",
      duties: [
        "Lập trình 11 kịch bản phá hoại dữ liệu (Deliberate Corruption)",
        "Xây dựng bộ lọc bóc tách XML JATS, chuẩn hóa schema & DOI",
        "Phát triển pipeline tự phục hồi (Self-Healing from Raw)",
      ],
      module: "src/ingestion/cleaning.py · corruption.py",
    },
    {
      name: "Nguyễn Hương Trà",
      role: "RAG & ChromaDB Vector Store Engineer",
      icon: Cpu,
      badge: "Vector Store",
      color: "from-teal-600 to-cyan-700",
      duties: [
        "Sinh Vector Embeddings 384-dim (Sentence Transformers MiniLM-L6-v2)",
        "Cấu hình ChromaDB Vector Database + cross-encoder reranker",
        "Xây dựng RAG Agent (LangChain) dùng tool semantic search/lookup",
      ],
      module: "src/retrieval/",
    },
    {
      name: "Hà Anh Tuấn",
      role: "Evaluation & Data Observability Lead",
      icon: BarChart,
      badge: "Benchmark & Eval",
      color: "from-amber-600 to-orange-700",
      duties: [
        "Xây dựng bộ giám định tự động LLM Judge (Thang điểm 1-5)",
        "Tính toán định lượng Retrieval Hit Rate, Token F1, Judge Accuracy",
        "Chạy Data Quality checks & Freshness monitoring trên 3 trạng thái",
      ],
      module: "src/evaluation/ · src/observability/",
    },
  ];

  return (
    <section id="team" className="py-20 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#124f8c]/10 text-[#124f8c] text-xs font-bold uppercase tracking-wider mb-3">
            <Users className="w-3.5 h-3.5" />
            Research Authors &amp; Module Ownership
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0b192c] tracking-tight">
            Nhóm Tác Giả: Tên Nhóm Là Gì Nhỉ
          </h2>
          <p className="text-slate-600 mt-3 text-base">
            Đội ngũ nghiên cứu và kỹ sư phát triển toàn diện các module trong hệ thống Data Observability &amp; RAG Benchmark.
          </p>
        </div>

        {/* 5 Author Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div
                key={idx}
                className="academic-card p-6 rounded-2xl flex flex-col justify-between hover:shadow-lg transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#124f8c]/10 text-[#124f8c] whitespace-nowrap">
                      {m.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#0b192c] group-hover:text-[#124f8c] transition-colors whitespace-nowrap">
                    {m.name}
                  </h3>
                  <p className="text-xs font-semibold text-[#124f8c] mb-4">{m.role}</p>

                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <p className="text-[11px] font-bold uppercase text-slate-400">Nhiệm vụ chính:</p>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {m.duties.map((d, i) => (
                        <li key={i} className="flex items-start gap-1.5 leading-snug">
                          <span className="text-[#124f8c] font-bold">•</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3.5 h-3.5 text-[#124f8c]" />
                    <span>Module:</span>
                  </span>
                  <code className="text-[#124f8c] font-bold">{m.module}</code>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
