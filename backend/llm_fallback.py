from __future__ import annotations

from dataclasses import replace
import os

import requests

from core.config import Settings, require_llm_credentials

# OpenAI first: that's what the whole team is actually using, so it's the
# fastest path to a working answer. The rest stay as a fallback safety net if
# OpenAI's key/quota ever fails. Does not change core/config.py or
# retrieval/llm.py — each candidate is just a differently-configured copy of
# the shared `Settings`, so the existing (unmodified) `build_llm`/`build_agent`
# pick it up naturally.
_CANDIDATE_ORDER = ["openai", "openrouter", "gemini", "deepseek", "ollama"]

_DEEPSEEK_BASE_URL = "https://api.deepseek.com"


def _ollama_reachable(base_url: str, timeout: float = 1.5) -> bool:
    try:
        requests.get(base_url, timeout=timeout)
        return True
    except requests.RequestException:
        return False


def _settings_for_candidate(settings: Settings, name: str) -> Settings | None:
    if name == "openrouter":
        if not settings.openrouter_api_key:
            return None
        return replace(settings, llm_provider="openrouter")

    if name == "ollama":
        if not _ollama_reachable(settings.ollama_base_url):
            return None
        return replace(settings, llm_provider="ollama", model_name=os.getenv("OLLAMA_MODEL", "llama3.1"))

    if name == "gemini":
        key = settings.google_api_key or os.getenv("GEMINI_API_KEY")
        if not key:
            return None
        return replace(
            settings,
            llm_provider="gemini",
            model_name=os.getenv("GEMINI_MODEL") or settings.model_name,
            google_api_key=key,
        )

    if name == "deepseek":
        key = os.getenv("DEEPSEEK_API_KEY")
        if not key:
            return None
        # DeepSeek is an OpenAI-compatible endpoint -> reuse the existing "custom" slot.
        return replace(
            settings,
            llm_provider="custom",
            model_name=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            custom_llm_api_key=key,
            custom_llm_base_url=os.getenv("DEEPSEEK_BASE_URL", _DEEPSEEK_BASE_URL),
        )

    if name == "openai":
        if not settings.openai_api_key:
            return None
        return replace(settings, llm_provider="openai", model_name="gpt-4o")

    return None


def resolve_llm_settings(settings: Settings) -> tuple[Settings, str]:
    """Probe candidates in order and return the first usable `Settings` + its name.

    Only checks that credentials exist (and, for Ollama, that the local server
    answers) — it does not spend an API call verifying the key is valid, so a
    stale/revoked key still surfaces as a runtime error on the first real
    request rather than being skipped here. Kept for callers that just need
    "which provider would be tried first" (e.g. a status display); actual
    chat requests should use `iter_llm_candidates` so a mid-chain failure
    (expired key, no credits, rate limit) falls through to the next provider.
    """
    for name, candidate in iter_llm_candidates(settings):
        return candidate, name
    raise RuntimeError("No LLM provider available: no candidate has usable credentials.")


def iter_llm_candidates(settings: Settings):
    """Yield every candidate with usable credentials, in fallback order.

    Unlike `resolve_llm_settings`, this does not stop at the first candidate —
    callers should try each in turn and move on when a real API call fails
    (e.g. HTTP 402/401/429), since a present API key does not guarantee the
    account can actually serve a request right now.
    """
    for name in _CANDIDATE_ORDER:
        candidate = _settings_for_candidate(settings, name)
        if candidate is None:
            continue
        try:
            require_llm_credentials(candidate)
        except RuntimeError:
            continue
        yield name, candidate
