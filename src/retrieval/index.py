from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import chromadb
import pandas as pd

from core.config import Settings
from core.utils import read_json, safe_slug, write_json
from retrieval.embeddings import MiniLMEmbeddings
from retrieval.reranker import DEFAULT_RERANKER_MODEL, MiniLMCrossEncoderReranker


REQUIRED_CLEAN_COLUMNS = (
    "paper_id",
    "title",
    "text_for_embedding",
    "published",
    "authors_joined",
    "categories_joined",
    "summary",
)

# These fields are enough for exact lookup, citations, and the deterministic QA
# helpers. URLs are kept when available, but are not required by the index.
MINIMUM_METADATA_FIELDS = (
    "paper_id",
    "title",
    "published",
    "authors_joined",
    "categories_joined",
    "summary",
)
OPTIONAL_METADATA_FIELDS = ("abs_url", "pdf_url")


def _clean_scalar_text(value: Any) -> str:
    """Convert a dataframe scalar to text without leaking pandas NaN markers."""

    if value is None or pd.isna(value):
        return ""
    return str(value).strip()


@dataclass(frozen=True)
class IndexConfig:
    """Auditable index configuration prepared before a collection is built."""

    clean_path: Path
    persist_path: Path
    collection_name: str
    embedding_model: str
    distance_metric: str = "cosine"
    metadata_fields: tuple[str, ...] = MINIMUM_METADATA_FIELDS


@dataclass(frozen=True)
class SmokeCheck:
    """A reproducible search/lookup case derived from one clean record."""

    semantic_query: str
    lookup_value: str
    expected_paper_id: str


@dataclass(frozen=True)
class SearchResult:
    paper_id: str
    title: str
    score: float
    content: str
    metadata: dict[str, Any]
    vector_score: float | None = None
    rerank_score: float | None = None


