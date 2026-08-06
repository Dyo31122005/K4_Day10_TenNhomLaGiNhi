"use client";

import React, { useState } from "react";
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Cpu,
} from "lucide-react";

export default function BenchmarkMatrix() {
  const [selectedMetric, setSelectedMetric] = useState<string>("all");

  // Real numbers from data/results/{baseline,corrupted,repaired}_metrics.json —
  // only metrics the pipeline actually computes (no cosine similarity, DOI
  // precision, or latency benchmarks exist anywhere in the codebase).
  const matrixRows = [
    {
      metric: "Retrieval Hit Rate",
      desc: "Tỷ lệ câu hỏi mà agent tìm thấy đúng tài liệu chứa ground truth trong kết quả vector search",
      baseline: "100.0%",
      corrupted: "33.3%",
      repaired: "100.0%",
      deltaCorrupt: "-66.7%",
      deltaRepair: "+66.7%",
      isPositiveImpact: false,
    },
    {
      metric: "Mean Token F1",
      desc: "Độ trùng khớp từ (F1) giữa câu trả lời của agent và ground truth answer",
      baseline: "1.0000",
      corrupted: "0.4600",
      repaired: "1.0000",
      deltaCorrupt: "-54.0%",
      deltaRepair: "+117.4%",
      isPositiveImpact: false,
    },
    {
      metric: "LLM Judge Accuracy",
      desc: "Tỷ lệ câu trả lời được LLM Judge (Gemini) chấm là chính xác",
      baseline: "100.0%",
      corrupted: "41.7%",
      repaired: "100.0%",
      deltaCorrupt: "-58.3%",
      deltaRepair: "+139.8%",
      isPositiveImpact: false,
    },
    {
      metric: "Mean Judge Score (1-5)",
      desc: "Điểm chất lượng câu trả lời do LLM Judge chấm trung bình trên thang 1-5",
      baseline: "5.00 / 5.0",
      corrupted: "3.08 / 5.0",
      repaired: "5.00 / 5.0",
      deltaCorrupt: "-38.4%",
      deltaRepair: "+62.3%",
      isPositiveImpact: false,
    },
  ];

  return (
    <section id="benchmark" className="py-20 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#124f8c]/10 text-[#124f8c] text-xs font-bold uppercase tracking-wider mb-3">
            <BarChart3 className="w-3.5 h-3.5" />
            Causal Impact Matrix
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0b192c] tracking-tight">
            Ma Trận Đo Lường &amp; Đánh Giá Nhân Quả (3-State Matrix)
          </h2>
          <p className="text-slate-600 mt-3 text-base">
            So sánh định lượng toàn diện giữa 3 trạng thái dữ liệu: Clean Baseline, Corrupted Data và Repaired State.
          </p>
        </div>

        {/* 3 State Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Card 1: Baseline */}
          <div className="academic-card p-6 rounded-2xl border-t-4 border-t-[#124f8c] relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-[#124f8c] uppercase">Trạng Thái 1</span>
              <span className="w-3 h-3 rounded-full bg-[#124f8c]" />
            </div>
            <h3 className="text-lg font-extrabold text-[#0b192c]">Clean Baseline</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              24 bài báo sạch, đầy đủ JATS metadata &amp; DOI chuẩn.
            </p>
            <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Hit Rate:</span>
                <strong className="text-emerald-700">100.0%</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">LLM Judge Score:</span>
                <strong className="text-emerald-700">5.00 / 5.0</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Judge Accuracy:</span>
                <strong className="text-emerald-700">100.0%</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Corrupted */}
          <div className="academic-card p-6 rounded-2xl border-t-4 border-t-[oklch(0.577_0.245_27.325)] relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-[oklch(0.577_0.245_27.325)] uppercase">Trạng Thái 2</span>
              <span className="w-3 h-3 rounded-full bg-[oklch(0.577_0.245_27.325)]" />
            </div>
            <h3 className="text-lg font-extrabold text-[#0b192c]">Corrupted State</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Áp dụng 11 kịch bản phá hủy tóm tắt &amp; schema drift.
            </p>
            <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Hit Rate:</span>
                <strong className="text-[oklch(0.577_0.245_27.325)]">33.3% (-66.7%)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">LLM Judge Score:</span>
                <strong className="text-[oklch(0.577_0.245_27.325)]">3.08 / 5.0 (-38.4%)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Judge Accuracy:</span>
                <strong className="text-[oklch(0.577_0.245_27.325)]">41.7% (-58.3%)</strong>
              </div>
            </div>
          </div>

          {/* Card 3: Repaired */}
          <div className="academic-card p-6 rounded-2xl border-t-4 border-t-emerald-600 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-emerald-700 uppercase">Trạng Thái 3</span>
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
            </div>
            <h3 className="text-lg font-extrabold text-[#0b192c]">Repaired State</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Tự phục hồi hoàn toàn từ snapshot papers_raw.json.
            </p>
            <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Hit Rate:</span>
                <strong className="text-emerald-700">100.0% (Phục hồi)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">LLM Judge Score:</span>
                <strong className="text-emerald-700">5.00 / 5.0</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Judge Accuracy:</span>
                <strong className="text-emerald-700">100.0% (Phục hồi)</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Benchmark Table */}
        <div className="academic-card rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-4 px-6">Chỉ Số Đo Lường (Benchmark Metric)</th>
                  <th className="py-4 px-4 text-center bg-blue-50/50 text-[#124f8c]">1. Clean Baseline</th>
                  <th className="py-4 px-4 text-center bg-red-50/50 text-[oklch(0.577_0.245_27.325)]">2. Corrupted</th>
                  <th className="py-4 px-4 text-center bg-emerald-50/50 text-emerald-800">3. Repaired</th>
                  <th className="py-4 px-4 text-center text-slate-600">Causal Impact (Suy giảm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {matrixRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-[#0b192c]">{row.metric}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{row.desc}</div>
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-[#124f8c] bg-blue-50/20">
                      {row.baseline}
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-[oklch(0.577_0.245_27.325)] bg-red-50/20">
                      {row.corrupted}
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-emerald-700 bg-emerald-50/20">
                      {row.repaired}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-xs font-bold ${
                          row.isPositiveImpact
                            ? "bg-red-100 text-[oklch(0.577_0.245_27.325)]"
                            : "bg-red-100 text-[oklch(0.577_0.245_27.325)]"
                        }`}
                      >
                        <TrendingDown className="w-3.5 h-3.5" />
                        {row.deltaCorrupt}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Causal Conclusion Box */}
        <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-blue-900 to-[#0b192c] text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-300" />
              <h4 className="font-bold text-base">Kết Luận Nhân Quả Trọng Yếu:</h4>
            </div>
            <p className="text-xs sm:text-sm text-sky-100 max-w-3xl leading-relaxed">
              Dữ liệu bẩn làm giảm tỷ lệ tìm đúng tài liệu 66.7 điểm phần trăm (100%→33.3%) và kéo Judge Accuracy từ 100% xuống chỉ còn 41.7%. Kiến trúc <strong>Data Observability + Immutable Raw Provenance</strong> giúp phục hồi cả hai chỉ số về đúng 100% sau khi repair.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
