---
owner: 'AI Paths Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'index'
scope: 'feature:ai-paths'
canonical: true
---

# AI-Paths Semantic Grammar

Semantic Grammar is the portable JSON contract for AI-Paths canvases and subgraphs.
It captures:

- full node settings for every node
- explicit edge wiring (`fromNodeId`, `fromPort`, `toNodeId`, `toPort`)
- execution/validation metadata
- provenance for cross-system copy/paste
- deterministic per-node-type hashes for traceable docs inference

This hub is the maintained contract reference for portable canvas JSON. Use
[`../overview.md`](../overview.md) and [`../reference.md`](../reference.md) for
the broader runtime, queue, and operator surface around that contract.

## Open This Hub When

- you need the portable canvas JSON contract rather than general AI Paths runtime guidance
- you need the schema, per-node JSON docs, or hash/index artifacts used by tooling
- you are changing semantic-grammar generation, validation, or copy/paste-safe canvas contracts

## Which Artifact To Use

| Question | Canonical artifact |
| --- | --- |
| What is the semantic-grammar spec? | `docs/ai-paths/semantic-grammar/spec-v1.md` |
| What JSON schema validates the canvas payload? | `docs/ai-paths/semantic-grammar/schema/canvas-grammar.v1.json` |
| Where are per-node JSON docs and scaffolds? | `docs/ai-paths/semantic-grammar/nodes/README.md` and `docs/ai-paths/semantic-grammar/nodes/` |
| Where are stable code contracts for the grammar? | `src/shared/contracts/ai-paths-semantic-grammar.ts` and `src/shared/lib/ai-paths/core/semantic-grammar/` |

Main references:

- Spec: `docs/ai-paths/semantic-grammar/spec-v1.md`
- JSON Schema: `docs/ai-paths/semantic-grammar/schema/canvas-grammar.v1.json`
- Node JSON hub: `docs/ai-paths/semantic-grammar/nodes/README.md`
- Per-node JSON scaffolds: `docs/ai-paths/semantic-grammar/nodes/`
- Node hash index: `docs/ai-paths/semantic-grammar/nodes/index.json` (`nodeHash`, `nodeHashAlgorithm`)

Code contracts:

- `src/shared/contracts/ai-paths-semantic-grammar.ts`
- `src/shared/lib/ai-paths/core/semantic-grammar/`

Generate per-node scaffolds:

```bash
npm run docs:ai-paths:semantic:generate
```

Check semantic-grammar coverage and structure with:

```bash
npm run docs:ai-paths:semantic:check
```
