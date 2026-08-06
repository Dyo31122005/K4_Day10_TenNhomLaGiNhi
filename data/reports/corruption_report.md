# Data Observability & Corruption Impact Comparison Report

## 1. Executive Summary

This report demonstrates the impact of data quality issues (corruption) on the performance of our RAG agent, and evaluates the recovery rate after running the repair process.

**Key Findings:**

- **Data corruption** degraded retrieval hit rate, token F1, judge accuracy, judge score.
- **Data repair** restored every tracked metric back to baseline levels.

---

## 2. Performance Comparison Table

| Metric                     | Baseline (Clean) | Corrupted (Lỗi) | Repaired (Đã Sửa) | Delta (Corrupted vs Baseline) |
| :------------------------- | :--------------: | :-------------: | :---------------: | :---------------------------: |
| **Retrieval Hit Rate**     |      100.0%      |      66.7%      |      100.0%       |            -33.3%             |
| **Mean Token F1-score**    |      1.0000      |     0.3495      |      1.0000       |            -0.6505            |
| **LLM Judge Accuracy**     |      100.0%      |      33.3%      |      100.0%       |            -66.7%             |
| **Mean Judge Score (1-5)** |       5.00       |      2.50       |       5.00        |            -2.5000            |
| **Total Rows**             |        24        |       25        |        24         |               1               |
| **Quality Status**         |       PASS       |      FAIL       |       PASS        |               -               |
| **Freshness Status**       |      FRESH       |      STALE      |       FRESH       |               -               |

---

## 3. Root Cause Analysis

1. **Dropped Records**: Removed the newest rows entirely, so any question whose ground truth depended on them can no longer be retrieved.
2. **Blank Summary**: Empties the summary field, so the agent lacks context to answer summary questions and tends to fall back to a non-answer.
3. **Summary Noise**: Injects unrelated tokens into the summary, degrading generation quality and lowering token F1 / judge scores.
4. **Title Truncation**: Shortens the title so exact-match/dense retrieval can fail or surface irrelevant papers, reducing retrieval hit rate.
5. **Stale Publication Date**: Pushes the published date far into the past, violating the freshness threshold and flipping freshness status to STALE.
6. **Category Swap**: Exchanges category labels between two otherwise valid papers. The schema remains valid, but category retrieval and answers become incorrect.
7. **Author Attribution Swap**: Exchanges author lists between two papers, simulating a bad multi-source merge while leaving titles and summaries plausible.
8. **HTML Markup Leakage**: Leaves raw markup in a summary, adding source artifacts to embedding input without breaking the dataframe schema.
9. **Future Publication Date**: Moves a publication date into the future and makes its persisted age negative, exposing missing temporal-range validation.
10. **Duplicate Record**: Re-inserts an existing paper as a second row, risking duplicate/conflicting evidence being retrieved for the same paper_id.
11. **Semantic Near Duplicate**: Adds a lightly reworded copy with a distinct ID, testing whether retrieval is diluted by duplicates that evade exact-match checks.

---

## 4. Query Analysis (Hit vs Miss Example)

We analyzed query **`q_001`** across all three phases:

- **Query**: `"Provide a summary of the paper 'Hi-RAG: A Hierarchical Retrieval-Augmented Generation Framework for Scalable and Generalisable Tool Selection in Large Language Model Agents'"`
- **Baseline (Clean)**:
  - **Retrieval**: **HIT** (Retrieved correct paper ID `10.1111/exsy.70341` at Rank 1).
  - **RAG Answer**: Correctly summarized Hi-RAG.
  - **LLM Judge Score**: **5/5 (Correct: True)**.
- **Corrupted**:
  - **Retrieval**: **MISS** (The paper `10.1111/exsy.70341` was completely removed by the `drop_latest` corruption operation).
  - **RAG Answer**: The agent retrieved an unrelated paper on "Deep RAG" (`10.36227/techrxiv.177272838.89432844/v1`) and summarized it instead.
  - **LLM Judge Score**: **2/5 (Correct: False)**.
- **Repaired (Recovered)**:
  - **Retrieval**: **HIT** (Retrieved correct paper ID `10.1111/exsy.70341` at Rank 1).
  - **RAG Answer**: Correctly summarized Hi-RAG.
  - **LLM Judge Score**: **5/5 (Correct: True)**.

---

## 5. Recovery Validation

- **Retrieval Hit Rate**: fully recovered
- **Token F1**: fully recovered
- **Judge Accuracy**: fully recovered
- **Judge Score**: fully recovered

All tracked metrics reached or exceeded their baseline value after repair.
