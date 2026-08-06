from __future__ import annotations

from dataclasses import replace
import os

import requests

from core.config import Settings, require_llm_credentials

# Order requested for the chatbot demo. Does not change core/config.py or
# retrieval/llm.py — each candidate is just a differently-configured copy of
# the shared `Settings`, so the existing (unmodified) `build_llm`/`build_agent`
# pick it up naturally.
_CANDIDATE_ORDER = ["openrouter", "ollama", "gemini", "deepseek", "openai"]

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
    request rather than being skipped here.
    """
    errors: list[str] = []
    for name in _CANDIDATE_ORDER:
        candidate = _settings_for_candidate(settings, name)
        if candidate is None:
            errors.append(f"{name}: no credential / unreachable")
            continue
        try:
            require_llm_credentials(candidate)
            return candidate, name
        except RuntimeError as exc:
            errors.append(f"{name}: {exc}")

    raise RuntimeError("No LLM provider available. Tried: " + "; ".join(errors))
