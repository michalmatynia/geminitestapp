import { NextResponse } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import {
  baseSettingQuerySchema,
  buildSettingQuerySchema,
  connectionSettingQuerySchema,
  resolveSettingRouteHandlers,
  type RouteHandlers,
} from './setting-router.helpers';

describe('base setting router helpers', () => {
  it('normalizes shared base setting query values', () => {
    expect(
      baseSettingQuerySchema.parse({
        connectionId: '  conn-3  ',
        inventoryId: '',
      })
    ).toEqual({
      connectionId: 'conn-3',
      inventoryId: undefined,
    });
  });

  it('builds connection-only query schemas for narrower setting routers', () => {
    expect(
      connectionSettingQuerySchema.parse({
        connectionId: '  conn-4  ',
      })
    ).toEqual({
      connectionId: 'conn-4',
    });

    expect(
      buildSettingQuerySchema(['inventoryId']).parse({
        inventoryId: '  inv-4  ',
      })
    ).toEqual({
      inventoryId: 'inv-4',
    });
  });

  it('returns the configured handlers for known settings', async () => {
    const getHandler = vi.fn(async () => NextResponse.json({ method: 'GET' }));
    const postHandler = vi.fn(async () => NextResponse.json({ method: 'POST' }));
    const handlersBySetting: Record<string, RouteHandlers> = {
      known: {
        GET: getHandler,
        POST: postHandler,
      },
    };

    const handlers = resolveSettingRouteHandlers('exports/base', handlersBySetting, 'known');
    const getResponse = await handlers.GET({} as never, {} as never);
    const postResponse = await handlers.POST({} as never, {} as never);

    expect(handlers.GET).toBe(getHandler);
    expect(handlers.POST).toBe(postHandler);
    await expect(getResponse.json()).resolves.toEqual({ method: 'GET' });
    await expect(postResponse.json()).resolves.toEqual({ method: 'POST' });
  });

  it('throws a not found error for unknown settings', () => {
    expect(() =>
      resolveSettingRouteHandlers('imports/base', {}, 'missing-setting')
    ).toThrow('Unknown imports/base setting: missing-setting');
  });
});
