from __future__ import annotations

from datetime import timedelta
from pathlib import Path

import pandas as pd

from core.utils import write_json
from ingestion.cleaning import CLEAN_SCHEMA_COLUMNS, build_text_for_embedding, validate_clean_dataframe


def _rebuild_derived_fields(df: pd.DataFrame) -> pd.DataFrame:
    """Refresh all fields whose value is derived from content after corruption."""
    rebuilt = df.copy()
    rebuilt["authors_joined"] = rebuilt["authors"].apply(
        lambda values: ", ".join(values) if isinstance(values, list) else ""
    )
    rebuilt["categories_joined"] = rebuilt["categories"].apply(
        lambda values: ", ".join(values) if isinstance(values, list) else ""
    )
    rebuilt["summary_chars"] = rebuilt["summary"].fillna("").astype(str).str.len()
    rebuilt["text_for_embedding"] = rebuilt.apply(lambda row: build_text_for_embedding(row.to_dict()), axis=1)
    return rebuilt


def corrupt_clean_dataframe(df: pd.DataFrame, output_log_path: Path) -> pd.DataFrame:
    """Create a deterministic, auditable set of quality failures for phase 2.

    The source dataframe is never modified. Small corpora receive at least one
    instance of each applicable corruption: dropped newest rows, empty summary,
    noisy summary, truncated title, stale date, and a duplicate paper id.
    """
    missing = [column for column in CLEAN_SCHEMA_COLUMNS if column not in df.columns]
    if missing:
        raise ValueError(f"Cannot corrupt dataframe missing clean-schema columns: {missing}")
    # Corruption starts from a real clean-contract artifact; otherwise a
    # downstream quality failure could be mistaken for a simulated defect.
    validate_clean_dataframe(df)
    if df.empty:
        write_json(output_log_path, {"input_rows": 0, "output_rows": 0, "operations": []})
        return df.copy()

    corrupted = df.copy().reset_index(drop=True)
    operations: list[dict[str, object]] = []

    # The clean frame is sorted newest first. Remove 10% (at least one) of it.
    drop_count = min(max(1, len(corrupted) // 10), max(0, len(corrupted) - 1))
    if drop_count:
        dropped_ids = corrupted.iloc[:drop_count]["paper_id"].tolist()
        corrupted = corrupted.iloc[drop_count:].reset_index(drop=True)
        operations.append({"type": "drop_latest", "paper_ids": dropped_ids})

    if not corrupted.empty:
        corrupted.loc[0, "summary"] = ""
        operations.append({"type": "blank_summary", "paper_id": corrupted.loc[0, "paper_id"]})

    if len(corrupted) > 1:
        corrupted.loc[1, "summary"] = f"{corrupted.loc[1, 'summary']} [CORRUPTED-NOISE]"
        operations.append({"type": "inject_summary_noise", "paper_id": corrupted.loc[1, "paper_id"]})

    if len(corrupted) > 2:
        corrupted.loc[2, "title"] = str(corrupted.loc[2, "title"])[:24].rstrip()
        operations.append({"type": "truncate_title", "paper_id": corrupted.loc[2, "paper_id"]})

    if len(corrupted) > 3:
        stale_day = pd.to_datetime(corrupted.loc[3, "published"], errors="coerce")
        if not pd.isna(stale_day):
            corrupted.loc[3, "published"] = (stale_day.date() - timedelta(days=730)).isoformat()
            # Preserve the baseline run-date reference used during cleaning:
            # moving published back 730 days must also make freshness 730 days
            # older, otherwise a stale-date corruption is invisible to checks
            # that use the persisted ``age_days`` field.
            current_age = pd.to_numeric(corrupted.loc[3, "age_days"], errors="coerce")
            if not pd.isna(current_age):
                corrupted.loc[3, "age_days"] = int(current_age) + 730
            operations.append({"type": "make_published_stale", "paper_id": corrupted.loc[3, "paper_id"]})

    if not corrupted.empty:
        duplicate = corrupted.iloc[[0]].copy()
        corrupted = pd.concat([corrupted, duplicate], ignore_index=True)
        operations.append({"type": "duplicate_row", "paper_id": duplicate.iloc[0]["paper_id"]})

    corrupted = _rebuild_derived_fields(corrupted)
    write_json(
        output_log_path,
        {"input_rows": len(df), "output_rows": len(corrupted), "operations": operations},
    )
    return corrupted[CLEAN_SCHEMA_COLUMNS]
