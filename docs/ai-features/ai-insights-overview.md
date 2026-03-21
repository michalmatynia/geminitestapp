---
owner: 'AI Platform Team'
last_reviewed: '2026-03-21'
status: 'active'
doc_type: 'feature-guide'
feature: 'ai-insights'
---

# AI Insights — Feature Overview

AI Insights automatically generates AI-powered insights across three categories: product analytics, system performance, and log anomalies. It provides actionable intelligence through automated analysis and trend detection.

## Feature Overview

AI Insights delivers three categories of intelligent analysis:

- **Analytics Insights**: Product usage patterns, content optimization recommendations, user behavior trends
- **Runtime Analytics**: System performance metrics, bottleneck identification, resource utilization patterns
- **Log Insights**: Anomaly detection, error trend analysis, system health patterns, performance degradation

## Architecture

```
┌──────────────────────────────────────────────────┐
│  AI Insights System                              │
├──────────────────────────────────────────────────┤
│                                                  │
│  Admin Pages                                    │
│  └─ AdminAiInsightsPage (dashboard)             │
│                                                  │
│  Context Layer (Single Context)                 │
│  ├─ InsightsContext (state/actions)             │
│  └─ Hooks: useInsightQueries, useInsightMutations
│                                                  │
│  Insight Types                                  │
│  ├─ Analytics Insights                          │
│  │  ├─ Product usage trends                     │
│  │  ├─ Content performance                      │
│  │  └─ User behavior patterns                   │
│  │                                               │
│  ├─ Runtime Analytics                           │
│  │  ├─ System performance metrics               │
│  │  ├─ Bottleneck identification                │
│  │  └─ Resource utilization                     │
│  │                                               │
│  └─ Log Insights                                │
│     ├─ Error anomalies                          │
│     ├─ Performance degradation                  │
│     └─ System health patterns                   │
│                                                  │
│  Generation Engine                              │
│  ├─ Trigger detection (when to generate)        │
│  ├─ Data collection (gather source data)        │
│  ├─ Analysis (AI model processing)              │
│  ├─ Scoring (relevance & impact ranking)        │
│  └─ Storage (persistence)                       │
│                                                  │
│  API Layer                                      │
│  ├─ GET /api/ai-insights/analytics              │
│  ├─ GET /api/ai-insights/runtime                │
│  ├─ GET /api/ai-insights/logs                   │
│  └─ POST /api/ai-insights/generate              │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Core Concepts

### Insight Categories

#### Analytics Insights

Understand product usage and content performance:

```typescript
interface AnalyticsInsight {
  type: 'analytics';
  category:
    | 'product_usage'      // How users interact with features
    | 'content_performance' // Which content resonates
    | 'user_behavior'       // Behavior patterns and trends
    | 'conversion'          // Funnel and conversion analysis
    | 'retention';          // User retention patterns

  findings: {
    title: string;
    description: string;
    evidence: string[];      // Data supporting the insight
    impact: 'high' | 'medium' | 'low';
  };

  recommendations: {
    action: string;
    expectedImpact: string;
    effort: 'low' | 'medium' | 'high';
    priority: number;        // 1-10 priority ranking
  }[];

  sourceData: {
    metric: string;
    value: number;
    trend: 'up' | 'down' | 'stable';
    timeframe: string;
  };
}
```

**Examples:**
- "Users spend 60% more time on mobile vs desktop" (evidence-backed insight)
- "Product A has 3x higher engagement than Product B" (actionable comparison)
- "Free trial users have 40% higher lifetime value" (trend insight)

#### Runtime Analytics

Monitor system performance and identify bottlenecks:

```typescript
interface RuntimeAnalyticsInsight {
  type: 'runtime_analytics';
  category:
    | 'performance'        // Speed and latency
    | 'bottleneck'         // Where delays occur
    | 'resource_usage'     // CPU, memory, disk
    | 'throughput'         // Requests per second
    | 'error_rate';        // Error patterns

  findings: {
    title: string;
    description: string;
    affectedSystems: string[];
    severity: 'critical' | 'high' | 'medium' | 'low';
  };

  metrics: {
    current: number;
    baseline: number;
    percentChange: number;
    unit: string;
  };

  rootCauses: {
    cause: string;
    likelihood: number;    // 0-100 confidence %
    impact: string;
  }[];

