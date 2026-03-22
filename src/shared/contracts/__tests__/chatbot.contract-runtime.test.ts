import { describe, expect, it } from 'vitest';

import {
  chatbotAgentRunActionRouteParamsSchema,
  chatbotJobActionRequestSchema,
  chatbotJobDeleteQuerySchema,
  chatbotJobResponseSchema,
  chatbotJobsDeleteQuerySchema,
  chatbotJsonRequestSchema,
  chatbotMemoryQuerySchema,
  chatbotSessionMessageCreateRequestSchema,
  chatbotSessionMessageResponseSchema,
  chatbotSessionMessagesResponseSchema,
  chatbotSessionsDeleteBodySchema,
  chatbotContextUploadResponseSchema,
  chatbotMemoryResponseSchema,
  chatbotSettingsQuerySchema,
  chatbotSessionCreateResponseSchema,
  chatbotSessionDeleteResponseSchema,
  chatbotSessionIdsResponseSchema,
  chatbotSessionResponseSchema,
  chatbotSettingsSaveRequestSchema,
  chatbotSessionsResponseSchema,
  chatbotSettingsResponseSchema,
  chatbotSettingsSaveResponseSchema,
} from '@/shared/contracts/chatbot';

describe('chatbot contract runtime', () => {
  it('parses chatbot settings responses', () => {
    expect(
      chatbotSettingsResponseSchema.parse({
        settings: {
          id: 'settings-1',
          key: 'default',
          settings: {
            model: 'gpt-4o-mini',
            personaId: null,
          },
          createdAt: '2026-03-11T10:00:00.000Z',
          updatedAt: '2026-03-11T10:01:00.000Z',
        },
      }).settings?.key
    ).toBe('default');

    expect(
      chatbotSettingsSaveResponseSchema.parse({
        settings: {
          id: 'settings-2',
          key: 'general',
          settings: {
            model: 'gpt-4o',
          },
          createdAt: '2026-03-11T10:00:00.000Z',
          updatedAt: '2026-03-11T10:01:00.000Z',
        },
      }).settings.settings.model
    ).toBe('gpt-4o');
  });

  it('parses chatbot memory response envelopes', () => {
    expect(
      chatbotMemoryResponseSchema.parse({
        items: [
          {
            id: 'memory-1',
            sessionId: 'session-1',
            key: 'summary',
            value: 'Stored memory',
            createdAt: '2026-03-11T10:00:00.000Z',
            updatedAt: '2026-03-11T10:01:00.000Z',
          },
        ],
      }).items
    ).toHaveLength(1);
  });

  it('parses chatbot session response envelopes', () => {
    expect(
      chatbotSessionsResponseSchema.parse({
        sessions: [
          {
            id: 'session-1',
            title: 'First session',
            userId: null,
            messages: [],
            messageCount: 0,
            createdAt: '2026-03-11T10:00:00.000Z',
            updatedAt: '2026-03-11T10:01:00.000Z',
          },
        ],
      }).sessions
    ).toHaveLength(1);

    expect(
      chatbotSessionResponseSchema.parse({
        session: {
          id: 'session-2',
          title: 'Focused session',
          userId: null,
          messages: [],
          messageCount: 1,
          createdAt: '2026-03-11T10:00:00.000Z',
          updatedAt: '2026-03-11T10:01:00.000Z',
        },
      }).session.id
    ).toBe('session-2');

    expect(
      chatbotSessionCreateResponseSchema.parse({
        sessionId: 'session-3',
        session: {
          id: 'session-3',
          title: 'Created session',
          userId: null,
          messages: [],
          messageCount: 0,
          createdAt: '2026-03-11T10:00:00.000Z',
          updatedAt: '2026-03-11T10:01:00.000Z',
        },
      }).sessionId
    ).toBe('session-3');

    expect(chatbotSessionIdsResponseSchema.parse({ ids: ['session-1', 'session-2'] }).ids).toHaveLength(2);
    expect(
      chatbotSessionDeleteResponseSchema.parse({ success: true, deletedCount: 2 }).deletedCount
    ).toBe(2);
  });

  it('parses chatbot context upload response envelopes', () => {
    expect(
      chatbotContextUploadResponseSchema.parse({
        segments: [
          {
            title: 'Uploaded PDF (page 1)',
            content: 'Parsed text',
          },
        ],
      }).segments[0]?.title
    ).toBe('Uploaded PDF (page 1)');
  });

  it('parses chatbot job request and response envelopes', () => {
    expect(
      chatbotJobResponseSchema.parse({
        job: {
          id: 'job-1',
          sessionId: 'session-1',
          status: 'pending',
          model: 'brain-model',
          payload: {
            sessionId: 'session-1',
          },
          createdAt: '2026-03-11T10:00:00.000Z',
          updatedAt: '2026-03-11T10:01:00.000Z',
        },
      }).job.id
    ).toBe('job-1');

    expect(chatbotJobsDeleteQuerySchema.parse({ scope: 'terminal' }).scope).toBe('terminal');
    expect(chatbotJobDeleteQuerySchema.parse({ force: 'true' }).force).toBe(true);
    expect(chatbotJobActionRequestSchema.parse({ action: 'cancel' }).action).toBe('cancel');
  });

  it('parses chatbot settings and memory request/query DTOs', () => {
    expect(chatbotSettingsQuerySchema.parse({ key: 'default' }).key).toBe('default');
    expect(
      chatbotSettingsSaveRequestSchema.parse({
        key: 'default',
        settings: { model: 'gpt-4o-mini' },
      }).settings
    ).toEqual({ model: 'gpt-4o-mini' });
    expect(
      chatbotMemoryQuerySchema.parse({
        memoryKey: 'summary',
        tag: 'important',
        q: 'deploy',
        limit: '25',
      })
    ).toMatchObject({
      memoryKey: 'summary',
      tag: 'important',
      q: 'deploy',
      limit: 25,
    });
  });

  it('parses chatbot session message and delete-body DTOs', () => {
    expect(
      chatbotSessionMessageCreateRequestSchema.parse({
        role: 'user',
        content: ' Hello ',
      })
    ).toMatchObject({
      role: 'user',
      content: 'Hello',
    });

    expect(
      chatbotSessionMessagesResponseSchema.parse({
        messages: [
          {
            id: 'message-1',
            sessionId: 'session-1',
            role: 'user',
            content: 'Hello',
            timestamp: '2026-03-22T10:00:00.000Z',
          },
        ],
      }).messages
    ).toHaveLength(1);

    expect(
      chatbotSessionMessageResponseSchema.parse({
        message: {
          id: 'message-1',
          sessionId: 'session-1',
          role: 'assistant',
          content: 'Hi',
          timestamp: '2026-03-22T10:01:00.000Z',
        },
      }).message.role
    ).toBe('assistant');

    expect(chatbotSessionsDeleteBodySchema.parse({ sessionId: 'session-1' })).toEqual({
      sessionId: 'session-1',
    });
    expect(chatbotSessionsDeleteBodySchema.parse({ sessionIds: ['session-1', 'session-2'] })).toEqual({
      sessionIds: ['session-1', 'session-2'],
    });
  });

  it('parses chatbot JSON chat requests and agent action route params', () => {
    expect(
      chatbotJsonRequestSchema.parse({
        sessionId: 'session-1',
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
        extra: 'allowed',
      })
    ).toMatchObject({
      sessionId: 'session-1',
      messages: [{ role: 'user', content: 'Hello' }],
      extra: 'allowed',
    });

    expect(
      chatbotAgentRunActionRouteParamsSchema.parse({
        runId: 'run-1',
        action: 'logs',
      })
    ).toEqual({
      runId: 'run-1',
      action: 'logs',
    });
  });
});
