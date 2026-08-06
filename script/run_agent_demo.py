from __future__ import annotations

"""Smoke-test the real LLM tool-calling agent (not the deterministic qa.py
shortcut used by evaluate_pipeline) and persist an auditable transcript.

Guide.md Bước 8 and the CP2/CP3 pass criteria both expect the agent to call a
retrieval tool before answering factual questions, with the tool output
traceable back to the collection it came from. ``pipelines/phase1.py`` never
exercises this path (it evaluates via ``retrieval.qa.answer_question``
instead), so this script is the actual evidence for that requirement.
"""

from core.config import load_settings
from core.utils import read_json, write_json
from retrieval.agent import build_agent, run_agent_question_audited, validate_agent_audit
from retrieval.index import LocalEmbeddingIndex

# One question per type from the real evaluation set, so the demo exercises
# the same question shapes the metrics pipeline is scored on.
SAMPLE_QUESTION_IDS = {"q_001", "q_002", "q_003", "q_004"}


def main() -> None:
    print("=== Agent tool-use smoke test (baseline collection) ===")
    settings = load_settings()

    print(f"Loading baseline index from {settings.paths.embeddings_json}...")
    index = LocalEmbeddingIndex.load(settings)

    test_set = read_json(settings.paths.eval_testset)
    sample = [item for item in test_set if item["id"] in SAMPLE_QUESTION_IDS]
    if not sample:
        raise RuntimeError(
            f"No questions with ids {sorted(SAMPLE_QUESTION_IDS)} found in {settings.paths.eval_testset}."
        )

    agent = build_agent(settings, index)

    results = []
    for item in sample:
        print(f"Asking [{item['id']}] ({item['question_type']}): {item['question']}")
        audit = run_agent_question_audited(agent, item["question"], collection_name=index.collection_name)
        try:
            validate_agent_audit(audit)
            audit_status = "PASS"
        except RuntimeError as exc:
            audit_status = f"FAIL: {exc}"
        print(f"  -> tools called: {audit.tool_names or 'NONE'} | audit: {audit_status}")

        results.append(
            {
                "id": item["id"],
                "question_type": item["question_type"],
                "question": item["question"],
                "ground_truth": item["ground_truth"],
                "agent_answer": audit.answer,
                "tool_names": audit.tool_names,
                "tool_outputs": audit.tool_outputs,
                "used_retrieval_tool": audit.used_retrieval_tool,
                "collection_name": audit.collection_name,
                "audit_status": audit_status,
            }
        )

    write_json(settings.paths.demo_answers, results)
    print(f"Saved agent demo transcript to {settings.paths.demo_answers}")

    failures = [item for item in results if item["audit_status"] != "PASS"]
    if failures:
        print(f"=== WARNING: {len(failures)}/{len(results)} question(s) failed the tool-use audit ===")
    else:
        print("=== All sampled questions passed the tool-use audit ===")


if __name__ == "__main__":
    main()
