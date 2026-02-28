import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GET, POST, DELETE, PATCH } from '@/app/api/chatbot/sessions/route';
import { chatbotSessionRepository } from '@/features/ai/chatbot/server';
import type { ChatbotSessionDto as ChatSession } from '@/shared/contracts/chatbot';

vi.mock('@/features/ai/chatbot/server', () => ({
  chatbotSessionRepository: {
    create: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Chatbot Sessions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET: returns all sessions', async () => {
    const mockSessions: ChatSession[] = [
      {
        id: 's1',
        title: 'Session 1',
        userId: null,
        messages: [],
        messageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    vi.mocked(chatbotSessionRepository.findAll).mockResolvedValue(mockSessions);

    const req = new NextRequest('http://localhost/api/chatbot/sessions');
    const res = await GET(req);
    const data = (await res.json()) as { sessions: ChatSession[] };

    expect(res.status).toBe(200);
    expect(data.sessions).toEqual(mockSessions);
  });

  it('POST: creates a new session', async () => {
    const mockSession: ChatSession = {
      id: 'new-id',
      title: 'New Session',
      userId: null,
      messages: [],
      messageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    vi.mocked(chatbotSessionRepository.create).mockResolvedValue(mockSession);

    const req = new NextRequest('http://localhost/api/chatbot/sessions', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Session' }),
    });

    const res = await POST(req);
    const data = (await res.json()) as { sessionId: string };

    expect(res.status).toBe(201);
    expect(data.sessionId).toBe('new-id');
    expect(chatbotSessionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Session',
      })
    );
  });

  it('PATCH: updates a session title', async () => {
    const mockSession: ChatSession = {
      id: 's1',
      title: 'Updated Title',
      userId: null,
      messages: [],
      messageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    vi.mocked(chatbotSessionRepository.update).mockResolvedValue(mockSession);

    const req = new NextRequest('http://localhost/api/chatbot/sessions', {
      method: 'PATCH',
      body: JSON.stringify({ sessionId: 's1', title: 'Updated Title' }),
    });

    const res = await PATCH(req);
    const data = (await res.json()) as { session: ChatSession };

    expect(res.status).toBe(200);
    expect(data.session.title).toBe('Updated Title');
  });

  it('DELETE: deletes a session', async () => {
    vi.mocked(chatbotSessionRepository.delete).mockResolvedValue(true);

    const req = new NextRequest('http://localhost/api/chatbot/sessions', {
      method: 'DELETE',
      body: JSON.stringify({ sessionId: 's1' }),
    });

    const res = await DELETE(req);
    const data = (await res.json()) as { success: boolean };

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('DELETE: returns 404 if session not found', async () => {
    vi.mocked(chatbotSessionRepository.delete).mockResolvedValue(false);

    const req = new NextRequest('http://localhost/api/chatbot/sessions', {
      method: 'DELETE',
      body: JSON.stringify({ sessionId: 'missing' }),
    });

    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });
});
