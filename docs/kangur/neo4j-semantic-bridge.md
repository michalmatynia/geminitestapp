---
owner: 'Kangur Team'
last_reviewed: '2026-03-12'
status: 'active'
doc_type: 'guide'
scope: 'feature:kangur'
canonical: true
---

# Kangur Neo4j Semantic Bridge

## Purpose

Kangur Tutor-AI questions need two kinds of context:

- long-form copy and FAQ text
- relationships between pages, panels, actions, anchors, flows, and tutor guidance

Neo4j is the relationship layer for that second part. It is not the canonical
source of Kangur tutor copy.

## Source of Truth

Canonical Kangur website-help content stays in repo-owned sources such as:

- `src/features/kangur/context-registry/refs.ts`
- `src/shared/contracts/kangur-ai-tutor-content.ts`
- future Kangur docs and settings catalogs

Neo4j stores a derived graph built from those sources. If the graph drifts, the
correct fix is to update the canonical sources or rerun the sync, not to edit
Neo4j manually.

## Local Setup

Bring up Neo4j locally with:

```bash
npm run neo4j:up
```

The local service is defined in `compose.db.yaml` and exposes:

- Browser: `http://localhost:7474`
- Bolt: `bolt://localhost:7687`

Recommended local env:

```bash
NEO4J_ENABLED="true"
NEO4J_URI="bolt://localhost:7687"
NEO4J_HTTP_URL="http://localhost:7474"
NEO4J_USERNAME="neo4j"
NEO4J_PASSWORD="neo4jdevpassword"
NEO4J_DATABASE="neo4j"
```

The standalone Neo4j helper scripts now load the repo `.env` automatically via
`dotenv/config`, so local commands like `kangur:knowledge-graph:status`,
`kangur:knowledge-graph:sync`, `kangur:knowledge-graph:query`, and
`kangur:knowledge-graph:smoke` do not need a manual `set -a && source .env`.

Stop the local service with:

```bash
npm run neo4j:down
```

## Sync Workflow

Preview the Kangur graph payload without writing to Neo4j:

```bash
npm run kangur:knowledge-graph:preview
```

The dry-run summary now also reports `sourceIntegrity`, which counts how many
canonical-source nodes are sync-safe versus missing required `sourceRecordId` or
`sourcePath` references.

Apply the sync to Neo4j:

```bash
npm run kangur:knowledge-graph:sync
```

To build a vector-backed graph snapshot for semantic Tutor-AI reranking, run:

```bash
node --import tsx scripts/db/sync-kangur-knowledge-graph.ts --with-embeddings
```

This keeps Mongo-backed tutor content and native guides as the source of truth,
but stores derived `semanticText` plus embeddings on Neo4j nodes so the tutor
can semantically rerank graph hits and use Neo4j vector-index recall.

Sync bootstraps the minimal Neo4j schema automatically:

- unique node identity on `(graphKey, id)` for `KangurKnowledgeNode`
- lookup index on `graphKey`

Inspect the live synced graph status in Neo4j with:

```bash
npm run kangur:knowledge-graph:status
```

That reports the currently synced locale, sync timestamp, stored node and edge
counts, live graph counts, canonical-source integrity counts, semantic and
embedding node counts, vector-index state, and a derived `semanticReadiness`
summary:

- `vector_ready`: embeddings exist and the Neo4j vector index is online
- `vector_index_pending`: embeddings exist but the vector index is still not online
- `embeddings_without_index`: embeddings exist but no Kangur vector index is present
- `metadata_only`: semantic text exists but the graph has no embeddings
- `no_semantic_text`: the live graph exists but semantic fields are missing
- `no_graph`: no live Kangur graph is present for the requested key

You can also preview a real tutor-style question locally from the command line:

```bash
npm run kangur:knowledge-graph:query -- --message="Jak się zalogować?" --surface=lesson --content-id=lesson-adding-doc --title="Dodawanie"
```

The query preview prints:

- a compact summary with retrieval status, query mode, recall strategy, and
  lexical/vector hit counts
