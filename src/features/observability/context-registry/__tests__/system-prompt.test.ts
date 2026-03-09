import { describe, expect, it } from 'vitest';

import type { ContextRegistryResolutionBundle } from '@/shared/contracts/ai-context-registry';

import { buildSystemLogsContextRegistrySystemPrompt } from '../system-prompt';

describe('buildSystemLogsContextRegistrySystemPrompt', () => {
  it('returns a structured prompt when registry context is present', () => {
    const bundle: ContextRegistryResolutionBundle = {
      refs: [{ id: 'page:system-logs', kind: 'static_node' }],
      nodes: [
        {
          id: 'page:system-logs',
          kind: 'page',
          name: 'Observation Post',
          description: 'System logs workspace',
          tags: ['observability', 'logs'],
          relationships: [{ type: 'uses', targetId: 'action:system-logs-interpret' }],
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
          id: 'runtime:system-logs:workspace',
          kind: 'runtime_document',
          entityType: 'system_logs_workspace_state',
          title: 'Observation Post workspace state',
          summary: 'Live state',
          status: null,
          tags: ['observability', 'logs'],
          relatedNodeIds: ['page:system-logs'],
          facts: { level: 'error', visibleLogCount: 5 },
          sections: [
            {
              kind: 'facts',
              title: 'Workspace snapshot',
              items: [{ activeFilterCount: 3 }],
            },
          ],
          provenance: { source: 'test' },
        },
      ],
      truncated: false,
      engineVersion: 'registry:test',
    };

    const prompt = buildSystemLogsContextRegistrySystemPrompt(bundle);

    expect(prompt).toContain('Context Registry bundle for the current Observation Post workspace.');
    expect(prompt).toContain('Treat this registry bundle as operator page state');
    expect(prompt).toContain('"visibleLogCount": 5');
    expect(prompt).toContain('"name": "Observation Post"');
  });

  it('returns an empty string when the bundle is empty', () => {
    expect(
      buildSystemLogsContextRegistrySystemPrompt({
        refs: [],
        nodes: [],
        documents: [],
        truncated: false,
        engineVersion: 'registry:test',
      })
    ).toBe('');
  });
});