class LocalEmbeddingIndex:
    def __init__(
        self,
        settings: Settings,
        collection_name: str,
        documents: list[dict[str, Any]],
        persist_path: Path,
    ):
        self.settings = settings
        self.collection_name = collection_name
        self.documents = documents
        self.persist_path = persist_path
        self.embedding_backend = "chroma"
        self.embedding_model = MiniLMEmbeddings(settings.embedding_model)
        self.reranker = MiniLMCrossEncoderReranker(DEFAULT_RERANKER_MODEL)
        self.client = chromadb.PersistentClient(path=str(persist_path))
        self.collection = self.client.get_collection(name=collection_name)
        self.documents_by_paper_id = {document["paper_id"].lower(): document for document in documents}
        self.documents_by_title = {document["title"].lower(): document for document in documents}

    @staticmethod
    def _build_documents(df: pd.DataFrame, strict_validation: bool = True) -> list[dict[str, Any]]:
        validate_clean_dataframe(df, strict_content=strict_validation)
        records = df.to_dict(orient="records")
        documents: list[dict[str, Any]] = []
        for index, row in enumerate(records):
            metadata = {
                field: _clean_scalar_text(row[field])
                for field in MINIMUM_METADATA_FIELDS
            }
            metadata.update(
                {
                    field: _clean_scalar_text(row[field])
                    for field in OPTIONAL_METADATA_FIELDS
                    if field in row and _clean_scalar_text(row[field])
                }
            )
            paper_id = _clean_scalar_text(row["paper_id"])
            documents.append(
                {
                    "record_id": f"{paper_id}::{index}",
                    "paper_id": paper_id,
                    "title": _clean_scalar_text(row["title"]),
                    "content": _clean_scalar_text(row["text_for_embedding"]),
                    "metadata": metadata,
                }
            )
        return documents

    @staticmethod
    def _derive_collection_name(settings: Settings, embeddings_output_path: Path | None) -> str:
        if embeddings_output_path is None:
            return settings.baseline_collection_name

        name_map = {
            settings.paths.embeddings_json.resolve(): settings.baseline_collection_name,
            settings.paths.corrupted_embeddings_json.resolve(): settings.corrupted_collection_name,
            settings.paths.repaired_embeddings_json.resolve(): settings.repaired_collection_name,
        }
        resolved_path = embeddings_output_path.resolve()
        if resolved_path in name_map:
            return name_map[resolved_path]
        return safe_slug(embeddings_output_path.stem)

    @classmethod
    def build(
        cls,
        df: pd.DataFrame,
        settings: Settings,
        embeddings_output_path: Path | None = None,
        strict_validation: bool | None = None,
    ) -> "LocalEmbeddingIndex":
        collection_name = cls._derive_collection_name(settings, embeddings_output_path)
        if strict_validation is None:
            strict_validation = collection_name != settings.corrupted_collection_name
        documents = cls._build_documents(df, strict_validation=strict_validation)
        persist_path = settings.paths.chroma_dir
        persist_path.mkdir(parents=True, exist_ok=True)

        embedding_model = MiniLMEmbeddings(settings.embedding_model)
        client = chromadb.PersistentClient(path=str(persist_path))
        existing_collections = {item.name for item in client.list_collections()}
        if collection_name in existing_collections:
            client.delete_collection(name=collection_name)
        collection = client.create_collection(
            name=collection_name,
            configuration={"hnsw": {"space": "cosine"}},
        )
        embeddings = embedding_model.embed_documents([document["content"] for document in documents])
        collection.add(
            ids=[document["record_id"] for document in documents],
            embeddings=embeddings,
            documents=[document["content"] for document in documents],
            metadatas=[document["metadata"] for document in documents],
        )

        manifest_path = embeddings_output_path or settings.paths.embeddings_json
        write_json(
            manifest_path,
            {
                "backend": "chroma",
                "embedding_model": settings.embedding_model,
                "reranker_model": DEFAULT_RERANKER_MODEL,
                "retrieval_strategy": "chroma-cosine-candidates-then-cross-encoder-rerank",
                "persist_path": str(persist_path),
                "collection_name": collection_name,
                "documents": documents,
            },
        )
        return cls(
            settings=settings,
            collection_name=collection_name,
            documents=documents,
            persist_path=persist_path,
        )

    @classmethod
    def load(cls, settings: Settings, embeddings_path: Path | None = None) -> "LocalEmbeddingIndex":
        payload = read_json(embeddings_path or settings.paths.embeddings_json)
        return cls(
            settings=settings,
            collection_name=payload["collection_name"],
            documents=payload["documents"],
            persist_path=Path(payload["persist_path"]),
        )

    def search(
        self,
        query: str,
        top_k: int | None = None,
        rerank: bool = True,
        candidate_multiplier: int = 4,
    ) -> list[SearchResult]:
        requested_k = top_k or self.settings.top_k
        if requested_k < 1:
            raise ValueError("top_k must be at least 1.")
        if candidate_multiplier < 1:
            raise ValueError("candidate_multiplier must be at least 1.")
        collection_count = self.collection.count()
        if collection_count == 0:
            return []
        candidate_k = min(collection_count, requested_k * candidate_multiplier if rerank else requested_k)
        query_embedding = self.embedding_model.embed_query(query)
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=candidate_k,
            include=["documents", "metadatas", "distances"],
        )
        ids = results.get("ids", [[]])[0]
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        scored: list[SearchResult] = []
        for record_id, content, metadata, distance in zip(ids, documents, metadatas, distances, strict=False):
            if not record_id or not metadata or not content:
                continue
            scored.append(
                SearchResult(
                    paper_id=str(metadata["paper_id"]),
                    title=str(metadata["title"]),
                    score=max(0.0, 1.0 - float(distance or 0.0)),
                    content=str(content),
                    metadata=dict(metadata),
                    vector_score=max(0.0, 1.0 - float(distance or 0.0)),
                )
            )
        if not rerank or not scored:
            return scored[:requested_k]

        rerank_logits = self.reranker.score(query, [item.content for item in scored])
        reranked = [
            SearchResult(
                paper_id=item.paper_id,
                title=item.title,
                score=self.reranker.normalized_score(logit),
                content=item.content,
                metadata=item.metadata,
                vector_score=item.vector_score,
                rerank_score=logit,
            )
            for item, logit in zip(scored, rerank_logits, strict=True)
        ]
        reranked.sort(
            key=lambda item: item.rerank_score if item.rerank_score is not None else float("-inf"),
            reverse=True,
        )
        return reranked[:requested_k]

    def lookup(self, value: str) -> dict[str, Any] | None:
        needle = value.strip().lower()
        if needle in self.documents_by_paper_id:
            return self.documents_by_paper_id[needle]
        if needle in self.documents_by_title:
            return self.documents_by_title[needle]
        return None


