import { describe, expect, it } from 'vitest';

import type { ContextRegistryResolutionBundle } from '@/shared/contracts/ai-context-registry';

import { buildChatbotContextRegistrySystemPrompt } from '../system-prompt';

describe('buildChatbotContextRegistrySystemPrompt', () => {
  it('returns a structured prompt when registry context is present', () => {
    const bundle: ContextRegistryResolutionBundle = {
      refs: [{ id: 'page:admin-chatbot', kind: 'static_node' }],
      nodes: [
        {
          id: 'page:admin-chatbot',
          kind: 'page',
          name: 'Admin Chatbot',
          description: 'Admin chatbot workspace',
          tags: ['chatbot', 'admin'],
          relationships: [{ type: 'uses', targetId: 'action:chatbot-chat' }],
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
          id: 'runtime:chatbot:workspace',
          kind: 'runtime_document',
          entityType: 'chatbot_workspace_state',
          title: 'Admin chatbot workspace state',
          summary: 'Live state',
          status: null,
          tags: ['chatbot', 'admin'],
          relatedNodeIds: ['page:admin-chatbot'],
          facts: { activeTab: 'chat', currentSessionId: 'session-1' },
          sections: [
            {
              kind: 'facts',
              title: 'Workspace snapshot',
              items: [{ currentSessionTitle: 'Support draft' }],
            },
          ],
          provenance: { source: 'test' },
        },
      ],
      truncated: false,
      engineVersion: 'registry:test',
    };

    const prompt = buildChatbotContextRegistrySystemPrompt(bundle);

    expect(prompt).toContain('Context Registry bundle for the current admin chatbot workspace.');
    expect(prompt).toContain('Treat this registry bundle as UI state');
    expect(prompt).toContain('"currentSessionId": "session-1"');
    expect(prompt).toContain('"name": "Admin Chatbot"');
  });

  it('returns an empty string when the bundle is empty', () => {
    expect(
      buildChatbotContextRegistrySystemPrompt({
        refs: [],
        nodes: [],
        documents: [],
        truncated: false,
        engineVersion: 'registry:test',
      })
    ).toBe('');
  });
});
