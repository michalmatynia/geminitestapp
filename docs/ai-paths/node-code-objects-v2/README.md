---
owner: 'AI Paths Team'
last_reviewed: '2026-04-11'
status: 'active'
doc_type: 'index'
scope: 'feature:ai-paths'
canonical: true
---
# AI-Paths Node Code Objects (v2)

Generated portable semantic node objects for copy/paste-safe AI-Paths authoring.

## Open This Hub When

- you need the generated v2 node-code-object artifacts rather than the broader AI Paths runtime docs
- you are regenerating or checking copy/paste-safe node object outputs
- you need the current v2 index, contract hashes, or per-node JSON objects used by tooling

## Which Artifact To Use

| Question | Canonical artifact |
| --- | --- |
| Where is the generated object index? | `index.json` |
| Where is the contract hash map? | `contracts.json` |
| Where are per-node v2 objects? | `<nodeType>.json` files in this folder |
| What source docs feed these artifacts? | `docs/ai-paths/semantic-grammar/nodes/*.json` plus `AI_PATHS_NODE_DOCS` fallback |

- Source docs: `docs/ai-paths/semantic-grammar/nodes/*.json` + `AI_PATHS_NODE_DOCS` fallback
- Index: `index.json`
- Contract hash map: `contracts.json`
- One object per node type: `<nodeType>.json`
- Integrity: deterministic `objectHash` (`sha256`)
- Generation prunes stale per-node JSON artifacts not present in `AI_PATHS_NODE_DOCS`
- Check fails fast when unexpected per-node JSON artifacts are present

Regenerate:

```bash
npm run docs:ai-paths:node-code:generate
```

Check:

```bash
npm run docs:ai-paths:node-code:check
```

Full node-docs pipeline:

```bash
npm run docs:ai-paths:node-docs:generate
npm run docs:ai-paths:node-docs:check
npm run docs:ai-paths:node-docs:verify
npm run docs:ai-paths:node-docs:ci
```

`docs:ai-paths:node-docs:ci` runs `verify` and tooltip coverage checks.
