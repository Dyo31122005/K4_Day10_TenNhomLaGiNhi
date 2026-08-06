from __future__ import annotations

import argparse
from dataclasses import asdict
import json

from core.config import load_settings
from retrieval.workflow import (
    audit_baseline_and_repaired_agents,
    build_and_verify_index,
    build_verify_all_indexes,
    collection_signature,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build and verify local retrieval collections.")
    parser.add_argument(
        "--variant",
        choices=("baseline", "corrupted", "repaired", "all"),
        default="all",
    )
    parser.add_argument(
        "--agent-smoke",
        action="store_true",
        help="After an all build, call the configured LLM and audit baseline/repaired tool use.",
    )
    args = parser.parse_args()
    settings = load_settings()

    if args.variant == "all":
        result = build_verify_all_indexes(settings)
        if args.agent_smoke:
            result["agent_audits"] = audit_baseline_and_repaired_agents(settings)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return

    index, verification, smoke = build_and_verify_index(settings, args.variant)
    print(
        json.dumps(
            {
                "signature": collection_signature(index),
                "verification": asdict(verification),
                "smoke": asdict(smoke) if smoke else None,
            },
            indent=2,
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
