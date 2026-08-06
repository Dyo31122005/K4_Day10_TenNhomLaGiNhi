from __future__ import annotations

from pathlib import Path
import sys

# Reuse the existing lab package (core, retrieval, ...) instead of re-implementing
# the RAG logic in a second language. Neither `src/` nor this `backend/` folder is
# pip-installed, so both are added to sys.path like the lab's own scripts do.
ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
BACKEND_DIR = Path(__file__).resolve().parent
for path in (SRC, BACKEND_DIR):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core.config import load_settings
from core.utils import read_json
from llm_fallback import resolve_llm_settings
from retrieval.agent import build_agent, run_agent_question
from retrieval.index import LocalEmbeddingIndex
from retrieval.qa import answer_question

settings = load_settings(project_dir=ROOT)

DATASET_PATHS = {
    "baseline": settings.paths.embeddings_json,
    "corrupted": settings.paths.corrupted_embeddings_json,
    "repaired": settings.paths.repaired_embeddings_json,
}

app = FastAPI(title="Day10 Paper RAG Chatbot")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_index_cache: dict[str, LocalEmbeddingIndex] = {}
_agent_cache: dict[str, object] = {}
_agent_provider: dict[str, str] = {}


def _get_index(dataset: str) -> LocalEmbeddingIndex:
    if dataset not in DATASET_PATHS:
        raise HTTPException(400, f"Unknown dataset '{dataset}'. Expected one of {list(DATASET_PATHS)}.")
    if dataset in _index_cache:
        return _index_cache[dataset]

    path = DATASET_PATHS[dataset]
    if not path.exists():
        raise HTTPException(
            503,
            f"'{dataset}' chưa được build (thiếu {path.name}). "
            f"Đợi role RAG/lead chạy xong checkpoint tương ứng rồi thử lại.",
        )
    index = LocalEmbeddingIndex.load(settings, embeddings_path=path)
    _index_cache[dataset] = index
    return index


def _get_agent(dataset: str):
    if dataset in _agent_cache:
        return _agent_cache[dataset]
    index = _get_index(dataset)
    try:
        candidate_settings, provider_used = resolve_llm_settings(settings)
    except RuntimeError as exc:
        raise HTTPException(500, str(exc)) from exc
    agent = build_agent(candidate_settings, index)
    _agent_cache[dataset] = agent
    _agent_provider[dataset] = provider_used
    return agent


class ChatRequest(BaseModel):
    question: str
    dataset: str = "baseline"
    mode: str = "agent"  # "agent" (LLM + tools, with provider fallback) or "qa" (rule-based, no LLM key needed)


class Source(BaseModel):
    paper_id: str
    title: str
    score: float | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source]
    dataset: str
    mode: str
    provider: str | None = None


def _dataset_info(path: Path) -> dict:
    if not path.exists():
        return {"ready": False, "paper_count": None, "collection_name": None}
    try:
        manifest = read_json(path)
        return {
            "ready": True,
            "paper_count": len(manifest.get("documents", [])),
            "collection_name": manifest.get("collection_name"),
        }
    except Exception:
        return {"ready": True, "paper_count": None, "collection_name": None}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "datasets": {name: _dataset_info(path) for name, path in DATASET_PATHS.items()},
    }


@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):
    question = payload.question.strip()
    if not question:
        raise HTTPException(400, "question không được để trống.")

    if payload.mode == "qa":
        index = _get_index(payload.dataset)
        result = answer_question(question, settings, index)
        sources = [
            Source(paper_id=pid, title=title)
            for pid, title in zip(result.retrieved_doc_ids, result.retrieved_titles)
        ]
        return ChatResponse(answer=result.answer, sources=sources, dataset=payload.dataset, mode="qa")

    agent = _get_agent(payload.dataset)
    answer = run_agent_question(agent, question)
    index = _get_index(payload.dataset)
    hits = index.search(question, top_k=settings.top_k)
    sources = [Source(paper_id=h.paper_id, title=h.title, score=round(h.score, 4)) for h in hits]
    return ChatResponse(
        answer=answer,
        sources=sources,
        dataset=payload.dataset,
        mode="agent",
        provider=_agent_provider.get(payload.dataset),
    )
