import { describe, expect, it } from 'vitest';

import type {
  DatabaseEngineMongoLastSync,
  DatabaseEngineMongoSyncVerification,
} from '@/shared/contracts/database';

import { buildMongoApplicationTransferSummaries } from './DatabaseEngineMongoSourceCards';

const buildVerification = (
  overrides: Partial<DatabaseEngineMongoSyncVerification> = {}
): DatabaseEngineMongoSyncVerification => ({
  status: 'passed',
  verifiedAt: '2026-05-08T10:00:00.000Z',
  source: 'cloud',
  target: 'local',
  sourceDbName: 'app_cloud',
  targetDbName: 'app_local',
  sourceCollections: 2,
  targetCollections: 2,
  collectionsCompared: 2,
  mismatches: [],
  collections: [],
  ...overrides,
});

describe('buildMongoApplicationTransferSummaries', () => {
  it('maps legacy top-level sync metadata to the GeminiTest application', () => {
    const legacyLastSync = {
      direction: 'cloud_to_local',
      source: 'cloud',
      target: 'local',
      syncedAt: '2026-05-08T10:00:00.000Z',
      preSyncBackups: [
        {
          role: 'source',
          source: 'cloud',
          backupName: 'cloud-source-pre-sync.archive',
          backupPath: '/tmp/backups/cloud-source-pre-sync.archive',
          logPath: '/tmp/backups/cloud-source-pre-sync.archive.log',
          createdAt: '2026-05-08T09:59:00.000Z',
          warning: null,
        },
        {
          role: 'target',
          source: 'local',
          backupName: 'local-target-pre-sync.archive',
          backupPath: '/tmp/backups/local-target-pre-sync.archive',
          logPath: '/tmp/backups/local-target-pre-sync.archive.log',
          createdAt: '2026-05-08T09:59:30.000Z',
          warning: null,
        },
      ],
      archivePath: '/tmp/mongo-sync.archive',
      logPath: '/tmp/mongo-sync.log',
      verification: buildVerification(),
    } as unknown as DatabaseEngineMongoLastSync;

    const summaries = buildMongoApplicationTransferSummaries(legacyLastSync);

    expect(summaries).toHaveLength(4);
    expect(summaries.find((summary) => summary.application === 'geminitestapp')).toMatchObject({
      backupCount: 2,
      sourceBackup: expect.objectContaining({ backupName: 'cloud-source-pre-sync.archive' }),
      targetBackup: expect.objectContaining({ backupName: 'local-target-pre-sync.archive' }),
      transfer: expect.objectContaining({
        application: 'geminitestapp',
        sourceDbName: 'app_cloud',
        targetDbName: 'app_local',
        archivePath: '/tmp/mongo-sync.archive',
        logPath: '/tmp/mongo-sync.log',
      }),
    });
    expect(summaries.find((summary) => summary.application === 'cms-builder')).toMatchObject({
      backupCount: 0,
      transfer: null,
    });
  });

  it('groups managed application transfers and backups by application', () => {
    const lastSync: DatabaseEngineMongoLastSync = {
      direction: 'local_to_cloud',
      source: 'local',
      target: 'cloud',
      syncedAt: '2026-05-08T11:00:00.000Z',
      preSyncBackups: [
        {
          application: 'studiq',
          role: 'source',
          source: 'local',
          backupName: 'studiq-source.archive',
          backupPath: '/tmp/backups/studiq-source.archive',
          logPath: '/tmp/backups/studiq-source.log',
          createdAt: '2026-05-08T10:59:00.000Z',
          warning: null,
        },
        {
          application: 'studiq',
          role: 'target',
          source: 'cloud',
          backupName: 'studiq-target.archive',
          backupPath: '/tmp/backups/studiq-target.archive',
          logPath: '/tmp/backups/studiq-target.log',
          createdAt: '2026-05-08T10:59:30.000Z',
          warning: null,
        },
      ],
      archivePath: null,
      logPath: null,
      verification: null,
      applicationTransfers: [
        {
          application: 'studiq',
          sourceDbName: 'studiq_local',
          targetDbName: 'studiq_cloud',
          archivePath: '/tmp/runtime/studiq.archive',
          logPath: '/tmp/runtime/studiq.log',
          verification: buildVerification({
            sourceDbName: 'studiq_local',
            targetDbName: 'studiq_cloud',
            collectionsCompared: 7,
          }),
        },
      ],
    };

    const summaries = buildMongoApplicationTransferSummaries(lastSync);

    expect(summaries.find((summary) => summary.application === 'studiq')).toMatchObject({
      backupCount: 2,
      sourceBackup: expect.objectContaining({ backupName: 'studiq-source.archive' }),
      targetBackup: expect.objectContaining({ backupName: 'studiq-target.archive' }),
      transfer: expect.objectContaining({
        sourceDbName: 'studiq_local',
        targetDbName: 'studiq_cloud',
        archivePath: '/tmp/runtime/studiq.archive',
        logPath: '/tmp/runtime/studiq.log',
        verification: expect.objectContaining({ collectionsCompared: 7 }),
      }),
    });
    expect(summaries.find((summary) => summary.application === 'products')).toMatchObject({
      backupCount: 0,
      transfer: null,
    });
  });
});
