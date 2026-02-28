import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

import { GET, POST } from '@/app/api/chatbot/settings/route';
import prisma from '@/shared/lib/db/prisma';

describe('Chatbot Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET: returns settings by key', async () => {
    const mockSettings = { key: 'default', settings: { model: 'gpt-4' } };
    vi.mocked(prisma.chatbotSettings.findUnique).mockResolvedValue(mockSettings as any);

    const req = new NextRequest('http://localhost/api/chatbot/settings?key=default');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.settings).toEqual(mockSettings);
    expect(prisma.chatbotSettings.findUnique).toHaveBeenCalledWith({
      where: { key: 'default' },
    });
  });

  it('POST: saves settings using upsert', async () => {
    const mockSaved = { key: 'default', settings: { model: 'gpt-4' } };
    vi.mocked(prisma.chatbotSettings.upsert).mockResolvedValue(mockSaved as any);

    const req = new NextRequest('http://localhost/api/chatbot/settings', {
      method: 'POST',
      body: JSON.stringify({ key: 'default', settings: { model: 'gpt-4' } }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.settings).toEqual(mockSaved);
    expect(prisma.chatbotSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'default' },
        update: { settings: { model: 'gpt-4' } },
        create: { key: 'default', settings: { model: 'gpt-4' } },
      })
    );
  });

  it('POST: returns 400 if settings missing', async () => {
    const req = new NextRequest('http://localhost/api/chatbot/settings', {
      method: 'POST',
      body: JSON.stringify({ key: 'default' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
