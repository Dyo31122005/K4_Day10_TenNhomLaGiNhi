from __future__ import annotations

from collections.abc import Iterable
from datetime import date, datetime
import html
from pathlib import Path
import re
from typing import Any
import unicodedata

import pandas as pd

from core.utils import compact_join, normalize_whitespace, now_utc, write_csv, write_json
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
MIN_SUMMARY_CHARS = 100
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_SPACE_BEFORE_PUNCTUATION_RE = re.compile(r"\s+([,.;:!?%\]\)])")
_SPACE_AFTER_OPENING_PUNCTUATION_RE = re.compile(r"([\[(])\s+")
_DASH_RE = re.compile(r"[\u2010-\u2015\u2212]")
_SPACE_AFTER_WORD_HYPHEN_RE = re.compile(r"(?<=\w)-\s+(?=\w)")


def _clean_text(value: object) -> str:
    """Strip lightweight Crossref/JATS markup and normalize whitespace."""
    if value is None or isinstance(value, (list, tuple, set, dict)):
        return ""
    try:
        if pd.isna(value):
            return ""
    except (TypeError, ValueError):
        return ""
    text = unicodedata.normalize("NFKC", html.unescape(str(value)))
    text = _HTML_TAG_RE.sub(" ", text)
    return _SPACE_BEFORE_PUNCTUATION_RE.sub(r"\1", normalize_whitespace(text))


def _clean_title(value: object) -> str:
    """Normalize display-title typography without changing its wording."""
    title = _clean_text(value)
    title = _DASH_RE.sub("-", title)
    title = _SPACE_AFTER_WORD_HYPHEN_RE.sub("-", title)
    title = _SPACE_BEFORE_PUNCTUATION_RE.sub(r"\1", title)
    return _SPACE_AFTER_OPENING_PUNCTUATION_RE.sub(r"\1", title).strip()


def _clean_string_list(value: object) -> list[str]:
    """Return an ordered, de-duplicated list of normalized non-empty strings."""
    if value is None:
        return []
    # A few metadata providers emit one author/category as a scalar. Treat it
    # as a one-item list instead of silently discarding valid metadata.
    values = [value] if isinstance(value, (str, bytes)) else value
    if not isinstance(values, Iterable) or isinstance(values, dict):
        return []
    cleaned: list[str] = []
    seen: set[str] = set()
    for item in values:
        normalized = _clean_text(item)
        key = normalized.casefold()
        if normalized and key not in seen:
            cleaned.append(normalized)
            seen.add(key)
    return cleaned


def _parse_iso_date(value: object) -> str:
    """Normalize valid date-like values to ISO calendar dates; invalid values are empty."""
    if value is None or isinstance(value, (list, tuple, set, dict)):
        return ""
    try:
        if pd.isna(value):
            return ""
    except (TypeError, ValueError):
        return ""
    text = str(value).strip()
    if not text:
        return ""
    # Crossref usually supplies YYYY-MM-DD, but accepting year/month precision
    # makes snapshots from other sources deterministic too.
    year_or_month = re.fullmatch(r"(\d{4})(?:[-/](\d{1,2}))?", text)
    if year_or_month:
        year, month = year_or_month.groups()
        try:
            return date(int(year), int(month or 1), 1).isoformat()
        except ValueError:
            return ""
    parsed = pd.to_datetime(text, errors="coerce", utc=True)
    if pd.isna(parsed):
        return ""
    return parsed.date().isoformat()


def build_text_for_embedding(row: dict[str, Any]) -> str:
    """Build the mandatory semantic representation used by the embedding index."""
    return " | ".join(
        (
            f"Title: {row['title']}",
            f"Authors: {row['authors_joined']}",
            f"Summary: {row['summary']}",
        )
    )


def validate_clean_dataframe(
    df: pd.DataFrame, run_date: date | datetime | None = None
) -> dict[str, Any]:
    """Validate the clean schema and return a checkpoint-friendly summary.

    The function intentionally raises ValueError for contract violations so it
    can be used both in CP1 and before a dataframe is sent to the indexer.
    """
    missing = [column for column in CLEAN_SCHEMA_COLUMNS if column not in df.columns]
    unexpected = [column for column in df.columns if column not in CLEAN_SCHEMA_COLUMNS]
    if missing or unexpected:
        details = []
        if missing:
            details.append(f"missing columns: {missing}")
        if unexpected:
            details.append(f"unexpected columns: {unexpected}")
        raise ValueError(f"Clean dataframe schema mismatch ({'; '.join(details)})")
    null_required = {
        column: int(df[column].isna().sum() + (df[column].astype(str).str.strip() == "").sum())
        for column in RAW_REQUIRED_FIELDS
    }
    duplicate_paper_ids = int(df["paper_id"].duplicated().sum())
    invalid_dates = int(pd.to_datetime(df["published"], errors="coerce").isna().sum())
    short_summaries = int((df["summary"].fillna("").astype(str).str.len() < MIN_SUMMARY_CHARS).sum())
    empty_embedding_text = int((df["text_for_embedding"].fillna("").astype(str).str.strip() == "").sum())
    expected_embedding_text = df.apply(
        lambda row: build_text_for_embedding(row.to_dict()), axis=1
    )
    embedding_text_mismatches = int((df["text_for_embedding"].fillna("") != expected_embedding_text).sum())

    numeric_age_days = pd.to_numeric(df["age_days"], errors="coerce")
    invalid_age_days = int(
        (numeric_age_days.isna() | (numeric_age_days < 0) | (numeric_age_days % 1 != 0)).sum()
    )
    age_days_mismatches = 0
    if run_date is not None:
        reference_day = run_date.date() if isinstance(run_date, datetime) else run_date
        published_days = pd.to_datetime(df["published"], errors="coerce").dt.date
        expected_age_days = published_days.map(
            lambda published_day: (reference_day - published_day).days if pd.notna(published_day) else None
        )
        age_days_mismatches = int((numeric_age_days != expected_age_days).sum())
    failures = {
        "null_required": {key: value for key, value in null_required.items() if value},
        "duplicate_paper_ids": duplicate_paper_ids,
        "invalid_published_dates": invalid_dates,
        "summary_below_minimum_length": short_summaries,
        "empty_embedding_text": empty_embedding_text,
        "embedding_text_mismatches": embedding_text_mismatches,
        "invalid_age_days": invalid_age_days,
        "age_days_mismatches": age_days_mismatches,
    }
    if any(failures.values()):
        raise ValueError(f"Clean dataframe validation failed: {failures}")
    return {"rows": len(df), "columns": list(df.columns), "is_valid": True}


