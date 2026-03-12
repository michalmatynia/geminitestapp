import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KANGUR_AI_TUTOR_APP_SETTINGS_KEY } from '@/shared/contracts/kangur-ai-tutor';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import { GET_handler, clearLiteSettingsServerCache } from './handler';

const createRequestContext = (query: Record<string, unknown> = {}): ApiHandlerContext =>
  ({
    requestId: 'request-settings-lite-1',
    traceId: 'trace-settings-lite-1',
    correlationId: 'corr-settings-lite-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query,
  }) as ApiHandlerContext;

describe('settings lite handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLiteSettingsServerCache();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
  });

  it('returns lite settings without requiring admin access', async () => {
    const toArrayMock = vi.fn().mockResolvedValue([
      {
        _id: KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
        key: KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
        value: JSON.stringify({ agentPersonaId: 'persona-1' }),
      },
    ]);
    const findMock = vi.fn().mockReturnValue({ toArray: toArrayMock });
    const collectionMock = vi.fn().mockReturnValue({ find: findMock });
    getMongoDbMock.mockResolvedValue({ collection: collectionMock });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/settings/lite'),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    expect(collectionMock).toHaveBeenCalledWith('settings');
    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([
          expect.objectContaining({
            key: expect.objectContaining({
              $in: expect.arrayContaining([KANGUR_AI_TUTOR_APP_SETTINGS_KEY]),
            }),
          }),
        ]),
      }),
      expect.any(Object)
    );
    await expect(response.json()).resolves.toEqual([
      {
        key: KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
        value: JSON.stringify({ agentPersonaId: 'persona-1' }),
      },
    ]);
  });
});
