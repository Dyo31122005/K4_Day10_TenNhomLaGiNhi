"use client";

import React, { useState } from "react";
import {
  Database,
  ExternalLink,
  Search,
  BookOpen,
  Calendar,
  User,
  Tag,
  CheckCircle,
} from "lucide-react";

export default function CorpusSection() {
  const [searchTerm, setSearchTerm] = useState("");

  // Real 24-paper Crossref corpus (data/clean/papers_clean.json) — not a mock sample.
  const papers = [
    { id: "10.1111/exsy.70341", title: "Hi-RAG: A Hierarchical Retrieval-Augmented Generation Framework for Scalable and Generalisable Tool Selection in Large Language Model Agents", authors: "Wei Tian, Yuhao Zhou", year: "2026", domain: "journal article", abstract: "As tool repositories for LLM agents grow from dozens to hundreds of endpoints, flat retrieval paradigms suffer from context overload and degraded selection accuracy.", url: "https://doi.org/10.1111/exsy.70341" },
    { id: "10.2118/234689-pa", title: "SafeRAG: A Large-Language-Model-Based Multistage Retrieval-Augmented Framework for Oil and Gas Safety Report Generation", authors: "Qianwen Cao, Chiyu Zhang, Junxiong Ning, Gongru Li", year: "2026", domain: "journal article", abstract: "In high-risk industrial settings, leveraging LLMs for automated accident analysis and safety report generation is efficient but fundamentally risky without grounding.", url: "https://doi.org/10.2118/234689-pa" },
    { id: "10.1007/s10278-026-02086-9", title: "JADE-Plus: A Multimodal Agentic Retrieval-Augmented Generation Large Language Framework for Diagnostic Support in Jawbone Lesions", authors: "Soroush Baseri Saadi, Jonas Ver Berne, Rocharles Cavalcante Fontenele, Peter Claes, Reinhilde Jacobs", year: "2026", domain: "journal article", abstract: "Diagnosing jawbone lesions in oral and maxillofacial radiology remains challenging due to overlapping radiological features and the need for integrated clinical reasoning.", url: "https://doi.org/10.1007/s10278-026-02086-9" },
    { id: "10.21203/rs.3.rs-10178277/v1", title: "Retrieval-Augmented Large-Language-Model-Based Time-Series Forecasting for Cross-Market Equity Analysis", authors: "Novanto Yudistira, Yanuar Putra Kharisma Adhiyasa", year: "2026", domain: "posted content", abstract: "Time-series foundation models and retrieval-based augmentation have emerged as relevant tools for financial forecasting.", url: "https://doi.org/10.21203/rs.3.rs-10178277/v1" },
    { id: "10.2196/preprints.106157", title: "Does retrieval-augmented generation impact medical students' perceptions of large language models?", authors: "Rohin Athavale, Alexander Cresswell, Alice Huffman", year: "2026", domain: "posted content", abstract: "There is evidence of rapid adoption of LLMs in undergraduate medical education, raising concerns about accuracy and student trust.", url: "https://doi.org/10.2196/preprints.106157" },
    { id: "10.3390/buildings16132637", title: "An Agentic AI System for Roof Design Compliance Using Computer Vision, Retrieval-Augmented Generation and Large Language Models", authors: "Nawari O. Nawari, Oluwatoyin O. Lawal", year: "2026", domain: "journal article", abstract: "Designers and building officials face increasing pressure to accelerate design review accuracy for roof assemblies and rooftop structures.", url: "https://doi.org/10.3390/buildings16132637" },
    { id: "10.21079/11681/50309", title: "Microsoft Azure AI/ML hackathon for development of retrieval-augmented generation large language model", authors: "Janet L. Autrey, Lacey S. Duckworth, Ashly N. Horner, Thomas Sigler, Victoria D. Moore", year: "2026", domain: "report", abstract: "The US Army Corps of Engineers Civil Works research mission addresses environmental sustainability problems via applied RAG systems.", url: "https://doi.org/10.21079/11681/50309" },
    { id: "10.63646/kpqm1958", title: "The Age of Autonomous Agents: A Bibliometric Review of Agentic AI Architectures, Applications, and Emerging Challenges", authors: "Ben J. Weber, Clara M. Hofmann, Amara N. Okoye", year: "2026", domain: "journal article", abstract: "The rapid evolution of LLMs has catalyzed a shift from passive AI systems toward autonomous agentic architectures capable of reasoning and tool use.", url: "https://doi.org/10.63646/kpqm1958" },
    { id: "10.21203/rs.3.rs-10012178/v1", title: "Retrieval-Augmented Generation (RAG), Generative AI, and Agentic AI Governance", authors: "Audrey Rah, Sven Hahues", year: "2026", domain: "posted content", abstract: "Enterprise adoption of GenAI, RAG, and agentic AI is advancing faster than many organizations can adapt their governance frameworks.", url: "https://doi.org/10.21203/rs.3.rs-10012178/v1" },
    { id: "10.47576/2949-1894.2026.7.7.023", title: "Снижение рисков применения LLM в сфере экономической безопасности предприятий молочной промышленности на основе подхода RAG", authors: "И.В. Ермаков, В.В. Филатов", year: "2026", domain: "journal article", abstract: "Nghiên cứu về giảm rủi ro khi ứng dụng LLM trong lĩnh vực an ninh kinh tế doanh nghiệp ngành sữa dựa trên phương pháp RAG.", url: "https://doi.org/10.47576/2949-1894.2026.7.7.023" },
    { id: "10.21203/rs.3.rs-9882260/v1", title: "Operationalizing Reliability Gaps in Large Language Models: A Semi-Systematic Evidence Map", authors: "Kushal Budha, Nikesh Lagun", year: "2026", domain: "posted content", abstract: "LLMs increasingly support reasoning and RAG-based knowledge work, but high benchmark performance doesn't by itself establish reliability.", url: "https://doi.org/10.21203/rs.3.rs-9882260/v1" },
    { id: "10.52060/juptik.v4i1.4318", title: "Chatbot Hybrid Fatwa MUI Menggunakan Retrieval Augmented Generation dan Large Language Model", authors: "Surya Hidayatullah Firdaus, Nazruddin Safaat H, Yelfi Vitriani, Novriyanto", year: "2026", domain: "journal article", abstract: "Aksesibilitas dokumen digital Fatwa MUI yang terfragmentasi membuat pencarian informasi kurang efektif tanpa sistem RAG hybrid.", url: "https://doi.org/10.52060/juptik.v4i1.4318" },
    { id: "10.54254/2753-8818/2026.dl34055", title: "Hallucination in Large Language Models and Retrieval-Augmented Generation: Mechanisms, Mitigation, and Evaluation", authors: "Haopeng Yang", year: "2026", domain: "journal article", abstract: "LLMs have demonstrated strong generative capability, but their outputs remain vulnerable to hallucination including factual errors.", url: "https://doi.org/10.54254/2753-8818/2026.dl34055" },
    { id: "10.22214/ijraset.2026.82233", title: "Hybrid Graph Neural Network and Large Language Model Framework for Robust Knowledge Graph Question Answering via RAG", authors: "Sohail Khan", year: "2026", domain: "journal article", abstract: "Knowledge graphs hold facts as connected triples and have become a backbone for systems that reason over linked information.", url: "https://doi.org/10.22214/ijraset.2026.82233" },
    { id: "10.21203/rs.3.rs-9770645/v1", title: "Adapting Large Language Models for Low-Resource Regulated Domains: Insurance Information Delivery in Kenya", authors: "Amos Mbeki Nyagar", year: "2026", domain: "posted content", abstract: "Insurance penetration in Kenya stands at roughly 2.3% of GDP, well below the global average, partly due to low financial literacy.", url: "https://doi.org/10.21203/rs.3.rs-9770645/v1" },
    { id: "10.1093/sleep/zsag091.0346", title: "0346 Retrieval Augmented Generation Improves Large Language Model Performance in Sleep Medicine", authors: "Joseph Cheung, Pengze Li, Anshum Patel, SaiKrishna Vallamchetla, Het Contractor, Hayden Heninger, Cui Tao", year: "2026", domain: "journal article", abstract: "Generic LLMs often lack domain-specific grounding, leading to hallucinations in high-stakes clinical contexts without RAG augmentation.", url: "https://doi.org/10.1093/sleep/zsag091.0346" },
    { id: "10.32473/flairs.39.1.141782", title: "An Exploratory Study of Agentic Retrieval Augmented Generation for Mental Health Oriented Language Models", authors: "Khoa Pham, Jiacheng Li, Hassan S. Al Khatib, Shahram Rahimi, Noorbakhsh Amiri Golilarz, Andy Perkins", year: "2026", domain: "journal article", abstract: "Mental health conditions affect over one billion individuals globally and remain challenging to assess due to fragmented clinical data.", url: "https://doi.org/10.32473/flairs.39.1.141782" },
    { id: "10.55041/isjem07213", title: "Speculative Retrieval-Augmented Generation for Cost-Efficient Large Language Model Inference", authors: "Dr. Sumalatha P, Manoj Kumar", year: "2026", domain: "journal article", abstract: "This work targets two crucial RAG bottlenecks: high inference latency and expensive computation cost.", url: "https://doi.org/10.55041/isjem07213" },
    { id: "10.20944/preprints202604.0339.v1", title: "Retrieval-Augmented Large Language Model Agents for Automated Scientific Literature Review Generation", authors: "Ruotong Wang, Nyutian Long, Shunqi Liu, Yuxi Wang, Zhen Qi, Huajun Zhang", year: "2026", domain: "posted content", abstract: "This study integrates retrieval-augmented mechanisms into LLM agents for scientific literature review generation.", url: "https://doi.org/10.20944/preprints202604.0339.v1" },
    { id: "10.70121/001c.158711", title: "The Role of Retrieval-Augmented Generation in Improving Factual Accuracy for Medical Large Language Models", authors: "Eason Ni", year: "2026", domain: "journal article", abstract: "LLMs relying solely on parametric memory demonstrate strong biomedical QA performance but tend to hallucinate facts without RAG grounding.", url: "https://doi.org/10.70121/001c.158711" },
    { id: "10.36227/techrxiv.177272838.89432844/v1", title: "A Survey of (Deep RAG) Deep Retrieval Augmented Generation and Reasoning in Large Language Models", authors: "Lihui Liu", year: "2026", domain: "posted content", abstract: "RAG has emerged as a powerful paradigm for combining LLMs with external knowledge sources to produce accurate, verifiable outputs.", url: "https://doi.org/10.36227/techrxiv.177272838.89432844/v1" },
    { id: "10.3390/app16052244", title: "Hybrid Retrieval-Augmented Generation: Semantic and Structural Integration for Large Language Model Reasoning", authors: "Hyewon Lee, Sungsu Lim", year: "2026", domain: "journal article", abstract: "Recent GraphRAG methods based on knowledge graphs primarily rely on structural path-level retrievers, missing fine-grained semantic relevance.", url: "https://doi.org/10.3390/app16052244" },
    { id: "10.35314/3y9hy151", title: "Implementation of Retrieval-Augmented Generation Method on Large Language Model for Campus Service and Information Chatbot", authors: "Muhammad Dzaki Salman, Rahmaddeni, Torkis Nasution, Susanti", year: "2026", domain: "journal article", abstract: "LLMs can improve information services in higher education, but are prone to generating answers not grounded in the campus corpus.", url: "https://doi.org/10.35314/3y9hy151" },
    { id: "10.20944/preprints202602.0996.v1", title: "Clinical Large Language Models with Multi-Stage Instruction Tuning and Advanced Retrieval-Augmented Generation", authors: "Donald Martin, Blake Bowman", year: "2026", domain: "posted content", abstract: "The demand for efficient Clinical Decision Support Systems is growing rapidly, driven by the escalating volume of medical data.", url: "https://doi.org/10.20944/preprints202602.0996.v1" },
  ];

  const filteredPapers = papers.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.authors.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section id="corpus" className="py-20 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#124f8c]/10 text-[#124f8c] text-xs font-bold uppercase tracking-wider mb-3">
            <Database className="w-3.5 h-3.5" />
            Academic Research Corpus
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0b192c] tracking-tight">
            24 Bài Báo Khoa Học (Crossref Dataset)
          </h2>
          <p className="text-slate-600 mt-3 text-base">
            Toàn bộ kho tài liệu được thu thập qua Crossref REST API, đã qua xử lý bóc tách JATS XML và sẵn sàng cho Vector Search.
          </p>
        </div>

        {/* Search Bar & Corpus Meta */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, tác giả hoặc chủ đề..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-[#124f8c] focus:ring-1 focus:ring-[#124f8c] transition-all"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              24 bài báo đã chuẩn hóa
            </span>
            <span>•</span>
            <span className="font-mono text-[#124f8c]">ChromaDB Indexed</span>
          </div>
        </div>

        {/* Papers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPapers.map((paper, idx) => (
            <div
              key={idx}
              className="academic-card p-6 rounded-2xl flex flex-col justify-between hover:border-[#124f8c]/40 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#124f8c] border border-blue-100">
                    {paper.domain}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {paper.year}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#0b192c] group-hover:text-[#124f8c] transition-colors leading-snug line-clamp-2 mb-2">
                  {paper.title}
                </h3>

                <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{paper.authors}</span>
                </p>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
                  {paper.abstract}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-mono text-[10px] text-slate-400 truncate max-w-[170px]">
                  DOI: {paper.id}
                </span>
                <a
                  href={paper.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-[#124f8c] hover:underline"
                >
                  <span>Xem Crossref</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
