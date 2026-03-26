---
owner: 'AI Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
scope: 'ai-features'
canonical: true
doc_type: 'technical-guide'
feature: 'chatbot'
---

# Chatbot Context Guide

This document covers the current admin context-management surface for the chatbot. It does not try to prescribe model-token budgets or theoretical local/global prompt assembly rules beyond what the app actually exposes.

## Verified operator surfaces

- `/admin/chatbot`
- `/admin/chatbot/context`

The main chatbot page exposes settings that toggle local/global behavior, while `/admin/chatbot/context` is the operator surface for maintaining shared global context items.

## Context page behavior

`/admin/chatbot/context` currently supports:

- creating manual context entries
- editing and deleting existing entries
- enabling and disabling specific entries
- tag-based quick filters
- free-text filtering by title, content, or tag
- copying a shareable filtered link using `q` and `tags` query params
- uploading a PDF and converting extracted segments into context items
- saving the current context collection and the active-id set back to persisted settings

## Persisted settings keys

The page currently persists through chatbot settings keys:

- `chatbot_global_context_items`
- `chatbot_global_context_active`

The UI loads those keys, materializes local editor state, and writes them back explicitly via “Save Contexts”.

## Current context item model

The page state is built around context items with:

- `id`
- `title`
- `content`
- `tags`
- `source`
- `createdAt`

In practice the page distinguishes at least these sources:

- `manual`
- `pdf`

Active state is stored separately from the item list, which is why the page can keep an item while disabling its use.

## Routed API surface

Context management sits inside the authenticated chatbot router:

- `/api/chatbot/context`
- `/api/chatbot/settings`

The page also uses a dedicated PDF-upload mutation path from the chatbot feature hooks, but the maintained public/operator contract is still the routed chatbot API family rather than a standalone ad hoc endpoint described only in docs.

## Relationship to local/global chatbot behavior

The current docs stance should stay narrow:

- the app exposes local/global behavior controls on the chatbot side
- `/admin/chatbot/context` is where shared global reference material is curated
- the page is not the sole source of persona instructions or all model context

Persona and routing settings still come from shared AI configuration and Agent Creator integrations documented elsewhere.

## Operational notes

- Tag filters can be restored from URL params, making the page shareable for operator workflows.
- PDF uploads append parsed segments as new context items and auto-activate them.
- Saving is explicit; local edits and active toggles are not the same as persisted state until saved.

## Documentation boundary

Use this page for:

- the operator behavior of `/admin/chatbot/context`
- persisted context keys
- filter and upload behavior

Use other docs for:

- overall chatbot workspace and API family: [`./chatbot-overview.md`](./chatbot-overview.md)
- session management: [`./chatbot-sessions.md`](./chatbot-sessions.md)
- memory inspection: `/admin/chatbot/memory`
