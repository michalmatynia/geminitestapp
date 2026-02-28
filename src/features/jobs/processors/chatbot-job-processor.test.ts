import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolveBrainModelExecutionConfigMock,
  runChatbotModelMock,
  findByIdMock,
  updateMock,
  addMessageMock,
} = vi.hoisted(() => ({
  resolveBrainModelExecutionConfigMock: vi.fn(),
  runChatbotModelMock: vi.fn(),
  findByIdMock: vi.fn(),
  updateMock: vi.fn(),
  addMessageMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainModelExecutionConfig: resolveBrainModelExecutionConfigMock,
}));

vi.mock('@/features/ai/chatbot/server-model-runtime', () => ({
  runChatbotModel: runChatbotModelMock,
}));

vi.mock('@/features/ai/chatbot/services/chatbot-job-repository', () => ({
  chatbotJobRepository: {
    findById: findByIdMock,
    update: updateMock,
  },
}));

vi.mock('@/features/ai/chatbot/services/chatbot-session-repository', () => ({
  chatbotSessionRepository: {
    addMessage: addMessageMock,
  },
}));

import { processJob } from './chatbot-job-processor';

describe('chatbot job processor', () => {
  beforeEach(() => {
    resolveBrainModelExecutionConfigMock.mockReset();
    runChatbotModelMock.mockReset();
    findByIdMock.mockReset();
    updateMock.mockReset();
    addMessageMock.mockReset();

    resolveBrainModelExecutionConfigMock.mockResolvedValue({
      modelId: 'brain-model',
      temperature: 0.4,
      maxTokens: 1200,
      systemPrompt: 'Brain prompt',
      brainApplied: {
        feature: 'chatbot',
        provider: 'model',
        modelId: 'brain-model',
        temperature: 0.4,
        maxTokens: 1200,
        systemPromptApplied: true,
        enforced: true,
      },
    });
    runChatbotModelMock.mockResolvedValue({
      message: 'Brain reply',
      modelId: 'brain-model',
      provider: 'ollama',
    });
    findByIdMock.mockResolvedValue({
      id: 'job-1',
      sessionId: 'session-1',
      status: 'running',
      payload: {
        model: 'legacy-model',
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
      },
    });
  });

  it('enforces Brain model config instead of the legacy job payload model', async () => {
    await processJob('job-1');

    expect(resolveBrainModelExecutionConfigMock).toHaveBeenCalledWith(
      'chatbot',
      expect.objectContaining({
        defaultTemperature: 0.7,
        defaultMaxTokens: 800,
      })
    );
    expect(runChatbotModelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'brain-model',
        temperature: 0.4,
        maxTokens: 1200,
        systemPrompt: 'Brain prompt',
      })
    );
    expect(addMessageMock).toHaveBeenCalledTimes(1);
    const addMessageArgs = addMessageMock.mock.calls[0] as [
      string,
      {
        role: 'assistant';
        content: 'Brain reply';
        model: 'brain-model';
        metadata?: {
          brainApplied?: {
            feature?: string;
            enforced?: boolean;
          };
        };
      },
    ];
    expect(addMessageArgs[0]).toBe('session-1');
    expect(addMessageArgs[1]).toMatchObject({
      role: 'assistant',
      content: 'Brain reply',
      model: 'brain-model',
    });
    expect(addMessageArgs[1].metadata?.brainApplied).toMatchObject({
      feature: 'chatbot',
      enforced: true,
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    const updateArgs = updateMock.mock.calls[0] as [
      string,
      {
        status: 'completed';
        model: 'brain-model';
        payload?: {
          model?: string;
          options?: {
            requestedModel?: string;
            brainApplied?: {
              feature?: string;
              modelId?: string;
            };
          };
        };
      },
    ];
    expect(updateArgs[0]).toBe('job-1');
    expect(updateArgs[1]).toMatchObject({
      status: 'completed',
      model: 'brain-model',
      payload: {
        model: 'brain-model',
      },
    });
    expect(updateArgs[1].payload?.options?.requestedModel).toBe('legacy-model');
    expect(updateArgs[1].payload?.options?.brainApplied).toMatchObject({
      feature: 'chatbot',
      modelId: 'brain-model',
    });
  });
});
