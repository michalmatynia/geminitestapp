import { describe, expect, it } from 'vitest';

import {
  parseDatabaseEngineBackupScheduleSetting,
  parseDatabaseEngineCollectionRouteMapSetting,
  parseDatabaseEngineOperationControlsSetting,
  parseDatabaseEnginePolicySetting,
  parseDatabaseEngineServiceRouteMapSetting,
} from '../database-engine-settings-parsing';
import {
  DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE,
  DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS,
  DEFAULT_DATABASE_ENGINE_POLICY,
} from '@/shared/lib/db/database-engine-constants';

describe('database engine settings parsing', () => {
  it('returns defaults for empty payloads', () => {
    expect(parseDatabaseEnginePolicySetting(null)).toEqual(DEFAULT_DATABASE_ENGINE_POLICY);
    expect(parseDatabaseEngineOperationControlsSetting('')).toEqual(
      DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS
    );
    expect(parseDatabaseEngineBackupScheduleSetting(undefined)).toEqual(
      DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE
    );
    expect(parseDatabaseEngineServiceRouteMapSetting(null)).toEqual({});
    expect(parseDatabaseEngineCollectionRouteMapSetting(null)).toEqual({});
  });

  it('parses canonical policy payloads', () => {
    expect(
      parseDatabaseEnginePolicySetting(
        JSON.stringify({
          requireExplicitServiceRouting: true,
          requireExplicitCollectionRouting: true,
          allowAutomaticFallback: false,
          allowAutomaticBackfill: false,
          allowAutomaticMigrations: false,
          strictProviderAvailability: true,
        })
      )
    ).toEqual({
      requireExplicitServiceRouting: true,
      requireExplicitCollectionRouting: true,
      allowAutomaticFallback: false,
      allowAutomaticBackfill: false,
      allowAutomaticMigrations: false,
      strictProviderAvailability: true,
    });
  });

  it('rejects malformed policy payloads', () => {
    expect(() => parseDatabaseEnginePolicySetting('{"broken":')).toThrowError(
      /invalid database engine policy settings payload/i
    );
    expect(() => parseDatabaseEnginePolicySetting(JSON.stringify({ legacy: true }))).toThrowError(
      /invalid database engine policy settings payload/i
    );
  });

  it('rejects invalid service and collection route maps', () => {
    expect(() =>
      parseDatabaseEngineServiceRouteMapSetting(
        JSON.stringify({
          app: 'mongodb',
          legacy: 'prisma',
        })
      )
    ).toThrowError(/invalid database engine service route map payload/i);

    expect(() =>
      parseDatabaseEngineCollectionRouteMapSetting(
        JSON.stringify({
          products: 'legacy',
        })
      )
    ).toThrowError(/invalid database engine collection route map payload/i);
  });

  it('parses canonical backup schedule payloads', () => {
    expect(
      parseDatabaseEngineBackupScheduleSetting(
        JSON.stringify({
          schedulerEnabled: true,
          repeatTickEnabled: false,
          lastCheckedAt: '2026-03-03T12:00:00.000Z',
          mongodb: {
            enabled: true,
            cadence: 'daily',
            intervalDays: 3,
            weekday: 1,
            timeUtc: '02:00',
            lastQueuedAt: null,
            lastRunAt: null,
            lastStatus: 'idle',
            lastJobId: null,
            lastError: null,
            nextDueAt: null,
          },
          postgresql: {
            enabled: false,
            cadence: 'weekly',
            intervalDays: 7,
            weekday: 2,
            timeUtc: '03:30',
            lastQueuedAt: null,
            lastRunAt: null,
            lastStatus: 'success',
            lastJobId: null,
            lastError: null,
            nextDueAt: null,
          },
        })
      )
    ).toMatchObject({
      schedulerEnabled: true,
      repeatTickEnabled: false,
      mongodb: {
        enabled: true,
        timeUtc: '02:00',
      },
      postgresql: {
        enabled: false,
        timeUtc: '03:30',
      },
    });
  });

  it('rejects invalid backup schedule fields and operation controls', () => {
    expect(() =>
      parseDatabaseEngineBackupScheduleSetting(
        JSON.stringify({
          ...DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE,
          mongodb: {
            ...DEFAULT_DATABASE_ENGINE_BACKUP_SCHEDULE.mongodb,
            timeUtc: '25:00',
          },
        })
      )
    ).toThrowError(/invalid database engine backup schedule settings payload/i);

    expect(() =>
      parseDatabaseEngineOperationControlsSetting(
        JSON.stringify({
          ...DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS,
          allowManualFullSync: 'yes',
        })
      )
    ).toThrowError(/invalid database engine operation controls settings payload/i);
  });
});
