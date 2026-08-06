"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  X,
  Sparkles,
  Database,
  Send,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Bot,
  MessageSquare,
} from "lucide-react";

interface InteractiveRAGModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function InteractiveRAGModal({ isOpen, onClose }: InteractiveRAGModalProps) {
  const [dataState, setDataState] = useState<"baseline" | "corrupted" | "repaired">("baseline");
  const [selectedQuestion, setSelectedQuestion] = useState(
    "Hi-RAG giải quyết vấn đề gì khi lựa chọn công cụ cho LLM agent?"
  );
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    answer: string;
    sources: Array<{ paper_id: string; title: string; score: number | null }>;
    provider: string | null;
  } | null>(null);

  if (!isOpen) return null;

  // Câu hỏi mẫu về các paper THẬT có trong corpus 24 bài (data/clean/papers_clean.json).
  const sampleQuestions = [
    "Hi-RAG giải quyết vấn đề gì khi lựa chọn công cụ cho LLM agent?",
    "Hệ thống SafeRAG ứng dụng trong ngành công nghiệp nào và cơ chế hoạt động ra sao?",
    "JADE-Plus sử dụng phương pháp đa phương thức nào để chẩn đoán tổn thương xương hàm?",
    "Ai là tác giả của bài về hallucination trong RAG?",
  ];

  // Gọi thẳng backend thật (FastAPI trên :8000) — không mock, không setTimeout giả lập.
  const handleRunQuery = async () => {
    setIsQuerying(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: selectedQuestion, dataset: dataState, mode: "qa" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? "Có lỗi xảy ra khi gọi backend.");
        return;
      }
      setResult({ answer: data.answer, sources: data.sources, provider: data.provider });
    } catch {
      setError(`Không kết nối được backend tại ${API_URL}. Chạy \`uvicorn backend.main:app\` rồi thử lại, hoặc mở /chat để dùng UI đầy đủ.`);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#124f8c]/20 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#124f8c] to-[#0b192c] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-sky-300" />
            </div>
            <div>
              <h3 className="font-bold text-base">RAG Query Agent Simulator</h3>
              <p className="text-xs text-sky-200">
                Thử nghiệm trực tiếp hiệu năng RAG trên 3 trạng thái dữ liệu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Full UI (Port 3000)</span>
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Banner to Full Chat */}
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Muốn trải nghiệm giao diện Chatbot đầy đủ kết nối Backend trực tiếp?
              </span>
            </div>
            <Link
              href="/chat"
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 shrink-0"
            >
              <span>Mở UI Chatbot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Step 1: Select Data State */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              1. Chọn Trạng Thái Cơ Sở Dữ Liệu (Vector Store State):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => {
                  setDataState("baseline");
                  setResult(null);
                }}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                  dataState === "baseline"
                    ? "bg-[#124f8c] text-white border-[#124f8c] shadow-sm"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${dataState === "baseline" ? "text-sky-300" : "text-[#124f8c]"}`} />
                <div>
                  <div className="font-bold text-xs">Clean Baseline</div>
                  <div className="text-[10px] opacity-80">24 bài báo sạch</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setDataState("corrupted");
                  setResult(null);
                }}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                  dataState === "corrupted"
                    ? "bg-[oklch(0.577_0.245_27.325)] text-white border-[oklch(0.577_0.245_27.325)] shadow-sm"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                }`}
              >
                <AlertTriangle className={`w-4 h-4 ${dataState === "corrupted" ? "text-yellow-200" : "text-[oklch(0.577_0.245_27.325)]"}`} />
                <div>
                  <div className="font-bold text-xs">Corrupted State</div>
                  <div className="text-[10px] opacity-80">11 kịch bản sai hỏng</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setDataState("repaired");
                  setResult(null);
                }}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                  dataState === "repaired"
                    ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                }`}
              >
                <RotateCcw className={`w-4 h-4 ${dataState === "repaired" ? "text-emerald-200" : "text-emerald-700"}`} />
                <div>
                  <div className="font-bold text-xs">Repaired State</div>
                  <div className="text-[10px] opacity-80">Tự phục hồi 100%</div>
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Select Sample Query */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              2. Chọn Câu Hỏi Nghiên Cứu Mẫu:
            </label>
            <div className="space-y-2">
              {sampleQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedQuestion(q);
                    setResult(null);
                  }}
                  className={`w-full p-2.5 rounded-lg text-left text-xs font-medium border transition-colors cursor-pointer flex items-center justify-between ${
                    selectedQuestion === q
                      ? "bg-blue-50 border-[#124f8c] text-[#124f8c] font-bold"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{q}</span>
                  {selectedQuestion === q && <ArrowRight className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Run Query Button */}
          <div>
            <button
              onClick={handleRunQuery}
              disabled={isQuerying}
              className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all ${
                dataState === "baseline"
                  ? "btn-academic-blue"
                  : dataState === "corrupted"
                  ? "btn-academic-red"
                  : "bg-emerald-700 hover:bg-emerald-800 text-white"
              }`}
            >
              {isQuerying ? (
                <span>Đang truy xuất Vector Store &amp; Sinh câu trả lời...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    Chạy RAG Query với trạng thái [
                    {dataState === "baseline"
                      ? "Clean Baseline"
                      : dataState === "corrupted"
                      ? "Corrupted"
                      : "Repaired"}
                    ]
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Error Box — backend chưa chạy hoặc dataset chưa build */}
          {error && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Query Result Box — dữ liệu thật trả về từ backend, không mock */}
          {result && (
            <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* LLM Generated Answer */}
              <div
                className={`p-4 rounded-xl border-l-4 ${
                  dataState === "corrupted"
                    ? "bg-red-50/70 border-l-[oklch(0.577_0.245_27.325)]"
                    : "bg-blue-50/70 border-l-[#124f8c]"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <span className="flex items-center gap-1.5 text-[#0b192c]">
                    <Bot className="w-4 h-4 text-[#124f8c]" />
                    Câu Trả Lời Của RAG Agent (backend thật):
                  </span>
                  {result.provider && (
                    <span className="font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      qua {result.provider}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
                  {result.answer}
                </p>
              </div>

              {/* Retrieved Sources — nguồn thật từ ChromaDB */}
              <div className="academic-card p-4 rounded-xl border-l-4 border-l-[#124f8c]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                  <Database className="w-3.5 h-3.5 text-[#124f8c]" />
                  Nguồn trích dẫn (ChromaDB — {dataState}):
                </div>
                <div className="space-y-2">
                  {result.sources.length === 0 && (
                    <p className="text-xs text-slate-500 italic">Không tìm thấy tài liệu liên quan trong dataset này.</p>
                  )}
                  {result.sources.map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700"
                    >
                      <div className="flex items-center justify-between font-bold text-[#0b192c] mb-1">
                        <span className="font-sans">{doc.title}</span>
                        {doc.score != null && <span className="text-[#124f8c] shrink-0 ml-2">score: {doc.score.toFixed(3)}</span>}
                      </div>
                      <p className="text-[10px] text-slate-500">{doc.paper_id}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
