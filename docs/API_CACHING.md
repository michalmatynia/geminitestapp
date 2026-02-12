# API Caching Strategy

This document outlines the caching strategies applied to the application's API routes. Explicit caching semantics are enforced to ensure data freshness, security, and performance.

## General Principles

*   **`force-dynamic` / `no-store`**: Applied to routes returning:
    *   Real-time data (e.g., system logs, analytics).
    *   Sensitive user data (e.g., user lists, permissions).
    *   Data that changes frequently and unpredictably.
    *   Data fetched from external APIs that provide their own real-time results (e.g., search).
*   **`revalidate`**: Applied to routes returning semi-static content that can tolerate some staleness (e.g., product lists, CMS pages). *Note: Specific revalidation times are defined per route based on business requirements.*

## Route-Specific Rationale

### System & Observability

| Route | Caching Strategy | Rationale |
| :--- | :--- | :--- |
| `/api/system/logs` | `no-store` | System logs are critical for real-time debugging and monitoring. Caching could hide recent errors or events. |
| `/api/analytics/events` | `no-store` | Analytics data ingestion and retrieval must be strictly real-time to accurately reflect user behavior and system state. |

### Authentication & Users

| Route | Caching Strategy | Rationale |
| :--- | :--- | :--- |
| `/api/auth/users` | `no-store` | User lists contain sensitive and mutable data (e.g., permissions, verification status). Serving stale data could lead to security risks or incorrect access control. |

### Products & Content

| Route | Caching Strategy | Rationale |
| :--- | :--- | :--- |
| `/api/products` | `revalidate: 60` | Product lists change frequently but can tolerate 1 minute staleness to reduce DB load. |
| `/api/products/[id]` | `revalidate: 60` | Product details are semi-static. 1 minute revalidation allows for updates without constant fetching. |
| `/api/public/products/[id]` | `revalidate: 60` | Public product details. 1 minute revalidation balances freshness and server load. |
| `/api/catalogs` | `revalidate: 600` | Catalog structures are semi-static. 10 minute revalidation is sufficient. |
| `/api/price-groups` | `revalidate: 600` | Price group configurations are semi-static. 10 minute revalidation is sufficient. |
| `/api/products/categories/tree` | `revalidate: 300` | Category structures are stable. 5 minute revalidation is sufficient. |
| `/api/products/count` | `revalidate: 30` | Approximate counts are acceptable for UI display. 30s revalidation balances accuracy and performance. |
| `/api/cms/pages` | `revalidate: 300` | CMS content is semi-static. 5 minute revalidation optimizes page loads. |
| `/api/notes` | `revalidate: 10` | User notes require high interactivity. 10s revalidation balances freshness with server load. |
| `/api/drafts` | `revalidate: 10` | Product drafts are similar to notes. 10s revalidation balances freshness and performance. |
| `/api/files` | `revalidate: 300` | File lists are stable. 5 minute revalidation is sufficient. |
| `/api/languages` | `revalidate: 3600` | Language data is highly static. 1 hour revalidation is appropriate. |
| `/api/countries` | `revalidate: 3600` | Country data is highly static. 1 hour revalidation is appropriate. |
| `/api/currencies` | `revalidate: 3600` | Currency data is highly static. 1 hour revalidation is appropriate. |
| `/api/databases/schema` | `revalidate: 3600` | Database schema is structural metadata. 1 hour revalidation is sufficient. |

### AI & Operations

| Route | Caching Strategy | Rationale |
| :--- | :--- | :--- |
| `/api/integrations` | `no-store` | Integration settings contain sensitive status and configuration data that must be secure and fresh. |
| `/api/integrations/jobs` | `no-store` | Integration job status is real-time operational data. |
| `/api/products/ai-jobs` | `no-store` | Job status is real-time operational data. Stale data would mislead users about progress. |
| `/api/ai-paths/runs` | `no-store` | Workflow execution status must be monitored in real-time. |
| `/api/ai-paths/trigger-buttons` | `no-store` | UI configuration that needs immediate updates for responsiveness. |
| `/api/chatbot/sessions` | `no-store` | Chat history is highly dynamic and personal. |
| `/api/agentcreator/agent` | `no-store` | Agent run logs and status are real-time debugging tools. |
| `/api/image-studio/projects` | `revalidate: 10` | Project lists depend on file system state. 10s revalidation ensures new folders appear quickly. |
| `/api/system/activity` | `no-store` | System activity logs must be real-time for monitoring and security audit. |
| `/api/system/logs/metrics` | `no-store` | Log metrics must reflect the latest system state. |
| `/api/databases/backups` | `no-store` | Backup lists are critical operational data. |
| `/api/databases/browse` | `no-store` | Database browsing must show the current state of data. |
| `/api/settings` | `no-store` | Critical configuration that requires immediate propagation. |
| `/api/settings/lite` | `no-store` | UI-critical configuration that requires immediate propagation. |

### External Integrations

| Route | Caching Strategy | Rationale |
| :--- | :--- | :--- |
| `/api/search` | `no-store` | Search results depend on external providers (Brave, Google) and user queries. Caching is generally not useful due to the high cardinality of queries and the need for up-to-date results. |

## Implementation Details

*   **Next.js App Router**: We use `export const dynamic = 'force-dynamic'` in route handlers to opt out of static optimization.
*   **Response Headers**: For `no-store` routes, we explicitly set the `Cache-Control: no-store` header in the `NextResponse` to instruct downstream caches (CDNs, browsers) not to store the response.

```typescript
// Example Implementation
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const data = await fetchData();
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
```
