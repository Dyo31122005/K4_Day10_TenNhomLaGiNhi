"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Sparkles,
  Database,
  ShieldAlert,
  BarChart3,
  Users,
  Menu,
  X,
  MessageSquare,
} from "lucide-react";

interface AcademicNavbarProps {
  onOpenRAGDemo?: () => void;
}

export default function AcademicNavbar({ onOpenRAGDemo }: AcademicNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Executive Abstract", href: "#abstract", icon: Sparkles },
    { name: "5-Step Pipeline", href: "#architecture", icon: Layers },
    { name: "Benchmark Matrix", href: "#benchmark", icon: BarChart3 },
    { name: "11 Corruptions", href: "#corruption", icon: ShieldAlert },
    { name: "24 Papers", href: "#corpus", icon: Database },
    { name: "Research Team", href: "#team", icon: Users },
  ];

  return (
    <nav
      className={`sticky top-0 z-40 w-full transition-all duration-200 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/80"
          : "bg-white border-b border-slate-200"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & Lab Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#124f8c] to-[#0b192c] flex items-center justify-center text-white shadow-md shadow-blue-900/10">
              <Database className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-[#0b192c]">
                  RAG Observability Lab
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#124f8c]/10 text-[#124f8c]">
                  K4 Day 10
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                Tên Nhóm Là Gì Nhỉ • Data Quality Benchmark
              </p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.name}
                  href={link.href}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-[#124f8c] hover:bg-slate-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Icon className="w-3.5 h-3.5 opacity-70" />
                  <span>{link.name}</span>
                </a>
              );
            })}
          </div>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-2.5">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-sm shadow-indigo-500/25 transition-all transform active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Full Chat UI (Port 3000)</span>
            </Link>

            <button
              onClick={onOpenRAGDemo}
              className="btn-academic-blue px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-200" />
              <span>Simulate</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center gap-2">
            <Link
              href="/chat"
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Chatbot
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-[#124f8c] hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#124f8c]"
              >
                <Icon className="w-4 h-4 text-[#124f8c]" />
                <span>{link.name}</span>
              </a>
            );
          })}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <Link
              href="/chat"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white flex items-center justify-center gap-2 shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Mở RAG Chatbot UI (Port 3000)</span>
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenRAGDemo?.();
              }}
              className="w-full py-2.5 rounded-xl text-xs font-bold btn-academic-blue flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-200" />
              <span>Thử Nghiệm RAG Simulator</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
