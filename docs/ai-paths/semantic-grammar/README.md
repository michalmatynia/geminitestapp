---
owner: 'AI Paths Team'
last_reviewed: '2026-03-09'
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
