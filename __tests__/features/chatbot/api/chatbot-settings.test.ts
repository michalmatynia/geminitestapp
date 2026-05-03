import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { getHandler as GET, postHandler as POST } from '@/app/api/chatbot/settings/handler';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

const {
  collectionFindOneMock,
  collectionUpdateOneMock,
  collectionMock,
  mongoCollectionAccessorMock,
  parseJsonBodyMock,
} = vi.hoisted(() => ({
  collectionFindOneMock: vi.fn(),
  collectionUpdateOneMock: vi.fn(),
  collectionMock: {
    findOne: vi.fn(),
    updateOne: vi.fn(),
  },
  mongoCollectionAccessorMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: (...args: unknown[]) => parseJsonBodyMock(...args),
}));

const mockContext = {
  requestId: 'chatbot-settings-test',
  startTime: Date.now(),
  getElapsedMs: () => 0,
} as ApiHandlerContext;

const originalMongoUri = process.env['MONGODB_URI'];

describe('Chatbot Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    collectionMock.findOne.mockImplementation((...args: unknown[]) => collectionFindOneMock(...args));
    collectionMock.updateOne.mockImplementation((...args: unknown[]) => collectionUpdateOneMock(...args));
    mongoCollectionAccessorMock.mockReturnValue(collectionMock);
    vi.mocked(getMongoDb).mockResolvedValue({
      collection: mongoCollectionAccessorMock,
    } as Awaited<ReturnType<typeof getMongoDb>>);
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
    if (originalMongoUri === undefined) {
      delete process.env['MONGODB_URI'];
      return;
    }
    process.env['MONGODB_URI'] = originalMongoUri;
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
    collectionFindOneMock.mockResolvedValue(mockSettings);

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
    expect(mongoCollectionAccessorMock).toHaveBeenCalledWith('chatbot_settings');
    expect(collectionFindOneMock).toHaveBeenCalledWith({ key: 'default' });
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
    collectionUpdateOneMock.mockResolvedValue({
      acknowledged: true,
      matchedCount: 0,
      modifiedCount: 0,
      upsertedCount: 1,
      upsertedId: 'default',
    });
    collectionFindOneMock.mockResolvedValue(mockSaved);

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
    expect(mongoCollectionAccessorMock).toHaveBeenCalledWith('chatbot_settings');
    expect(collectionUpdateOneMock).toHaveBeenCalledWith(
      { key: 'default' },
      expect.objectContaining({
        $set: expect.objectContaining({
          id: 'default',
          key: 'default',
          settings: { model: 'gpt-4' },
        }),
        $setOnInsert: expect.objectContaining({
          _id: 'default',
        }),
      }),
      { upsert: true }
    );
    expect(collectionFindOneMock).toHaveBeenCalledWith({ key: 'default' });
  });

  it('POST: returns 400 if settings missing', async () => {
    const req = new NextRequest('http://localhost/api/chatbot/settings', {
      method: 'POST',
      body: JSON.stringify({ key: 'default' }),
    });

    await expect(POST(req, mockContext)).rejects.toThrow('Settings payload is required.');
  });
});
