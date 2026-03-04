import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { logSystemEventMock } = vi.hoisted(() => ({
  logSystemEventMock: vi.fn(),
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

import { assertLegacyCompatRouteEnabled } from './server';

const originalCompatRoutesEnv = process.env['AI_PATHS_LEGACY_COMPAT_ROUTES_ENABLED'];

describe('ai-paths legacy-compat server guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (originalCompatRoutesEnv === undefined) {
      delete process.env['AI_PATHS_LEGACY_COMPAT_ROUTES_ENABLED'];
    } else {
      process.env['AI_PATHS_LEGACY_COMPAT_ROUTES_ENABLED'] = originalCompatRoutesEnv;
    }
  });

  afterAll(() => {
    if (originalCompatRoutesEnv === undefined) {
      delete process.env['AI_PATHS_LEGACY_COMPAT_ROUTES_ENABLED'];
    } else {
      process.env['AI_PATHS_LEGACY_COMPAT_ROUTES_ENABLED'] = originalCompatRoutesEnv;
    }
  });

  it('allows route execution when compatibility routes are enabled', () => {
    process.env['AI_PATHS_LEGACY_COMPAT_ROUTES_ENABLED'] = 'true';

    expect(() =>
      assertLegacyCompatRouteEnabled({
        route: '/api/countries',
        method: 'GET',
        source: 'api.compat.countries.GET',
      })
    ).not.toThrow();
    expect(logSystemEventMock).not.toHaveBeenCalled();
  });

  it('blocks legacy routes when compatibility routes are disabled', () => {
    process.env['AI_PATHS_LEGACY_COMPAT_ROUTES_ENABLED'] = 'false';

    expect(() =>
      assertLegacyCompatRouteEnabled({
        route: '/api/countries',
        method: 'GET',
        source: 'api.compat.countries.GET',
      })
    ).toThrow('Legacy compatibility route "GET /api/countries" is disabled.');
    expect(logSystemEventMock).toHaveBeenCalledTimes(1);
  });
});
