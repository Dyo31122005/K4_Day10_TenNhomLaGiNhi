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
from llm_fallback import iter_llm_candidates
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


def _load_index_local(embeddings_path: Path) -> LocalEmbeddingIndex:
    """Load an index manifest but ignore its recorded `persist_path`.

    `LocalEmbeddingIndex.load()` trusts the absolute `persist_path` baked into
    the manifest at build time -- but that path reflects whichever teammate's
    machine last regenerated the embeddings (seen so far: `D:\\Anh Tuan\\...`,
    `H:\\Lab_day10\\...`), not this machine. Chroma then raises
    `chromadb.errors.NotFoundError` for a collection that in fact exists, just
    under `settings.paths.chroma_dir` locally. Rebuilding the same object via
    the public constructor with the local path sidesteps that without editing
    the shared retrieval/index.py contract.
    """
    payload = read_json(embeddings_path)
    return LocalEmbeddingIndex(
        settings=settings,
        collection_name=payload["collection_name"],
        documents=payload["documents"],
        persist_path=settings.paths.chroma_dir,
    )


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
    try:
        index = _load_index_local(path)
    except Exception as exc:
        raise HTTPException(500, f"Không load được index '{dataset}': {exc}") from exc
    _index_cache[dataset] = index
    return index


def _answer_with_fallback(question: str, index: LocalEmbeddingIndex) -> tuple[str, str]:
    """Try each LLM candidate in order until one actually answers.

    A present API key does not mean the account can serve a request right now
    (expired key, out of credits, rate limited) -- those only surface once we
    call the model. So unlike a static "pick a provider" resolver, this tries
    the real call per candidate and only moves on when it fails.
    """
    attempted: list[str] = []
    last_error: Exception | None = None
    for name, candidate_settings in iter_llm_candidates(settings):
        attempted.append(name)
        try:
            agent = build_agent(candidate_settings, index)
            answer = run_agent_question(agent, question)
            return answer, name
        except Exception as exc:  # noqa: BLE001 - genuinely any provider/network failure should fall through
            last_error = exc
            continue

    if not attempted:
        raise HTTPException(500, "Không có LLM provider nào có credential khả dụng.")
    raise HTTPException(
        500,
        f"Đã thử hết provider ({', '.join(attempted)}) nhưng đều lỗi. Lỗi cuối cùng: {last_error}",
    )


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


class PaperDetail(BaseModel):
    paper_id: str
    title: str
    authors_joined: str
    published: str
    categories_joined: str
    summary: str
    abs_url: str | None = None
    pdf_url: str | None = None


@app.get("/paper", response_model=PaperDetail)
def get_paper(dataset: str, paper_id: str):
    index = _get_index(dataset)
    record = index.lookup(paper_id)
    if not record:
        raise HTTPException(404, f"Không tìm thấy paper_id={paper_id!r} trong dataset '{dataset}'.")
    metadata = record["metadata"]
    return PaperDetail(
        paper_id=metadata["paper_id"],
        title=metadata["title"],
        authors_joined=metadata.get("authors_joined", ""),
        published=metadata.get("published", ""),
        categories_joined=metadata.get("categories_joined", ""),
        summary=metadata.get("summary", ""),
        abs_url=metadata.get("abs_url"),
        pdf_url=metadata.get("pdf_url"),
    )


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

    index = _get_index(payload.dataset)
    answer, provider_used = _answer_with_fallback(question, index)
    hits = index.search(question, top_k=settings.top_k)
    sources = [Source(paper_id=h.paper_id, title=h.title, score=round(h.score, 4)) for h in hits]
    return ChatResponse(
        answer=answer,
        sources=sources,
        dataset=payload.dataset,
        mode="agent",
        provider=provider_used,
    )
