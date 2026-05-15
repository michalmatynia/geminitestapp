/**
 * Database Engine Operation Guards
 * 
 * Authorization and access control for database engine operations.
 * Provides:
 * - Operation gate definitions and labels
 * - Permission checking for database operations
 * - Access control enforcement
 * - Operation authorization validation
 * - Server-only operation guards
 */

import 'server-only';

import { forbiddenError } from '@/shared/errors/app-error';
import type { DatabaseEngineOperationControls } from '@/shared/lib/db/database-engine-constants';
import { getDatabaseEngineOperationControls } from '@/shared/lib/db/database-engine-policy';

/** Type for database engine operation gates */
export type DatabaseEngineOperationGate = keyof DatabaseEngineOperationControls;

/** Human-readable labels for each operation gate */
const gateLabels: Record<DatabaseEngineOperationGate, string> = {
  allowManualFullSync: 'Manual full database sync',
  allowManualCollectionSync: 'Manual collection sync',
  allowManualBackfill: 'Manual settings backfill',
  allowManualBackupRunNow: 'Manual backup run-now',
  allowManualBackupMaintenance: 'Manual backup restore/upload/delete',
  allowBackupSchedulerTick: 'Backup scheduler manual tick',
  allowOperationJobCancellation: 'Operation job cancellation',
};

/**
 * assertDatabaseEngineOperationEnabled: Validates that a specific, sensitive database operation 
 * is globally enabled according to current Database Engine controls.
 * 
 * This should be called at the start of any privileged operation (e.g., API route handlers)
 * to ensure that manual or sensitive actions are permitted by system-wide configuration.
 * 
 * @param gate - The key of the operation control to check.
 * @throws {ForbiddenError} If the specific operation is disabled in the system policy.
 */
export async function assertDatabaseEngineOperationEnabled(
  gate: DatabaseEngineOperationGate
): Promise<void> {
  const controls = await getDatabaseEngineOperationControls();
  if (controls[gate]) return;

  throw forbiddenError(
    `${gateLabels[gate]} is disabled by Database Engine controls. Enable it in Workflow Database -> Database Engine -> Manual Operation Controls.`
  );
}
