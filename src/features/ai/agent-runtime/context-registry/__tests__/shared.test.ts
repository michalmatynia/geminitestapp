import { describe, expect, it } from 'vitest';

import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';

import {
  applyAgentRuntimeContextMemory,
  buildAgentRuntimeContextRegistryPrompt,
  readAgentRuntimeContextRegistry,
} from '../shared';

describe('agent runtime context registry helpers', () => {
  it('reads a persisted contextRegistry envelope from plan state', () => {
    const contextRegistry: ContextRegistryConsumerEnvelope = {
      refs: [{ id: 'page:ai-paths', kind: 'static_node' }],
      engineVersion: 'test-engine',
      resolved: {
        refs: [{ id: 'page:ai-paths', kind: 'static_node' }],
        nodes: [],
        documents: [],
        truncated: false,
        engineVersion: 'test-engine',
      },
    };

    expect(
      readAgentRuntimeContextRegistry({
        contextRegistry,
      })
    ).toEqual(contextRegistry);
  });

  it('builds a compact prompt from resolved registry documents', () => {
    const prompt = buildAgentRuntimeContextRegistryPrompt({
      refs: [{ id: 'page:ai-paths', kind: 'static_node' }],
      nodes: [
        {
          id: 'page:ai-paths',
          kind: 'page',
          name: 'AI Paths',
          description: 'AI Paths authoring workspace.',
          tags: ['ai', 'paths'],
          permissions: {
            readScopes: ['admin'],
            riskTier: 'low',
            classification: 'internal',
          },
          version: '1',
          updatedAtISO: '2026-03-09T00:00:00.000Z',
          source: {
            type: 'code',
            ref: 'src/features/ai/ai-paths/pages/AdminAiPathsPage.tsx',
          },
        },
      ],
      documents: [
        {
          id: 'runtime:ai-paths:workspace',
          kind: 'runtime_document',
          entityType: 'ai_paths_workspace_state',
          title: 'AI Paths workspace state',
          summary: 'Selected node is model-1.',
          tags: ['workspace'],
          relatedNodeIds: ['page:ai-paths'],
          facts: {
            selectedNodeId: 'model-1',
          },
        },
      ],
      truncated: false,
      engineVersion: 'test-engine',
    });

    expect(prompt).toContain('Context Registry bundle for the current page session.');
    expect(prompt).toContain('AI Paths workspace state');
    expect(prompt).toContain('selectedNodeId');
  });

  it('keeps the registry prompt as persistent memory context', () => {
    const contextPrompt = 'Context Registry bundle';

    expect(
      applyAgentRuntimeContextMemory(
        ['summary-1', 'summary-2', contextPrompt, 'summary-3'],
        contextPrompt,
        4
      )
    ).toEqual(['summary-1', 'summary-2', 'summary-3', contextPrompt]);
  });
});
