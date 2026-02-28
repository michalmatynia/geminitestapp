import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  listBrainModelsMock,
  resolveBrainModelExecutionConfigMock,
  runChatbotModelMock,
  addMessageMock,
  mkdirMock,
  readdirMock,
  unlinkMock,
  rmMock,
} = vi.hoisted(() => ({
  listBrainModelsMock: vi.fn(),
  resolveBrainModelExecutionConfigMock: vi.fn(),
  runChatbotModelMock: vi.fn(),
  addMessageMock: vi.fn(),
  mkdirMock: vi.fn(),
  readdirMock: vi.fn(),
  unlinkMock: vi.fn(),
  rmMock: vi.fn(),
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

vi.mock('@/features/ai/chatbot/server-model-runtime', () => ({
  runChatbotModel: runChatbotModelMock,
}));

vi.mock('@/features/ai/chatbot/server', () => ({
  chatbotSessionRepository: {
    addMessage: addMessageMock,
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
    mkdirMock.mockReset();
    readdirMock.mockReset();
    unlinkMock.mockReset();
    rmMock.mockReset();

    mkdirMock.mockResolvedValue(undefined);
    readdirMock.mockResolvedValue([]);
    unlinkMock.mockResolvedValue(undefined);
    rmMock.mockResolvedValue(undefined);
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

  it('uses Brain config on POST and ignores the legacy requested model', async () => {
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
          model: 'legacy-model',
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
});
