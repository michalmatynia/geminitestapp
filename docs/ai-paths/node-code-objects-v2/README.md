# AI-Paths Node Code Objects (v2)

Generated portable semantic node objects for copy/paste-safe AI-Paths authoring.

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

