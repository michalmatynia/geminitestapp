/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDatabaseEngineOperationControlsMock } = vi.hoisted(() => ({
  getDatabaseEngineOperationControlsMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/db/database-engine-policy', () => ({
  getDatabaseEngineOperationControls: getDatabaseEngineOperationControlsMock,
}));

import { assertDatabaseEngineOperationEnabled } from './database-engine-operation-guards';

describe('database-engine-operation-guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows enabled manual operations', async () => {
    getDatabaseEngineOperationControlsMock.mockResolvedValue({
      allowManualFullSync: true,
      allowManualCollectionSync: true,
      allowManualBackfill: true,
      allowManualBackupRunNow: true,
      allowManualBackupMaintenance: true,
      allowBackupSchedulerTick: true,
      allowOperationJobCancellation: true,
    });

    await expect(assertDatabaseEngineOperationEnabled('allowManualBackupRunNow')).resolves.toBe(
      undefined
    );
  });

  it('throws a labeled forbidden error when a gate is disabled', async () => {
    getDatabaseEngineOperationControlsMock.mockResolvedValue({
      allowManualFullSync: true,
      allowManualCollectionSync: true,
      allowManualBackfill: true,
      allowManualBackupRunNow: false,
      allowManualBackupMaintenance: true,
      allowBackupSchedulerTick: true,
      allowOperationJobCancellation: true,
    });

    await expect(
      assertDatabaseEngineOperationEnabled('allowManualBackupRunNow')
    ).rejects.toThrow(/manual backup run-now is disabled/i);
  });
});
