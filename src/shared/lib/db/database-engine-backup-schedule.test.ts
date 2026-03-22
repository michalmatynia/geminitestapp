import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logClientCatchMock } = vi.hoisted(() => ({
  logClientCatchMock: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: logClientCatchMock,
}));

import { DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE } from './database-engine-constants';
import {
  DATABASE_ENGINE_BACKUP_WEEKDAYS,
  isValidDatabaseEngineBackupTimeUtc,
  normalizeDatabaseEngineBackupSchedule,
} from './database-engine-backup-schedule';

describe('database-engine-backup-schedule', () => {
  beforeEach(() => {
    logClientCatchMock.mockReset();
  });

  it('validates canonical UTC backup times', () => {
    expect(isValidDatabaseEngineBackupTimeUtc('00:00')).toBe(true);
    expect(isValidDatabaseEngineBackupTimeUtc('23:59')).toBe(true);
    expect(isValidDatabaseEngineBackupTimeUtc('24:00')).toBe(false);
    expect(isValidDatabaseEngineBackupTimeUtc('7:30')).toBe(false);
  });

  it('normalizes schedule payloads from JSON input', () => {
    const schedule = normalizeDatabaseEngineBackupSchedule(
      JSON.stringify({
        schedulerEnabled: true,
        repeatTickEnabled: true,
        lastCheckedAt: '2024-03-20T10:00:00Z',
        mongodb: {
          enabled: true,
          cadence: 'weekly',
          intervalDays: 999,
          weekday: -10,
          timeUtc: '04:30',
          lastQueuedAt: '2024-03-20T10:10:00Z',
          lastRunAt: 'invalid',
          lastStatus: 'failed',
          lastJobId: '  job-1  ',
          lastError: ' backup failed ',
          nextDueAt: '2024-03-21T04:30:00Z',
        },
      })
    );

    expect(schedule).toEqual({
      schedulerEnabled: true,
      repeatTickEnabled: true,
      lastCheckedAt: '2024-03-20T10:00:00.000Z',
      mongodb: {
        enabled: true,
        cadence: 'weekly',
        intervalDays: 365,
        weekday: 0,
        timeUtc: '04:30',
        lastQueuedAt: '2024-03-20T10:10:00.000Z',
        lastRunAt: null,
        lastStatus: 'failed',
        lastJobId: 'job-1',
        lastError: 'backup failed',
        nextDueAt: '2024-03-21T04:30:00.000Z',
      },
    });
  });

  it('falls back to defaults on invalid raw payloads and logs parse failures', () => {
    expect(normalizeDatabaseEngineBackupSchedule('{')).toEqual(
      DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE
    );
    expect(logClientCatchMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'db.database-engine-backup-schedule',
        action: 'parseRawObject',
      })
    );
  });

  it('exports weekdays in Sunday-first order', () => {
    expect(DATABASE_ENGINE_BACKUP_WEEKDAYS).toEqual([
      { value: 0, label: 'Sunday' },
      { value: 1, label: 'Monday' },
      { value: 2, label: 'Tuesday' },
      { value: 3, label: 'Wednesday' },
      { value: 4, label: 'Thursday' },
      { value: 5, label: 'Friday' },
      { value: 6, label: 'Saturday' },
    ]);
  });
});
