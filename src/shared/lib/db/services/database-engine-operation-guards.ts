import 'server-only';

import { forbiddenError } from '@/shared/errors/app-error';
import type { DatabaseEngineOperationControls } from '@/shared/lib/db/database-engine-constants';
import { getDatabaseEngineOperationControls } from '@/shared/lib/db/database-engine-policy';

export type DatabaseEngineOperationGate = keyof DatabaseEngineOperationControls;

const gateLabels: Record<DatabaseEngineOperationGate, string> = {
  allowManualFullSync: 'Manual full database sync',
  allowManualCollectionSync: 'Manual collection sync',
  allowManualBackfill: 'Manual settings backfill',
  allowManualBackupRunNow: 'Manual backup run-now',
  allowManualBackupMaintenance: 'Manual backup restore/upload/delete',
  allowBackupSchedulerTick: 'Backup scheduler manual tick',
  allowOperationJobCancellation: 'Operation job cancellation',
};

export async function assertDatabaseEngineOperationEnabled(
  gate: DatabaseEngineOperationGate
): Promise<void> {
  const controls = await getDatabaseEngineOperationControls();
  if (controls[gate]) return;

  throw forbiddenError(
    `${gateLabels[gate]} is disabled by Database Engine controls. Enable it in Workflow Database -> Database Engine -> Manual Operation Controls.`
  );
}
