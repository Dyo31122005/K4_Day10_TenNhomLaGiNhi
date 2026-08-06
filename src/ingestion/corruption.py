from __future__ import annotations

from datetime import timedelta
from pathlib import Path
from collections.abc import Collection
from typing import Any

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


def _operation(
    operation_type: str,
    record_ids: list[object],
    parameters: dict[str, Any],
    before_count: int,
    after_count: int,
) -> dict[str, Any]:
    """Return the stable, audit-friendly shape used in ``corruption_log``."""
    return {
        "type": operation_type,
        "record_ids": [str(record_id) for record_id in record_ids],
        "parameters": parameters,
        "before_count": before_count,
        "after_count": after_count,
    }


def _verify_corruption(
    baseline: pd.DataFrame, corrupted: pd.DataFrame, operations: list[dict[str, Any]]
) -> dict[str, Any]:
    """Prove that the final dataframe has the changes claimed by the log."""
    baseline_for_lookup = baseline.copy()
    corrupted_for_lookup = corrupted.copy()
    baseline_for_lookup["paper_id"] = baseline_for_lookup["paper_id"].astype(str)
    corrupted_for_lookup["paper_id"] = corrupted_for_lookup["paper_id"].astype(str)
    baseline_by_id = baseline_for_lookup.drop_duplicates("paper_id", keep="first").set_index("paper_id", drop=False)
    corrupted_by_id = corrupted_for_lookup.drop_duplicates("paper_id", keep="first").set_index("paper_id", drop=False)
    checks: list[dict[str, Any]] = []

    for operation in operations:
        operation_type = str(operation["type"])
        record_ids = operation["record_ids"]
        passed = operation["before_count"] >= 0 and operation["after_count"] >= 0

        if operation_type == "drop_latest":
            passed = passed and all(record_id not in corrupted_by_id.index for record_id in record_ids)
        elif operation_type == "blank_summary":
            passed = passed and corrupted_by_id.at[record_ids[0], "summary"] == ""
        elif operation_type == "inject_summary_noise":
            passed = passed and "[CORRUPTED-NOISE]" in corrupted_by_id.at[record_ids[0], "summary"]
        elif operation_type == "truncate_title":
            passed = passed and len(str(corrupted_by_id.at[record_ids[0], "title"])) <= 24
        elif operation_type == "make_published_stale":
            record_id = record_ids[0]
            before = pd.to_datetime(baseline_by_id.at[record_id, "published"], errors="coerce")
            after = pd.to_datetime(corrupted_by_id.at[record_id, "published"], errors="coerce")
            passed = passed and pd.notna(before) and pd.notna(after) and (after - before).days == -730
        elif operation_type == "swap_categories":
            left, right = record_ids
            passed = passed and (
                corrupted_by_id.at[left, "categories"] == baseline_by_id.at[right, "categories"]
                and corrupted_by_id.at[right, "categories"] == baseline_by_id.at[left, "categories"]
            )
        elif operation_type == "swap_authors":
            left, right = record_ids
            passed = passed and (
                corrupted_by_id.at[left, "authors"] == baseline_by_id.at[right, "authors"]
                and corrupted_by_id.at[right, "authors"] == baseline_by_id.at[left, "authors"]
            )
        elif operation_type == "html_markup_leakage":
            passed = passed and "<i>Unprocessed source markup" in corrupted_by_id.at[record_ids[0], "summary"]
        elif operation_type == "make_published_future":
            record_id = record_ids[0]
            before = pd.to_datetime(baseline_by_id.at[record_id, "published"], errors="coerce")
            after = pd.to_datetime(corrupted_by_id.at[record_id, "published"], errors="coerce")
            passed = passed and pd.notna(before) and pd.notna(after) and (after - before).days == 365
        elif operation_type == "duplicate_row":
            passed = passed and int((corrupted["paper_id"] == record_ids[0]).sum()) >= 2
        elif operation_type == "semantic_near_duplicate":
            source_id = str(operation["parameters"]["source_paper_id"])
            passed = passed and record_ids[0] in corrupted_by_id.index and source_id in corrupted_by_id.index

        checks.append({"type": operation_type, "record_ids": record_ids, "passed": bool(passed)})

    baseline_ids = set(baseline["paper_id"].astype(str))
    corrupted_ids = set(corrupted["paper_id"].astype(str))
    return {
        "is_consistent": all(check["passed"] for check in checks),
        "baseline_row_count": len(baseline),
        "corrupted_row_count": len(corrupted),
        "row_count_delta": len(corrupted) - len(baseline),
        "missing_baseline_record_ids": sorted(baseline_ids - corrupted_ids),
        "new_record_ids": sorted(corrupted_ids - baseline_ids),
        "duplicate_paper_ids": sorted(
            corrupted.loc[corrupted["paper_id"].duplicated(keep=False), "paper_id"].astype(str).unique()
        ),
        "checks": checks,
    }


