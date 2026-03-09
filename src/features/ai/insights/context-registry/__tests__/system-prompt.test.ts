import { describe, expect, it } from 'vitest';

import type { ContextRegistryResolutionBundle } from '@/shared/contracts/ai-context-registry';

import {
  buildAnalyticsInsightContextRegistrySystemPrompt,
  buildRuntimeAnalyticsInsightContextRegistrySystemPrompt,
} from '../system-prompt';

const bundle: ContextRegistryResolutionBundle = {
  refs: [{ id: 'page:ai-insights', kind: 'static_node' }],
  nodes: [
    {
      id: 'page:ai-insights',
      kind: 'page',
      name: 'AI Insights Dashboard',
      description: 'Insight dashboard',
      tags: ['ai', 'insights'],
      relationships: [{ type: 'uses', targetId: 'action:analytics-generate-insight' }],
      permissions: {
        readScopes: ['ctx:read'],
        riskTier: 'none',
        classification: 'internal',
      },
      version: '1.0.0',
      updatedAtISO: '2026-03-09T00:00:00.000Z',
      source: { type: 'code', ref: 'test' },
    },
  ],
  documents: [
    {
      id: 'runtime:ai-insights:workspace',
      kind: 'runtime_document',
      entityType: 'ai_insights_workspace_state',
      title: 'AI insights workspace state',
      summary: 'Live state',
      status: null,
      tags: ['ai-insights'],
      relatedNodeIds: ['page:ai-insights'],
      facts: { analyticsInsightCount: 4 },
      sections: [
        {
          kind: 'facts',
          title: 'Insight buckets',
          items: [{ runtimeRunPending: true }],
        },
      ],
      provenance: { source: 'test' },
    },
  ],
  truncated: false,
  engineVersion: 'registry:test',
};

describe('ai insights context-registry prompts', () => {
  it('builds the analytics insight registry prompt', () => {
    const prompt = buildAnalyticsInsightContextRegistrySystemPrompt(bundle);

    expect(prompt).toContain('current analytics insight trigger surface');
    expect(prompt).toContain('Treat this registry bundle as current operator UI state');
    expect(prompt).toContain('"analyticsInsightCount": 4');
  });

  it('builds the runtime analytics insight registry prompt', () => {
    const prompt = buildRuntimeAnalyticsInsightContextRegistrySystemPrompt(bundle);

    expect(prompt).toContain('current runtime analytics insight trigger surface');
    expect(prompt).toContain('"runtimeRunPending": true');
  });

  it('returns an empty string when no bundle is available', () => {
    expect(buildAnalyticsInsightContextRegistrySystemPrompt(null)).toBe('');
    expect(buildRuntimeAnalyticsInsightContextRegistrySystemPrompt(null)).toBe('');
  });
});
