// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import type { DatabaseInfo } from '@/shared/contracts/database';

import { buildBackupApplicationSummaries } from './BackupApplicationSummary';

const buildBackup = (overrides: Partial<DatabaseInfo>): DatabaseInfo => ({
  name: 'geminitestapp/app-backup.archive',
  size: 0,
  createdAt: '2026-05-07T10:00:00.000Z',
  lastModifiedAt: '2026-05-07T10:00:00.000Z',
  ...overrides,
});

describe('buildBackupApplicationSummaries', () => {
  it('groups prefixed and legacy backups by managed Mongo application', () => {
    const summaries = buildBackupApplicationSummaries([
      buildBackup({
        name: 'legacy-root-backup.archive',
        size: 100,
        createdAt: '2026-05-06T10:00:00.000Z',
        lastModifiedAt: '2026-05-06T10:00:00.000Z',
      }),
      buildBackup({
        name: 'geminitestapp/app-backup-2.archive',
        size: 200,
        createdAt: '2026-05-08T10:00:00.000Z',
        lastModifiedAt: '2026-05-08T10:00:00.000Z',
      }),
      buildBackup({
        name: 'studiq/studiq-backup.archive',
        size: 300,
      }),
      buildBackup({
        name: 'products/products-backup.archive',
        size: 400,
      }),
    ]);

    expect(summaries).toHaveLength(4);
    expect(summaries.find((item) => item.application === 'geminitestapp')).toMatchObject({
      count: 2,
      totalSizeBytes: 300,
      latestBackup: expect.objectContaining({ name: 'geminitestapp/app-backup-2.archive' }),
    });
    expect(summaries.find((item) => item.application === 'studiq')).toMatchObject({
      count: 1,
      totalSizeBytes: 300,
    });
    expect(summaries.find((item) => item.application === 'cms-builder')).toMatchObject({
      count: 0,
      totalSizeBytes: 0,
      latestBackup: null,
    });
    expect(summaries.find((item) => item.application === 'products')).toMatchObject({
      count: 1,
      totalSizeBytes: 400,
    });
  });
});
