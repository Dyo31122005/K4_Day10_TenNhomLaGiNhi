from __future__ import annotations

from functools import lru_cache
import math

from sentence_transformers import CrossEncoder


DEFAULT_RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"


@lru_cache(maxsize=2)
def _load_reranker(model_name: str) -> CrossEncoder:
    return CrossEncoder(model_name)


class MiniLMCrossEncoderReranker:
    """Second-stage reranker that scores query/document pairs jointly."""

    def __init__(self, model_name: str = DEFAULT_RERANKER_MODEL):
        self.model_name = model_name

    def score(self, query: str, documents: list[str]) -> list[float]:
        if not documents:
            return []
        model = _load_reranker(self.model_name)
        logits = model.predict([(query, document) for document in documents])
        return [float(value) for value in logits]

    @staticmethod
    def normalized_score(logit: float) -> float:
        """Map an MS MARCO relevance logit to a display-friendly [0, 1] score."""

        if logit >= 0:
            return 1.0 / (1.0 + math.exp(-logit))
        exp_value = math.exp(logit)
        return exp_value / (1.0 + exp_value)
