---
owner: 'Kangur Team'
last_reviewed: '2026-03-11'
status: 'active'
doc_type: 'guide'
scope: 'feature:kangur'
canonical: true
---

# Kangur Neo4j Semantic Bridge

## Purpose

Kangur website-help questions need two kinds of context:

- long-form copy and FAQ text
- relationships between pages, actions, anchors, flows, and tutor guidance

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

Stop the local service with:

```bash
npm run neo4j:down
```

## Sync Workflow

Preview the Kangur graph payload without writing to Neo4j:

```bash
npm run kangur:knowledge-graph:preview
```

Apply the sync to Neo4j:

```bash
npm run kangur:knowledge-graph:sync
```

The sync currently seeds:

- Kangur website-help flows such as sign-in, account creation, lessons, tests,
  assignments, and learner profile help
- tutor-auth guidance anchors such as `kangur-primary-nav-login`
- context-root references from `refs.ts`

## Runtime Bridge

The first runtime bridge is now wired into the Kangur tutor server path:

- graph retrieval service:
  `src/features/kangur/server/knowledge-graph/retrieval.ts`
- tutor chat integration:
  `src/app/api/kangur/ai-tutor/chat/handler.ts`

Current behavior:

- only runs when `NEO4J_ENABLED` is active
- only activates for website-help and navigation-style tutor questions
- adds Neo4j graph hits as:
  - tutor system context
  - tutor response sources

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

For tutor answers about the Kangur website, the intended bridge is:

1. resolve relevant graph neighborhood from Neo4j
2. fetch supporting tutor/doc text from canonical sources or vector retrieval
3. merge both into one tutor context bundle

## Guardrails

- Do not store canonical Kangur tutor copy only in Neo4j.
- Do not add manual graph-only facts that are not traceable to repo-owned
  Kangur sources.
- Keep the graph scoped to website-help and navigation first; lesson pedagogy
  and math explanation stay in the existing tutor/runtime systems.
