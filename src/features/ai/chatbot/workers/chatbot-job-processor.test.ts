import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findJobByIdMock,
  updateJobMock,
  addMessageMock,
  resolveBrainModelExecutionConfigMock,
  runChatbotModelMock,
} = vi.hoisted(() => ({
  findJobByIdMock: vi.fn(),
  updateJobMock: vi.fn(),
  addMessageMock: vi.fn(),
  resolveBrainModelExecutionConfigMock: vi.fn(),
  runChatbotModelMock: vi.fn(),
}));

vi.mock('@/features/ai/chatbot/services/chatbot-job-repository', () => ({
  chatbotJobRepository: {
    findById: findJobByIdMock,
    update: updateJobMock,
  },
}));

vi.mock('@/features/ai/chatbot/services/chatbot-session-repository', () => ({
  chatbotSessionRepository: {
    addMessage: addMessageMock,
  },
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainModelExecutionConfig: resolveBrainModelExecutionConfigMock,
}));

vi.mock('@/shared/lib/ai/chatbot/server-model-runtime', () => ({
  runChatbotModel: runChatbotModelMock,
}));

import { processJob } from './chatbot-job-processor';

describe('processJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    findJobByIdMock.mockResolvedValue({
      id: 'job-1',
      sessionId: 'session-1',
      status: 'running',
      payload: {
        sessionId: 'session-1',
        messages: [
          {
            role: 'user',
            content: 'Summarize the current workspace.',
          },
        ],
        contextRegistry: {
          refs: [
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
          ],
          engineVersion: 'page-context-engine/1',
          resolved: {
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
                description: 'Chatbot workspace.',
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
            documents: [
              {
                id: 'runtime:chatbot:workspace',
                kind: 'runtime_document',
                entityType: 'chatbot_workspace_state',
                title: 'Chatbot workspace state',
                summary: 'Workspace details',
                tags: ['chatbot'],
                relatedNodeIds: ['page:admin-chatbot'],
                timestamps: {
                  observedAtISO: '2026-03-09T09:00:00.000Z',
                },
                facts: {
                  activeSessionId: 'session-1',
                  selectedPersonaId: 'persona-1',
                },
              },
            ],
            truncated: false,
            engineVersion: 'page-context-engine/1',
          },
        },
        options: {},
      },
    });
    resolveBrainModelExecutionConfigMock.mockResolvedValue({
      modelId: 'brain-model',
      temperature: 0.3,
      maxTokens: 900,
      systemPrompt: 'Brain prompt',
      brainApplied: {
        feature: 'chatbot',
        modelId: 'brain-model',
      },
    });
    runChatbotModelMock.mockResolvedValue({
      message: 'Workspace summary',
    });
    addMessageMock.mockResolvedValue(undefined);
    updateJobMock.mockResolvedValue(undefined);
  });

  it('appends stored context registry state to the chatbot worker system prompt', async () => {
    await processJob('job-1');

    expect(runChatbotModelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: expect.stringContaining(
          'Context Registry bundle for the current admin chatbot workspace.'
        ),
      })
    );
    expect(runChatbotModelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: expect.stringContaining('"selectedPersonaId": "persona-1"'),
      })
    );
    expect(updateJobMock).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({
        payload: expect.objectContaining({
          contextRegistry: expect.objectContaining({
            refs: expect.any(Array),
          }),
        }),
      })
    );
  });
});