  recommendations: {
    action: string;
    expectedImprovement: string;
    estimatedEffort: 'low' | 'medium' | 'high';
  }[];
}
```

**Examples:**
- "Database queries taking 2x longer (avg 500ms → 1000ms)" (performance insight)
- "Image processing is the bottleneck (takes 70% of request time)" (bottleneck insight)
- "Memory usage spikes every hour at :30 mark" (pattern insight)

#### Log Insights

Detect anomalies and health patterns in logs:

```typescript
interface LogInsight {
  type: 'log_insight';
  category:
    | 'anomaly'            // Unusual patterns
    | 'error_trend'        // Error frequency changes
    | 'system_health'      // Overall system state
    | 'degradation'        // Performance drops
    | 'security';          // Suspicious patterns

  findings: {
    title: string;
    description: string;
    affectedComponent: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
  };

  anomalies: {
    pattern: string;
    frequency: number;     // Occurrences detected
    baseline: number;      // Expected frequency
    deviation: number;     // % above baseline
  };

  sourceEvents: {
    count: number;
    timespan: string;      // e.g., "last 24 hours"
    sampleEvents: string[];
  };

  recommendations: {
    investigation: string;
    action: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
  }[];
}
```

**Examples:**
- "Error rate spiked from 0.1% to 5% at 3:00 AM" (error trend)
- "Detected unusual login pattern from 12 different IPs in 10 seconds" (anomaly)
- "Database connection pool exhaustion 3 times in past week" (system health)

### Insight Lifecycle

```
Trigger Detection
    ↓
    └─ Is insight generation needed?
         ├─ Schedule: Every 24 hours
         ├─ Event: On threshold breach
         └─ Manual: User requests

Data Collection
    ↓
    └─ Gather source data
         ├─ Analytics database
         ├─ Performance metrics
         └─ Log aggregation system

Analysis
    ↓
    └─ AI model processes data
         ├─ Identify patterns
         ├─ Detect anomalies
         ├─ Generate explanations
         └─ Create recommendations

Scoring & Ranking
    ↓
    └─ Evaluate significance
         ├─ Relevance score
         ├─ Impact assessment
         ├─ Actionability
         └─ Priority assignment

Storage & Display
    ↓
    └─ Persist and present
         ├─ Save to database
         ├─ Cache for performance
         └─ Display in dashboard
```

### Insight Record

```typescript
interface AiInsight {
  id: string;

  // Metadata
  type: 'analytics' | 'runtime_analytics' | 'log_insight';
  category: string;
  status: 'active' | 'archived' | 'dismissed';

  // Content
  title: string;
  description: string;
  findings: Record<string, unknown>;
  recommendations: {
    action: string;
    priority: number;
    expectedImpact: string;
  }[];

  // Ranking
  relevanceScore: number;      // 0-100
  impactScore: number;         // 0-100
  actionability: number;       // 0-100

  // Sourcing
  sourceData: Record<string, unknown>;
  dataPoints: number;          // How many data points analyzed
  confidence: number;          // 0-100 confidence %

  // Timing
  generatedAt: Date;
  validUntil: Date;           // When insight expires
  dismissedAt?: Date;
}
```

### Scoring System

Insights are ranked by relevance and impact:

| Score | Formula | Meaning |
|-------|---------|---------|
| **Relevance** | `Confidence × DataPoints / 100` | How well-supported |
| **Impact** | `Magnitude × AffectedUsers / 1000` | Real-world significance |
| **Actionability** | `(Effort / 10) × Impact` | ROI of acting on it |

Final score = (Relevance + Impact + Actionability) / 3

---

## Typical Workflows

### Viewing Analytics Insights

```
1. User opens AI Insights dashboard
2. System displays Analytics panel
3. Shows ranked insights:
   - "Mobile users 60% more engaged"
   - "Product A underperforming"
   - "Free trial → paid conversion 40%"
4. User clicks insight for details
5. Sees evidence, recommendations, action items
```

### Acting on Runtime Insights

```
1. Dashboard shows Runtime Analytics
2. Alert: "Database queries 2x slower"
3. Root causes suggested:
   - Missing index on users table
   - Connection pool exhausted
4. User clicks "View Evidence"
5. See query execution plans and logs
6. Click "Create Ticket" to address
```

### Investigating Log Anomalies

```
1. Log Insights panel shows anomaly
2. Alert: "Error rate spike 5% → 25%"
3. Affected: API responses
4. Timeline: "Last 2 hours"
5. User views sample error logs
6. Identifies pattern → fixes issue
```

---

## Key Files

### Pages
- `src/features/ai/insights/pages/AdminAiInsightsPage.tsx` — Main dashboard with 3 insight panels

### Context & State
- `src/features/ai/insights/context/InsightsContext.tsx` — State/actions split
- `src/features/ai/insights/hooks/useInsightQueries.ts` — Query and mutation hooks

### Core Logic
- `src/features/ai/insights/generator.ts` — Insight generation engine
- `src/features/ai/insights/repository.ts` — Data persistence layer

### Contracts
- `src/shared/contracts/ai-insights.ts` — Zod schemas for type safety

---

## API Reference

### Get Analytics Insights

```
GET /api/ai-insights/analytics?limit=10&offset=0