- requested context-registry refs
- runtime resolution mode and any resolved runtime document ids
- Neo4j retrieval/hydration output
- resolved `websiteHelpTarget`

You can also run a live smoke matrix against the synced graph:

```bash
npm run kangur:knowledge-graph:smoke
```

That command exercises a fixed set of Kangur website-help prompts and fails if
their resolved `websiteHelpTarget` route or anchor drifts from the expected
canonical result.

The sync currently seeds:

- Kangur website-help flows such as sign-in, account creation, lessons, tests,
  assignments, and learner profile help
- tutor-auth guidance anchors such as `kangur-primary-nav-login`
- context-root references from `refs.ts`
- Mongo-backed native-guide entries for page sections across lessons, games,
  tests, profile, parent dashboard, and auth
- optional node embeddings derived from the same canonical sources when sync is
  run with `--with-embeddings`
- a Neo4j vector index over node embeddings when the graph is synced with
  `--with-embeddings`

## Runtime Bridge

The first runtime bridge is now wired into the Kangur tutor server path:

- graph retrieval service:
  `src/features/kangur/server/knowledge-graph/retrieval.ts`
- tutor chat integration:
  `src/app/api/kangur/ai-tutor/chat/handler.ts`

Current behavior:

- only runs when `NEO4J_ENABLED` is active
- activates for both:
  - website-help and navigation-style tutor questions
  - section-aware Tutor-AI prompts where the current Kangur surface, panel, or
    focus id should drive retrieval
- scores Neo4j hits with Kangur Tutor-AI metadata such as `surface`,
  `focusKind`, `focusIdPrefixes`, `contentIdPrefixes`, and trigger phrases
- optionally reranks semantic hits with stored Neo4j node embeddings when the
  graph has been synced with `--with-embeddings`
- uses Neo4j vector-index recall first for semantic Tutor-AI prompts when that
  index is available, then falls back to the metadata graph scorer
- adds Neo4j graph hits as:
  - tutor system context
  - tutor response sources
- hydrates graph hits back into canonical Mongo-backed tutor content, native
  guides, and live Kangur runtime context documents when available

## Retrieval Debug Preview

Admin-only retrieval preview is available at:

- `POST /api/kangur/ai-tutor/knowledge-graph/preview`

Use it to inspect:

- normalized retrieval tokens
- requested runtime refs
- resolved runtime document ids
- Neo4j retrieval status, node ids, resolved `websiteHelpTarget`, hydrated
  sources, and node-level hydration provenance

For graph-grounded website-help answers, tutor chat responses now also carry
`websiteHelpTarget`, which is the resolved route or anchor that the tutor UI can
turn into a `Przejdź do tego miejsca` affordance. Neo4j still selects the
semantic neighborhood, but the answer and target remain grounded in canonical
Mongo/runtime hydration.

## First-Phase Graph Contract

First-phase node kinds:

- `app`
- `flow`
- `faq`
- `guide`
- `anchor`
- `context_root`
- `page`
- `collection`
- `action`
- `policy`

First-phase edge kinds:

- `HAS_FLOW`
- `HAS_REFERENCE`
- `LEADS_TO`
- `EXPLAINS`
- `RELATED_TO`
- `USES_ANCHOR`

## Retrieval Strategy

Neo4j should be used together with existing retrieval systems:

- vector retrieval for long-form text chunks
- Neo4j for flow and relationship traversal

For tutor answers about the Kangur website or current Kangur page section, the
intended bridge is:

1. resolve relevant graph neighborhood from Neo4j
2. fetch supporting tutor/doc text from canonical sources or vector retrieval
3. merge both into one tutor context bundle

## Guardrails

- Do not store canonical Kangur tutor copy only in Neo4j.
- Do not add manual graph-only facts that are not traceable to repo-owned
  Kangur sources.
- Use the graph for page semantics, navigation, and section grounding; lesson
  pedagogy and math explanation still stay in the existing tutor/runtime
  systems.
