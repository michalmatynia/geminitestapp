import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolveBrainModelExecutionConfigMock,
  findByIdMock,
  addMessageMock,
  createMock,
  findAllMock,
  deleteManyMock,
  enqueueChatbotJobMock,
  startChatbotJobQueueMock,
} = vi.hoisted(() => ({
  resolveBrainModelExecutionConfigMock: vi.fn(),
  findByIdMock: vi.fn(),
  addMessageMock: vi.fn(),
  createMock: vi.fn(),
  findAllMock: vi.fn(),
  deleteManyMock: vi.fn(),
  enqueueChatbotJobMock: vi.fn(),
  startChatbotJobQueueMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainModelExecutionConfig: resolveBrainModelExecutionConfigMock,
}));

vi.mock('@/features/ai/chatbot/services/chatbot-session-repository', () => ({
  chatbotSessionRepository: {
    findById: findByIdMock,
    addMessage: addMessageMock,
  },
}));

vi.mock('@/features/ai/chatbot/services/chatbot-job-repository', () => ({
  chatbotJobRepository: {
    create: createMock,
    findAll: findAllMock,
    deleteMany: deleteManyMock,
  },
}));

vi.mock('@/features/jobs/server', () => ({
  enqueueChatbotJob: enqueueChatbotJobMock,
  startChatbotJobQueue: startChatbotJobQueueMock,
}));

import { POST_handler } from './handler';

describe('chatbot jobs handler', () => {
  beforeEach(() => {
    resolveBrainModelExecutionConfigMock.mockReset();
    findByIdMock.mockReset();
    addMessageMock.mockReset();
    createMock.mockReset();
    findAllMock.mockReset();
    deleteManyMock.mockReset();
    enqueueChatbotJobMock.mockReset();
    startChatbotJobQueueMock.mockReset();

    resolveBrainModelExecutionConfigMock.mockResolvedValue({
      modelId: 'brain-model',
      temperature: 0.4,
      maxTokens: 1000,
      systemPrompt: 'Brain prompt',
      brainApplied: {
        feature: 'chatbot',
        provider: 'model',
        modelId: 'brain-model',
        temperature: 0.4,
        maxTokens: 1000,
        systemPromptApplied: true,
        enforced: true,
      },
    });
    findByIdMock.mockResolvedValue({
      id: 'session-1',
      messages: [],
    });
    addMessageMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: 'job-1',
      sessionId: 'session-1',
      status: 'pending',
    });
    enqueueChatbotJobMock.mockResolvedValue(undefined);
  });

  it('creates a job with Brain-applied config and queues it', async () => {
    const response = await POST_handler(
      new Request('http://localhost/api/chatbot/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'session-1',
          model: 'legacy-model',
          messages: [
            {
              role: 'user',
              content: 'Translate this',
            },
          ],
          userMessage: 'Translate this',
        }),
      }) as Parameters<typeof POST_handler>[0],
      { requestId: 'req-3' } as Parameters<typeof POST_handler>[1]
    );

    const payload = (await response.json()) as {
      jobId: string;
      status: string;
      brainApplied?: { modelId?: string; enforced?: boolean };
    };

    expect(createMock).toHaveBeenCalledTimes(1);
    const createArgs = createMock.mock.calls[0] as [
      {
        sessionId: 'session-1';
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
    expect(createArgs[0]).toMatchObject({
      sessionId: 'session-1',
      model: 'brain-model',
      payload: {
        model: 'brain-model',
      },
    });
    expect(createArgs[0].payload?.options?.requestedModel).toBe('legacy-model');
    expect(createArgs[0].payload?.options?.brainApplied).toMatchObject({
      feature: 'chatbot',
      modelId: 'brain-model',
    });
    expect(startChatbotJobQueueMock).toHaveBeenCalledTimes(1);
    expect(enqueueChatbotJobMock).toHaveBeenCalledWith('job-1');
    expect(payload).toMatchObject({
      jobId: 'job-1',
      status: 'pending',
      brainApplied: {
        modelId: 'brain-model',
        enforced: true,
      },
    });
  });
});
