---
owner: 'AI Paths Team'
last_reviewed: '2026-03-28'
status: 'active'
doc_type: 'index'
scope: 'generated'
canonical: true
---
# Semantic Grammar Node JSON

Generated JSON scaffolds for every AI-Paths node type with deterministic per-node hashes.

- One file per node type (`<nodeType>.json`)
- Every node file includes `nodeHashAlgorithm` + `nodeHash` (`sha256`)
- `index.json` contains per-node hash + quick metadata for docs-driven validation inference
- Source of truth: `src/shared/lib/ai-paths/core/docs/node-docs.ts`
- Optional default config seeded from: `src/shared/lib/ai-paths/core/definitions/index.ts`
- Generation prunes stale per-node JSON artifacts not present in `AI_PATHS_NODE_DOCS`
- Check fails fast if unexpected per-node JSON artifacts are present

Regenerate:

```bash
npm run docs:ai-paths:semantic:generate
```
