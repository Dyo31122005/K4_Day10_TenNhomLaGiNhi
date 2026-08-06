from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import UTC, datetime
import hashlib
import json
from pathlib import Path
from typing import Any, Literal

from core.config import Settings
from core.utils import read_json, write_json, write_text
from retrieval.index import (
    LocalEmbeddingIndex,
    SmokeCheck,
    load_clean_dataframe,
    prepare_smoke_checks,
)


IndexVariant = Literal["baseline", "corrupted", "repaired"]


@dataclass(frozen=True)
class IndexArtifacts:
    variant: IndexVariant
    clean_path: Path
    manifest_path: Path
    collection_name: str
    build_log_path: Path


@dataclass(frozen=True)
class IndexVerification:
    collection_name: str
    clean_rows: int
    manifest_documents: int
    collection_documents: int
    paper_ids_match: bool
    contents_match: bool
    embedding_model_match: bool
    passed: bool


@dataclass(frozen=True)
class SmokeResult:
    query: str
    expected_paper_id: str
    search_paper_ids: list[str]
    search_titles: list[str]
    search_scores: list[float]
    lookup_paper_id: str | None
    search_hit: bool
    lookup_hit: bool


def resolve_index_artifacts(settings: Settings, variant: IndexVariant) -> IndexArtifacts:
    variants = {
        "baseline": (
            settings.paths.clean_csv,
            settings.paths.embeddings_json,
            settings.baseline_collection_name,
        ),
        "corrupted": (
            settings.paths.corrupted_clean_csv,
            settings.paths.corrupted_embeddings_json,
            settings.corrupted_collection_name,
        ),
        "repaired": (
            settings.paths.repaired_clean_csv,
            settings.paths.repaired_embeddings_json,
            settings.repaired_collection_name,
        ),
    }
    clean_path, manifest_path, collection_name = variants[variant]
    return IndexArtifacts(
        variant=variant,
        clean_path=clean_path,
        manifest_path=manifest_path,
        collection_name=collection_name,
        build_log_path=manifest_path.with_name(f"{manifest_path.stem}_build_log.json"),
    )


