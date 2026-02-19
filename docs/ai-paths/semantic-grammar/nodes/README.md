# Semantic Grammar Node JSON

Generated JSON scaffolds for every AI-Paths node type with deterministic per-node hashes.

- One file per node type (`<nodeType>.json`)
- Every node file includes `nodeHashAlgorithm` + `nodeHash` (`sha256`)
- `index.json` contains per-node hash + quick metadata for docs-driven validation inference
- Source of truth: `src/features/ai/ai-paths/lib/core/docs/node-docs.ts`
- Optional default config seeded from: `src/features/ai/ai-paths/lib/core/definitions/index.ts`

Regenerate:

```bash
npm run docs:ai-paths:semantic:generate
```