Response:
{
  insights: [
    {
      id: "insight-123",
      title: "Mobile users 60% more engaged",
      relevanceScore: 92,
      impactScore: 87,
      recommendations: [...]
    },
    ...
  ],
  total: 45
}
```

### Get Runtime Analytics

```
GET /api/ai-insights/runtime?system=database

Response:
{
  insights: [
    {
      id: "insight-456",
      title: "Database queries 2x slower",
      severity: "high",
      rootCauses: [...]
    },
    ...
  ]
}
```

### Get Log Insights

```
GET /api/ai-insights/logs?timeframe=24h

Response:
{
  insights: [
    {
      id: "insight-789",
      title: "Error rate anomaly detected",
      category: "anomaly",
      anomalies: [...]
    },
    ...
  ]
}
```

### Trigger Generation

```
POST /api/ai-insights/generate

Body:
{
  type: "analytics",
  scope: "product",
  forceRefresh: false
}

Response:
{
  status: "generating",
  jobId: "job-123",
  estimatedTime: 30
}
```

---

## Configuration

### Generation Triggers

```typescript
interface InsightGenerationConfig {
  // Schedule-based
  schedules: {
    analytics: {
      enabled: true;
      frequency: 'daily' | 'weekly' | 'monthly';
      time: '02:00'; // UTC
    };
    runtime: {
      enabled: true;
      frequency: 'hourly' | '6-hourly' | 'daily';
    };
    logs: {
      enabled: true;
      frequency: 'continuous'; // Stream-based
    };
  };

  // Threshold-based
  thresholds: {
    errorRateChange: 2.0;      // Alert if error rate 2x
    responseTimeChange: 1.5;   // Alert if response time 1.5x
    anomalyConfidence: 85;     // Only show 85%+ confident
  };

  // Model settings
  model: {
    modelId: 'gpt-4';
    temperature: 0.3;          // Lower = more factual
    maxTokens: 2000;
  };
}
```

---

## Integration Points

### With Observability
- Source data from logging and metrics systems
- Trigger insights from metric alerts
- Feed insights into dashboards

### With Case Resolver
- Link insights to case investigation
- Use insights as evidence in cases

### With Agent Runtime
- Agent can request insights during planning
- Use insights to inform decisions

---

## Performance Optimization

### Data Collection
- Lazy load data (only when needed)
- Cache aggregations (update hourly)
- Sample large datasets (1000+ events → sample)

### Generation
- Batch insight generation (process multiple types together)
- Async processing (don't block UI)
- Queue system for high load

### Display
- Paginate insights (20 per page)
- Cache ranked insights (refresh hourly)
- Streaming updates for real-time insights

---

## Common Tasks

### Get Top Insights

```tsx
const { getTopInsights } = useInsightQueries();

const top5 = await getTopInsights({
  limit: 5,
  minRelevance: 70,
});
```

### Filter by Category

```tsx
const { getInsightsByCategory } = useInsightQueries();

const analyticsInsights = await getInsightsByCategory('analytics');
```

### Dismiss Insight

```tsx
const { dismissInsight } = useInsightMutations();

await dismissInsight('insight-123');
```

### Generate On-Demand

```tsx
const { generateInsights } = useInsightMutations();

const result = await generateInsights({
  type: 'runtime_analytics',
  forceRefresh: true,
});
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| No insights shown | Generation not triggered | Check schedules in config |
| Low relevance scores | Poor source data | Verify data quality, expand timeframe |
| Slow generation | Large dataset | Enable sampling, use narrower scope |
| Inaccurate findings | Model temperature too high | Lower temperature to 0.2-0.3 |

---

## Next Steps

1. **Analytics Deep Dive**: Understanding product usage patterns
2. **Runtime Monitoring**: Setting up performance baselines
3. **Log Analysis**: Anomaly detection and alerting
4. **Acting on Insights**: Converting insights to action
5. **Custom Insights**: Creating domain-specific insight types

---

**Last Updated:** 2026-03-21
**Status:** Comprehensive feature overview
**Related Docs:** AI Features README, Observability systems, Case Resolver integration

