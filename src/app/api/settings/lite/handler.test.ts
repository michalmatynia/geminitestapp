import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KANGUR_AI_TUTOR_APP_SETTINGS_KEY } from '@/shared/contracts/kangur-ai-tutor';
import {
  KANGUR_LAUNCH_ROUTE_SETTINGS_KEY,
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
} from '@/shared/contracts/kangur';
import { OBSERVABILITY_LOGGING_KEYS } from '@/shared/contracts/observability';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

vi.mock('server-only', () => ({}));

const { getMongoDbMock, getMongoClientMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  getMongoClientMock: vi.fn(),
}));
const captureExceptionMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
  getMongoClient: getMongoClientMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockReturnValue(new Headers()),
}));

vi.mock('@/shared/lib/auth/settings-manage-access', () => ({
  assertSettingsManageAccess: vi.fn(async () => undefined),
}));

import {
  __testOnly,
  GET_handler,
  clearLiteSettingsServerCache,
  prewarmLiteSettingsServerCache,
} from './handler';

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
    const updateOneMock = vi.fn().mockResolvedValue({ acknowledged: true });
    const findKangurMock = vi.fn().mockReturnValue({ toArray: toArrayKangurMock });
    const findSettingsMock = vi.fn().mockReturnValue({ toArray: toArraySettingsMock });
    const collectionMock = vi.fn((name: string) => {
      if (name === 'kangur_settings') {
        return { find: findKangurMock, createIndex: createIndexMock, updateOne: updateOneMock };
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
        {
          key: KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
          value: 'default',
        },
      ])
    );
  });

  it('prewarms the lite settings cache so the next request can serve from memory', async () => {
    const toArrayKangurMock = vi.fn().mockResolvedValue([
      {
        _id: KANGUR_LAUNCH_ROUTE_SETTINGS_KEY,
        key: KANGUR_LAUNCH_ROUTE_SETTINGS_KEY,
        value: JSON.stringify({ route: 'dedicated_app' }),
      },
    ]);
    const toArraySettingsMock = vi.fn().mockResolvedValue([]);
    const createIndexMock = vi.fn().mockResolvedValue(undefined);
    const updateOneMock = vi.fn().mockResolvedValue({ acknowledged: true });
    const findKangurMock = vi.fn().mockReturnValue({ toArray: toArrayKangurMock });
    const findSettingsMock = vi.fn().mockReturnValue({ toArray: toArraySettingsMock });
    const collectionMock = vi.fn((name: string) => {
      if (name === 'kangur_settings') {
        return { find: findKangurMock, createIndex: createIndexMock, updateOne: updateOneMock };
      }
      return { find: findSettingsMock };
    });
    getMongoDbMock.mockResolvedValue({ collection: collectionMock });

    await prewarmLiteSettingsServerCache();

    const dbCallsAfterPrewarm = getMongoDbMock.mock.calls.length;
    expect(dbCallsAfterPrewarm).toBeGreaterThan(0);

    const response = await GET_handler(
      new NextRequest('http://localhost/api/settings/lite'),
      createRequestContext()
    );

    expect(response.headers.get('X-Cache')).toBe('hit');
    expect(getMongoDbMock).toHaveBeenCalledTimes(dbCallsAfterPrewarm);
    await expect(response.json()).resolves.toEqual(
      expect.arrayContaining([
        {
          key: KANGUR_LAUNCH_ROUTE_SETTINGS_KEY,
          value: JSON.stringify({ route: 'dedicated_app' }),
        },
      ])
    );
  });

  it('returns observability logging control settings from the lite endpoint', async () => {
    const toArrayKangurMock = vi.fn().mockResolvedValue([]);
    const toArraySettingsMock = vi.fn().mockResolvedValue([
      {
        _id: OBSERVABILITY_LOGGING_KEYS.infoEnabled,
        key: OBSERVABILITY_LOGGING_KEYS.infoEnabled,
        value: 'false',
      },
      {
        _id: OBSERVABILITY_LOGGING_KEYS.activityEnabled,
        key: OBSERVABILITY_LOGGING_KEYS.activityEnabled,
        value: 'true',
      },
      {
        _id: OBSERVABILITY_LOGGING_KEYS.errorEnabled,
        key: OBSERVABILITY_LOGGING_KEYS.errorEnabled,
        value: 'false',
      },
    ]);
    const createIndexMock = vi.fn().mockResolvedValue(undefined);
    const updateOneMock = vi.fn().mockResolvedValue({ acknowledged: true });
    const findKangurMock = vi.fn().mockReturnValue({ toArray: toArrayKangurMock });
    const findSettingsMock = vi.fn().mockReturnValue({ toArray: toArraySettingsMock });
    const collectionMock = vi.fn((name: string) => {
      if (name === 'kangur_settings') {
        return { find: findKangurMock, createIndex: createIndexMock, updateOne: updateOneMock };
      }
      return { find: findSettingsMock };
    });
    getMongoDbMock.mockResolvedValue({ collection: collectionMock });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/settings/lite'),
      createRequestContext()
    );

    await expect(response.json()).resolves.toEqual(
      expect.arrayContaining([
        {
          key: OBSERVABILITY_LOGGING_KEYS.infoEnabled,
          value: 'false',
        },
        {
          key: OBSERVABILITY_LOGGING_KEYS.activityEnabled,
          value: 'true',
        },
        {
          key: OBSERVABILITY_LOGGING_KEYS.errorEnabled,
          value: 'false',
        },
      ])
    );
  });

  it('returns a degraded empty response for transient mongo connectivity failures', async () => {
    const error = new Error('Socket \'secureConnect\' timed out after 11640ms (connectTimeoutMS: 1000)');
    error.name = 'MongoServerSelectionError';
    getMongoDbMock.mockRejectedValue(error);

    const response = await GET_handler(
      new NextRequest('http://localhost/api/settings/lite'),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Cache')).toBe('degraded');
    expect(response.headers.get('X-Settings-Degraded')).toBe('transient-mongo-error');
    await expect(response.json()).resolves.toEqual([]);
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('times out hung lite settings fetches', async () => {
    vi.useFakeTimers();

    try {
      const handled = __testOnly
        .withLiteSettingsTimeout(new Promise(() => undefined))
        .catch((error: unknown) => error);

      await vi.advanceTimersByTimeAsync(2_501);

      await expect(handled).resolves.toMatchObject({
        message: 'Lite settings fetch timed out after 2500ms.',
        name: 'LiteSettingsFetchTimeoutError',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('suppresses transient mongo connectivity failures during SSR prewarm', async () => {
    const error = new Error('Socket \'secureConnect\' timed out after 11640ms (connectTimeoutMS: 1000)');
    error.name = 'MongoServerSelectionError';
    getMongoDbMock.mockRejectedValue(error);

    await expect(prewarmLiteSettingsServerCache()).resolves.toBeUndefined();
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });
});
