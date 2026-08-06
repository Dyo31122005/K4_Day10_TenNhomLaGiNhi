"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus, Moon, Sun, Send, Copy,
  ThumbsUp, ThumbsDown, Sparkles, BarChart2, Database, Clock, Hash,
  Bot, Layers, Paperclip, Image as ImageIcon, Mic, Globe, Code2,
  CircleCheck, Circle, AlertCircle,
} from "lucide-react";

// ─── Config ─────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Types ──────────────────────────────────────────────────────────────────

type Dataset = "baseline" | "corrupted" | "repaired";
type Mode = "agent" | "qa";

type Source = { paper_id: string; title: string; score?: number | null };

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  sources?: Source[];
  provider?: string | null;
};

type DatasetInfo = { ready: boolean; paper_count: number | null; collection_name: string | null };
type HealthResponse = { status: string; datasets: Record<Dataset, DatasetInfo> };

const DATASET_LABEL: Record<Dataset, string> = {
  baseline: "Baseline",
  corrupted: "Corrupted",
  repaired: "Repaired",
};

const SUGGESTIONS = [
  { icon: <Database className="w-4 h-4" />, label: "Tìm bài báo", prompt: "Bài nào nói về SafeRAG cho ngành dầu khí?" },
  { icon: <Hash className="w-4 h-4" />, label: "Tác giả", prompt: "Ai là tác giả của bài về hallucination trong RAG?" },
  { icon: <Clock className="w-4 h-4" />, label: "Ngày xuất bản", prompt: "Bài về sleep medicine được xuất bản khi nào?" },
  { icon: <Globe className="w-4 h-4" />, label: "Chủ đề", prompt: "Có những bài nào về agentic AI governance?" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Micro-components ───────────────────────────────────────────────────────

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-7 h-7 text-xs" : "w-8 h-8 text-xs";
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className={cn(sz, "rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-semibold shrink-0")}>
      {initials}
    </div>
  );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "muted" }) {
  const v = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    muted: "bg-slate-50 text-slate-400 border border-slate-200",
  }[variant];
  return <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", v)}>{children}</span>;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  );
}

function formatInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded text-xs font-mono bg-slate-100 text-indigo-600">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-indigo-400" />
              <span>{formatInline(line.slice(2))}</span>
            </div>
          );
        }
        if (line === "") return <div key={i} className="h-1" />;
        return <p key={i}>{formatInline(line)}</p>;
      })}
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ darkMode, onPrompt }: { darkMode: boolean; onPrompt: (p: string) => void }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-5">
        <Sparkles className="w-7 h-7 text-white" />
      </div>
      <h2 className={cn("text-xl font-bold mb-2 tracking-tight", darkMode ? "text-slate-100" : "text-[#0F172A]")}>
        Hỏi gì đó về corpus paper Crossref
      </h2>
      <p className={cn("text-sm max-w-md mb-8", darkMode ? "text-slate-400" : "text-[#64748B]")}>
        RAG agent chỉ trả lời dựa trên 24 paper đã index trong dataset đang chọn — không bịa ngoài corpus.
      </p>
      <div className="grid grid-cols-2 gap-2.5 w-full max-w-xl">
        {SUGGESTIONS.map(({ icon, label, prompt }) => (
          <button
            key={label}
            onClick={() => onPrompt(prompt)}
            className={cn(
              "flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-150 group",
              darkMode
                ? "bg-slate-800 border-slate-700/60 hover:border-indigo-500/40 hover:bg-slate-700"
                : "bg-white border-[#E2E8F0] hover:border-indigo-200 hover:shadow-sm hover:shadow-indigo-500/10"
            )}
          >
            <span className={cn("mt-0.5 shrink-0", darkMode ? "text-indigo-400" : "text-indigo-500")}>{icon}</span>
            <div>
              <div className={cn("text-xs font-semibold mb-0.5", darkMode ? "text-slate-300" : "text-[#0F172A]")}>{label}</div>
              <div className={cn("text-xs leading-snug", darkMode ? "text-slate-500" : "text-[#64748B]")}>{prompt}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Message bubble ─────────────────────────────────────────────────────────

function MessageBubble({ msg, darkMode, onCopy }: { msg: Message; darkMode: boolean; onCopy: () => void }) {
  const [reacted, setReacted] = useState<string | null>(null);

  if (msg.role === "system") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        {msg.content}
      </div>
    );
  }

  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {isUser ? (
        <Avatar name="Ban" size="sm" />
      ) : (
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-500 to-violet-600">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={cn("flex flex-col gap-1.5 max-w-[78%]", isUser && "items-end")}>
        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-500/20"
            : darkMode
              ? "bg-slate-800 border border-slate-700/60 text-slate-200 rounded-tl-sm shadow-sm"
              : "bg-white border border-[#E2E8F0] text-[#0F172A] rounded-tl-sm shadow-sm shadow-slate-100"
        )}>
          <MarkdownContent content={msg.content} />

          {msg.provider && (
            <p className={cn("mt-2 text-[10px] uppercase tracking-wide", isUser ? "text-white/60" : "opacity-50")}>
              trả lời qua: {msg.provider}
            </p>
          )}

          {msg.sources && msg.sources.length > 0 && (
            <div className={cn("mt-2 space-y-1 border-t pt-2 text-[11px]", isUser ? "border-white/20 text-white/80" : darkMode ? "border-slate-700/60 opacity-80" : "border-slate-100 opacity-80")}>
              <p className="font-semibold">Nguồn:</p>
              {msg.sources.map((s) => (
                <p key={s.paper_id} title={s.paper_id} className="truncate">
                  • {s.title}
                  {s.score != null && ` (${s.score.toFixed(3)})`}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className={cn("flex items-center gap-1", isUser && "flex-row-reverse")}>
          <span className={cn("text-xs", darkMode ? "text-slate-600" : "text-[#CBD5E1]")}>{formatTime(msg.timestamp)}</span>
          {!isUser && (
            <div className="flex items-center gap-0.5 ml-1">
              {[
                { icon: <Copy className="w-3 h-3" />, action: onCopy, label: "Copy" },
                { icon: <ThumbsUp className="w-3 h-3" />, action: () => setReacted("up"), label: "Good", active: reacted === "up" },
                { icon: <ThumbsDown className="w-3 h-3" />, action: () => setReacted("down"), label: "Bad", active: reacted === "down" },
              ].map(({ icon, action, label, active }) => (
                <button
                  key={label}
                  onClick={action}
                  title={label}
                  className={cn(
                    "p-1 rounded-md transition-colors",
                    active ? "text-indigo-500" : darkMode ? "text-slate-600 hover:text-slate-400 hover:bg-slate-700" : "text-[#CBD5E1] hover:text-[#64748B] hover:bg-slate-100"
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Dataset item (sidebar) — replaces the mock conversation list ──────────

function DatasetItem({
  id, active, info, darkMode, onClick,
}: { id: Dataset; active: boolean; info: DatasetInfo | undefined; darkMode: boolean; onClick: () => void }) {
  const ready = info?.ready ?? false;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-colors",
        active
          ? darkMode ? "bg-slate-700/70 text-slate-100" : "bg-indigo-50 text-indigo-700"
          : darkMode ? "hover:bg-slate-700/40 text-slate-300" : "hover:bg-slate-50 text-[#0F172A]"
      )}
    >
      {ready ? <CircleCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
      <span className="flex-1 text-left text-xs font-medium">{DATASET_LABEL[id]}</span>
      <span className={cn("text-xs", darkMode ? "text-slate-500" : "text-[#94A3B8]")}>
        {info?.paper_count ?? "–"}
      </span>
    </button>
  );
}

// ─── Right panel — real pipeline trace, not mock data ──────────────────────

function RightPanel({
  darkMode, health, dataset, lastAssistant,
}: { darkMode: boolean; health: HealthResponse | null; dataset: Dataset; lastAssistant: Message | undefined }) {
  const cardCls = cn("rounded-xl border p-4 mb-3", darkMode ? "bg-slate-800/60 border-slate-700/60" : "bg-slate-50 border-[#E2E8F0]");
  const labelCls = cn("text-xs font-semibold uppercase tracking-wide mb-3", darkMode ? "text-slate-500" : "text-[#94A3B8]");
  const subCls = cn("text-xs", darkMode ? "text-slate-500" : "text-[#64748B]");

  const info = health?.datasets?.[dataset];

  return (
    <div className="p-4 flex flex-col min-h-full">
      {/* Dataset trace — real ready-state per stage of the lab pipeline */}
      <div className={cardCls}>
        <div className={labelCls}>Pipeline trace</div>
        <div className="space-y-2">
          {(["baseline", "corrupted", "repaired"] as Dataset[]).map((d) => {
            const di = health?.datasets?.[d];
            return (
              <div key={d} className="flex items-center gap-2.5">
                {di?.ready ? <CircleCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                <span className={cn("text-xs flex-1", darkMode ? "text-slate-400" : "text-[#64748B]")}>{DATASET_LABEL[d]}</span>
                <span className={cn("text-xs font-mono", darkMode ? "text-slate-500" : "text-[#94A3B8]")}>
                  {di?.ready ? `${di.paper_count} paper` : "chưa build"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current dataset detail */}
      <div className={cardCls}>
        <div className={labelCls}>Dataset đang chọn</div>
        <div className={cn("text-sm font-semibold mb-1", darkMode ? "text-slate-200" : "text-[#0F172A]")}>
          {DATASET_LABEL[dataset]}
        </div>
        <div className={subCls}>Collection: {info?.collection_name ?? "chưa build"}</div>
        <div className={subCls}>Số paper: {info?.paper_count ?? "–"}</div>
      </div>

      {/* Provider used for last answer */}
      <div className={cardCls}>
        <div className={labelCls}>LLM provider (fallback chain)</div>
        {lastAssistant?.provider ? (
          <div className="flex items-center gap-2">
            <Bot className="w-3.5 h-3.5 text-indigo-500" />
            <span className={cn("text-sm font-semibold", darkMode ? "text-slate-200" : "text-[#0F172A]")}>{lastAssistant.provider}</span>
          </div>
        ) : (
          <div className={subCls}>Chưa có câu trả lời nào qua mode agent.</div>
        )}
        <div className={cn("mt-1.5", subCls)}>Thứ tự thử: openrouter → ollama → gemini → deepseek → openai</div>
      </div>

      {/* Sources of the last answer */}
      <div className={cardCls}>
        <div className={labelCls}>Nguồn trích dẫn gần nhất</div>
        {lastAssistant?.sources && lastAssistant.sources.length > 0 ? (
          <div className="space-y-2">
            {lastAssistant.sources.map((s) => (
              <div key={s.paper_id} className={cn("text-xs p-2 rounded-lg", darkMode ? "bg-slate-700/40" : "bg-white border border-[#E2E8F0]")}>
                <div className={cn("font-medium truncate", darkMode ? "text-slate-300" : "text-[#0F172A]")} title={s.title}>{s.title}</div>
                <div className={subCls}>{s.paper_id}{s.score != null && ` · score ${s.score.toFixed(3)}`}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className={subCls}>Chưa có nguồn trích dẫn.</div>
        )}
      </div>
    </div>
  );
}

// ─── Root ───────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [dataset, setDataset] = useState<Dataset>("baseline");
  const [mode, setMode] = useState<Mode>("agent");
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchHealth = async () => {
      try {
        const res = await fetch(`${API_URL}/health`);
        if (!res.ok) return;
        const data: HealthResponse = await res.json();
        if (!cancelled) setHealth(data);
      } catch {
        if (!cancelled) setHealth(null);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function sendMessage(overridePrompt?: string) {
    const question = (overridePrompt ?? input).trim();
    if (!question || loading) return;

    setMessages((m) => [...m, { id: Date.now().toString(), role: "user", content: question, timestamp: new Date() }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, dataset, mode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((m) => [...m, { id: (Date.now() + 1).toString(), role: "system", content: data.detail ?? "Có lỗi xảy ra.", timestamp: new Date() }]);
        return;
      }

      setMessages((m) => [...m, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        provider: data.provider,
        timestamp: new Date(),
      }]);
    } catch {
      setMessages((m) => [...m, {
        id: (Date.now() + 1).toString(),
        role: "system",
        content: `Không kết nối được backend tại ${API_URL}. Kiểm tra đã chạy uvicorn chưa.`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div
      className={cn("flex h-screen w-full overflow-hidden", darkMode ? "dark" : "")}
      style={{ fontFamily: "'Inter', sans-serif", background: darkMode ? "#0F172A" : "#F8FAFC" }}
    >
      {/* Sidebar */}
      <aside className={cn(
        "flex flex-col shrink-0 border-r transition-all duration-200 overflow-hidden",
        darkMode ? "bg-[#1E293B] border-slate-700/60" : "bg-white border-[#E2E8F0]",
        sidebarOpen ? "w-[260px]" : "w-0"
      )}>
        <div className="flex flex-col h-full min-w-[260px]">
          <div className="px-4 pt-5 pb-3 flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className={cn("text-sm font-semibold truncate", darkMode ? "text-slate-100" : "text-[#0F172A]")}>Day 10 · Paper RAG</span>
          </div>

          <div className="px-3 mb-3">
            <button
              onClick={() => setMessages([])}
              className="w-full flex items-center gap-2 h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-sm shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              Chat mới
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4" style={{ scrollbarWidth: "none" }}>
            <div className={cn("flex items-center gap-1.5 px-2 py-1 mb-1", darkMode ? "text-slate-500" : "text-[#94A3B8]")}>
              <Layers className="w-3 h-3" />
              <span className="text-xs font-semibold uppercase tracking-wide">Dataset</span>
            </div>
            {(["baseline", "corrupted", "repaired"] as Dataset[]).map((d) => (
              <DatasetItem key={d} id={d} active={dataset === d} info={health?.datasets?.[d]} darkMode={darkMode} onClick={() => setDataset(d)} />
            ))}
          </div>

          <div className={cn("border-t px-2 pt-2 pb-4 space-y-0.5", darkMode ? "border-slate-700/60" : "border-[#E2E8F0]")}>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={cn("w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors", darkMode ? "hover:bg-slate-700/50 text-slate-400" : "hover:bg-slate-50 text-[#64748B]")}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {darkMode ? "Light mode" : "Dark mode"}
            </button>
            <div className={cn("flex items-center gap-2.5 px-2 py-2 mt-1 rounded-xl", darkMode ? "hover:bg-slate-700/50" : "hover:bg-slate-50")}>
              <Avatar name="Nguyen Hung Manh" size="sm" />
              <div className="flex-1 min-w-0">
                <div className={cn("text-xs font-semibold truncate", darkMode ? "text-slate-200" : "text-[#0F172A]")}>Mạnh</div>
                <div className={cn("text-xs truncate", darkMode ? "text-slate-500" : "text-[#64748B]")}>Role 2 · Ingestion</div>
              </div>
              <Badge variant="success">K4</Badge>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className={cn("h-14 flex items-center gap-3 px-4 border-b shrink-0", darkMode ? "bg-[#1E293B] border-slate-700/60" : "bg-white border-[#E2E8F0]")}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={cn("p-1.5 rounded-lg transition-colors", darkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-[#64748B]")}>
            <Layers className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className={cn("text-sm font-semibold truncate", darkMode ? "text-slate-100" : "text-[#0F172A]")}>
              Paper RAG Chatbot — {DATASET_LABEL[dataset]}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className={cn(
                "flex items-center gap-1.5 h-8 px-3 rounded-xl border text-xs font-medium transition-colors outline-none",
                darkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-50 border-[#E2E8F0] text-[#0F172A]"
              )}
            >
              <option value="agent">agent (LLM + tools)</option>
              <option value="qa">qa (rule-based)</option>
            </select>

            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                rightPanelOpen ? (darkMode ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-[#0F172A]") : (darkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-[#64748B]")
              )}
              title="Pipeline trace"
            >
              <BarChart2 className="w-4 h-4" />
            </button>

            <Avatar name="Nguyen Hung Manh" size="sm" />
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-6" style={{ scrollbarWidth: "none" }}>
              <div className="max-w-[760px] mx-auto space-y-6">
                {messages.length === 0 && <EmptyState darkMode={darkMode} onPrompt={(p) => sendMessage(p)} />}
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    darkMode={darkMode}
                    onCopy={() => { navigator.clipboard.writeText(msg.content); showToast("Đã copy câu trả lời"); }}
                  />
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-500 to-violet-600">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className={cn("rounded-2xl rounded-tl-sm border", darkMode ? "bg-slate-800 border-slate-700/60" : "bg-white border-[#E2E8F0] shadow-sm shadow-slate-100")}>
                      <TypingIndicator />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className={cn("border-t px-4 py-4", darkMode ? "border-slate-700/60 bg-[#1E293B]" : "border-[#E2E8F0] bg-white")}>
              <div className="max-w-[760px] mx-auto">
                <div className={cn(
                  "flex flex-col rounded-2xl border transition-all",
                  darkMode ? "bg-slate-800 border-slate-700 focus-within:border-indigo-500/60" : "bg-[#F8FAFC] border-[#E2E8F0] focus-within:border-indigo-300 focus-within:shadow-md focus-within:shadow-indigo-500/10"
                )}>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    rows={1}
                    className={cn(
                      "w-full px-4 pt-3.5 pb-2 text-sm outline-none bg-transparent resize-none leading-relaxed",
                      darkMode ? "text-slate-200 placeholder:text-slate-500" : "text-[#0F172A] placeholder:text-[#94A3B8]"
                    )}
                    placeholder="Hỏi gì đó về corpus paper... (Shift+Enter xuống dòng)"
                    style={{ maxHeight: 180, minHeight: 52 }}
                  />
                  <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
                    <div className="flex items-center gap-0.5">
                      {[Paperclip, ImageIcon, Mic, Globe, Code2].map((Icon, i) => (
                        <span key={i} title="Chưa hỗ trợ" className={cn("p-1.5 rounded-lg opacity-30 cursor-not-allowed", darkMode ? "text-slate-500" : "text-[#94A3B8]")}>
                          <Icon className="w-4 h-4" />
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || loading}
                        className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150",
                          input.trim() && !loading
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/30 active:scale-95"
                            : darkMode ? "bg-slate-700 text-slate-600" : "bg-slate-200 text-slate-400"
                        )}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                <p className={cn("text-center text-xs mt-2", darkMode ? "text-slate-600" : "text-[#CBD5E1]")}>
                  Agent chỉ trả lời dựa trên corpus đã index — không đảm bảo đúng nếu dataset đang corrupted.
                </p>
              </div>
            </div>
          </div>

          {rightPanelOpen && (
            <aside className={cn("w-[280px] shrink-0 border-l flex flex-col overflow-y-auto", darkMode ? "bg-[#1E293B] border-slate-700/60" : "bg-white border-[#E2E8F0]")} style={{ scrollbarWidth: "none" }}>
              <RightPanel darkMode={darkMode} health={health} dataset={dataset} lastAssistant={lastAssistant} />
            </aside>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
