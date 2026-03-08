import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  listBrainModelsMock,
  resolveBrainModelExecutionConfigMock,
  runChatbotModelMock,
  addMessageMock,
  findSessionByIdMock,
  buildPersonaChatMemoryContextMock,
  persistAgentPersonaExchangeMemoryMock,
  mkdirMock,
  readdirMock,
  unlinkMock,
  rmMock,
} = vi.hoisted(() => ({
  listBrainModelsMock: vi.fn(),
  resolveBrainModelExecutionConfigMock: vi.fn(),
  runChatbotModelMock: vi.fn(),
  addMessageMock: vi.fn(),
  findSessionByIdMock: vi.fn(),
  buildPersonaChatMemoryContextMock: vi.fn(),
  persistAgentPersonaExchangeMemoryMock: vi.fn(),
  mkdirMock: vi.fn(),
  readdirMock: vi.fn(),
  unlinkMock: vi.fn(),
  rmMock: vi.fn(),
}));

vi.mock('@/features/ai/agentcreator/server/persona-memory', () => ({
  buildPersonaChatMemoryContext: buildPersonaChatMemoryContextMock,
  persistAgentPersonaExchangeMemory: persistAgentPersonaExchangeMemoryMock,
}));

vi.mock('fs/promises', () => ({
  default: {
    mkdir: mkdirMock,
    readdir: readdirMock,
    unlink: unlinkMock,
    rm: rmMock,
  },
}));

vi.mock('@/shared/lib/ai-brain/server-model-catalog', () => ({
  listBrainModels: listBrainModelsMock,
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainModelExecutionConfig: resolveBrainModelExecutionConfigMock,
}));

vi.mock('@/shared/lib/ai/chatbot/server-model-runtime', () => ({
  runChatbotModel: runChatbotModelMock,
}));

vi.mock('@/features/ai/chatbot/server', () => ({
  chatbotSessionRepository: {
    addMessage: addMessageMock,
    findById: findSessionByIdMock,
  },
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemError: vi.fn(),
  logSystemEvent: vi.fn(),
}));

import { GET_handler, POST_handler } from './handler';

