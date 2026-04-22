import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteHandler, getHandler } from './handler';
import { chatbotSessionRepository } from '@/features/ai/chatbot/server';

vi.mock('@/features/ai/chatbot/server', () => ({
  chatbotSessionRepository: {
    findAll: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

describe('chatbot sessions handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns session ids when scope=ids uses the shared query DTO', async () => {
    vi.mocked(chatbotSessionRepository.findAll).mockResolvedValue([
      {
        id: 'session-1',
        title: 'First session',
        userId: null,
        messages: [],
        messageCount: 0,
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-01T10:00:00.000Z',
      },
      {
        id: 'session-2',
        title: 'Second session',
        userId: null,
        messages: [],
        messageCount: 0,
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-01T10:00:00.000Z',
      },
    ]);

    const response = await getHandler(
      new NextRequest('http://localhost/api/chatbot/sessions'),
      {
        query: {
          scope: 'ids',
        },
      } as Parameters<typeof getHandler>[1]
    );

    await expect(response.json()).resolves.toEqual({
      ids: ['session-1', 'session-2'],
    });
  });

  it('deletes multiple sessions using the shared delete-body DTO', async () => {
    vi.mocked(chatbotSessionRepository.deleteMany).mockResolvedValue(2);

    const response = await deleteHandler(
      new NextRequest('http://localhost/api/chatbot/sessions', {
        method: 'DELETE',
      }),
      {
        body: {
          sessionIds: ['session-1', 'session-2'],
        },
      } as Parameters<typeof deleteHandler>[1]
    );

    expect(chatbotSessionRepository.deleteMany).toHaveBeenCalledWith(['session-1', 'session-2']);
    await expect(response.json()).resolves.toEqual({
      success: true,
      deletedCount: 2,
    });
  });

  it('deletes a single session using the shared delete-body DTO', async () => {
    vi.mocked(chatbotSessionRepository.delete).mockResolvedValue(true);

    const response = await deleteHandler(
      new NextRequest('http://localhost/api/chatbot/sessions', {
        method: 'DELETE',
      }),
      {
        body: {
          sessionId: 'session-1',
        },
      } as Parameters<typeof deleteHandler>[1]
    );

    expect(chatbotSessionRepository.delete).toHaveBeenCalledWith('session-1');
    await expect(response.json()).resolves.toEqual({
      success: true,
      deletedCount: 1,
    });
  });
});
