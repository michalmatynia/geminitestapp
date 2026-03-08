import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchAgentPersonasMock } = vi.hoisted(() => ({
  fetchAgentPersonasMock: vi.fn(),
}));

const { addAgentLongTermMemoryMock } = vi.hoisted(() => ({
  addAgentLongTermMemoryMock: vi.fn(),
}));

vi.mock('@/features/ai/agentcreator/utils/personas', async () => {
  const actual = await vi.importActual<typeof import('@/features/ai/agentcreator/utils/personas')>(
    '@/features/ai/agentcreator/utils/personas'
  );

  return {
    ...actual,
    fetchAgentPersonas: fetchAgentPersonasMock,
  };
});

vi.mock('@/features/ai/agent-runtime/memory', () => ({
  addAgentLongTermMemory: addAgentLongTermMemoryMock,
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    agentLongTermMemory: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    chatbotMessage: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from '@/shared/lib/db/prisma';

import {
  buildAgentPersonaMemoryKey,
  buildPersonaChatMemoryContext,
  persistAgentPersonaExchangeMemory,
  searchAgentPersonaMemory,
} from './persona-memory';

describe('persona memory service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAgentPersonasMock.mockResolvedValue([
      {
        id: 'persona-1',
        name: 'Helpful Tutor',
        role: 'Tutor',
        instructions: 'Stay warm and specific.',
        settings: {
          memory: {
            enabled: true,
            includeChatHistory: true,
            useMoodSignals: true,
            defaultSearchLimit: 5,
          },
        },
        createdAt: '2026-03-07T10:00:00.000Z',
        updatedAt: '2026-03-07T10:00:00.000Z',
      },
    ]);
    vi.mocked(prisma.agentLongTermMemory.findMany).mockResolvedValue([
      {
        id: 'mem-1',
        memoryKey: 'persona-1-bank',
        runId: 'run-1',
        personaId: 'persona-1',
        content: 'The learner asks for step-by-step support with fractions.',
        summary: 'Fractions guidance memory',
        tags: ['fractions', 'support'],
        topicHints: ['fractions'],
        moodHints: ['encouraging'],
        sourceType: 'manual',
        sourceId: 'note-1',
        sourceLabel: 'Teacher note',
        sourceCreatedAt: new Date('2026-03-06T09:00:00.000Z'),
        metadata: { role: 'teacher' },
        importance: 4,
        lastAccessedAt: null,
        createdAt: new Date('2026-03-06T09:30:00.000Z'),
        updatedAt: new Date('2026-03-06T09:45:00.000Z'),
      },
    ] as never);
    vi.mocked(prisma.agentLongTermMemory.updateMany).mockResolvedValue({ count: 1 } as never);
    addAgentLongTermMemoryMock.mockResolvedValue(null);
    vi.mocked(prisma.chatbotMessage.findMany).mockResolvedValue([
      {
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'assistant',
        content: 'Great job. Let us break fractions into smaller steps.',
        model: 'brain-model',
        images: [],
        metadata: {},
        createdAt: new Date('2026-03-07T08:00:00.000Z'),
        session: {
          id: 'session-1',
          title: 'Fractions practice',
          createdAt: new Date('2026-03-07T07:55:00.000Z'),
          updatedAt: new Date('2026-03-07T08:00:00.000Z'),
        },
      },
    ] as never);
  });

  it('returns persona memories with provenance and mood summary', async () => {
    const result = await searchAgentPersonaMemory({
      personaId: 'persona-1',
      q: 'fractions',
      limit: 5,
    });

    expect(prisma.agentLongTermMemory.findMany).toHaveBeenCalled();
    expect(prisma.chatbotMessage.findMany).toHaveBeenCalled();
    expect(result.summary).toMatchObject({
      personaId: 'persona-1',
      totalRecords: 2,
      memoryEntryCount: 1,
      conversationMessageCount: 1,
      suggestedMoodId: 'encouraging',
    });
    expect(result.items[0]).toMatchObject({
      personaId: 'persona-1',
    });
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'mem-1',
          recordType: 'memory_entry',
          sourceLabel: 'Teacher note',
          sourceType: 'manual',
          moodHints: ['encouraging'],
        }),
        expect.objectContaining({
          id: 'msg-1',
          recordType: 'conversation_message',
          sourceLabel: 'Fractions practice',
          sourceType: 'chat_message',
        }),
      ])
    );
  });

  it('relates memories by extracted topic terms and explicit mood filters', async () => {
    const result = await searchAgentPersonaMemory({
      personaId: 'persona-1',
      q: 'Can you help me with fractions?',
      topic: 'fractions',
      mood: 'encouraging',
      limit: 5,
    });

    expect(result.summary).toMatchObject({
      personaId: 'persona-1',
      totalRecords: 2,
      suggestedMoodId: 'encouraging',
    });
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'mem-1',
          topicHints: expect.arrayContaining(['fractions']),
          moodHints: expect.arrayContaining(['encouraging']),
        }),
        expect.objectContaining({
          id: 'msg-1',
          recordType: 'conversation_message',
          topicHints: expect.arrayContaining(['fractions']),
          moodHints: expect.arrayContaining(['encouraging']),
        }),
      ])
    );
  });

  it('builds a prompt-ready persona context from memory results', async () => {
    const result = await buildPersonaChatMemoryContext({
      personaId: 'persona-1',
      latestUserMessage: 'Can you help me with fractions?',
    });

    expect(result.suggestedMoodId).toBe('encouraging');
    expect(result.systemPrompt).toContain('Active persona: Helpful Tutor (Tutor).');
    expect(result.systemPrompt).toContain('Persona instructions: Stay warm and specific.');
    expect(result.systemPrompt).toContain('Relevant persona memory:');
    expect(result.systemPrompt).toContain('Teacher note');
  });

  it('persists durable persona memory entries with provenance and inferred hints', async () => {
    await persistAgentPersonaExchangeMemory({
      personaId: 'persona-1',
      sourceType: 'chat_message',
      sourceId: 'chatbot:session-1:assistant',
      sourceLabel: 'Chatbot session',
      sourceCreatedAt: '2026-03-07T08:05:00.000Z',
      sessionId: 'session-1',
      userMessage: 'Can you help me with fractions?',
      assistantMessage: 'Great job. Let us break fractions into smaller steps.',
      tags: ['chatbot'],
      metadata: {
        source: 'chatbot',
      },
    });

    expect(addAgentLongTermMemoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        memoryKey: buildAgentPersonaMemoryKey('persona-1'),
        personaId: 'persona-1',
        sourceType: 'chat_message',
        sourceId: 'chatbot:session-1:assistant',
        sourceLabel: 'Chatbot session',
        tags: expect.arrayContaining(['persona-memory', 'chat_message', 'chatbot']),
        topicHints: expect.arrayContaining(['help', 'fractions', 'break', 'smaller']),
        moodHints: expect.arrayContaining(['encouraging']),
        metadata: expect.objectContaining({
          source: 'chatbot',
          sessionId: 'session-1',
          latestUserMessage: 'Can you help me with fractions?',
          originRole: 'assistant',
        }),
      })
    );
  });
});
