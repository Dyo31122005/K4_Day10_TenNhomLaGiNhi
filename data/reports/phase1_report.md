# Baseline Phase 1 Report

## 1. Source Summary
- **Source API**: Crossref REST API
- **Total Raw Records**: 24
- **Cleaned Records**: 24

## 2. Evaluation Metrics
- **Samples**: 12
- **Retrieval Hit Rate**: 100.0%
- **Mean Token F1**: 1.0000
- **Judge Accuracy**: 100.0%
- **Mean Judge Score**: 5.00

## 3. Data Quality & Freshness
- **Quality Status**: PASS
- **Total Rows**: 24
- **Freshness Status**: FRESH
- **Latest Published**: 2026-08-01
- **Oldest Published**: 2026-02-12
- **Stale Rows**: 0

### Quality Check Details:
- **row_count**: PASS (Expected >= 20 rows, got 24)
- **paper_id_not_null**: PASS (Found 0 null/empty paper_ids)
- **paper_id_unique**: PASS (Found 0 duplicate paper_ids)
- **title_not_null**: PASS (Found 0 null/empty titles)
- **summary_length**: PASS (Found 0 summaries shorter than 100 chars)
- **freshness**: PASS (Found 0 stale rows older than 180 days)
