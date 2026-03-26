---
owner: 'AI Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'feature-guide'
scope: 'ai-features'
canonical: true
feature: 'chatbot'
---

# Chatbot Overview

The chatbot is the admin conversational workspace in `src/features/ai/chatbot`. It combines multi-session chat, persona-backed settings, local/global context controls, memory inspection, and optional agent-run handoff.

## Verified routes

- `/admin/chatbot`
- `/admin/chatbot/sessions`
- `/admin/chatbot/context`
- `/admin/chatbot/memory`

## Verified workspace shape

The main page at `/admin/chatbot` mounts:

- a session sidebar
- a central workspace with `Chat` and `Settings` tabs
- a debug panel
- a context-registry page provider for `admin:chatbot`
- an `AgentCreatorSettingsProvider`, so persona and model choices stay aligned with Agent Creator

Supporting routes break out operational views:

- `sessions`: session inventory and lifecycle work
- `context`: context inspection and curation
- `memory`: memory inspection and cleanup

## Verified API surface

The feature uses the `src/app/api/chatbot/*` router family rather than a single legacy message endpoint.

Primary surfaces:

- `/api/chatbot/*`
- `/api/chatbot/sessions/*`
- `/api/chatbot/settings`
- `/api/chatbot/context`
- `/api/chatbot/memory`
- `/api/chatbot/jobs/*`
- `/api/chatbot/agent/*`

## Key integrations

- **Agent Creator**: persona and settings state are shared into the chatbot workspace.
- **AI Paths / agent runtime**: the UI tracks `latestAgentRunId`, and `/api/chatbot/agent/*` exposes the run-assistance lane.
- **AI Context Registry**: the page publishes chatbot workspace state through a context-registry bundle.
- **Documentation / tooling**: the page is a feature UI, while execution, leasing, and queue governance live in the dedicated AI Paths docs.

## What this doc intentionally does not claim

- It does not define a stable `/api/chatbot/message` contract. The real surface is the routed `chatbot` API family.
- It does not treat personas as chatbot-local data. Persona and model configuration are shared with Agent Creator.
- It does not duplicate AI Paths queueing and execution policy. Use [`../ai-paths/overview.md`](../ai-paths/overview.md) and [`../ai-paths/reference.md`](../ai-paths/reference.md) for that layer.

## Related docs

- [`./chatbot-sessions.md`](./chatbot-sessions.md)
- [`./chatbot-context.md`](./chatbot-context.md)
- [`./agent-creator-overview.md`](./agent-creator-overview.md)
- [`../ai-paths/overview.md`](../ai-paths/overview.md)
