from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from langchain.agents import create_agent
from langchain.tools import tool

from core.config import Settings
from retrieval.index import LocalEmbeddingIndex
from retrieval.llm import build_llm


@dataclass(frozen=True)
class AgentRunAudit:
    answer: str
    tool_names: list[str]
    tool_outputs: list[str]
    used_retrieval_tool: bool
    collection_name: str


def validate_agent_audit(audit: AgentRunAudit) -> None:
    """Verify that a factual agent run used retrieval from the intended collection."""

    if not audit.used_retrieval_tool:
        raise RuntimeError("Agent answered without calling a retrieval tool.")
    if not audit.tool_outputs:
        raise RuntimeError("Agent retrieval tool produced no auditable output.")
    expected_marker = f"collection: {audit.collection_name}"
    if not any(expected_marker in output for output in audit.tool_outputs):
        raise RuntimeError(
            f"Agent tool output did not come from collection {audit.collection_name!r}."
        )


def build_agent_tools(index: LocalEmbeddingIndex) -> list[Any]:
    """Create retrieval tools separately so their raw outputs can be smoke-tested."""

    @tool
    def semantic_search_papers(query: str, top_k: int = 4) -> str:
        """Search the local paper corpus with embeddings and return the most relevant papers."""
        results = index.search(query, top_k=top_k)
        if not results:
            return f"collection: {index.collection_name}\nNo relevant paper found."
        lines = []
        for result in results:
            lines.append(
                f"collection: {index.collection_name}\n"
                f"paper_id: {result.paper_id}\n"
                f"title: {result.title}\n"
                f"rerank_score: {result.score:.4f}\n"
                f"vector_score: {(result.vector_score or 0.0):.4f}\n"
                f"published: {result.metadata.get('published', '')}\n"
                f"categories: {result.metadata.get('categories_joined', '')}\n"
                f"authors: {result.metadata.get('authors_joined', '')}\n"
                f"{result.content}"
            )
        return "\n\n".join(lines)

    @tool
    def lookup_paper(paper_id_or_title: str) -> str:
        """Look up a paper by exact paper_id or exact title from the local corpus."""
        record = index.lookup(paper_id_or_title)
        if not record:
            return f"collection: {index.collection_name}\nNo exact paper match found."
        metadata = record.get("metadata", {})
        return (
            f"collection: {index.collection_name}\n"
            f"paper_id: {record['paper_id']}\n"
            f"title: {record['title']}\n"
            f"published: {metadata.get('published', '')}\n"
            f"categories: {metadata.get('categories_joined', '')}\n"
            f"authors: {metadata.get('authors_joined', '')}\n"
            f"{record['content']}"
        )

    return [semantic_search_papers, lookup_paper]


def build_agent(settings: Settings, index: LocalEmbeddingIndex):
    tools = build_agent_tools(index)

    llm = build_llm(settings=settings, temperature=0.0)
    return create_agent(
        model=llm,
        tools=tools,
        system_prompt=(
            "You answer questions about the indexed scholarly paper corpus sourced from Crossref. "
            "For every factual corpus question, you MUST call semantic_search_papers or lookup_paper "
            "before answering. Base factual claims only on returned tool content, cite paper_id, and "
            "never fill gaps with outside knowledge. If the tools do not support the answer, reply "
            "that the indexed corpus does not contain enough evidence."
        ),
        name="paper_corpus_agent",
    )


def run_agent_question_audited(agent: Any, question: str, collection_name: str) -> AgentRunAudit:
    result = agent.invoke({"messages": [{"role": "user", "content": question}]})
    messages = result.get("messages", [])
    if not messages:
        return AgentRunAudit("", [], [], False, collection_name)
    final_message = messages[-1]
    answer = getattr(final_message, "content", str(final_message))
    tool_messages = [message for message in messages if getattr(message, "type", "") == "tool"]
    tool_names = [str(getattr(message, "name", "unknown")) for message in tool_messages]
    tool_outputs = [str(getattr(message, "content", "")) for message in tool_messages]
    retrieval_tools = {"semantic_search_papers", "lookup_paper"}
    used_retrieval_tool = any(name in retrieval_tools for name in tool_names)
    return AgentRunAudit(
        answer=str(answer),
        tool_names=tool_names,
        tool_outputs=tool_outputs,
        used_retrieval_tool=used_retrieval_tool,
        collection_name=collection_name,
    )


def run_agent_question(agent: Any, question: str) -> str:
    audit = run_agent_question_audited(agent, question, collection_name="unknown")
    return audit.answer