def corrupt_clean_dataframe(
    df: pd.DataFrame,
    output_log_path: Path,
    frozen_test_paper_ids: Collection[str] | None = None,
) -> pd.DataFrame:
    """Create a deterministic, auditable set of quality failures for phase 2.

    The source dataframe is never modified. Small corpora receive at least one
    instance of each applicable corruption: dropped newest rows, empty summary,
    noisy summary, truncated title, stale/future dates, duplicate identities,
    cross-record attribution errors, markup leakage, and a near duplicate.

    This function deliberately operates on the *clean* artifact. Raw-response
    failures (schema drift, truncated JSON) and index failures (stale or
    misaligned vectors) belong to their respective ingestion/index pipelines;
    simulating them here would not exercise those boundaries.
    """
    missing = [column for column in CLEAN_SCHEMA_COLUMNS if column not in df.columns]
    if missing:
        raise ValueError(f"Cannot corrupt dataframe missing clean-schema columns: {missing}")
    # Corruption starts from a real clean-contract artifact; otherwise a
    # downstream quality failure could be mistaken for a simulated defect.
    validate_clean_dataframe(df)
    if df.empty:
        empty = df.copy()
        write_json(
            output_log_path,
            {
                "input_rows": 0,
                "output_rows": 0,
                "operations": [],
                "verification": _verify_corruption(empty, empty, []),
            },
        )
        return df.copy()

    corrupted = df.copy().reset_index(drop=True)
    frozen_ids = {str(paper_id) for paper_id in frozen_test_paper_ids or ()}
    available_frozen_ids = [
        str(paper_id) for paper_id in corrupted["paper_id"] if str(paper_id) in frozen_ids
    ]
    if frozen_ids and len(available_frozen_ids) < 3:
        raise ValueError("Corruption requires at least three frozen test-set paper IDs in the clean dataframe.")
    if frozen_ids:
        # Place frozen-C2 documents first so dropped rows and every following
        # deterministic mutation affect documents the evaluation actually asks about.
        is_frozen = corrupted["paper_id"].astype(str).isin(frozen_ids)
        corrupted = pd.concat([corrupted[is_frozen], corrupted[~is_frozen]], ignore_index=True)
    operations: list[dict[str, Any]] = []

    # The clean frame is sorted newest first. Remove 10% (at least one) of it.
    drop_count = min(max(1, len(corrupted) // 10), max(0, len(corrupted) - 1))
    if frozen_ids:
        drop_count = min(drop_count, max(1, len(available_frozen_ids) - 2))
    if drop_count:
        before_count = len(corrupted)
        dropped_ids = corrupted.iloc[:drop_count]["paper_id"].tolist()
        corrupted = corrupted.iloc[drop_count:].reset_index(drop=True)
        operations.append(_operation("drop_latest", dropped_ids, {"fraction": 0.10}, before_count, len(corrupted)))

    def row_index_for(default_index: int) -> int | None:
        """Choose a surviving frozen-C2 row, or retain legacy deterministic order."""
        if frozen_ids:
            remaining = corrupted.index[corrupted["paper_id"].astype(str).isin(frozen_ids)].tolist()
            return remaining[default_index % len(remaining)] if remaining else None
        return default_index if default_index < len(corrupted) else None

    if (row_index := row_index_for(0)) is not None:
        before_count = len(corrupted)
        corrupted.loc[row_index, "summary"] = ""
        operations.append(_operation("blank_summary", [corrupted.loc[row_index, "paper_id"]], {"value": ""}, before_count, len(corrupted)))

    if (row_index := row_index_for(1)) is not None:
        before_count = len(corrupted)
        corrupted.loc[row_index, "summary"] = f"{corrupted.loc[row_index, 'summary']} [CORRUPTED-NOISE]"
        operations.append(_operation("inject_summary_noise", [corrupted.loc[row_index, "paper_id"]], {"suffix": "[CORRUPTED-NOISE]"}, before_count, len(corrupted)))

    if (row_index := row_index_for(1)) is not None:
        before_count = len(corrupted)
        corrupted.loc[row_index, "title"] = str(corrupted.loc[row_index, "title"])[:24].rstrip()
        operations.append(_operation("truncate_title", [corrupted.loc[row_index, "paper_id"]], {"max_characters": 24}, before_count, len(corrupted)))

    if (row_index := row_index_for(0)) is not None:
        before_count = len(corrupted)
        stale_day = pd.to_datetime(corrupted.loc[row_index, "published"], errors="coerce")
        if not pd.isna(stale_day):
            corrupted.loc[row_index, "published"] = (stale_day.date() - timedelta(days=730)).isoformat()
            # Preserve the baseline run-date reference used during cleaning:
            # moving published back 730 days must also make freshness 730 days
            # older, otherwise a stale-date corruption is invisible to checks
            # that use the persisted ``age_days`` field.
            current_age = pd.to_numeric(corrupted.loc[row_index, "age_days"], errors="coerce")
            if not pd.isna(current_age):
                corrupted.loc[row_index, "age_days"] = int(current_age) + 730
            operations.append(_operation("make_published_stale", [corrupted.loc[row_index, "paper_id"]], {"days": -730}, before_count, len(corrupted)))

    # These two swaps preserve the dataframe schema and text quality. They are
    # therefore useful silent failures: simple null/format checks will pass,
    # while attribution and category answers become wrong.
    if (left := row_index_for(0)) is not None and (right := row_index_for(1)) is not None and left != right:
        before_count = len(corrupted)
        left_categories, right_categories = corrupted.at[left, "categories"], corrupted.at[right, "categories"]
        left_primary, right_primary = corrupted.at[left, "primary_category"], corrupted.at[right, "primary_category"]
        corrupted.at[left, "categories"], corrupted.at[right, "categories"] = right_categories, left_categories
        corrupted.at[left, "primary_category"], corrupted.at[right, "primary_category"] = right_primary, left_primary
        operations.append(
            _operation(
                "swap_categories",
                corrupted.loc[[left, right], "paper_id"].tolist(),
                {"fields": ["categories", "primary_category"]},
                before_count,
                len(corrupted),
            )
        )

    if (left := row_index_for(0)) is not None and (right := row_index_for(1)) is not None and left != right:
        before_count = len(corrupted)
        left_authors, right_authors = corrupted.at[left, "authors"], corrupted.at[right, "authors"]
        corrupted.at[left, "authors"], corrupted.at[right, "authors"] = right_authors, left_authors
        operations.append(
            _operation(
                "swap_authors",
                corrupted.loc[[left, right], "paper_id"].tolist(),
                {"fields": ["authors"]},
                before_count,
                len(corrupted),
            )
        )

    if (row_index := row_index_for(1)) is not None:
        before_count = len(corrupted)
        corrupted.loc[row_index, "summary"] = (
            f"{corrupted.loc[row_index, 'summary']} "
            "<i>Unprocessed source markup remains in this abstract.</i>"
        )
        operations.append(
            _operation(
                "html_markup_leakage",
                [corrupted.loc[row_index, "paper_id"]],
                {"markup": "<i>...</i>"},
                before_count,
                len(corrupted),
            )
        )

    if (row_index := row_index_for(1)) is not None:
        before_count = len(corrupted)
        future_day = pd.to_datetime(corrupted.loc[row_index, "published"], errors="coerce")
        if not pd.isna(future_day):
            corrupted.loc[row_index, "published"] = (future_day.date() + timedelta(days=365)).isoformat()
            current_age = pd.to_numeric(corrupted.loc[row_index, "age_days"], errors="coerce")
            if not pd.isna(current_age):
                corrupted.loc[row_index, "age_days"] = int(current_age) - 365
            operations.append(
                _operation(
                    "make_published_future",
                    [corrupted.loc[row_index, "paper_id"]],
                    {"days": 365},
                    before_count,
                    len(corrupted),
                )
            )

    if (row_index := row_index_for(0)) is not None:
        before_count = len(corrupted)
        duplicate = corrupted.loc[[row_index]].copy()
        corrupted = pd.concat([corrupted, duplicate], ignore_index=True)
        operations.append(
            _operation(
                "duplicate_row",
                [duplicate.iloc[0]["paper_id"]],
                {"copies_added": 1},
                before_count,
                len(corrupted),
            )
        )

    if (row_index := row_index_for(1)) is not None:
        before_count = len(corrupted)
        near_duplicate = corrupted.loc[[row_index]].copy()
        source_id = str(near_duplicate.iloc[0]["paper_id"])
        near_duplicate.loc[:, "paper_id"] = f"{source_id}#near-duplicate"
        near_duplicate.loc[:, "title"] = f"{near_duplicate.iloc[0]['title']} (replicated study)"
        near_duplicate.loc[:, "summary"] = (
            f"{near_duplicate.iloc[0]['summary']} "
            "This replicated version preserves the same central finding."
        )
        corrupted = pd.concat([corrupted, near_duplicate], ignore_index=True)
        operations.append(
            _operation(
                "semantic_near_duplicate",
                [near_duplicate.iloc[0]["paper_id"]],
                {"source_paper_id": source_id, "copies_added": 1},
                before_count,
                len(corrupted),
            )
        )

    for operation in operations:
        affected_ids = set(operation["record_ids"])
        source_id = operation["parameters"].get("source_paper_id")
        if source_id:
            affected_ids.add(str(source_id))
        operation["frozen_test_overlap_record_ids"] = sorted(affected_ids & frozen_ids)
    if frozen_ids and any(not operation["frozen_test_overlap_record_ids"] for operation in operations):
        missing_overlap = [operation["type"] for operation in operations if not operation["frozen_test_overlap_record_ids"]]
        raise RuntimeError(f"Corruption operations without frozen-C2 overlap: {missing_overlap}")

    corrupted = _rebuild_derived_fields(corrupted)
    verification = _verify_corruption(df, corrupted, operations)
    if not verification["is_consistent"]:
        failed = [check["type"] for check in verification["checks"] if not check["passed"]]
        raise RuntimeError(f"Corrupted dataframe does not match corruption log: {failed}")
    write_json(
        output_log_path,
        {
            "input_rows": len(df),
            "output_rows": len(corrupted),
            "operations": operations,
            "verification": verification,
            "frozen_test_set": {
                "record_ids": sorted(frozen_ids),
                "all_operations_overlap": bool(frozen_ids) and all(
                    operation["frozen_test_overlap_record_ids"] for operation in operations
                ),
            },
        },
    )
    return corrupted[CLEAN_SCHEMA_COLUMNS]
