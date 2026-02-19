# AI-Paths Semantic Grammar

Semantic Grammar is the portable JSON contract for AI-Paths canvases and subgraphs.
It captures:

- full node settings for every node
- explicit edge wiring (`fromNodeId`, `fromPort`, `toNodeId`, `toPort`)
- execution/validation metadata
- provenance for cross-system copy/paste

Main references:

- Spec: `docs/ai-paths/semantic-grammar/spec-v1.md`
- JSON Schema: `docs/ai-paths/semantic-grammar/schema/canvas-grammar.v1.json`
- Per-node JSON scaffolds: `docs/ai-paths/semantic-grammar/nodes/`

Code contracts:

- `src/shared/contracts/ai-paths-semantic-grammar.ts`
- `src/features/ai/ai-paths/lib/core/semantic-grammar/`

Generate per-node scaffolds:

```bash
npm run docs:ai-paths:semantic:generate
```
