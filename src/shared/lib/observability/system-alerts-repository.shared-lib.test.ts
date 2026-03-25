import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSystemAlerts } from '@/shared/lib/observability/system-alerts-repository';

const getMongoDbMock = vi.hoisted(() => vi.fn());
const captureExceptionMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

describe('system-alerts-repository shared-lib coverage', () => {
  beforeEach(() => {
    getMongoDbMock.mockReset();
    captureExceptionMock.mockReset();
    delete process.env['MONGODB_URI'];
  });

  it('returns an empty array when mongodb is not configured', async () => {
    await expect(getSystemAlerts()).resolves.toEqual([]);
    expect(getMongoDbMock).not.toHaveBeenCalled();
  });

  it('parses persisted alerts from the settings collection', async () => {
    process.env['MONGODB_URI'] = 'mongodb://example.test/db';
    const findOne = vi.fn().mockResolvedValue({
      value: JSON.stringify([
        {
          id: 'alert-1',
          name: 'High error rate',
          condition: { threshold: 5 },
          severity: 'critical',
          enabled: true,
          createdAt: '2026-03-25T10:00:00.000Z',
          updatedAt: '2026-03-25T10:00:00.000Z',
        },
      ]),
    });
    const collection = vi.fn().mockReturnValue({ findOne });
    getMongoDbMock.mockResolvedValue({ collection });

    await expect(getSystemAlerts()).resolves.toEqual([
      {
        id: 'alert-1',
        name: 'High error rate',
        condition: { threshold: 5 },
        severity: 'critical',
        enabled: true,
        createdAt: '2026-03-25T10:00:00.000Z',
        updatedAt: '2026-03-25T10:00:00.000Z',
      },
    ]);
  });

  it('returns an empty array and captures malformed payload failures', async () => {
    process.env['MONGODB_URI'] = 'mongodb://example.test/db';
    const findOne = vi.fn().mockResolvedValue({ value: '{' });
    const collection = vi.fn().mockReturnValue({ findOne });
    getMongoDbMock.mockResolvedValue({ collection });

    await expect(getSystemAlerts()).resolves.toEqual([]);
    expect(captureExceptionMock).toHaveBeenCalledWith(expect.any(Error));
  });
});