def _documents_digest(documents: list[dict[str, Any]]) -> str:
    canonical = [
        {
            "paper_id": str(document["paper_id"]),
            "title": str(document["title"]),
            "content": str(document["content"]),
        }
        for document in documents
    ]
    payload = json.dumps(canonical, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def collection_signature(index: LocalEmbeddingIndex) -> dict[str, Any]:
    """Return a stable signature used to prove another build did not mutate this collection."""

    return {
        "collection_name": index.collection_name,
        "count": index.collection.count(),
        "documents_sha256": _documents_digest(index.documents),
    }


def verify_index_manifest(
    index: LocalEmbeddingIndex,
    settings: Settings,
    variant: IndexVariant,
) -> IndexVerification:
    artifacts = resolve_index_artifacts(settings, variant)
    strict_content = variant != "corrupted"
    df = load_clean_dataframe(artifacts.clean_path, strict_content=strict_content)
    payload = read_json(artifacts.manifest_path)
    expected_documents = LocalEmbeddingIndex._build_documents(
        df,
        strict_validation=strict_content,
    )
    manifest_documents = payload.get("documents", [])
    expected_ids = [document["paper_id"] for document in expected_documents]
    manifest_ids = [document.get("paper_id") for document in manifest_documents]
    paper_ids_match = expected_ids == manifest_ids
    contents_match = _documents_digest(expected_documents) == _documents_digest(manifest_documents)
    model_match = payload.get("embedding_model") == settings.embedding_model
    collection_count = index.collection.count()
    passed = all(
        (
            payload.get("collection_name") == artifacts.collection_name,
            len(df) == len(manifest_documents) == collection_count,
            paper_ids_match,
            contents_match,
            model_match,
        )
    )
    return IndexVerification(
        collection_name=index.collection_name,
        clean_rows=len(df),
        manifest_documents=len(manifest_documents),
        collection_documents=collection_count,
        paper_ids_match=paper_ids_match,
        contents_match=contents_match,
        embedding_model_match=model_match,
        passed=passed,
    )


def run_smoke_check(index: LocalEmbeddingIndex, check: SmokeCheck, top_k: int = 4) -> SmokeResult:
    results = index.search(check.semantic_query, top_k=top_k)
    lookup = index.lookup(check.lookup_value)
    result_ids = [item.paper_id for item in results]
    lookup_id = str(lookup["paper_id"]) if lookup else None
    return SmokeResult(
        query=check.semantic_query,
        expected_paper_id=check.expected_paper_id,
        search_paper_ids=result_ids,
        search_titles=[item.title for item in results],
        search_scores=[round(item.score, 6) for item in results],
        lookup_paper_id=lookup_id,
        search_hit=check.expected_paper_id in result_ids,
        lookup_hit=lookup_id == check.expected_paper_id,
    )


def build_and_verify_index(
    settings: Settings,
    variant: IndexVariant,
    smoke_check: SmokeCheck | None = None,
) -> tuple[LocalEmbeddingIndex, IndexVerification, SmokeResult | None]:
    """Build one named collection, verify lineage, and persist an auditable build log."""

    artifacts = resolve_index_artifacts(settings, variant)
    strict_content = variant != "corrupted"
    df = load_clean_dataframe(artifacts.clean_path, strict_content=strict_content)
    index = LocalEmbeddingIndex.build(
        df=df,
        settings=settings,
        embeddings_output_path=artifacts.manifest_path,
        strict_validation=strict_content,
    )
    verification = verify_index_manifest(index, settings, variant)
    if not verification.passed:
        raise RuntimeError(f"Index verification failed for {variant}: {verification}")
    selected_check = smoke_check
    if selected_check is None and variant == "baseline":
        selected_check = prepare_smoke_checks(df, limit=1)[0]
    smoke_result = run_smoke_check(index, selected_check) if selected_check else None
    write_json(
        artifacts.build_log_path,
        {
            "built_at_utc": datetime.now(UTC).isoformat(),
            "variant": variant,
            "clean_path": str(artifacts.clean_path.resolve()),
            "manifest_path": str(artifacts.manifest_path.resolve()),
            "persist_path": str(settings.paths.chroma_dir.resolve()),
            "embedding_model": settings.embedding_model,
            "collection_signature": collection_signature(index),
            "verification": asdict(verification),
            "smoke_result": asdict(smoke_result) if smoke_result else None,
        },
    )
    return index, verification, smoke_result


def build_verify_all_indexes(settings: Settings, report_path: Path | None = None) -> dict[str, Any]:
    """Build baseline/corrupted/repaired and prove collection isolation with one baseline query."""

    baseline_df = load_clean_dataframe(settings.paths.clean_csv)
    baseline_check = prepare_smoke_checks(baseline_df, limit=1)[0]
    baseline, baseline_verification, baseline_smoke = build_and_verify_index(
        settings,
        "baseline",
        baseline_check,
    )
    baseline_signature_before = collection_signature(baseline)

    corrupted, corrupted_verification, corrupted_smoke = build_and_verify_index(
        settings,
        "corrupted",
        baseline_check,
    )
    baseline_reloaded = LocalEmbeddingIndex.load(settings, settings.paths.embeddings_json)
    baseline_signature_after_corrupted = collection_signature(baseline_reloaded)
    baseline_unchanged = baseline_signature_before == baseline_signature_after_corrupted
    if not baseline_unchanged:
        raise RuntimeError("Building papers-corrupted mutated papers-baseline.")

    repaired, repaired_verification, repaired_smoke = build_and_verify_index(
        settings,
        "repaired",
        baseline_check,
    )
    outcomes = {
        "embedding_model": settings.embedding_model,
        "persist_path": str(settings.paths.chroma_dir.resolve()),
        "baseline_query": baseline_check.semantic_query,
        "baseline_unchanged_after_corrupted_build": baseline_unchanged,
        "collections": {
            "baseline": {
                "manifest_path": str(settings.paths.embeddings_json.resolve()),
                "verification": asdict(baseline_verification),
                "smoke": asdict(baseline_smoke) if baseline_smoke else None,
            },
            "corrupted": {
                "manifest_path": str(settings.paths.corrupted_embeddings_json.resolve()),
                "verification": asdict(corrupted_verification),
                "smoke": asdict(corrupted_smoke) if corrupted_smoke else None,
            },
            "repaired": {
                "manifest_path": str(settings.paths.repaired_embeddings_json.resolve()),
                "verification": asdict(repaired_verification),
                "smoke": asdict(repaired_smoke) if repaired_smoke else None,
            },
        },
    }
    destination = report_path or settings.paths.project_dir / "data" / "reports" / "retrieval_collections.md"
    write_retrieval_report(outcomes, destination)
    return outcomes


def write_retrieval_report(outcomes: dict[str, Any], path: Path) -> None:
    """Write the team-facing search, lookup, and collection-isolation evidence."""

    lines = [
        "# Retrieval collections verification",
        "",
        f"- Embedding model: `{outcomes['embedding_model']}`",
        f"- Chroma persist path: `{outcomes['persist_path']}`",
        f"- Reproducible baseline query: `{outcomes['baseline_query']}`",
        f"- Baseline unchanged after corrupted build: `{outcomes['baseline_unchanged_after_corrupted_build']}`",
        "",
        "| Variant | Collection | Clean/manifest/Chroma | Search top paper | Exact lookup | Manifest |",
        "|---|---|---:|---|---|---|",
    ]
    for variant, result in outcomes["collections"].items():
        verification = result["verification"]
        smoke = result["smoke"] or {}
        counts = (
            f"{verification['clean_rows']}/"
            f"{verification['manifest_documents']}/"
            f"{verification['collection_documents']}"
        )
        top_id = (smoke.get("search_paper_ids") or ["no result"])[0]
        lookup = smoke.get("lookup_paper_id") or "not found"
        lines.append(
            f"| {variant} | `{verification['collection_name']}` | {counts} | "
            f"`{top_id}` | `{lookup}` | `{result['manifest_path']}` |"
        )
    lines.extend(
        [
            "",
            "## Interpretation",
            "",
            "The same query is run against all three collections. Differences in ranked IDs or scores "
            "come from their respective clean/corrupted/repaired inputs. Exact lookup uses the baseline "
            "paper ID, so a missing result in the corrupted collection is valid evidence of corruption.",
            "",
            "Each collection has its own name, embedding manifest, and build log. The collections share "
            "one Chroma persistence directory but are independently replaceable and reloadable.",
        ]
    )
    write_text(path, "\n".join(lines) + "\n")
