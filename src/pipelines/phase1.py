from __future__ import annotations

from core.config import load_settings
from core.utils import now_utc, write_csv, write_json
from ingestion.crossref import fetch_source_records, load_raw_records
from ingestion.cleaning import build_clean_dataframe
from retrieval.index import LocalEmbeddingIndex
from evaluation.testset import build_test_set
from evaluation.metrics import evaluate_pipeline
from observability.quality import run_data_quality_checks, build_freshness_report
from observability.reporting import generate_phase1_report


def main() -> None:
    print("=== Starting Baseline Pipeline (Phase 1) ===")
    
    # 1. Load settings
    settings = load_settings()
    
    # 2. Load or fetch raw records
    raw_path = settings.paths.raw_records_json
    if settings.refresh_source or not raw_path.exists():
        print(f"Fetching raw records from API: {settings.source_query}...")
        records = fetch_source_records(settings)
    else:
        print(f"Loading raw records from cache: {raw_path}...")
        records = load_raw_records(raw_path)
        
    print(f"Successfully loaded {len(records)} raw records.")

    # 3. Clean data
    print("Cleaning and normalizing records...")
    df = build_clean_dataframe(records, now_utc())
    print(f"Cleaned dataset contains {len(df)} records.")

    # 4. Save clean CSV/JSON
    print(f"Saving clean datasets to {settings.paths.clean_csv} and {settings.paths.clean_json}...")
    write_csv(df, settings.paths.clean_csv)
    write_json(settings.paths.clean_json, df.to_dict(orient="records"))

    # 5. Build Chroma index
    print("Building Chroma vector index...")
    index = LocalEmbeddingIndex.build(df, settings, settings.paths.embeddings_json)
    print(f"Index built successfully with collection: {index.collection_name}.")

    # 6. Create or load evaluation set
    testset_path = settings.paths.eval_testset
    if settings.refresh_test_set or not testset_path.exists():
        print(f"Generating new evaluation set at {testset_path}...")
        test_set = build_test_set(df, testset_path)
    else:
        print(f"Using existing evaluation set from {testset_path}...")
        
    # 7. Evaluate
    print("Evaluating baseline RAG agent pipeline...")
    bundle = evaluate_pipeline(
        settings=settings,
        index=index,
        test_set_path=testset_path,
        metrics_output_path=settings.paths.baseline_metrics,
        answers_output_path=settings.paths.baseline_answers,
    )
    print(f"Evaluation complete. Hit rate: {bundle.summary['retrieval_hit_rate'] * 100:.1f}%, F1: {bundle.summary['mean_token_f1']:.4f}")

    # 8. Run quality checks & freshness report
    print("Running data quality and freshness checks...")
    quality = run_data_quality_checks(df, settings, "baseline_quality_report.json")
    freshness = build_freshness_report(df, settings, settings.paths.freshness_report)

    # 9. Create markdown report
    print(f"Generating baseline report at {settings.paths.baseline_report}...")
    source_summary = {
        "source_api": settings.source_api,
        "total_raw_records": len(records),
        "cleaned_records": len(df),
    }
    generate_phase1_report(
        settings.paths.baseline_report,
        source_summary=source_summary,
        metrics=bundle.summary,
        quality=quality,
        freshness=freshness,
    )
    
    print("=== Baseline Pipeline Completed successfully! ===")


if __name__ == "__main__":
    main()
