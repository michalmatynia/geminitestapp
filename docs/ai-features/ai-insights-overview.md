---
owner: 'AI Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'feature-guide'
scope: 'ai-features'
canonical: true
feature: 'ai-insights'
---

# AI Insights Overview

AI Insights is the admin dashboard that aggregates AI-generated summaries for analytics, runtime telemetry, and system logs.

## Verified route

- `/admin/ai-insights`

The page is backed by `src/features/ai/insights/pages/AdminAiInsightsPage.tsx` and publishes a context-registry workspace bundle under `pageId='admin:ai-insights'`.

## Verified dashboard shape

The dashboard renders three operator panels:

- **Analytics Insights**
- **Runtime Insights**
- **Log Insights**

Each panel supports:

- fetching the latest saved insights
- running a fresh insight generation pass
- rendering empty, loading, and error states

The page also exposes a settings action that sends operators to `/admin/brain?tab=routing`.

## Verified API surface

AI Insights does not use a single `/api/ai-insights/*` namespace. The current routes are split by source domain:

- `/api/analytics/insights`
- `/api/ai-paths/runtime-analytics/insights`
- `/api/system/logs/insights`
- `/api/system/logs/interpret`

The first three supply the dashboard data and run mutations. `system/logs/interpret` remains a related log-analysis helper surface.

## Data-source boundaries

- **Analytics Insights** summarize product and traffic-side signals.
- **Runtime Insights** summarize AI Paths execution quality, performance, and rollout risk.
- **Log Insights** summarize operational error patterns and log-derived regressions.

That split matters operationally: the feature is one dashboard, but the source systems stay separate.

## Key integrations

- **AI Context Registry**: the page registers an AI Insights workspace bundle.
- **AI Paths**: runtime insights are sourced from the AI Paths runtime-analytics lane.
- **Observability / system logs**: log insights are shared with broader observability tooling under `/api/system/logs/*`.

## Related docs

- [`../ai-paths/overview.md`](../ai-paths/overview.md)
- [`../platform/agent-discovery.md`](../platform/agent-discovery.md)
