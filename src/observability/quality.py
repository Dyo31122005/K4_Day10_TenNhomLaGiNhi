from __future__ import annotations

from typing import Any
from datetime import UTC, datetime
from pathlib import Path
import pandas as pd

from core.config import Settings
from core.utils import write_json


def run_data_quality_checks(df: pd.DataFrame, settings: Settings, report_name: str) -> dict[str, Any]:
    """Perform data quality checks.

    Checks:
    1. Row count >= 20.
    2. `paper_id` is unique and not null.
    3. `title` is not null.
    4. `summary` is not null and >= 100 characters.
    5. Freshness check: no record age > threshold.
    Gaves result JSON into data/quality/.
    """
    total_rows = len(df)

    # 1. Row count check
    min_rows = 20
    row_count_ok = total_rows >= min_rows

    # 2. paper_id checks
    paper_ids_null = int(df["paper_id"].isna().sum() + (df["paper_id"].astype(str).str.strip() == "").sum()) if "paper_id" in df.columns else 1
    paper_id_not_null_ok = paper_ids_null == 0

    paper_id_unique_ok = not df["paper_id"].duplicated().any() if "paper_id" in df.columns else False
    paper_ids_duplicated = int(df["paper_id"].duplicated().sum()) if "paper_id" in df.columns else 0

    # 3. title check
    titles_null = int(df["title"].isna().sum() + (df["title"].astype(str).str.strip() == "").sum()) if "title" in df.columns else 1
    title_not_null_ok = titles_null == 0

    # 4. summary length check
    min_summary_chars = 100
    short_summaries = int((df["summary"].fillna("").astype(str).str.len() < min_summary_chars).sum()) if "summary" in df.columns else 1
    summary_length_ok = short_summaries == 0

    # 5. freshness check
    stale_rows = int((df["age_days"] > settings.freshness_threshold_days).sum()) if "age_days" in df.columns else 1
    freshness_ok = stale_rows == 0

    is_valid = (
        row_count_ok
        and paper_id_not_null_ok
        and paper_id_unique_ok
        and title_not_null_ok
        and summary_length_ok
        and freshness_ok
    )

    report = {
        "report_name": report_name,
        "timestamp": datetime.now(UTC).isoformat(),
        "total_rows": total_rows,
        "is_valid": bool(is_valid),
        "checks": {
            "row_count": {
                "status": "PASS" if row_count_ok else "FAIL",
                "details": f"Expected >= {min_rows} rows, got {total_rows}",
            },
            "paper_id_not_null": {
                "status": "PASS" if paper_id_not_null_ok else "FAIL",
                "details": f"Found {paper_ids_null} null/empty paper_ids",
            },
            "paper_id_unique": {
                "status": "PASS" if paper_id_unique_ok else "FAIL",
                "details": f"Found {paper_ids_duplicated} duplicate paper_ids",
            },
            "title_not_null": {
                "status": "PASS" if title_not_null_ok else "FAIL",
                "details": f"Found {titles_null} null/empty titles",
            },
            "summary_length": {
                "status": "PASS" if summary_length_ok else "FAIL",
                "details": f"Found {short_summaries} summaries shorter than {min_summary_chars} chars",
            },
            "freshness": {
                "status": "PASS" if freshness_ok else "FAIL",
                "details": f"Found {stale_rows} stale rows older than {settings.freshness_threshold_days} days",
            },
        },
    }

    report_path = settings.paths.quality_dir / report_name
    write_json(report_path, report)
    return report


def build_freshness_report(df: pd.DataFrame, settings: Settings, report_path) -> dict[str, Any]:
    """Compile freshness report.

    1. Finds latest and oldest published date.
    2. Counts stale rows.
    3. Checks if dataset is overall fresh.
    4. Writes JSON report.
    """
    if df.empty:
        report = {
            "latest_published": "",
            "oldest_published": "",
            "stale_rows": 0,
            "total_rows": 0,
            "is_fresh": True,
        }
        write_json(Path(report_path), report)
        return report

    latest_published = df["published"].max() if "published" in df.columns else ""
    oldest_published = df["published"].min() if "published" in df.columns else ""
    stale_rows = int((df["age_days"] > settings.freshness_threshold_days).sum()) if "age_days" in df.columns else 0
    total_rows = len(df)
    is_fresh = stale_rows == 0

    report = {
        "latest_published": latest_published,
        "oldest_published": oldest_published,
        "stale_rows": stale_rows,
        "total_rows": total_rows,
        "is_fresh": bool(is_fresh),
    }

    write_json(Path(report_path), report)
    return report
