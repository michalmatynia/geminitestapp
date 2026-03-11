import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET_handler, POST_handler } from './handler';
import { chatbotSessionRepository } from '@/features/ai/chatbot/server';

vi.mock('@/features/ai/chatbot/server', () => ({
  chatbotSessionRepository: {
    findById: vi.fn(),
    addMessage: vi.fn(),
  },
}));

describe('chatbot session messages handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists session messages from the repository', async () => {
    vi.mocked(chatbotSessionRepository.findById).mockResolvedValue({
      id: 'session-1',
      title: 'Session 1',
      userId: null,
      messages: [
        {
          id: 'message-1',
          sessionId: 'session-1',
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-02T10:00:00.000Z',
        },
      ],
      messageCount: 1,
      createdAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-01-02T10:00:00.000Z',
    });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/chatbot/sessions/session-1/messages'),
      {} as any,
      { sessionId: 'session-1' }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.messages).toHaveLength(1);
    expect(chatbotSessionRepository.findById).toHaveBeenCalledWith('session-1');
  });

  it('adds a message through the repository and returns the created message', async () => {
    vi.mocked(chatbotSessionRepository.addMessage).mockResolvedValue({
      id: 'session-1',
      title: 'Session 1',
      userId: null,
      messages: [
        {
          id: 'message-1',
          sessionId: 'session-1',
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-02T10:00:00.000Z',
        },
      ],
      messageCount: 1,
      createdAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-01-02T10:00:00.000Z',
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/chatbot/sessions/session-1/messages', {
        method: 'POST',
        body: JSON.stringify({
          role: 'user',
          content: 'Hello',
        }),
      }),
      {} as any,
      { sessionId: 'session-1' }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toEqual(
      expect.objectContaining({
        id: 'message-1',
        role: 'user',
        content: 'Hello',
      })
    );
    expect(chatbotSessionRepository.addMessage).toHaveBeenCalledWith('session-1', {
      role: 'user',
      content: 'Hello',
    });
  });

  it('returns 404 when the target session does not exist', async () => {
    vi.mocked(chatbotSessionRepository.findById).mockResolvedValue(null);

    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/chatbot/sessions/missing/messages'),
        {} as any,
        { sessionId: 'missing' }
      )
    ).rejects.toMatchObject({
      message: 'Session not found.',
    });
  });
});
