"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  Database,
  Layers,
  FileCheck,
  Zap,
  MessageSquare,
} from "lucide-react";

interface AcademicHeroProps {
  onOpenRAGDemo?: () => void;
}

export default function AcademicHero({ onOpenRAGDemo }: AcademicHeroProps) {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28 bg-gradient-to-b from-slate-50 via-white to-slate-50/50 border-b border-slate-200/80">
      {/* Background Subtle Tech Grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#124f8c 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Academic Title & Core Pitch */}
          <div className="lg:col-span-7 space-y-6">
            {/* Top Pill / Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-[#124f8c] animate-pulse" />
              <span className="text-xs font-bold text-[#124f8c] tracking-wide uppercase">
                Crossref RAG Observability Benchmark
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black text-[#0b192c] tracking-tight leading-[1.15]">
              Data Observability &amp;{" "}
              <span className="text-[#124f8c] underline decoration-blue-300 decoration-wavy decoration-2">
                Causal Impact
              </span>{" "}
              trên Hệ Thống Academic RAG
            </h1>

            {/* Subtitle / Proposition */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Kiểm chứng mối quan hệ nhân quả định lượng giữa chất lượng dữ liệu đầu vào và độ chính xác của mô hình RAG:{" "}
              <strong className="text-[#0b192c]">24 bài báo khoa học Crossref</strong>, 
              chịu ảnh hưởng bởi <strong className="text-[oklch(0.577_0.245_27.325)]">11 kịch bản sai hỏng có chủ đích</strong>, 
              và được phục hồi toàn diện qua cơ chế <strong className="text-emerald-700">Self-Healing Pipeline</strong>.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-500/25 transition-all transform active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Mở Trình RAG Chatbot (Port 3000)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                onClick={onOpenRAGDemo}
                className="btn-academic-blue px-6 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-sky-200" />
                <span>Mô Phỏng 3 Trạng Thái RAG</span>
              </button>

              <a
                href="#benchmark"
                className="px-5 py-3.5 rounded-xl font-bold text-sm text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-all flex items-center gap-2"
              >
                <Layers className="w-4 h-4 text-[#124f8c]" />
                <span>Xem Ma Trận Đo Lường</span>
              </a>
            </div>

            {/* Key Meta Badges */}
            <div className="pt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-1.5">
                <Database className="w-4 h-4 text-[#124f8c]" />
                <span>ChromaDB 384-dim (Cosine)</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              <div className="flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>LLM Judge Auto-Scoring (1-5)</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[oklch(0.577_0.245_27.325)]" />
                <span>11 Corruption Injections</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3-State Interactive Preview Card */}
          <div className="lg:col-span-5">
            <div className="academic-card p-6 sm:p-7 rounded-3xl relative overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-[#124f8c]">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#0b192c]">
                      Thực Nghiệm 3 Trạng Thái Dữ Liệu
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Crossref Corpus: 24 Papers
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Live Results
                </span>
              </div>

              {/* State 1: Clean Baseline */}
              <div className="mb-4 p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#124f8c]" />
                    <span className="font-bold text-xs text-[#0b192c]">
                      Trạng Thái 1: Clean Baseline
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    24 bài báo sạch nguyên bản từ Crossref
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>5.00 / 5.0</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Hit: 100%</span>
                </div>
              </div>

              {/* State 2: Corrupted */}
              <div className="mb-4 p-3.5 rounded-xl bg-red-50/70 border border-red-100 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[oklch(0.577_0.245_27.325)]" />
                    <span className="font-bold text-xs text-[#0b192c]">
                      Trạng Thái 2: Corrupted Data
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    11 kịch bản phá hủy tóm tắt &amp; schema
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-[oklch(0.577_0.245_27.325)] font-bold text-xs">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>3.08 / 5.0</span>
                  </div>
                  <span className="text-[10px] text-red-500 font-mono">Hit: 33.3% (-66.7%)</span>
                </div>
              </div>

              {/* State 3: Repaired (Self-Healing) */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span className="font-bold text-xs text-[#0b192c]">
                      Trạng Thái 3: Repaired (Healing)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Tự phục hồi từ Raw Provenance Snapshot
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-emerald-700 font-bold text-xs">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>5.00 / 5.0</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-mono">Hit: 100% (Phục hồi)</span>
                </div>
              </div>

              {/* Bottom Quick Test CTA */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Trải nghiệm trực quan:
                </span>
                <Link
                  href="/chat"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <span>Chạy Chatbot RAG</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