describe('chatbot handler', () => {
  beforeEach(() => {
    listBrainModelsMock.mockReset();
    resolveBrainModelExecutionConfigMock.mockReset();
    runChatbotModelMock.mockReset();
    addMessageMock.mockReset();
    findSessionByIdMock.mockReset();
    buildPersonaChatMemoryContextMock.mockReset();
    persistAgentPersonaExchangeMemoryMock.mockReset();
    mkdirMock.mockReset();
    readdirMock.mockReset();
    unlinkMock.mockReset();
    rmMock.mockReset();

    mkdirMock.mockResolvedValue(undefined);
    readdirMock.mockResolvedValue([]);
    unlinkMock.mockResolvedValue(undefined);
    rmMock.mockResolvedValue(undefined);
    findSessionByIdMock.mockResolvedValue(null);
    persistAgentPersonaExchangeMemoryMock.mockResolvedValue(undefined);
    buildPersonaChatMemoryContextMock.mockResolvedValue({
      persona: {
        id: 'persona-1',
        name: 'Helpful Tutor',
      },
      memory: {
        items: [],
        summary: {
          personaId: 'persona-1',
          suggestedMoodId: null,
          totalRecords: 0,
          memoryEntryCount: 0,
          conversationMessageCount: 0,
        },
      },
      systemPrompt: 'Persona instructions',
      suggestedMoodId: null,
    });
  });

  it('returns the Brain catalog on GET with deprecation metadata', async () => {
    listBrainModelsMock.mockResolvedValue({
      models: ['gpt-4o-mini', 'llama3.2'],
      sources: {
        modelPresets: ['gpt-4o-mini'],
        paidModels: [],
        configuredOllamaModels: ['llama3.2'],
        liveOllamaModels: [],
      },
    });

    const response = await GET_handler(
      new Request('http://localhost/api/chatbot') as Parameters<typeof GET_handler>[0],
      { requestId: 'req-1' } as Parameters<typeof GET_handler>[1]
    );
    const payload = (await response.json()) as {
      models: string[];
      deprecation?: { code?: string };
    };

    expect(payload.models).toEqual(['gpt-4o-mini', 'llama3.2']);
    expect(payload.deprecation?.code).toBe('CHATBOT_MODELS_ENDPOINT_DEPRECATED');
  });

  it('uses Brain config on POST for canonical payloads', async () => {
    resolveBrainModelExecutionConfigMock.mockResolvedValue({
      modelId: 'brain-model',
      temperature: 0.3,
      maxTokens: 900,
      systemPrompt: 'Brain prompt',
      brainApplied: {
        feature: 'chatbot',
        provider: 'model',
        modelId: 'brain-model',
        temperature: 0.3,
        maxTokens: 900,
        systemPromptApplied: true,
        enforced: true,
      },
    });
    runChatbotModelMock.mockResolvedValue({
      message: 'Brain reply',
      modelId: 'brain-model',
      provider: 'ollama',
    });

    const response = await POST_handler(
      new Request('http://localhost/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'session-1',
          messages: [
            {
              role: 'user',
              content: 'Hello',
            },
          ],
        }),
      }) as Parameters<typeof POST_handler>[0],
      { requestId: 'req-2' } as Parameters<typeof POST_handler>[1]
    );

    const payload = (await response.json()) as {
      message: string;
      sessionId: string | null;
      brainApplied?: { modelId?: string; enforced?: boolean };
    };

    expect(runChatbotModelMock).toHaveBeenCalledWith({
      messages: [
        {
          role: 'user',
          content: 'Hello',
        },
      ],
      modelId: 'brain-model',
      temperature: 0.3,
      maxTokens: 900,
      systemPrompt: 'Brain prompt',
    });
    expect(addMessageMock).toHaveBeenCalledTimes(2);
    expect(payload).toMatchObject({
      message: 'Brain reply',
      sessionId: 'session-1',
      brainApplied: {
        modelId: 'brain-model',
        enforced: true,
      },
    });
  });

  it('augments the system prompt with persona memory when the session has a persona', async () => {
    resolveBrainModelExecutionConfigMock.mockResolvedValue({
      modelId: 'brain-model',
      temperature: 0.2,
      maxTokens: 700,
      systemPrompt: 'Brain prompt',
      brainApplied: {
        feature: 'chatbot',
        provider: 'model',
        modelId: 'brain-model',
        temperature: 0.2,
        maxTokens: 700,
        systemPromptApplied: true,
        enforced: true,
      },
    });
    findSessionByIdMock.mockResolvedValue({
      id: 'session-2',
      personaId: 'persona-1',
      settings: {
        personaId: 'persona-1',
      },
    });
    buildPersonaChatMemoryContextMock.mockResolvedValue({
      persona: {
        id: 'persona-1',
        name: 'Memory Tutor',
      },
      memory: {
        items: [],
        summary: {
          personaId: 'persona-1',
          suggestedMoodId: 'encouraging',
          totalRecords: 1,
          memoryEntryCount: 1,
          conversationMessageCount: 0,
        },
      },
      systemPrompt: 'Persona instructions\n\nRelevant persona memory:\n- memory line',
      suggestedMoodId: 'encouraging',
    });
    runChatbotModelMock.mockResolvedValue({
      message: 'Persona reply',
      modelId: 'brain-model',
      provider: 'ollama',
    });

    const response = await POST_handler(
      new Request('http://localhost/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'session-2',
          messages: [
            {
              role: 'user',
              content: 'Can you help me with fractions?',
            },
          ],
        }),
      }) as Parameters<typeof POST_handler>[0],
      { requestId: 'req-4' } as Parameters<typeof POST_handler>[1]
    );

    const payload = (await response.json()) as {
      message?: string;
      suggestedMoodId?: string | null;
    };

    expect(buildPersonaChatMemoryContextMock).toHaveBeenCalledWith({
      personaId: 'persona-1',
      latestUserMessage: 'Can you help me with fractions?',
    });
    expect(runChatbotModelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt:
          'Brain prompt\n\nPersona instructions\n\nRelevant persona memory:\n- memory line',
      })
    );
    expect(addMessageMock).toHaveBeenNthCalledWith(
      2,
      'session-2',
      expect.objectContaining({
        role: 'assistant',
        metadata: expect.objectContaining({
          personaId: 'persona-1',
          suggestedPersonaMoodId: 'encouraging',
        }),
      })
    );
    expect(persistAgentPersonaExchangeMemoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        personaId: 'persona-1',
        sourceType: 'chat_message',
        sourceLabel: 'Chatbot session',
        sessionId: 'session-2',
        userMessage: 'Can you help me with fractions?',
        assistantMessage: 'Persona reply',
        tags: ['chatbot'],
        moodHints: ['encouraging'],
      })
    );
    expect(payload).toMatchObject({
      message: 'Persona reply',
      suggestedMoodId: 'encouraging',
    });
  });

  it('rejects legacy model override payloads', async () => {
    await expect(
      POST_handler(
        new Request('http://localhost/api/chatbot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'session-1',
            model: 'legacy-model',
            messages: [
              {
                role: 'user',
                content: 'Hello',
              },
            ],
          }),
        }) as Parameters<typeof POST_handler>[0],
        { requestId: 'req-3' } as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow(/unsupported model override/i);

    expect(runChatbotModelMock).not.toHaveBeenCalled();
  });
});
