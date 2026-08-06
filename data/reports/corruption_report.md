# Data Observability & Corruption Impact Comparison Report

## 1. Executive Summary
This report demonstrates the impact of data quality issues (corruption) on the performance of our RAG agent, and evaluates the recovery rate after running the repair process.

**Key Findings:**
- **Data corruption** degraded retrieval hit rate, token F1, judge accuracy, judge score.
- **Data repair** restored every tracked metric back to baseline levels.

---

## 2. Performance Comparison Table

| Metric | Baseline (Clean) | Corrupted (Lỗi) | Repaired (Đã Sửa) | Delta (Corrupted vs Baseline) |
| :--- | :---: | :---: | :---: | :---: |
| **Retrieval Hit Rate** | 100.0% | 33.3% | 100.0% | -66.7% |
| **Mean Token F1-score** | 1.0000 | 0.4600 | 1.0000 | -0.5400 |
| **LLM Judge Accuracy** | 100.0% | 41.7% | 100.0% | -58.3% |
| **Mean Judge Score (1-5)** | 5.00 | 3.08 | 5.00 | -1.9167 |
| **Total Rows** | 12 | 12 | 12 | 0 |
| **Quality Status** | PASS | FAIL | PASS | - |
| **Freshness Status** | FRESH | STALE | FRESH | - |

---

## 3. Root Cause Analysis

1. **Dropped Records**: Removed the newest rows entirely, so any question whose ground truth depended on them can no longer be retrieved.
2. **Blank Summary**: Empties the summary field, so the agent lacks context to answer summary questions and tends to fall back to a non-answer.
3. **Summary Noise**: Injects unrelated tokens into the summary, degrading generation quality and lowering token F1 / judge scores.
4. **Title Truncation**: Shortens the title so exact-match/dense retrieval can fail or surface irrelevant papers, reducing retrieval hit rate.
5. **Stale Publication Date**: Pushes the published date far into the past, violating the freshness threshold and flipping freshness status to STALE.
6. **Duplicate Record**: Re-inserts an existing paper as a second row, risking duplicate/conflicting evidence being retrieved for the same paper_id.

---

## 4. Recovery Validation
- **Retrieval Hit Rate**: fully recovered
- **Token F1**: fully recovered
- **Judge Accuracy**: fully recovered
- **Judge Score**: fully recovered

All tracked metrics reached or exceeded their baseline value after repair.
