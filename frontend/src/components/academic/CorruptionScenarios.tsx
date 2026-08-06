"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  FileX,
  Shuffle,
  Binary,
  CalendarX,
  Type,
  Code,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function CorruptionScenarios() {
  const [selectedScenario, setSelectedScenario] = useState<number>(0);

  // Real 11 operations from src/ingestion/corruption.py::corrupt_clean_dataframe,
  // exact parameters as logged in data/results/corruption_log.json.
  const scenarios = [
    {
      id: 1,
      name: "drop_latest — Xóa bài mới nhất",
      icon: FileX,
      severity: "Nghiêm trọng (High)",
      ragImpact: "Xóa hẳn tài liệu khỏi index",
      desc: "Xóa 10% record có ngày xuất bản mới nhất (fraction: 0.10) khỏi dataset trước khi build index — mô phỏng việc mất dữ liệu trong quá trình ETL.",
      exampleBefore: `24 records trong papers_clean.csv`,
      exampleAfter: `23 records — record mới nhất bị loại, ground_truth_doc_id tương ứng không còn trong index`,
      causalResult: "Câu hỏi có ground truth trỏ vào record bị xóa → Retrieval Hit Rate = 0 cho câu đó.",
    },
    {
      id: 2,
      name: "blank_summary — Xóa rỗng Abstract",
      icon: Type,
      severity: "Nghiêm trọng (High)",
      ragImpact: "text_for_embedding mất phần nội dung chính",
      desc: "Gán summary = \"\" cho 1 record ngẫu nhiên. text_for_embedding chỉ còn title + authors, mất toàn bộ ngữ nghĩa abstract khi tính vector.",
      exampleBefore: `"summary": "Retrieval-Augmented Generation (RAG) has emerged as..."`,
      exampleAfter: `"summary": ""`,
      causalResult: "Vector embedding cho record này gần như chỉ dựa vào title, giảm độ liên quan khi semantic search.",
    },
    {
      id: 3,
      name: "inject_summary_noise — Bơm nhiễu Summary",
      icon: Binary,
      severity: "Trung bình (Medium)",
      ragImpact: "Loãng tín hiệu ngữ nghĩa",
      desc: "Chèn suffix rác \"[CORRUPTED-NOISE]\" vào cuối summary của 1 record, làm loãng mật độ từ khóa quan trọng trong text_for_embedding.",
      exampleBefore: `"...produce accurate, context-aware, and verifiable outputs."`,
      exampleAfter: `"...produce accurate, context-aware, and verifiable outputs. [CORRUPTED-NOISE]"`,
      causalResult: "Vector embedding lệch nhẹ khỏi ngữ nghĩa gốc, ảnh hưởng thứ hạng trong semantic search.",
    },
    {
      id: 4,
      name: "truncate_title — Cắt cụt tiêu đề",
      icon: Shuffle,
      severity: "Cực kỳ nghiêm trọng (Critical)",
      ragImpact: "Phá vỡ cơ chế exact-title lookup",
      desc: "Cắt title xuống còn tối đa 24 ký tự (max_characters: 24). Agent thường dùng exact-title match (đặt trong dấu nháy đơn) để lookup chính xác — title bị cắt phá vỡ hoàn toàn cơ chế này.",
      exampleBefore: `"Hi-RAG: A Hierarchical Retrieval-Augmented Generation Framework..."`,
      exampleAfter: `"Hi-RAG: A Hierarchic" (24 ký tự)`,
      causalResult: "Agent rơi về semantic search kém chính xác hơn thay vì exact lookup — một trong những nguyên nhân chính khiến Hit Rate giảm 66.7 điểm phần trăm.",
    },
    {
      id: 5,
      name: "make_published_stale — Làm cũ ngày xuất bản",
      icon: CalendarX,
      severity: "Thấp - Trung bình (Low-Med)",
      ragImpact: "Sai lệch freshness signal",
      desc: "Lùi ngày published của 1 record đi 730 ngày (days: -730), khiến freshness check coi record này là STALE dù nội dung vẫn hợp lệ.",
      exampleBefore: `"published": "2026-08-01"`,
      exampleAfter: `"published": "2024-08-02" (lùi 730 ngày)`,
      causalResult: "corrupted_freshness_report.json chuyển từ FRESH sang STALE cho record này.",
    },
    {
      id: 6,
      name: "swap_categories — Hoán đổi chủ đề",
      icon: Shuffle,
      severity: "Trung bình (Medium)",
      ragImpact: "Sai lệch câu trả lời loại 'categories'",
      desc: "Hoán đổi categories_joined giữa 2 record ngẫu nhiên, khiến câu hỏi dạng 'bài này thuộc chủ đề gì?' trả lời sai dù retrieval vẫn đúng tài liệu.",
      exampleBefore: `Paper A: "journal article", Paper B: "posted content"`,
      exampleAfter: `Paper A: "posted content", Paper B: "journal article"`,
      causalResult: "Token F1 giảm cho câu hỏi loại categories dù Hit Rate không đổi.",
    },
    {
      id: 7,
      name: "swap_authors — Hoán đổi tác giả",
      icon: AlertTriangle,
      severity: "Trung bình (Medium)",
      ragImpact: "Sai lệch câu trả lời loại 'authors'",
      desc: "Hoán đổi authors_joined giữa 2 record ngẫu nhiên — RAG agent trả lời sai tên tác giả dù vẫn tìm đúng tài liệu.",
      exampleBefore: `Paper A: "Wei Tian, Yuhao Zhou"`,
      exampleAfter: `Paper A: authors của Paper B (đã hoán đổi)`,
      causalResult: "Câu hỏi 'Ai là tác giả của bài X?' trả lời sai tên dù retrieval đúng.",
    },
    {
      id: 8,
      name: "html_markup_leakage — Rò rỉ thẻ HTML/XML",
      icon: Code,
      severity: "Trung bình (Medium)",
      ragImpact: "Nhiễu tokenizer, lộ lỗi cleaning",
      desc: "Chèn ngược thẻ JATS XML (đáng lẽ đã bị strip ở bước cleaning) vào summary của 1 record, mô phỏng lỗi regression trong pipeline cleaning.",
      exampleBefore: `"Retrieval-Augmented Generation has emerged as..."`,
      exampleAfter: `"<jats:p>Retrieval-Augmented Generation has emerged as...</jats:p>"`,
      causalResult: "Tag lẫn vào text_for_embedding làm nhiễu token, giảm nhẹ chất lượng embedding.",
    },
    {
      id: 9,
      name: "make_published_future — Ngày xuất bản trong tương lai",
      icon: CalendarX,
      severity: "Thấp (Low)",
      ragImpact: "Vi phạm ràng buộc freshness hợp lệ",
      desc: "Đặt ngày published của 1 record vào tương lai (sau ngày chạy pipeline) — trường hợp biên mà freshness/quality check cần phát hiện được.",
      exampleBefore: `"published": "2026-08-01"`,
      exampleAfter: `"published": "2027-XX-XX" (tương lai)`,
      causalResult: "Quality check phải flag record này là invalid published date.",
    },
    {
      id: 10,
      name: "duplicate_row — Nhân bản record",
      icon: Shuffle,
      severity: "Thấp (Low)",
      ragImpact: "Trùng lặp trong index, lệch thống kê",
      desc: "Nhân đôi 1 record có sẵn (giữ nguyên nội dung) — kiểm tra dedupe check có phát hiện được bản sao gần giống nhau không.",
      exampleBefore: `24 records`,
      exampleAfter: `24 records + 1 bản sao = 24 rows (trước bước semantic_near_duplicate)`,
      causalResult: "quality checks phải phát hiện duplicate paper_id/content nếu dedupe không xử lý đúng.",
    },
    {
      id: 11,
      name: "semantic_near_duplicate — Bản sao gần giống ngữ nghĩa",
      icon: Binary,
      severity: "Thấp (Low)",
      ragImpact: "2 record gần giống nhau cạnh tranh thứ hạng",
      desc: "Tạo 1 record mới có nội dung gần giống (không hệt) 1 record có sẵn — khó phát hiện hơn duplicate_row vì không trùng 100%, kiểm tra retrieval có bị nhiễu bởi near-duplicate không.",
      exampleBefore: `24 records`,
      exampleAfter: `25 records (record cuối cùng, gần giống 1 record khác)`,
      causalResult: "Kết thúc chuỗi 11 operations: 24 → 25 rows, output_rows trong corruption_log.json.",
    },
  ];

  const current = scenarios[selectedScenario];
  const CurrentIcon = current.icon;

  return (
    <section id="corruption" className="py-20 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[oklch(0.577_0.245_27.325)]/10 text-[oklch(0.577_0.245_27.325)] text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            Controlled Chaos Engineering
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0b192c] tracking-tight">
            11 Kịch Bản Phá Hoại Dữ Liệu Có Chủ Đích
          </h2>
          <p className="text-slate-600 mt-3 text-base">
            Mô phỏng các lỗi phổ biến trong quá trình Ingestion và ETL thực tế để kiểm tra khả năng phục hồi của hệ thống.
          </p>
        </div>

        {/* 6 Scenario Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {scenarios.map((sc, idx) => {
            const Icon = sc.icon;
            const isSelected = selectedScenario === idx;
            return (
              <button
                key={sc.id}
                onClick={() => setSelectedScenario(idx)}
                className={`p-5 rounded-2xl text-left transition-all border cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-white border-[oklch(0.577_0.245_27.325)] shadow-md ring-2 ring-red-500/20"
                    : "bg-white/70 border-slate-200 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      Kịch Bản #{sc.id}
                    </span>
                    <div
                      className={`p-2 rounded-xl ${
                        isSelected
                          ? "bg-red-100 text-[oklch(0.577_0.245_27.325)]"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3
                    className={`font-bold text-sm leading-snug line-clamp-2 ${
                      isSelected ? "text-[#0b192c]" : "text-slate-700"
                    }`}
                  >
                    {sc.name}
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Mức độ:</span>
                  <span className="font-bold text-[oklch(0.577_0.245_27.325)]">{sc.severity}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Deep Dive Box for Selected Scenario */}
        <div className="academic-card p-6 sm:p-8 rounded-3xl bg-white shadow-lg border-t-4 border-t-[oklch(0.577_0.245_27.325)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Description & Causal Analysis */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-[oklch(0.577_0.245_27.325)] flex items-center justify-center shrink-0">
                  <CurrentIcon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold text-[oklch(0.577_0.245_27.325)]">
                    CHI TIẾT KỊCH BẢN #{current.id}
                  </span>
                  <h3 className="text-xl font-bold text-[#0b192c]">
                    {current.name}
                  </h3>
                </div>
              </div>

              <p className="text-slate-600 text-sm leading-relaxed">
                {current.desc}
              </p>

              <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-100 text-xs text-red-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[oklch(0.577_0.245_27.325)]" />
                  Hậu quả nhân quả (Causal Impact):
                </div>
                <p className="text-slate-700">{current.causalResult}</p>
              </div>
            </div>

            {/* Right Column: Code Comparison (Before vs After) */}
            <div className="lg:col-span-6 space-y-3">
              {/* Clean Before */}
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-800">
                  <span>Dữ Liệu Sạch (Clean Baseline)</span>
                  <span className="text-[10px] font-mono">Status: OK</span>
                </div>
                <pre className="p-3 text-xs font-mono text-slate-700 overflow-x-auto">
                  <code>{current.exampleBefore}</code>
                </pre>
              </div>

              {/* Corrupted After */}
              <div className="rounded-xl overflow-hidden border border-red-200 bg-red-50/30">
                <div className="px-3 py-1.5 bg-red-100 border-b border-red-200 flex items-center justify-between text-xs font-bold text-[oklch(0.577_0.245_27.325)]">
                  <span>Sau Khi Bơm Sai Hỏng (Corrupted Injection)</span>
                  <span className="text-[10px] font-mono">Status: ERROR</span>
                </div>
                <pre className="p-3 text-xs font-mono text-red-800 overflow-x-auto">
                  <code>{current.exampleAfter}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
