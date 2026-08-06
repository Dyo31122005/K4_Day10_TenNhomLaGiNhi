"use client";

import React from "react";
import Link from "next/link";
import { Database, ExternalLink, MessageSquare } from "lucide-react";

export default function AcademicFooter() {
  return (
    <footer className="bg-[#0b192c] text-white border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-slate-800">
          {/* Col 1 & 2: Branding */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#124f8c] flex items-center justify-center text-white shadow-md">
                <Database className="w-5 h-5 text-sky-300" />
              </div>
              <div>
                <span className="font-bold text-lg text-white">RAG Observability Lab</span>
                <p className="text-xs text-sky-300">Nhóm: Tên Nhóm Là Gì Nhỉ</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Dự án nghiên cứu thực nghiệm kiểm chứng mối tương quan nhân quả giữa chất lượng dữ liệu và độ chính xác của các hệ thống Retrieval-Augmented Generation (RAG).
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Dataset: 24 Crossref Papers • ChromaDB 384-dim</span>
            </div>
          </div>

          {/* Col 3: Research Sections */}
          <div>
            <h4 className="font-bold text-sm text-white uppercase tracking-wider mb-4">
              Nghiên Cứu
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <a href="#abstract" className="hover:text-sky-300 transition-colors">
                  Executive Abstract
                </a>
              </li>
              <li>
                <a href="#architecture" className="hover:text-sky-300 transition-colors">
                  5-Step Data Pipeline
                </a>
              </li>
              <li>
                <a href="#benchmark" className="hover:text-sky-300 transition-colors">
                  3-State Benchmark Matrix
                </a>
              </li>
              <li>
                <a href="#corruption" className="hover:text-sky-300 transition-colors">
                  11 Corruption Scenarios
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Dataset & Papers */}
          <div>
            <h4 className="font-bold text-sm text-white uppercase tracking-wider mb-4">
              Dữ Liệu &amp; Mã Nguồn
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <a href="#corpus" className="hover:text-sky-300 transition-colors">
                  24 Ingested Papers
                </a>
              </li>
              <li>
                <a href="#citation" className="hover:text-sky-300 transition-colors">
                  BibTeX Citation
                </a>
              </li>
              <li>
                <a href="#team" className="hover:text-sky-300 transition-colors">
                  Nhóm Tác Giả
                </a>
              </li>
              <li>
                <a href="https://api.crossref.org" target="_blank" rel="noreferrer" className="hover:text-sky-300 transition-colors flex items-center gap-1">
                  <span>Crossref REST API</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 5: Lab Information */}
          <div>
            <h4 className="font-bold text-sm text-white uppercase tracking-wider mb-4">
              RAG Chatbot
            </h4>
            <div className="space-y-3 text-xs text-slate-400">
              <Link
                href="/chat"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Mở UI Chatbot (Port 3000)</span>
              </Link>
              <p>Chuyên đề: Data Pipeline &amp; Observability</p>
              <p className="text-[11px] text-slate-500 font-mono">
                Repository: K4_Day10_TenNhomLaGiNhi
              </p>
            </div>
          </div>
        </div>

        {/* Footer Bottom Strip */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 Nhóm Nghiên Cứu &quot;Tên Nhóm Là Gì Nhỉ&quot;. Open Academic Research.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-slate-400">
              Màu chủ đạo: <span className="text-sky-400 font-semibold">#124f8c Brand Blue</span> &amp;{" "}
              <span className="text-red-400 font-semibold">oklch Red</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
