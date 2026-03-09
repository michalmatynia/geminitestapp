import { describe, expect, it } from 'vitest';

import type { ContextRegistryResolutionBundle } from '@/shared/contracts/ai-context-registry';

import { buildAgentTeachingContextRegistrySystemPrompt } from '../system-prompt';

describe('buildAgentTeachingContextRegistrySystemPrompt', () => {
  it('returns a structured prompt when registry context is present', () => {
    const bundle: ContextRegistryResolutionBundle = {
      refs: [{ id: 'page:agent-teaching-chat', kind: 'static_node' }],
      nodes: [
        {
          id: 'page:agent-teaching-chat',
          kind: 'page',
          name: 'Agent Creator Teaching Chat',
          description: 'Learner agent chat page',
          tags: ['agent-creator', 'teaching'],
          relationships: [{ type: 'uses', targetId: 'action:agent-teaching-chat' }],
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
          id: 'runtime:agent-teaching-chat:workspace',
          kind: 'runtime_document',
          entityType: 'agent_teaching_chat_state',
          title: 'Agent teaching chat workspace state',
          summary: 'Live state',
          status: null,
          tags: ['agent-creator', 'chat'],
          relatedNodeIds: ['page:agent-teaching-chat'],
          facts: { selectedAgentId: 'agent-1', messageCount: 2 },
          sections: [
            {
              kind: 'facts',
              title: 'Workspace snapshot',
              items: [{ selectedAgentName: 'Math Tutor' }],
            },
          ],
          provenance: { source: 'test' },
        },
      ],
      truncated: false,
      engineVersion: 'registry:test',
    };

    const prompt = buildAgentTeachingContextRegistrySystemPrompt(bundle);

    expect(prompt).toContain('Context Registry bundle for the current Agent Creator teaching chat page.');
    expect(prompt).toContain('Do not cite this registry bundle as knowledge-base evidence.');
    expect(prompt).toContain('"selectedAgentId": "agent-1"');
    expect(prompt).toContain('"name": "Agent Creator Teaching Chat"');
  });

  it('returns an empty string when the bundle is empty', () => {
    expect(
      buildAgentTeachingContextRegistrySystemPrompt({
        refs: [],
        nodes: [],
        documents: [],
        truncated: false,
        engineVersion: 'registry:test',
      })
    ).toBe('');
  });
});
