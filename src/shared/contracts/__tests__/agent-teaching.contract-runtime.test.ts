import { describe, expect, it } from 'vitest';

import {
  agentTeachingAgentResponseSchema,
  agentTeachingAgentsResponseSchema,
  agentTeachingChatResponseSchema,
  agentTeachingCollectionDeleteResponseSchema,
  agentTeachingCollectionsResponseSchema,
  agentTeachingDocumentsResponseSchema,
  agentTeachingSearchResponseSchema,
} from '@/shared/contracts/agent-teaching';

const sampleAgent = {
  id: 'agent-1',
  agentId: 'gpt-4.1-mini',
  name: 'Support Tutor',
  description: 'Answers support questions',
  llmModel: 'gpt-4.1-mini',
  embeddingModel: 'text-embedding-3-small',
  systemPrompt: 'Be accurate.',
  collectionIds: ['collection-1'],
  createdAt: '2026-03-11T10:00:00.000Z',
  updatedAt: '2026-03-11T10:01:00.000Z',
};

const sampleDocument = {
  id: 'document-1',
  collectionId: 'collection-1',
  name: 'FAQ',
  description: 'manual-text',
  content: 'Reset the device by holding the power button.',
  text: 'Reset the device by holding the power button.',
  metadata: {
    title: 'FAQ',
    source: 'manual-text',
    tags: ['faq'],
  },
  embeddingModel: 'text-embedding-3-small',
  embeddingDimensions: 1536,
  createdAt: '2026-03-11T10:00:00.000Z',
  updatedAt: '2026-03-11T10:01:00.000Z',
};

describe('agent teaching contract runtime', () => {
  it('parses agent and collection list envelopes', () => {
    expect(
      agentTeachingAgentsResponseSchema.parse({
        agents: [sampleAgent],
      }).agents
    ).toHaveLength(1);

    expect(
      agentTeachingCollectionsResponseSchema.parse({
        collections: [
          {
            id: 'collection-1',
            name: 'Knowledge Base',
            description: 'Primary support docs',
            embeddingModel: 'text-embedding-3-small',
            createdAt: '2026-03-11T10:00:00.000Z',
            updatedAt: '2026-03-11T10:01:00.000Z',
          },
        ],
      }).collections
    ).toHaveLength(1);

    expect(
      agentTeachingAgentResponseSchema.parse({
        agent: sampleAgent,
      }).agent.name
    ).toBe('Support Tutor');
  });

  it('parses document, search, and chat envelopes', () => {
    expect(
      agentTeachingDocumentsResponseSchema.parse({
        items: [sampleDocument],
        total: 1,
      }).items
    ).toHaveLength(1);

    expect(
      agentTeachingSearchResponseSchema.parse({
        sources: [
          {
            documentId: 'document-1',
            collectionId: 'collection-1',
            text: sampleDocument.text,
            score: 0.98,
            metadata: sampleDocument.metadata,
          },
        ],
      }).sources[0]?.documentId
    ).toBe('document-1');

    expect(
      agentTeachingChatResponseSchema.parse({
        message: 'Use the reset button procedure from the FAQ.',
        sources: [
          {
            documentId: 'document-1',
            collectionId: 'collection-1',
            text: sampleDocument.text,
            score: 0.98,
          },
        ],
      }).message
    ).toContain('reset');
  });

  it('parses collection delete envelopes', () => {
    expect(
      agentTeachingCollectionDeleteResponseSchema.parse({
        ok: true,
        deleted: true,
        deletedDocuments: 3,
      }).deletedDocuments
    ).toBe(3);
  });
});
