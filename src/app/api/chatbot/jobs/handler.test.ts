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
  contextRegistryResolveRefsMock,
} = vi.hoisted(() => ({
  resolveBrainModelExecutionConfigMock: vi.fn(),
  findByIdMock: vi.fn(),
  addMessageMock: vi.fn(),
  createMock: vi.fn(),
  findAllMock: vi.fn(),
  deleteManyMock: vi.fn(),
  enqueueChatbotJobMock: vi.fn(),
  startChatbotJobQueueMock: vi.fn(),
  contextRegistryResolveRefsMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainModelExecutionConfig: resolveBrainModelExecutionConfigMock,
}));

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  contextRegistryEngine: {
    resolveRefs: contextRegistryResolveRefsMock,
  },
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

const buildChatbotJobRequestPayload = (
  overrides: Record<string, unknown>
): Record<string, unknown> => ({
  sessionId: 'session-1',
  messages: [
    {
      role: 'user',
      content: 'Translate this',
    },
  ],
  ...overrides,
});

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
    contextRegistryResolveRefsMock.mockReset();

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
    contextRegistryResolveRefsMock.mockResolvedValue({
      refs: [
        {
          id: 'page:admin-chatbot',
          kind: 'static_node',
        },
      ],
      nodes: [
        {
          id: 'page:admin-chatbot',
          kind: 'page',
          name: 'Admin Chatbot',
          description: 'Admin chatbot workspace.',
          tags: ['chatbot'],
          relationships: [],
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
      documents: [],
      truncated: false,
      engineVersion: 'page-context-engine/1',
    });
  });

  it('creates a job with Brain-applied config and queues it', async () => {
    const requestPayload = buildChatbotJobRequestPayload({
      userMessage: 'Translate this',
    });
    const response = await POST_handler(
      new Request('http://localhost/api/chatbot/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
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

  it('rejects legacy model override payloads', async () => {
    const requestPayload = buildChatbotJobRequestPayload({
      model: 'legacy-model',
    });
    await expect(
      POST_handler(
        new Request('http://localhost/api/chatbot/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        }) as Parameters<typeof POST_handler>[0],
        { requestId: 'req-4' } as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow(/unsupported model override/i);

    expect(createMock).not.toHaveBeenCalled();
    expect(startChatbotJobQueueMock).not.toHaveBeenCalled();
    expect(enqueueChatbotJobMock).not.toHaveBeenCalled();
  });

  it('normalizes and stores context registry payloads on queued jobs', async () => {
    const expectedContextRefs = [
      {
        id: 'page:admin-chatbot',
        kind: 'static_node',
      },
      {
        id: 'runtime:chatbot:workspace',
        kind: 'runtime_document',
        providerId: 'chatbot-page-local',
        entityType: 'chatbot_workspace_state',
      },
    ];
    const contextRegistryRequestPayload = {
      sessionId: 'session-1',
      messages: [
        {
          role: 'user',
          content: 'Use the page context.',
        },
      ],
      contextRegistry: {
        refs: expectedContextRefs,
        engineVersion: 'page-context-engine/1',
        resolved: {
          refs: [
            {
              id: 'runtime:chatbot:workspace',
              kind: 'runtime_document',
              providerId: 'chatbot-page-local',
              entityType: 'chatbot_workspace_state',
            },
          ],
          nodes: [],
          documents: [
            {
              id: 'runtime:chatbot:workspace',
              kind: 'runtime_document',
              entityType: 'chatbot_workspace_state',
              title: 'Chatbot workspace state',
              summary: 'Current page state',
              tags: ['chatbot'],
              relatedNodeIds: ['page:admin-chatbot'],
              timestamps: {
                observedAtISO: '2026-03-09T08:30:00.000Z',
              },
            },
          ],
          truncated: false,
          engineVersion: 'page-context-engine/1',
        },
      },
    };
    const expectedResolvedContextRegistry = {
      refs: expectedContextRefs,
      resolved: expect.objectContaining({
        documents: expect.arrayContaining([
          expect.objectContaining({
            id: 'runtime:chatbot:workspace',
          }),
        ]),
        nodes: expect.arrayContaining([
          expect.objectContaining({
            id: 'page:admin-chatbot',
          }),
        ]),
      }),
    };

    await POST_handler(
      new Request('http://localhost/api/chatbot/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contextRegistryRequestPayload),
      }) as Parameters<typeof POST_handler>[0],
      { requestId: 'req-5' } as Parameters<typeof POST_handler>[1]
    );

    expect(contextRegistryResolveRefsMock).toHaveBeenCalledWith({
      refs: expectedContextRefs,
      maxNodes: 24,
      depth: 1,
    });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          contextRegistry: expect.objectContaining(expectedResolvedContextRegistry),
        }),
      })
    );
  });
});
