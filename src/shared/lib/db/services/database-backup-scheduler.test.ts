/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getDatabaseEngineBackupScheduleMock,
  invalidateDatabaseEnginePolicyCacheMock,
  getMongoDbMock,
  enqueueProductAiJobMock,
  captureExceptionMock,
  logWarningMock,
} = vi.hoisted(() => ({
  getDatabaseEngineBackupScheduleMock: vi.fn(),
  invalidateDatabaseEnginePolicyCacheMock: vi.fn(),
  getMongoDbMock: vi.fn(),
  enqueueProductAiJobMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/db/database-engine-policy', () => ({
  getDatabaseEngineBackupSchedule: getDatabaseEngineBackupScheduleMock,
  invalidateDatabaseEnginePolicyCache: invalidateDatabaseEnginePolicyCacheMock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/lib/products/services/productAiService', () => ({
  enqueueProductAiJob: enqueueProductAiJobMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logWarning: logWarningMock,
  },
}));

import {
  evaluateBackupTargetSchedule,
  getDatabaseBackupSchedulerStatus,
} from './database-backup-scheduler';

describe('database-backup-scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps disabled targets out of the due-now state', () => {
    const evaluation = evaluateBackupTargetSchedule(
      {
        enabled: false,
        cadence: 'daily',
        intervalDays: 3,
        weekday: 1,
        timeUtc: '02:00',
        lastQueuedAt: null,
        lastRunAt: null,
        lastStatus: 'idle',
        lastJobId: null,
        lastError: null,
        nextDueAt: '2026-03-22T02:00:00.000Z',
      },
      new Date('2026-03-22T10:00:00.000Z')
    );

    expect(evaluation).toEqual({
      dueNow: false,
      nextDueAt: '2026-03-22T02:00:00.000Z',
    });
  });

  it('computes first and subsequent due times for active schedules', () => {
    const firstDue = evaluateBackupTargetSchedule(
      {
        enabled: true,
        cadence: 'weekly',
        intervalDays: 3,
        weekday: 6,
        timeUtc: '12:30',
        lastQueuedAt: null,
        lastRunAt: null,
        lastStatus: 'idle',
        lastJobId: null,
        lastError: null,
        nextDueAt: null,
      },
      new Date('2026-03-21T10:00:00.000Z')
    );
    const repeatDue = evaluateBackupTargetSchedule(
      {
        enabled: true,
        cadence: 'every_n_days',
        intervalDays: 2,
        weekday: 1,
        timeUtc: '02:00',
        lastQueuedAt: '2026-03-19T02:00:00.000Z',
        lastRunAt: null,
        lastStatus: 'success',
        lastJobId: 'job-1',
        lastError: null,
        nextDueAt: null,
      },
      new Date('2026-03-21T02:01:00.000Z')
    );

    expect(firstDue).toEqual({
      dueNow: false,
      nextDueAt: '2026-03-21T12:30:00.000Z',
    });
    expect(repeatDue).toEqual({
      dueNow: true,
      nextDueAt: '2026-03-21T02:00:00.000Z',
    });
  });

  it('projects scheduler status with due-now metadata for the configured target', async () => {
    getDatabaseEngineBackupScheduleMock.mockResolvedValue({
      schedulerEnabled: true,
      repeatTickEnabled: false,
      lastCheckedAt: '2026-03-21T09:00:00.000Z',
      mongodb: {
        enabled: true,
        cadence: 'daily',
        intervalDays: 1,
        weekday: 1,
        timeUtc: '08:00',
        lastQueuedAt: '2026-03-20T08:00:00.000Z',
        lastRunAt: '2026-03-20T08:00:00.000Z',
        lastStatus: 'success',
        lastJobId: 'job-1',
        lastError: null,
        nextDueAt: null,
      },
    });

    const status = await getDatabaseBackupSchedulerStatus(
      new Date('2026-03-21T09:30:00.000Z')
    );

    expect(status).toMatchObject({
      timestamp: '2026-03-21T09:30:00.000Z',
      schedulerEnabled: true,
      repeatTickEnabled: false,
      lastCheckedAt: '2026-03-21T09:00:00.000Z',
      targets: {
        mongodb: expect.objectContaining({
          dueNow: true,
          nextDueAt: '2026-03-21T08:00:00.000Z',
          lastStatus: 'success',
        }),
      },
    });
  });
});
