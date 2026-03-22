import { beforeEach, describe, expect, it, vi } from 'vitest';

const { reportRuntimeCatchMock } = vi.hoisted(() => ({
  reportRuntimeCatchMock: vi.fn(),
}));

vi.mock('@/shared/utils/observability/runtime-error-reporting', () => ({
  reportRuntimeCatch: reportRuntimeCatchMock,
}));

import { DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS } from './database-engine-constants';
import { normalizeDatabaseEngineOperationControls } from './database-engine-operation-controls';

describe('database-engine-operation-controls', () => {
  beforeEach(() => {
    reportRuntimeCatchMock.mockReset();
  });

  it('normalizes boolean controls from raw objects', () => {
    expect(
      normalizeDatabaseEngineOperationControls({
        allowManualFullSync: false,
        allowManualCollectionSync: false,
        allowManualBackfill: true,
        allowManualBackupRunNow: false,
        allowManualBackupMaintenance: true,
        allowBackupSchedulerTick: false,
        allowOperationJobCancellation: false,
      })
    ).toEqual({
      allowManualFullSync: false,
      allowManualCollectionSync: false,
      allowManualBackfill: true,
      allowManualBackupRunNow: false,
      allowManualBackupMaintenance: true,
      allowBackupSchedulerTick: false,
      allowOperationJobCancellation: false,
    });
  });

  it('falls back to defaults for empty or invalid payloads and reports parse failures', () => {
    expect(normalizeDatabaseEngineOperationControls(undefined)).toEqual(
      DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS
    );

    expect(normalizeDatabaseEngineOperationControls('{')).toEqual(
      DEFAULT_DATABASE_ENGINE_OPERATION_CONTROLS
    );
    expect(reportRuntimeCatchMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'db.database-engine-operation-controls',
        action: 'parseJsonObject',
      })
    );
  });
});
