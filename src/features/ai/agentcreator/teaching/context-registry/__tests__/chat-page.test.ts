import { describe, expect, it } from 'vitest';

import type {
  AgentTeachingAgentRecord,
  AgentTeachingEmbeddingCollectionRecord,
} from '@/shared/contracts/agent-teaching';

import {
  AGENT_TEACHING_CHAT_CONTEXT_ROOT_IDS,
  buildAgentTeachingChatContextBundle,
} from '../chat-page';

const agents: AgentTeachingAgentRecord[] = [
  {
    id: 'agent-1',
    agentId: 'agent-1',
    name: 'Math Tutor',
    description: 'Helps with algebra.',
    llmModel: 'gpt-test',
    embeddingModel: 'nomic-test',
    systemPrompt: 'Be precise.',
    collectionIds: ['collection-1'],
  },
];

const collections: AgentTeachingEmbeddingCollectionRecord[] = [
  {
    id: 'collection-1',
    name: 'Algebra KB',
    description: 'Algebra content',
    embeddingModel: 'nomic-test',
  },
];

describe('buildAgentTeachingChatContextBundle', () => {
  it('builds a runtime document from the visible teaching chat state', () => {
    const bundle = buildAgentTeachingChatContextBundle({
      agents,
      collections,
      chatModelId: 'gpt-test',
      embeddingModelId: 'nomic-test',
      selectedAgent: agents[0] ?? null,
      messages: [
        { role: 'user', content: 'What is 2 + 2?' },
        { role: 'assistant', content: '4' },
      ],
      lastSources: [
        {
          documentId: 'doc-1',
          collectionId: 'collection-1',
          score: 0.91,
          text: '2 + 2 equals 4.',
          metadata: { title: 'Addition basics', source: 'manual-text' },
        },
      ],
    });

    expect(bundle.refs).toHaveLength(1);
    expect(bundle.documents).toHaveLength(1);
    expect(bundle.documents[0]?.facts).toMatchObject({
      selectedAgentId: 'agent-1',
      selectedAgentName: 'Math Tutor',
      messageCount: 2,
      lastRetrievedSourceCount: 1,
      configuredChatModelId: 'gpt-test',
    });
    expect(bundle.documents[0]?.relatedNodeIds).toEqual([...AGENT_TEACHING_CHAT_CONTEXT_ROOT_IDS]);
    expect(bundle.documents[0]?.sections[1]?.title).toBe('Available agents');
    expect(bundle.documents[0]?.sections[4]?.items?.[0]).toMatchObject({
      documentId: 'doc-1',
      collectionName: 'Algebra KB',
    });
  });
});
