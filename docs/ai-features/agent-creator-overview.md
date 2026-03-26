---
owner: 'AI Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'feature-guide'
scope: 'ai-features'
canonical: true
feature: 'agent-creator'
---

# Agent Creator Overview

Agent Creator is the admin surface for persona configuration, learner-agent teaching, and agent-run inspection. It lives under `src/features/ai/agentcreator` and shares ownership with the broader AI runtime stack.

## Verified routes

- `/admin/agentcreator`
- `/admin/agentcreator/personas`
- `/admin/agentcreator/runs`
- `/admin/agentcreator/teaching`
- `/admin/agentcreator/teaching/agents`
- `/admin/agentcreator/teaching/collections`
- `/admin/agentcreator/teaching/chat`
- `/admin/agentcreator/personas/[personaId]/memory`

The route index is a navigation hub. The operational work happens in personas, runs, and teaching subpages.

## Verified feature areas

### Personas

The personas surface manages:

- persona identity and descriptions
- AI Brain-backed routing settings
- mood-avatar configuration
- memory-bank behavior
- avatar file and thumbnail cleanup on save/delete

### Runs

The runs surface renders agent runtime records with:

- status
- prompt/model metadata
- snapshot and log counts
- human-intervention markers
- run-detail modal access

Although the page lives under Agent Creator, the run records come from the shared agent-runtime contract.

### Teaching

The teaching area manages:

- learner agents
- embedding collections
- agent-teaching chat

The learner-agent UI validates LLM and embedding model configuration before save and ties agent records to selected knowledge collections.

## Verified API surface

Agent Creator uses the `src/app/api/agentcreator/*` family, including:

- `/api/agentcreator/*`
- `/api/agentcreator/agent/*`
- `/api/agentcreator/personas/avatar`
- `/api/agentcreator/teaching/agents`
- `/api/agentcreator/teaching/collections`
- `/api/agentcreator/teaching/chat`

Older generic `/api/agents/*` references are not the maintained contract for this repo.

## Key integrations

- **Chatbot**: chatbot settings and persona state depend on Agent Creator configuration.
- **Agent Runtime / AI Paths**: the runs surface inspects shared runtime records.
- **AI Brain**: persona and teaching flows depend on centrally configured chat and embedding models.

## Related docs

- [`./chatbot-overview.md`](./chatbot-overview.md)
- [`../ai-paths/overview.md`](../ai-paths/overview.md)
