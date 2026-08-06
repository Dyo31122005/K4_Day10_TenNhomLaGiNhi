from __future__ import annotations

import pandas as pd

from core.config import load_settings
from core.utils import now_utc, read_json, write_csv, write_json
from ingestion.crossref import load_raw_records
from ingestion.cleaning import build_clean_dataframe, validate_clean_dataframe
from retrieval.index import LocalEmbeddingIndex
from evaluation.metrics import evaluate_pipeline
from observability.quality import run_data_quality_checks, build_freshness_report
from observability.reporting import generate_corruption_report


def main() -> None:
    print("=== Starting Corruption Flow (Phase 2) ===")

    # 1. Load settings and clean baseline dataset
    settings = load_settings()
    
    clean_path = settings.paths.clean_json
    if not clean_path.exists():
        raise FileNotFoundError(f"Baseline clean data not found at {clean_path}. Please run phase 1 first.")
    
    print(f"Loading baseline clean data from {clean_path}...")
    df_clean = pd.DataFrame(read_json(clean_path))
    
    # Load baseline metrics for comparison
    baseline_metrics_path = settings.paths.baseline_metrics
    if not baseline_metrics_path.exists():
        raise FileNotFoundError(f"Baseline metrics not found at {baseline_metrics_path}. Please run phase 1 first.")
    baseline_metrics = read_json(baseline_metrics_path)

    # 2. Load the persisted corruption artifact.  C2 must remain frozen: this
    # flow never regenerates either the test set or the corruption here.
    if not settings.paths.eval_testset.exists():
        raise FileNotFoundError(
            f"Frozen C2 evaluation set not found at {settings.paths.eval_testset}."
        )
    if not settings.paths.corrupted_clean_csv.exists():
        raise FileNotFoundError(
            f"Corrupted dataset not found at {settings.paths.corrupted_clean_csv}. "
            "Create it before running the phase-2 experiment."
        )
    if not settings.paths.corruption_log.exists():
        raise FileNotFoundError(f"Corruption log not found at {settings.paths.corruption_log}.")

    print(f"Loading persisted corrupted data from {settings.paths.corrupted_clean_csv}...")
    df_corrupted = pd.read_csv(settings.paths.corrupted_clean_csv)
    corrupted_snapshot = df_corrupted.copy(deep=True)
    print(f"Corrupted dataset loaded with {len(df_corrupted)} rows (baseline: {len(df_clean)} rows).")

    # 3. Rebuild index for corrupted data
    print("Building Chroma vector index for corrupted data...")
    corrupted_index = LocalEmbeddingIndex.build(df_corrupted, settings, settings.paths.corrupted_embeddings_json)
    print(f"Corrupted index built with collection: {corrupted_index.collection_name}.")

    # 4. Evaluate the corrupted index using the same frozen C2 test set.
    print("Evaluating RAG agent on corrupted index...")
    corrupted_bundle = evaluate_pipeline(
        settings=settings,
        index=corrupted_index,
        test_set_path=settings.paths.eval_testset,
        metrics_output_path=settings.paths.corrupted_metrics,
        answers_output_path=settings.paths.corrupted_answers,
    )
    print(f"Corrupted evaluation complete. Hit rate: {corrupted_bundle.summary['retrieval_hit_rate'] * 100:.1f}%, F1: {corrupted_bundle.summary['mean_token_f1']:.4f}")

    # 5. Run quality & freshness checks on corrupted data
    print("Running quality and freshness checks on corrupted data...")
    corrupted_quality = run_data_quality_checks(df_corrupted, settings, "corrupted_quality_report.json")
    corrupted_freshness = build_freshness_report(
        df_corrupted, settings, settings.paths.quality_dir / "corrupted_freshness_report.json"
    )

    # 6. Repair only from the raw C2 snapshot, using the normal cleaner.
    print("Repairing dataset from raw records...")
    raw_path = settings.paths.raw_records_json
    if not raw_path.exists():
        raise FileNotFoundError(f"Raw records snapshot not found at {raw_path}.")
        
    raw_records = load_raw_records(raw_path)
    df_repaired = build_clean_dataframe(raw_records, now_utc())
    # Repair is a clean reconstruction from raw records, never an in-place
    # transformation of the corrupted artifact.
    if not df_corrupted.equals(corrupted_snapshot):
        raise RuntimeError("Repair mutated the corrupted dataframe in place.")
    validate_clean_dataframe(df_clean)
    validate_clean_dataframe(df_repaired)
    if list(df_repaired.columns) != list(df_clean.columns):
        raise RuntimeError("Repaired dataset schema does not match the baseline schema.")
    print(f"Repaired dataset created from raw records with {len(df_repaired)} rows.")

    # Save repaired artifacts
    print(f"Saving repaired datasets to {settings.paths.repaired_clean_csv}...")
    write_csv(df_repaired, settings.paths.repaired_clean_csv)
    write_json(settings.paths.repaired_clean_json, df_repaired.to_dict(orient="records"))

    # 7. Rebuild index for repaired data
    print("Building Chroma vector index for repaired data...")
    repaired_index = LocalEmbeddingIndex.build(df_repaired, settings, settings.paths.repaired_embeddings_json)
    print(f"Repaired index built with collection: {repaired_index.collection_name}.")

    # 8. Evaluate the repaired index against the unchanged frozen C2 test set.
    print("Evaluating RAG agent on repaired index...")
    repaired_bundle = evaluate_pipeline(
        settings=settings,
        index=repaired_index,
        test_set_path=settings.paths.eval_testset,
        metrics_output_path=settings.paths.repaired_metrics,
        answers_output_path=settings.paths.repaired_answers,
    )
    print(f"Repaired evaluation complete. Hit rate: {repaired_bundle.summary['retrieval_hit_rate'] * 100:.1f}%, F1: {repaired_bundle.summary['mean_token_f1']:.4f}")

    # 9. Run quality & freshness checks on repaired data
    print("Running quality and freshness checks on repaired data...")
    repaired_quality = run_data_quality_checks(df_repaired, settings, "repaired_quality_report.json")
    repaired_freshness = build_freshness_report(
        df_repaired, settings, settings.paths.quality_dir / "repaired_freshness_report.json"
    )

    # 10. Generate the baseline/corrupted/repaired comparison report.
    print(f"Generating comparison report at {settings.paths.comparison_report}...")
    corruption_log = read_json(settings.paths.corruption_log)
    generate_corruption_report(
        settings.paths.comparison_report,
        baseline_metrics=baseline_metrics,
        corrupted_metrics=corrupted_bundle.summary,
        repaired_metrics=repaired_bundle.summary,
        corrupted_quality=corrupted_quality,
        repaired_quality=repaired_quality,
        corrupted_freshness=corrupted_freshness,
        repaired_freshness=repaired_freshness,
        corruption_log=corruption_log,
    )

    print("=== Corruption and Comparison Flow Completed successfully! ===")


if __name__ == "__main__":
    main()
