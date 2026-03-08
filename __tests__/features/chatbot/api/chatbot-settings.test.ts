import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { ChatbotSettings } from '@prisma/client';

import { GET, POST } from '@/app/api/chatbot/settings/route';
import prisma from '@/shared/lib/db/prisma';

vi.mock('@/shared/lib/db/prisma', () => {
  const mockPrisma = {
    chatbotSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $disconnect: vi.fn(),
  };
  return {
    ...mockPrisma,
    default: mockPrisma,
  };
});

describe('Chatbot Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET: returns settings by key', async () => {
    const mockSettings = { key: 'default', settings: { model: 'gpt-4' } };
    const mockRow = { ...mockSettings, id: '1', createdAt: new Date(), updatedAt: new Date() };
    vi.mocked(prisma.chatbotSettings.findUnique).mockResolvedValue(mockRow as unknown as ChatbotSettings);

    const req = new NextRequest('http://localhost/api/chatbot/settings?key=default');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.settings).toMatchObject(mockSettings);
    expect(prisma.chatbotSettings.findUnique).toHaveBeenCalledWith({
      where: { key: 'default' },
    });
  });

  it('POST: saves settings using upsert', async () => {
    const mockSaved = { key: 'default', settings: { model: 'gpt-4' } };
    const mockRow = { ...mockSaved, id: '1', createdAt: new Date(), updatedAt: new Date() };
    vi.mocked(prisma.chatbotSettings.upsert).mockResolvedValue(mockRow as unknown as ChatbotSettings);

    const req = new NextRequest('http://localhost/api/chatbot/settings', {
      method: 'POST',
      body: JSON.stringify({ key: 'default', settings: { model: 'gpt-4' } }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.settings).toMatchObject(mockSaved);
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
