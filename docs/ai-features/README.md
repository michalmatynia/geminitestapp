---
owner: 'AI Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'index'
scope: 'ai-features'
canonical: true
---

# AI Features Documentation

This folder covers the admin-facing AI feature set that lives under `src/features/ai` plus the shared workspace layers those features reuse.

Use [`../ai-paths/README.md`](../ai-paths/README.md) for the dedicated AI Paths runtime, queueing, leasing, and execution docs. This folder keeps the feature-level view.

## Canonical Feature Map

| Area | Verified admin routes | Verified API surface | Primary docs |
| --- | --- | --- | --- |
| Agent Runtime / AI Paths | `/admin/ai-paths`, `/admin/agentcreator/runs` | `/api/ai-paths/*` | [`../ai-paths/overview.md`](../ai-paths/overview.md), [`./agent-runtime-overview.md`](./agent-runtime-overview.md), [`./agent-runtime-execution-flow.md`](./agent-runtime-execution-flow.md) |
| Chatbot | `/admin/chatbot`, `/admin/chatbot/sessions`, `/admin/chatbot/context`, `/admin/chatbot/memory` | `/api/chatbot/*`, `/api/chatbot/agent/*` | [`./chatbot-overview.md`](./chatbot-overview.md), [`./chatbot-sessions.md`](./chatbot-sessions.md), [`./chatbot-context.md`](./chatbot-context.md) |
| Image Studio | `/admin/image-studio`, `/admin/image-studio/settings`, `/admin/image-studio/ui-presets`, `/admin/image-studio/validation-patterns` | `/api/image-studio/*` | [`./image-studio-overview.md`](./image-studio-overview.md) |
| AI Insights | `/admin/ai-insights` | `/api/analytics/insights`, `/api/ai-paths/runtime-analytics/insights`, `/api/system/logs/insights`, `/api/system/logs/interpret` | [`./ai-insights-overview.md`](./ai-insights-overview.md) |
| Agent Creator | `/admin/agentcreator`, `/admin/agentcreator/personas`, `/admin/agentcreator/runs`, `/admin/agentcreator/teaching/*` | `/api/agentcreator/*` | [`./agent-creator-overview.md`](./agent-creator-overview.md) |
| Cross-feature integrations | Shared boundaries across chatbot, Agent Creator, Image Studio, AI Insights, Prompt Exploder, and AI Paths | Mixed feature-owned APIs | [`./integrations.md`](./integrations.md) |

## Shared AI Layers

- **AI Context Registry**: shared page-context and workspace-bundle layer used by chatbot, AI insights, AI Paths, and other admin tools. Operator surface: `/admin/context-registry`.
- **Agent Creator settings and AI Brain routing**: chatbot and teaching flows depend on persona/model configuration managed outside the feature-local page itself.
- **Prompt Exploder bridge**: Image Studio and Case Resolver hand prompt payloads into Prompt Exploder, but Prompt Exploder owns its own doc cluster in [`../prompt-exploder/README.md`](../prompt-exploder/README.md).

## Documentation Rules For This Folder

- Keep these docs tied to verified admin routes, exported feature pages, and real API prefixes.
- Prefer feature-level overviews here and push deep runtime policy to [`../ai-paths/`](../ai-paths/).
- Do not add placeholder “coming soon” sections for docs that do not exist yet.
- When a feature owns a richer folder elsewhere, link to that folder instead of duplicating a second hub.