def validate_raw_to_clean(records: list[PaperRecord], run_date: datetime) -> dict[str, Any]:
    """CP1 sample validation: transform raw records and assert the clean contract."""
    return validate_clean_dataframe(build_clean_dataframe(records, run_date))


def write_clean_artifacts(
    df: pd.DataFrame,
    clean_csv_path: Path | None = None,
    clean_json_path: Path | None = None,
    audit_log_path: Path | None = None,
) -> dict[str, Any]:
    """Persist the clean-data contract and its raw-to-clean reconciliation log.

    ``DataFrame.attrs['cleaning_audit']`` is populated by
    :func:`build_clean_dataframe`, so the log stays coupled to the exact frame
    written to disk.  Callers that construct a frame independently still get a
    useful output-row count.
    """
    default_clean_dir = Path(__file__).resolve().parents[2] / "data" / "clean"
    clean_csv_path = clean_csv_path or default_clean_dir / "papers_clean.csv"
    clean_json_path = clean_json_path or default_clean_dir / "papers_clean.json"

    audit = dict(df.attrs.get("cleaning_audit", {}))
    audit_run_date = audit.get("run_date")
    parsed_run_date = date.fromisoformat(audit_run_date) if audit_run_date else None
    validate_clean_dataframe(df, parsed_run_date)
    write_csv(df, clean_csv_path)
    write_json(clean_json_path, df.to_dict(orient="records"))

    persisted_json = pd.DataFrame(pd.read_json(clean_json_path))
    validate_clean_dataframe(persisted_json, parsed_run_date)

    audit["output_rows"] = len(df)
    audit["clean_csv"] = str(clean_csv_path)
    audit["clean_json"] = str(clean_json_path)
    write_json(audit_log_path or clean_json_path.with_name("cleaning_log.json"), audit)
    return audit


def build_clean_dataframe(records: list[PaperRecord], run_date: datetime | None = None) -> pd.DataFrame:
    """Normalize raw records into the stable schema consumed by all downstream stages.

    Rows without a paper id, title, a summary of at least 100 characters, or a
    parseable published date are dropped. Duplicate paper ids keep the first
    raw occurrence. ``updated`` falls back to ``published``; optional
    author/category lists become empty lists and their joined fields become
    empty strings.  ``age_days`` is measured against ``run_date`` (or now).
    """
    run_day: date = (run_date or now_utc()).date()
    rows: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    filter_counts = {
        "missing_paper_id": 0,
        "missing_title": 0,
        "missing_summary": 0,
        "summary_below_minimum_length": 0,
        "invalid_published": 0,
        "duplicate_paper_id": 0,
    }

    for record in records:
        raw = record.__dict__
        paper_id = _clean_text(raw.get("paper_id")).lower()
        title = _clean_title(raw.get("title"))
        summary = _clean_text(raw.get("summary"))
        published = _parse_iso_date(raw.get("published"))
        # Stable IDs are deduplicated after required-field validation.  This
        # makes the count explain whether a row was malformed or was a genuine
        # duplicate of an otherwise usable document.
        if not paper_id:
            filter_counts["missing_paper_id"] += 1
            continue
        if not title:
            filter_counts["missing_title"] += 1
            continue
        if not summary:
            filter_counts["missing_summary"] += 1
            continue
        if len(summary) < MIN_SUMMARY_CHARS:
            filter_counts["summary_below_minimum_length"] += 1
            continue
        if not published:
            filter_counts["invalid_published"] += 1
            continue
        if paper_id in seen_ids:
            filter_counts["duplicate_paper_id"] += 1
            continue
        seen_ids.add(paper_id)

        authors = _clean_string_list(raw.get("authors"))
        categories = _clean_string_list(raw.get("categories"))
        primary_category = _clean_text(raw.get("primary_category"))
        if not primary_category and categories:
            primary_category = categories[0]
        if primary_category:
            existing_category = next(
                (category for category in categories if category.casefold() == primary_category.casefold()), None
            )
            if existing_category:
                primary_category = existing_category
            else:
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
        validate_clean_dataframe(df, run_day)
    df.attrs["cleaning_audit"] = {
        "input_rows": len(records),
        "output_rows": len(df),
        "filtered_or_deduplicated_rows": sum(filter_counts.values()),
        "counts_by_reason": filter_counts,
        "run_date": run_day.isoformat(),
    }
    return df


def build_and_save_clean_dataframe(records: list[PaperRecord], run_date: datetime | None = None) -> pd.DataFrame:
    """Clean records and persist the standard artifacts in ``data/clean``."""
    df = build_clean_dataframe(records, run_date)
    write_clean_artifacts(df)
    return df
