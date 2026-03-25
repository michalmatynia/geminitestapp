/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const toArray = vi.fn();
  const limit = vi.fn(() => ({ toArray }));
  const sort = vi.fn(() => ({ limit }));
  const find = vi.fn(() => ({ sort }));
  const collection = vi.fn(() => ({ find }));
  const getMongoDb = vi.fn(async () => ({ collection }));

  return {
    collection,
    find,
    getMongoDb,
    limit,
    sort,
    toArray,
  };
});

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

import {
  escapeRegex,
  listAlertEvidenceLogs,
  toMongoWhere,
  toSystemLogRecord,
} from './repository';

describe('system-log-alerts repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T17:00:00.000Z'));
  });

  it('escapes regex fragments and builds mongo filters from alert evidence queries', () => {
    expect(escapeRegex('api(service)+v2?')).toBe('api\\(service\\)\\+v2\\?');

    const from = new Date('2026-03-25T16:00:00.000Z');
    const to = new Date('2026-03-25T17:00:00.000Z');

    expect(
      toMongoWhere({
        level: 'error',
        excludeAlertEvents: true,
        sourceContains: 'api(service)+v2?',
        service: 'catalog-service',
        pathPrefix: '/api/products(v2)',
        statusCodeMin: 500,
        statusCodeMax: 599,
        from,
        to,
      })
    ).toEqual({
      level: 'error',
      'context.alertType': { $exists: false },
      source: { $regex: 'api\\(service\\)\\+v2\\?', $options: 'i' },
      $or: [
        { service: { $regex: '^catalog-service$', $options: 'i' } },
        { 'context.service': 'catalog-service' },
      ],
      path: { $regex: '^/api/products\\(v2\\)', $options: 'i' },
      statusCode: { $gte: 500, $lte: 599 },
      createdAt: { $gte: from, $lte: to },
    });
  });

  it('normalizes mongo system-log documents into DTO records', () => {
    const record = toSystemLogRecord({
      _id: 'mongo-1',
      level: 'debug' as never,
      message: 'Unhandled error',
      source: 'edge',
      service: '   ',
      context: {
        service: 'catalog',
        traceId: 'trace-1',
        correlationId: 'corr-1',
        spanId: 'span-1',
        parentSpanId: 'parent-1',
      },
      traceId: ' ',
      correlationId: '',
      spanId: undefined,
      parentSpanId: null,
      createdAt: 'not-a-date',
    });

    expect(record).toEqual({
      id: 'mongo-1',
      level: 'error',
      message: 'Unhandled error',
      category: null,
      source: 'edge',
      service: 'catalog',
      context: {
        service: 'catalog',
        traceId: 'trace-1',
        correlationId: 'corr-1',
        spanId: 'span-1',
        parentSpanId: 'parent-1',
      },
      stack: null,
      path: null,
      method: null,
      statusCode: null,
      requestId: null,
      traceId: 'trace-1',
      correlationId: 'corr-1',
      spanId: 'span-1',
      parentSpanId: 'parent-1',
      userId: null,
      createdAt: '2026-03-25T17:00:00.000Z',
      updatedAt: null,
    });
  });

  it('loads and maps alert evidence logs with a minimum limit of one', async () => {
    mocks.toArray.mockResolvedValueOnce([
      {
        _id: 'mongo-2',
        level: 'warn',
        message: 'Slow request',
        source: 'api(service)',
        context: {
          service: 'catalog',
        },
        createdAt: '2026-03-25T16:45:00.000Z',
      },
    ]);

    const result = await listAlertEvidenceLogs(
      {
        sourceContains: 'api(service)',
        service: 'catalog',
        excludeAlertEvents: true,
        limit: 0,
      },
      5
    );

    expect(mocks.getMongoDb).toHaveBeenCalledTimes(1);
    expect(mocks.collection).toHaveBeenCalledWith('system_logs');
    expect(mocks.find).toHaveBeenCalledWith({
      'context.alertType': { $exists: false },
      source: { $regex: 'api\\(service\\)', $options: 'i' },
      $or: [
        { service: { $regex: '^catalog$', $options: 'i' } },
        { 'context.service': 'catalog' },
      ],
    });
    expect(mocks.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(mocks.limit).toHaveBeenCalledWith(1);
    expect(result).toEqual([
      expect.objectContaining({
        id: 'mongo-2',
        level: 'warn',
        source: 'api(service)',
        service: 'catalog',
        createdAt: '2026-03-25T16:45:00.000Z',
      }),
    ]);
  });
});
