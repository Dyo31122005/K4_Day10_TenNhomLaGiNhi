from __future__ import annotations

from typing import Any
from pathlib import Path
import pandas as pd

from core.utils import first_sentence, write_json


def build_test_set(df: pd.DataFrame, output_path) -> list[dict[str, Any]]:
    """Build evaluation set from cleaned dataframe.

    1. Checks minimum number of documents.
    2. Chooses representative papers (up to 6 papers).
    3. Creates 4 question types for each:
       - summary
       - authors
       - date
       - categories
    4. Each question contains the title in single quotes and trigger keywords.
    5. Saves JSON to output_path.
    """
    if df.empty:
        raise ValueError("Cannot build test set from an empty DataFrame.")

    # We select up to 3 papers to generate 12 evaluation questions
    selected_df = df.head(3)
    test_cases: list[dict[str, Any]] = []
    idx = 1

    for _, row in selected_df.iterrows():
        title = row["title"]
        paper_id = row["paper_id"]

        # 1. Summary question (no trigger keywords, asks for overview)
        test_cases.append({
            "id": f"q_{idx:03d}",
            "question_type": "summary",
            "question": f"Provide a summary of the paper '{title}'",
            "ground_truth": first_sentence(row["summary"]),
            "ground_truth_doc_ids": [paper_id],
        })
        idx += 1

        # 2. Authors question (contains trigger "Who authored")
        test_cases.append({
            "id": f"q_{idx:03d}",
            "question_type": "authors",
            "question": f"Who authored the paper '{title}'?",
            "ground_truth": row["authors_joined"],
            "ground_truth_doc_ids": [paper_id],
        })
        idx += 1

        # 3. Date question (contains trigger "When was")
        test_cases.append({
            "id": f"q_{idx:03d}",
            "question_type": "date",
            "question": f"When was the paper '{title}' published?",
            "ground_truth": row["published"],
            "ground_truth_doc_ids": [paper_id],
        })
        idx += 1

        # 4. Categories question (contains trigger "What categories")
        test_cases.append({
            "id": f"q_{idx:03d}",
            "question_type": "categories",
            "question": f"What categories does the paper '{title}' belong to?",
            "ground_truth": row["categories_joined"],
            "ground_truth_doc_ids": [paper_id],
        })
        idx += 1

    write_json(Path(output_path), test_cases)
    return test_cases
