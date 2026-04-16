import { describe, expect, it } from 'vitest';

import {
  databaseEngineMongoSourceStateSchema,
  databasePreviewRequestSchema,
  databaseTypeSchema,
} from '@/shared/contracts/database';

describe('database contract runtime', () => {
  it('parses valid database types', () => {
    expect(databaseTypeSchema.parse('mongodb')).toBe('mongodb');
  });

  it('rejects invalid database type', () => {
    expect(() => databaseTypeSchema.parse('auto')).toThrow();
  });

  it('parses valid preview request and rejects invalid request type', () => {
    const parsed = databasePreviewRequestSchema.parse({
      type: 'mongodb',
      mode: 'full',
    });
    expect(parsed.type).toBe('mongodb');
    expect(parsed.mode).toBe('full');

    expect(() =>
      databasePreviewRequestSchema.parse({
        type: 'auto',
        mode: 'full',
      })
    ).toThrow();
  });

  it('parses mongo source state runtime payloads', () => {
    const parsed = databaseEngineMongoSourceStateSchema.parse({
      timestamp: '2026-04-09T06:00:00.000Z',
      activeSource: 'local',
      defaultSource: 'local',
      lastSync: {
        direction: 'cloud_to_local',
        source: 'cloud',
        target: 'local',
        syncedAt: '2026-04-09T05:50:00.000Z',
        archivePath: '/tmp/dump.archive',
        logPath: '/tmp/restore-log.json',
      },
      local: {
        source: 'local',
        configured: true,
        dbName: 'app',
        maskedUri: 'mongodb://127.0.0.1:27017/app',
        isActive: true,
        usesLegacyEnv: false,
        reachable: true,
        healthError: null,
      },
      cloud: {
        source: 'cloud',
        configured: true,
        dbName: 'app',
        maskedUri: 'mongodb+srv://***',
        isActive: false,
        usesLegacyEnv: false,
        reachable: false,
        healthError: 'timed out',
      },
      canSwitch: true,
      canSync: true,
      syncIssue: null,
    });

    expect(parsed.lastSync?.direction).toBe('cloud_to_local');
    expect(parsed.local.isActive).toBe(true);
  });
});
