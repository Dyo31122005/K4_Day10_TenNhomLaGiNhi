# Retrieval collections verification

- Embedding model: `sentence-transformers/all-MiniLM-L6-v2`
- Reranker model: `cross-encoder/ms-marco-MiniLM-L-6-v2`
- Chroma persist path: `/Users/empteax214/Documents/vinai/K4_Day10_TenNhomLaGiNhi/data/chroma`
- Reproducible baseline query: `Hi-RAG: A Hierarchical Retrieval-Augmented Generation Framework for Scalable and Generalisable Tool Selection in Large Language Model Agents`
- Baseline unchanged after corrupted build: `True`

| Variant | Collection | Clean/manifest/Chroma | Search top paper | Exact lookup | Manifest |
|---|---|---:|---|---|---|
| baseline | `papers-baseline` | 24/24/24 | `10.1111/exsy.70341` | `10.1111/exsy.70341` | `/Users/empteax214/Documents/vinai/K4_Day10_TenNhomLaGiNhi/data/embeddings/papers_embeddings.json` |
| corrupted | `papers-corrupted` | 23/23/23 | `10.36227/techrxiv.177272838.89432844/v1` | `not found` | `/Users/empteax214/Documents/vinai/K4_Day10_TenNhomLaGiNhi/data/embeddings/papers_embeddings_corrupted.json` |
| repaired | `papers-repaired` | 24/24/24 | `10.1111/exsy.70341` | `10.1111/exsy.70341` | `/Users/empteax214/Documents/vinai/K4_Day10_TenNhomLaGiNhi/data/embeddings/papers_embeddings_repaired.json` |

## Interpretation

The same query is run against all three collections. Differences in ranked IDs or scores come from their respective clean/corrupted/repaired inputs. Exact lookup uses the baseline paper ID, so a missing result in the corrupted collection is valid evidence of corruption.

Each collection has its own name, embedding manifest, and build log. The collections share one Chroma persistence directory but are independently replaceable and reloadable.