def prepare_index_config(
    settings: Settings,
    clean_path: Path | None = None,
    embeddings_output_path: Path | None = None,
) -> IndexConfig:
    """Prepare the baseline/corrupted/repaired index inputs without building it."""

    source_path = (clean_path or settings.paths.clean_csv).resolve()
    return IndexConfig(
        clean_path=source_path,
        persist_path=settings.paths.chroma_dir.resolve(),
        collection_name=LocalEmbeddingIndex._derive_collection_name(settings, embeddings_output_path),
        embedding_model=settings.embedding_model,
    )


def load_clean_dataframe(clean_path: Path, strict_content: bool = True) -> pd.DataFrame:
    """Read a clean CSV/JSON artifact and enforce the retrieval schema contract."""

    if not clean_path.exists():
        raise FileNotFoundError(f"Clean dataset is not available yet: {clean_path}")
    suffix = clean_path.suffix.lower()
    if suffix == ".csv":
        df = pd.read_csv(clean_path)
    elif suffix == ".json":
        df = pd.read_json(clean_path)
    else:
        raise ValueError(f"Unsupported clean dataset format: {clean_path.suffix}")
    validate_clean_dataframe(df, strict_content=strict_content)
    return df


def validate_clean_dataframe(df: pd.DataFrame, strict_content: bool = True) -> None:
    """Fail early when cleaned data cannot safely be embedded or looked up."""

    missing = [column for column in REQUIRED_CLEAN_COLUMNS if column not in df.columns]
    if missing:
        raise ValueError(f"Clean dataframe is missing retrieval columns: {', '.join(missing)}")
    if df.empty:
        raise ValueError("Clean dataframe has no records to index.")

    for column in ("paper_id", "title"):
        values = df[column].fillna("").astype(str).str.strip()
        if values.eq("").any():
            bad_rows = values.index[values.eq("")].tolist()[:5]
            raise ValueError(f"Column {column!r} is blank at rows: {bad_rows}")

    if not strict_content:
        return

    for column in ("text_for_embedding", "summary"):
        values = df[column].fillna("").astype(str).str.strip()
        if values.eq("").any():
            bad_rows = values.index[values.eq("")].tolist()[:5]
            raise ValueError(f"Column {column!r} is blank at rows: {bad_rows}")

    normalized_ids = df["paper_id"].astype(str).str.strip().str.lower()
    if normalized_ids.duplicated().any():
        duplicates = normalized_ids[normalized_ids.duplicated(keep=False)].unique().tolist()[:5]
        raise ValueError(f"paper_id must be unique; duplicates: {duplicates}")

    embedding_texts = df["text_for_embedding"].astype(str).str.strip()
    normalized_texts = embedding_texts.str.replace(r"\s+", " ", regex=True).str.casefold()
    if normalized_texts.duplicated().any():
        duplicate_rows = normalized_texts.index[normalized_texts.duplicated(keep=False)].tolist()[:5]
        raise ValueError(f"text_for_embedding is duplicated at rows: {duplicate_rows}")

    for row_index in df.index:
        normalized_text = normalized_texts.loc[row_index]
        for source_column in ("title", "summary"):
            expected = " ".join(str(df.at[row_index, source_column]).split()).casefold()
            if expected not in normalized_text:
                raise ValueError(
                    f"text_for_embedding at row {row_index} does not contain {source_column}."
                )


def prepare_smoke_checks(df: pd.DataFrame, limit: int = 3) -> list[SmokeCheck]:
    """Create deterministic post-index search and exact-lookup checks from clean data."""

    validate_clean_dataframe(df)
    if limit < 1:
        raise ValueError("Smoke-check limit must be at least 1.")
    checks: list[SmokeCheck] = []
    for row in df.head(limit).to_dict(orient="records"):
        checks.append(
            SmokeCheck(
                semantic_query=str(row["title"]).strip(),
                lookup_value=str(row["paper_id"]).strip(),
                expected_paper_id=str(row["paper_id"]).strip(),
            )
        )
    return checks
