import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import { getHandler, postHandler } from './handler';

const findOneMock = vi.fn();
const updateOneMock = vi.fn();
const collectionMock = {
  findOne: findOneMock,
  updateOne: updateOneMock,
};

describe('chatbot settings handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://example.test/chatbot';
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue(collectionMock),
    });
  });

  it('loads chatbot settings using the shared query DTO', async () => {
    findOneMock.mockResolvedValueOnce({
      _id: 'default',
      key: 'default',
      settings: { model: 'gpt-4o-mini' },
      createdAt: '2026-03-22T09:00:00.000Z',
      updatedAt: '2026-03-22T09:05:00.000Z',
    });

    const response = await getHandler(
      new NextRequest('http://localhost/api/chatbot/settings?key=default'),
      {
        query: {},
      } as Parameters<typeof getHandler>[1]
    );

    expect(findOneMock).toHaveBeenCalledWith({ key: 'default' });
    await expect(response.json()).resolves.toEqual({
      settings: {
        id: 'default',
        key: 'default',
        settings: { model: 'gpt-4o-mini' },
        createdAt: '2026-03-22T09:00:00.000Z',
        updatedAt: '2026-03-22T09:05:00.000Z',
      },
    });
  });

  it('saves chatbot settings using the shared request DTO', async () => {
    findOneMock.mockResolvedValueOnce({
      _id: 'default',
      id: 'default',
      key: 'default',
      settings: { model: 'gpt-4o-mini', toolsEnabled: true },
      createdAt: '2026-03-22T09:00:00.000Z',
      updatedAt: '2026-03-22T09:10:00.000Z',
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/chatbot/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          settings: {
            model: 'gpt-4o-mini',
            toolsEnabled: true,
          },
        }),
      }),
      {} as Parameters<typeof postHandler>[1]
    );

    expect(updateOneMock).toHaveBeenCalledWith(
      { key: 'default' },
      expect.objectContaining({
        $set: expect.objectContaining({
          key: 'default',
          settings: {
            model: 'gpt-4o-mini',
            toolsEnabled: true,
          },
        }),
      }),
      { upsert: true }
    );
    await expect(response.json()).resolves.toEqual({
      settings: {
        id: 'default',
        key: 'default',
        settings: { model: 'gpt-4o-mini', toolsEnabled: true },
        createdAt: '2026-03-22T09:00:00.000Z',
        updatedAt: '2026-03-22T09:10:00.000Z',
      },
    });
  });
});
