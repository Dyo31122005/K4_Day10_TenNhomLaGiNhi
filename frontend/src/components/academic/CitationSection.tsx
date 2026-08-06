"use client";

import React, { useState } from "react";
import {
  FileCode,
  Copy,
  Check,
  FileText,
  Database,
  BookMarked,
} from "lucide-react";

export default function CitationSection() {
  const [copied, setCopied] = useState(false);

  // Real repo URL — no DOI (this is a coursework lab report, not a published article,
  // so a fabricated DOI would be a false claim).
  const bibtexCode = `@misc{k4day10dataobservability2026,
  title={Data Observability and Causal Impact on Academic Retrieval-Augmented Generation (RAG) Systems},
  author={Nguyen, Minh Dat and Nguyen, Hung Manh and Tran, Hoang Mai Anh and Nguyen, Huong Tra and Ha, Anh Tuan},
  howpublished={K4 Day 10 Data Pipeline \\& Observability Lab},
  year={2026},
  url={https://github.com/Dyo31122005/K4_Day10_TenNhomLaGiNhi}
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bibtexCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="citation" className="py-20 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#124f8c]/10 text-[#124f8c] text-xs font-bold uppercase tracking-wider mb-3">
            <BookMarked className="w-3.5 h-3.5" />
            Citation &amp; Artifact Downloads
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0b192c] tracking-tight">
            Trích Dẫn Học Thuật &amp; Tải Báo Cáo
          </h2>
          <p className="text-slate-600 mt-3 text-base">
            Sử dụng định dạng BibTeX để trích dẫn nghiên cứu này hoặc tải về đầy đủ các tài liệu phân tích thực nghiệm.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: BibTeX Box */}
          <div className="lg:col-span-7 academic-card p-6 sm:p-7 rounded-2xl border-t-4 border-t-[#124f8c]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#124f8c]" />
                <span className="font-bold text-sm text-[#0b192c]">BibTeX Citation</span>
              </div>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#124f8c] text-white hover:bg-[#0e3f70] transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Đã Sao Chép!" : "Copy BibTeX"}</span>
              </button>
            </div>

            <div className="bg-slate-950 text-sky-200 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed shadow-inner">
              <pre>{bibtexCode}</pre>
            </div>
          </div>

          {/* Right Column: Downloadable Reports */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500">
              Tài Nguyên Báo Cáo &amp; Dữ Liệu:
            </h3>

            {/* Report 1: Group Report */}
            <div className="academic-card p-4 rounded-xl flex items-center justify-between hover:border-[#124f8c]/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-[#124f8c] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#0b192c]">Group Research Report</h4>
                  <p className="text-xs text-slate-500">Báo cáo tổng kết 3-state benchmark</p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#124f8c] px-3 py-1.5 rounded-lg bg-[#124f8c]/10">
                Markdown / PDF
              </span>
            </div>

            {/* Report 2: Corruption Report */}
            <div className="academic-card p-4 rounded-xl flex items-center justify-between hover:border-[oklch(0.577_0.245_27.325)]/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 text-[oklch(0.577_0.245_27.325)] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#0b192c]">Corruption Impact Analysis</h4>
                  <p className="text-xs text-slate-500">Báo cáo chi tiết 11 kịch bản sai hỏng</p>
                </div>
              </div>
              <span className="text-xs font-bold text-[oklch(0.577_0.245_27.325)] px-3 py-1.5 rounded-lg bg-red-100">
                Markdown
              </span>
            </div>

            {/* Dataset 3: Clean CSV */}
            <div className="academic-card p-4 rounded-xl flex items-center justify-between hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#0b192c]">Clean Crossref Papers Dataset</h4>
                  <p className="text-xs text-slate-500">24 bài báo sạch kèm DOI &amp; Abstract</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 px-3 py-1.5 rounded-lg bg-emerald-100">
                CSV (24 Rows)
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
