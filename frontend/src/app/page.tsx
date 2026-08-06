"use client";

import { useRouter } from "next/navigation";
import AcademicNavbar from "@/components/academic/AcademicNavbar";
import AcademicHero from "@/components/academic/AcademicHero";
import ResearchAbstract from "@/components/academic/ResearchAbstract";
import PipelineArchitecture from "@/components/academic/PipelineArchitecture";
import BenchmarkMatrix from "@/components/academic/BenchmarkMatrix";
import CorruptionScenarios from "@/components/academic/CorruptionScenarios";
import CorpusSection from "@/components/academic/CorpusSection";
import ResearchTeam from "@/components/academic/ResearchTeam";
import CitationSection from "@/components/academic/CitationSection";
import AcademicFooter from "@/components/academic/AcademicFooter";

export default function LandingPage() {
  const router = useRouter();
  const goToChat = () => router.push("/chat");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-[#124f8c] selection:text-white">
      {/* Top Academic Navigation Bar */}
      <AcademicNavbar onOpenRAGDemo={goToChat} />

      {/* Main Content Sections */}
      <main>
        {/* 1. Hero Section & Quick 3-State Preview */}
        <AcademicHero onOpenRAGDemo={goToChat} />

        {/* 2. Executive Research Abstract */}
        <ResearchAbstract />

        {/* 3. End-to-End 5-Step Pipeline Architecture */}
        <PipelineArchitecture />

        {/* 4. Causal Benchmark Matrix (3-State Comparison) */}
        <BenchmarkMatrix />

        {/* 5. 11 Controlled Corruption Scenarios */}
        <CorruptionScenarios />

        {/* 6. 24 Ingested Crossref Papers Corpus */}
        <CorpusSection />

        {/* 7. Research Authors & Module Ownership */}
        <ResearchTeam />

        {/* 8. BibTeX Citation & Report Downloads */}
        <CitationSection />
      </main>

      {/* Academic Footer */}
      <AcademicFooter />
    </div>
  );
}
