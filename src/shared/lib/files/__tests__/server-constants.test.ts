import path from 'path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}));

const ORIGINAL_ENV = { ...process.env };

const resetEnv = () => {
  Object.keys(process.env).forEach((key) => {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  });
  Object.assign(process.env, ORIGINAL_ENV);
};

const loadServerConstants = async (overrides: Record<string, string | undefined>) => {
  resetEnv();
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
  vi.resetModules();
  const mod = await import('@/shared/lib/files/server-constants');
  const { logger } = await import('@/shared/utils/logger');
  return { mod, logger };
};

describe('server-constants uploadsRoot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetEnv();
  });

  it('uses UPLOADS_ROOT when provided and does not warn if it matches public/uploads', async () => {
    const publicUploads = path.resolve(process.cwd(), 'public', 'uploads');
    const { mod, logger } = await loadServerConstants({
      UPLOADS_ROOT: 'public/uploads',
      NODE_ENV: 'development',
      VITEST: 'false',
    });

    expect(mod.uploadsRoot).toBe(publicUploads);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns in dev when uploadsRoot is not public/uploads', async () => {
    const { mod, logger } = await loadServerConstants({
      UPLOADS_ROOT: '/tmp/custom-uploads',
      NODE_ENV: 'development',
      VITEST: 'false',
    });

    expect(mod.uploadsRoot).toBe(path.resolve('/tmp/custom-uploads'));
    expect(logger.warn).toHaveBeenCalledTimes(1);
    const warnMock = logger.warn as unknown as { mock: { calls: unknown[][] } };
    const message = warnMock.mock.calls[0]?.[0] ?? '';
    expect(String(message)).toContain('uploadsRoot points to');
  });

  it('skips warning in test mode even when uploadsRoot differs', async () => {
    const { logger } = await loadServerConstants({
      UPLOADS_ROOT: '/tmp/custom-uploads',
      NODE_ENV: 'test',
      VITEST: 'true',
    });

    expect(logger.warn).not.toHaveBeenCalled();
  });
});
