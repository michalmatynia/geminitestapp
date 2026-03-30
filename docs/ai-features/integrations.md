---
owner: 'AI Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'integration-guide'
scope: 'ai-features'
canonical: true
---

# AI Features Integration Guide

This document describes the verified integration boundaries between the maintained AI feature surfaces in this repo.

## 1. Agent Creator ↔ Chatbot

Agent Creator is the source of persona and model configuration that the chatbot consumes.

Verified coupling:

- the chatbot page mounts `AgentCreatorSettingsProvider`
- persona selection and related routing settings flow from Agent Creator into chatbot state
- chatbot agent-assist flows can surface `latestAgentRunId`, which ties back to the shared runtime layer

Operational rule:

- treat persona and model configuration as shared AI infrastructure, not chatbot-local settings

## 2. Agent Creator ↔ Agent Runtime / AI Paths

Agent Creator owns the admin operator surfaces for personas, teaching, and run inspection, but execution details live in the shared runtime stack.

Verified coupling:

- `/admin/agentcreator/runs` renders `AgentRunRecord` data
- `/api/agentcreator/agent/*` and `/api/ai-paths/*` sit on the same broader execution layer
- AI Paths keeps the deeper queue, lease, remediation, and runtime-analytics surfaces documented under [`../ai-paths/`](../ai-paths/)

Operational rule:

- document operator run inspection in Agent Creator docs and runtime policy in AI Paths docs

## 3. Image Studio ↔ Prompt Exploder

This is the strongest feature-to-feature bridge in the current AI/admin stack.

Verified coupling:

- Image Studio can launch `/admin/prompt-exploder?source=image-studio&returnTo=%2Fadmin%2Fimage-studio`
- Prompt Exploder can reapply output back into Image Studio
- Image Studio exposes `/api/image-studio/prompt-extract`, which Prompt Exploder-related flows use to derive editable prompt inputs

Operational rule:

- Prompt Exploder owns the editing and runtime-tuning docs in [`../prompt-exploder/README.md`](../prompt-exploder/README.md)
- Image Studio docs should describe the bridge, not duplicate Prompt Exploder operations guidance

## 4. Prompt Exploder ↔ Case Resolver

Prompt Exploder also acts as a structured editing bridge for Case Resolver content.

Verified coupling:

- Prompt Exploder recognizes Case Resolver return targets
- bridge payloads carry transfer metadata, checksum, expiry, and case-resolver context
- Case Resolver-side apply flows validate document/session alignment before applying content

Operational rule:

- keep bridge-contract details in Prompt Exploder docs, because that feature owns the payload contracts and runtime normalization rules

## 5. AI Insights ↔ Analytics / AI Paths / System Logs

AI Insights is an aggregation surface, not a single-source subsystem.

Verified coupling:

- analytics insights come from `/api/analytics/insights`
- runtime insights come from `/api/ai-paths/runtime-analytics/insights`
- log insights come from `/api/system/logs/insights`

Operational rule:

- keep the dashboard docs in the AI feature layer
- keep source-system policy in analytics, observability, and AI Paths docs

## 6. AI Context Registry Across Features

The AI context-registry layer is a shared dependency across multiple admin AI surfaces.

Verified consumers in this docs slice:

- chatbot
- AI insights
- AI Paths
- context-registry operator page itself
- parts of Image Studio and other admin tooling

Operational rule:

- use the context-registry docs for page-bundle mechanics
- use feature docs for “what state is exposed” rather than duplicating registry internals

## 7. Documentation boundary

- Feature overviews in this folder should name verified routes, exported pages, and API prefixes.
- Queueing, leasing, remediation, and execution-state policy belong in [`../ai-paths/`](../ai-paths/).
- Prompt Exploder operational behavior belongs in [`../prompt-exploder/`](../prompt-exploder/).
