import { describe, expect, it } from 'vitest';

import type { DatabaseEngineOperationJob } from '@/shared/contracts/database';

import { buildBackupJobSummaries } from './BackupOperationJobsSummary';

const buildJob = (
  overrides: Partial<DatabaseEngineOperationJob>
): DatabaseEngineOperationJob => ({
  id: 'job-1',
  type: 'db_backup',
  status: 'queued',
  dbType: 'mongodb',
  direction: null,
  source: 'db_backup',
  payload: {},
  result: null,
  resultSummary: null,
  errorMessage: null,
  progress: 0,
  createdAt: '2026-05-08T10:00:00.000Z',
  updatedAt: null,
  startedAt: null,
  finishedAt: null,
  completedAt: null,
  ...overrides,
});

describe('buildBackupJobSummaries', () => {
  it('extracts managed backup targets from job payloads', () => {
    const summaries = buildBackupJobSummaries([
      buildJob({
        id: 'job-studiq',
        status: 'completed',
        source: 'database_engine_managed_backup',
        payload: { application: 'studiq' },
        resultSummary: 'Backup created',
      }),
      buildJob({
        id: 'job-unknown',
        payload: { application: 'unknown' },
      }),
      buildJob({
        id: 'job-other',
        type: 'other',
      }),
    ]);

    expect(summaries).toEqual([
      expect.objectContaining({
        id: 'job-studiq',
        status: 'completed',
        target: 'studiq',
        source: 'database_engine_managed_backup',
        resultSummary: 'Backup created',
      }),
      expect.objectContaining({
        id: 'job-unknown',
        target: 'all',
      }),
    ]);
  });
});
