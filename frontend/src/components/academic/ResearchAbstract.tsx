"use client";

import React from "react";
import { BookOpen, CheckCircle2, ShieldAlert, Cpu } from "lucide-react";

export default function ResearchAbstract() {
  return (
    <section id="abstract" className="py-20 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#124f8c]/10 text-[#124f8c] text-xs font-bold uppercase tracking-wider mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            Executive Research Abstract
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0b192c] tracking-tight">
            Tóm Tắt Đề Tài &amp; Động Lực Thực Nghiệm
          </h2>
          <p className="text-slate-600 mt-3 text-base">
            Kiểm chứng giả thuyết: Sự suy giảm chất lượng dữ liệu trong Data Pipeline gây ra suy giảm tuyến tính nghiêm trọng về độ chính xác và xuất hiện ảo giác (hallucination) trong các hệ thống RAG học thuật.
          </p>
        </div>

        {/* Paper Executive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Main Abstract Text Block */}
          <div className="lg:col-span-8 academic-card p-6 sm:p-8 rounded-2xl flex flex-col justify-between">
            <div className="space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed">
              <p>
                Hệ thống <strong>Retrieval-Augmented Generation (RAG)</strong> ngày càng trở thành tiêu chuẩn vàng trong việc truy vấn và tổng hợp tri thức từ các kho tài liệu học thuật khổng lồ. Tuy nhiên, hiệu năng của RAG phụ thuộc mật thiết vào tính toàn vẹn của dữ liệu đầu vào.
              </p>
              <p>
                Trong nghiên cứu thực nghiệm này (Khóa học <strong>K4 - Day 10</strong>), chúng tôi thiết lập một đường ống dữ liệu toàn diện (Data Pipeline) từ khâu thu thập <strong>24 bài báo khoa học chuẩn qua Crossref REST API</strong>, lưu trữ bất biến (Immutable Raw Ingestion), làm sạch và chuẩn hóa schema, sinh Vector Embeddings 384 chiều, đến lưu trữ trong <strong>ChromaDB</strong>.
              </p>
              <p>
                Để chứng minh mối liên hệ nhân quả, chúng tôi áp dụng <strong>11 kịch bản sai hỏng có chủ đích (Deliberate Corruption)</strong> và đánh giá định lượng bằng hệ thống giám định tự động <strong>LLM Judge</strong>. Kết quả chứng minh: khi dữ liệu bị phá hủy, tỷ lệ tìm thấy đúng bài báo (Hit Rate) giảm từ <span className="font-bold text-emerald-700">100%</span> xuống <span className="font-bold text-[oklch(0.577_0.245_27.325)]">33.3%</span> và điểm đánh giá LLM Judge giảm từ <span className="font-bold text-emerald-700">5.00/5.0</span> xuống <span className="font-bold text-[oklch(0.577_0.245_27.325)]">3.08/5.0</span>. Sau khi kích hoạt quy trình <strong>Self-Healing</strong>, toàn bộ hệ thống phục hồi lại 100% độ chính xác ban đầu.
              </p>
            </div>

            {/* Author Attribution Meta */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
              <div>
                <span className="font-bold text-[#0b192c]">Tác giả: </span>
                <span>Nguyễn Minh Đạt, Nguyễn Hùng Mạnh, Trần Hoàng Mai Anh, Nguyễn Hương Trà, Hà Anh Tuấn</span>
              </div>
              <div className="font-mono text-[#124f8c] font-bold">
                K4_Day10_TenNhomLaGiNhi
              </div>
            </div>
          </div>

          {/* Key Findings Side Cards */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Finding 1 */}
            <div className="academic-card p-5 rounded-xl border-l-4 border-l-emerald-600">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-[#0b192c]">Clean Baseline: 100% Hit Rate</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Trên tập 24 bài báo sạch, hệ thống RAG đạt độ chính xác tuyệt đối, trích dẫn đúng DOI và không có bất kỳ hiện tượng ảo giác nào.
              </p>
            </div>

            {/* Finding 2 */}
            <div className="academic-card p-5 rounded-xl border-l-4 border-l-[oklch(0.577_0.245_27.325)]">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-5 h-5 text-[oklch(0.577_0.245_27.325)]" />
                <h3 className="font-bold text-sm text-[#0b192c]">Corrupted: -66.7% Hit Rate</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Khi bị xóa Abstract hoặc lỗi Schema, LLM bị rơi vào tình trạng ảo giác nghiêm trọng, điểm đánh giá trung bình tụt giảm 46.6%.
              </p>
            </div>

            {/* Finding 3 */}
            <div className="academic-card p-5 rounded-xl border-l-4 border-l-[#124f8c]">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-5 h-5 text-[#124f8c]" />
                <h3 className="font-bold text-sm text-[#0b192c]">Self-Healing: Phục Hồi 100%</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Nhờ lưu trữ bất biến Raw Provenance, pipeline tự động tái tạo lại toàn bộ dữ liệu sạch và Vector Store mà không cần crawl lại từ đầu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
