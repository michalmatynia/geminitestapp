import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import type { ChatbotSettings } from '@prisma/client';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { GET_handler as GET, POST_handler as POST } from '@/app/api/chatbot/settings/handler';
import prisma from '@/shared/lib/db/prisma';

const {
  chatbotSettingsFindUniqueMock,
  chatbotSettingsUpsertMock,
  prismaDisconnectMock,
  parseJsonBodyMock,
} = vi.hoisted(() => ({
  chatbotSettingsFindUniqueMock: vi.fn(),
  chatbotSettingsUpsertMock: vi.fn(),
  prismaDisconnectMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    chatbotSettings: {
      findUnique: chatbotSettingsFindUniqueMock,
      upsert: chatbotSettingsUpsertMock,
    },
    $disconnect: prismaDisconnectMock,
  },
}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: (...args: unknown[]) => parseJsonBodyMock(...args),
}));

const mockContext = {
  requestId: 'chatbot-settings-test',
  startTime: Date.now(),
  getElapsedMs: () => 0,
} as ApiHandlerContext;

describe('Chatbot Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parseJsonBodyMock.mockImplementation(async (req: NextRequest, schema: { safeParse: (input: unknown) => { success: boolean; data?: unknown; error?: { format: () => unknown } } }) => {
      try {
        const body = (await req.json()) as unknown;
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return {
            ok: false,
            response: new Response(JSON.stringify({ error: 'Invalid payload.' }), { status: 400 }),
          };
        }
        return {
          ok: true,
          data: parsed.data,
        };
      } catch {
        return {
          ok: false,
          response: new Response(JSON.stringify({ error: 'Invalid payload.' }), { status: 400 }),
        };
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET: returns settings by key', async () => {
    const createdAt = new Date('2026-03-01T10:00:00.000Z');
    const updatedAt = new Date('2026-03-02T10:00:00.000Z');
    const mockSettings = {
      id: 'chatbot-settings-default',
      key: 'default',
      settings: { model: 'gpt-4' },
      createdAt,
      updatedAt,
    };
    vi.mocked(prisma.chatbotSettings.findUnique).mockResolvedValue(
      mockSettings as unknown as ChatbotSettings
    );

    const req = new NextRequest('http://localhost/api/chatbot/settings?key=default');
    const res = await GET(req, { ...mockContext, query: { key: 'default' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.settings).toEqual({
      id: 'chatbot-settings-default',
      key: 'default',
      settings: { model: 'gpt-4' },
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
    expect(prisma.chatbotSettings.findUnique).toHaveBeenCalledWith({
      where: { key: 'default' },
    });
  });

  it('POST: saves settings using upsert', async () => {
    const createdAt = new Date('2026-03-01T10:00:00.000Z');
    const updatedAt = new Date('2026-03-02T10:00:00.000Z');
    const mockSaved = {
      id: 'chatbot-settings-default',
      key: 'default',
      settings: { model: 'gpt-4' },
      createdAt,
      updatedAt,
    };
    vi.mocked(prisma.chatbotSettings.upsert).mockResolvedValue(
      mockSaved as unknown as ChatbotSettings
    );

    const req = new NextRequest('http://localhost/api/chatbot/settings', {
      method: 'POST',
      body: JSON.stringify({ key: 'default', settings: { model: 'gpt-4' } }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.settings).toEqual({
      id: 'chatbot-settings-default',
      key: 'default',
      settings: { model: 'gpt-4' },
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
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

    await expect(POST(req, mockContext)).rejects.toThrow('Settings payload is required.');
  });
});
