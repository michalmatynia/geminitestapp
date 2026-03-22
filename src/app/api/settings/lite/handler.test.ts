import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KANGUR_AI_TUTOR_APP_SETTINGS_KEY } from '@/shared/contracts/kangur-ai-tutor';
import { KANGUR_LAUNCH_ROUTE_SETTINGS_KEY } from '@/shared/contracts/kangur';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const { getMongoDbMock, getMongoClientMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  getMongoClientMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
  getMongoClient: getMongoClientMock,
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockReturnValue(new Headers()),
}));

vi.mock('@/shared/lib/auth/settings-manage-access', () => ({
  assertSettingsManageAccess: vi.fn(async () => undefined),
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
    const toArrayKangurMock = vi.fn().mockResolvedValue([
      {
        _id: KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
        key: KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
        value: JSON.stringify({ agentPersonaId: 'persona-1' }),
      },
      {
        _id: KANGUR_LAUNCH_ROUTE_SETTINGS_KEY,
        key: KANGUR_LAUNCH_ROUTE_SETTINGS_KEY,
        value: JSON.stringify({ route: 'dedicated_app' }),
      },
    ]);
    const toArraySettingsMock = vi.fn().mockResolvedValue([]);
    const createIndexMock = vi.fn().mockResolvedValue(undefined);
    const findKangurMock = vi.fn().mockReturnValue({ toArray: toArrayKangurMock });
    const findSettingsMock = vi.fn().mockReturnValue({ toArray: toArraySettingsMock });
    const collectionMock = vi.fn((name: string) => {
      if (name === 'kangur_settings') {
        return { find: findKangurMock, createIndex: createIndexMock };
      }
      return { find: findSettingsMock };
    });
    getMongoDbMock.mockResolvedValue({ collection: collectionMock });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/settings/lite'),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    expect(collectionMock).toHaveBeenCalledWith('settings');
    expect(collectionMock).toHaveBeenCalledWith('kangur_settings');
    expect(findKangurMock).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([
          expect.objectContaining({
            key: expect.objectContaining({
              $in: expect.arrayContaining([
                KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
                KANGUR_LAUNCH_ROUTE_SETTINGS_KEY,
              ]),
            }),
          }),
        ]),
      }),
      expect.any(Object)
    );
    await expect(response.json()).resolves.toEqual(
      expect.arrayContaining([
        {
          key: KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
          value: JSON.stringify({ agentPersonaId: 'persona-1' }),
        },
        {
          key: KANGUR_LAUNCH_ROUTE_SETTINGS_KEY,
          value: JSON.stringify({ route: 'dedicated_app' }),
        },
      ])
    );
  });
});
