'use client';

import type { DatabaseEngineStatus } from '@/shared/contracts/database';
import type { StatusVariant } from '@/shared/contracts/ui/base';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { FormSection, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { Button, Card } from '@/shared/ui/primitives.public';
import { useDatabaseEngineActionsContext, useDatabaseEngineStateContext } from '../../context/DatabaseEngineContext';
import { MongoSourceSection } from './DatabaseEngineMongoSourceSection';

import type { JSX } from 'react';

const resolveEngineStatusBadge = (
  engineStatus: DatabaseEngineStatus | undefined
): { status: string; variant: StatusVariant } => {
  if (engineStatus === undefined) {
    return { status: 'Loading', variant: 'pending' };
  }

  const blockingIssuesCount = engineStatus.blockingIssues.length;
  if (blockingIssuesCount > 0) {
    return {
      status: `${blockingIssuesCount} Blocking Issue${blockingIssuesCount === 1 ? '' : 's'}`,
      variant: 'warning',
    };
  }

  if (!engineStatus.providers.mongodbConfigured) {
    return { status: 'MongoDB Unconfigured', variant: 'error' };
  }

  return { status: 'Healthy', variant: 'active' };
};

export function DatabaseEngineSettingsTab(): JSX.Element {
  const {
    backupSchedule,
    operationControls,
    engineStatus,
    mongoSourceState,
    isSyncingMongoSources,
  } = useDatabaseEngineStateContext();
  const {
    updateBackupSchedule,
    updateOperationControls,
    syncMongoSources,
    setActiveView,
  } = useDatabaseEngineActionsContext();
  const engineStatusBadge = resolveEngineStatusBadge(engineStatus);

  return (
    <div className='space-y-6'>
      <FormSection title='Engine Status'>
        <StatusBadge status={engineStatusBadge.status} variant={engineStatusBadge.variant} />
      </FormSection>

      <MongoSourceSection
        mongoSourceState={mongoSourceState}
        isSyncingMongoSources={isSyncingMongoSources}
        allowManualFullSync={operationControls.allowManualFullSync}
        onSync={(direction) => {
          syncMongoSources(direction).catch(() => {});
        }}
      />

      <FormSection title='Operation Controls'>
        <ToggleRow
          label='Manual Full Sync'
          checked={operationControls.allowManualFullSync}
          onCheckedChange={(checked) => updateOperationControls({ allowManualFullSync: checked })}
        />
      </FormSection>

      <FormSection title='Backup Policy'>
        <ToggleRow
          label='Enable Automated Backups'
          checked={backupSchedule.schedulerEnabled}
          onCheckedChange={(checked) => updateBackupSchedule({ schedulerEnabled: checked })}
        />
        <Card variant='subtle' padding='md' className='space-y-3 border-white/10'>
          <p className='text-xs leading-relaxed text-gray-300'>
            Manual backup creation, restore, upload, and scheduler controls are available in the
            Backup Center.
          </p>
          <div>
            <Button type='button' onClick={() => setActiveView('backups')}>
              Open Backup Center
            </Button>
          </div>
        </Card>
      </FormSection>
    </div>
  );
}
