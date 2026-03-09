import { describe, expect, it } from 'vitest';

import type { ContextRegistryResolutionBundle } from '@/shared/contracts/ai-context-registry';

import { buildAiPathsContextRegistrySystemPrompt } from '../system-prompt';

describe('buildAiPathsContextRegistrySystemPrompt', () => {
  it('returns a structured prompt when registry context is present', () => {
    const bundle: ContextRegistryResolutionBundle = {
      refs: [{ id: 'page:ai-paths', kind: 'static_node' }],
      nodes: [
        {
          id: 'page:ai-paths',
          kind: 'page',
          name: 'AI Paths Canvas',
          description: 'AI Paths workspace',
          tags: ['ai-paths', 'admin'],
          relationships: [{ type: 'uses', targetId: 'action:run-ai-path' }],
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
          id: 'runtime:ai-paths:workspace',
          kind: 'runtime_document',
          entityType: 'ai_paths_workspace_state',
          title: 'AI Paths workspace state',
          summary: 'Live state',
          status: 'running',
          tags: ['ai-paths', 'admin'],
          relatedNodeIds: ['page:ai-paths'],
          facts: { activePathId: 'path-1', selectedNodeId: 'node-1' },
          sections: [
            {
              kind: 'facts',
              title: 'Workspace snapshot',
              items: [{ activePathName: 'Path One' }],
            },
          ],
          provenance: { source: 'test' },
        },
      ],
      truncated: false,
      engineVersion: 'registry:test',
    };

    const prompt = buildAiPathsContextRegistrySystemPrompt(bundle);

    expect(prompt).toContain('Context Registry bundle for the current AI Paths workspace.');
    expect(prompt).toContain('Treat this registry bundle as live UI state');
    expect(prompt).toContain('"activePathId": "path-1"');
    expect(prompt).toContain('"name": "AI Paths Canvas"');
  });

  it('returns an empty string when the bundle is empty', () => {
    expect(
      buildAiPathsContextRegistrySystemPrompt({
        refs: [],
        nodes: [],
        documents: [],
        truncated: false,
        engineVersion: 'registry:test',
      })
    ).toBe('');
  });
});
