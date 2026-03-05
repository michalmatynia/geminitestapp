# AI-Paths Node Code Objects (v2)

Generated portable semantic node objects for copy/paste-safe AI-Paths authoring.

- Source docs: `docs/ai-paths/semantic-grammar/nodes/*.json` + `AI_PATHS_NODE_DOCS` fallback
- Index: `index.json`
- One object per node type: `<nodeType>.json`
- Integrity: deterministic `objectHash` (`sha256`)

Regenerate:

```bash
npm run docs:ai-paths:node-code:generate
```

Check:

```bash
npm run docs:ai-paths:node-code:check
```

