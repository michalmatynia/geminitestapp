---
owner: 'AI Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
scope: 'ai-features'
canonical: true
doc_type: 'technical-guide'
feature: 'chatbot'
---

# Chatbot Sessions Guide

This document covers the current session-management surface for the admin chatbot.

## Verified operator surfaces

- `/admin/chatbot`
- `/admin/chatbot/sessions`

The main chatbot page is the active conversation workspace. The dedicated sessions page is the operator view for search, cleanup, inline renaming, and bulk deletion.

## Sessions page behavior

`/admin/chatbot/sessions` currently supports:

- searching by title or session id
- inline title editing
- opening a session back in the main workspace
- single-session delete with confirmation
- bulk selection
- “select visible” and “select all matching”
- bulk delete with confirmation flow
- refresh/refetch from the backend

Opening a session sends the operator back to the main workspace using `?session=<id>`.

## Routed API surface

Session management is part of the authenticated catch-all chatbot router in [`src/app/api/chatbot/[[...path]]/route.ts`](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/src/app/api/chatbot/[[...path]]/route.ts).

Verified session routes:

- `/api/chatbot/sessions`
- `/api/chatbot/sessions/[sessionId]`
- `/api/chatbot/sessions/[sessionId]/messages`

Related routed surfaces in the same family:

- `/api/chatbot`
- `/api/chatbot/context`
- `/api/chatbot/settings`
- `/api/chatbot/memory`
- `/api/chatbot/jobs/*`
- `/api/chatbot/agent/*`

## Current page-state model

The sessions page state in `useChatbotSessionsState` currently centers on:

- fetched session list items
- client-side search filtering
- inline title draft state
- selected row ids
- optional skip-confirm behavior for bulk delete
- mutation-backed “select all matching” behavior that requests ids from the backend

That means the page is not just a passive table. It mixes client filtering with backend-assisted bulk selection.

## Operational notes

- Session search is title/id based, not a full-text search over message content.
- Bulk deletion is explicit and separate from row selection.
- Session-open behavior belongs to the main `/admin/chatbot` workspace, not the sessions page itself.
- Message handling lives behind the routed chatbot API family rather than a single legacy message endpoint.

## Documentation boundary

Use this page for:

- session list management
- routed session endpoints
- session-operations behavior on the admin page

Use other docs for:

- overall chatbot workspace shape: [`./chatbot-overview.md`](./chatbot-overview.md)
- context curation: [`./chatbot-context.md`](./chatbot-context.md)
- memory inspection: `/admin/chatbot/memory` and the overview doc
