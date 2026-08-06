from __future__ import annotations

from collections.abc import Iterable
from datetime import date, datetime
import html
import re
from typing import Any

import pandas as pd

from core.utils import compact_join, normalize_whitespace
from ingestion.crossref import PaperRecord


# This order is also the persisted clean-data contract.  Keep the raw fields
# first so the raw -> clean transformation remains easy to audit.
CLEAN_SCHEMA_COLUMNS = [
    "paper_id",
    "title",
    "summary",
    "authors",
    "categories",
    "primary_category",
    "published",
    "updated",
    "abs_url",
    "pdf_url",
    "comment",
    "authors_joined",
    "categories_joined",
    "summary_chars",
    "age_days",
    "text_for_embedding",
]

RAW_REQUIRED_FIELDS = {"paper_id", "title", "summary", "published"}
_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _clean_text(value: object) -> str:
    """Strip lightweight Crossref/JATS markup and normalize whitespace."""
    if value is None or pd.isna(value):
        return ""
    text = html.unescape(str(value))
    text = _HTML_TAG_RE.sub(" ", text)
    return normalize_whitespace(text)


def _clean_string_list(value: object) -> list[str]:
    """Return an ordered, de-duplicated list of normalized non-empty strings."""
    if value is None or (not isinstance(value, Iterable)) or isinstance(value, (str, bytes, dict)):
        return []
    cleaned: list[str] = []
    seen: set[str] = set()
    for item in value:
        normalized = _clean_text(item)
        key = normalized.casefold()
        if normalized and key not in seen:
            cleaned.append(normalized)
            seen.add(key)
    return cleaned


def _parse_iso_date(value: object) -> str:
    """Normalize valid date-like values to ISO calendar dates; invalid values are empty."""
    if value is None or pd.isna(value):
        return ""
    parsed = pd.to_datetime(str(value).strip(), errors="coerce", utc=True)
    if pd.isna(parsed):
        return ""
    return parsed.date().isoformat()


def build_text_for_embedding(row: dict[str, Any]) -> str:
    """Build the retrieval text from searchable paper content and useful context."""
    parts = [
        f"Title: {row['title']}",
        f"Summary: {row['summary']}",
    ]
    if row["authors_joined"]:
        parts.append(f"Authors: {row['authors_joined']}")
    if row["categories_joined"]:
        parts.append(f"Categories: {row['categories_joined']}")
    if row["comment"]:
        parts.append(f"Source: {row['comment']}")
    return "\n".join(parts)


def validate_clean_dataframe(df: pd.DataFrame) -> dict[str, Any]:
    """Validate the clean schema and return a checkpoint-friendly summary.

    The function intentionally raises ValueError for contract violations so it
    can be used both in CP1 and before a dataframe is sent to the indexer.
    """
    missing = [column for column in CLEAN_SCHEMA_COLUMNS if column not in df.columns]
    if missing:
        raise ValueError(f"Clean dataframe is missing columns: {missing}")
    null_required = {
        column: int(df[column].isna().sum() + (df[column].astype(str).str.strip() == "").sum())
        for column in RAW_REQUIRED_FIELDS
    }
    duplicate_paper_ids = int(df["paper_id"].duplicated().sum())
    invalid_dates = int(pd.to_datetime(df["published"], errors="coerce").isna().sum())
    empty_embedding_text = int((df["text_for_embedding"].astype(str).str.strip() == "").sum())
    failures = {
        "null_required": {key: value for key, value in null_required.items() if value},
        "duplicate_paper_ids": duplicate_paper_ids,
        "invalid_published_dates": invalid_dates,
        "empty_embedding_text": empty_embedding_text,
    }
    if any(failures.values()):
        raise ValueError(f"Clean dataframe validation failed: {failures}")
    return {"rows": len(df), "columns": list(df.columns), "is_valid": True}


def validate_raw_to_clean(records: list[PaperRecord], run_date: datetime) -> dict[str, Any]:
    """CP1 sample validation: transform raw records and assert the clean contract."""
    return validate_clean_dataframe(build_clean_dataframe(records, run_date))


def build_clean_dataframe(records: list[PaperRecord], run_date: datetime) -> pd.DataFrame:
    """Normalize raw records into the stable schema consumed by all downstream stages.

    Rows without a paper id, title, summary, or parseable published date are
    dropped. Duplicate paper ids keep the first raw occurrence. ``updated``
    falls back to ``published``; optional author/category lists become empty
    lists and their joined fields become empty strings.
    """
    run_day: date = run_date.date()
    rows: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for record in records:
        raw = record.__dict__
        paper_id = _clean_text(raw.get("paper_id")).lower()
        title = _clean_text(raw.get("title"))
        summary = _clean_text(raw.get("summary"))
        published = _parse_iso_date(raw.get("published"))
        if not paper_id or not title or not summary or not published or paper_id in seen_ids:
            continue
        seen_ids.add(paper_id)

        authors = _clean_string_list(raw.get("authors"))
        categories = _clean_string_list(raw.get("categories"))
        primary_category = _clean_text(raw.get("primary_category"))
        if not primary_category and categories:
            primary_category = categories[0]
        if primary_category and primary_category.casefold() not in {item.casefold() for item in categories}:
            categories.insert(0, primary_category)

        published_day = date.fromisoformat(published)
        row: dict[str, Any] = {
            "paper_id": paper_id,
            "title": title,
            "summary": summary,
            "authors": authors,
            "categories": categories,
            "primary_category": primary_category,
            "published": published,
            "updated": _parse_iso_date(raw.get("updated")) or published,
            "abs_url": _clean_text(raw.get("abs_url")),
            "pdf_url": _clean_text(raw.get("pdf_url")),
            "comment": _clean_text(raw.get("comment")),
            "authors_joined": compact_join(authors),
            "categories_joined": compact_join(categories),
            "summary_chars": len(summary),
            "age_days": (run_day - published_day).days,
        }
        row["text_for_embedding"] = build_text_for_embedding(row)
        rows.append(row)

    df = pd.DataFrame(rows, columns=CLEAN_SCHEMA_COLUMNS)
    if not df.empty:
        df = df.sort_values(["published", "paper_id"], ascending=[False, True], kind="stable").reset_index(drop=True)
        validate_clean_dataframe(df)
    return df
