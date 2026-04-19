'use client';

import type { JSX } from 'react';
import { Card, Button, Input, Toggle } from '@/shared/ui/primitives.public';
import { FormField } from '@/shared/ui/forms-and-actions.public';
import { useDatabaseBackupsActionsContext, useDatabaseBackupsStateContext } from '../../context/DatabaseBackupsContext';

export function BackupSchedulerSettings(): JSX.Element {
  const {
    schedulerEnabledDraft,
    repeatTickEnabledDraft,
    activeTargetEnabledDraft,
    activeTargetTimeLocalDraft,
    activeTargetTimeLocalDraftValid,
    isBackupScheduleDirty,
    isBackupScheduleSaving,
  } = useDatabaseBackupsStateContext();
  
  const {
    handleSchedulerEnabledDraftChange,
    handleRepeatSchedulerTickDraftChange,
    handleActiveTargetEnabledDraftChange,
    handleActiveTargetTimeLocalChange,
    saveDailySchedule,
  } = useDatabaseBackupsActionsContext();

  return (
    <Card className='p-4 space-y-4 border-white/10 bg-gray-900/50'>
      <div className='flex items-center justify-between'>
        <h3 className='font-medium text-white'>Scheduler</h3>
        <Toggle
          checked={schedulerEnabledDraft}
          onCheckedChange={handleSchedulerEnabledDraftChange}
        />
      </div>
      
      {schedulerEnabledDraft && (
        <div className='space-y-4 pt-2'>
          <Toggle
            label='Repeat Tick'
            checked={repeatTickEnabledDraft}
            onCheckedChange={handleRepeatSchedulerTickDraftChange}
          />
          <Toggle
            label='Active Target Enabled'
            checked={activeTargetEnabledDraft}
            onCheckedChange={handleActiveTargetEnabledDraftChange}
          />
          <FormField label='Active Target Time (Local)'>
            <Input
              type='time'
              value={activeTargetTimeLocalDraft}
              onChange={(e) => handleActiveTargetTimeLocalChange(e.target.value)}
              className={!activeTargetTimeLocalDraftValid ? 'border-red-500' : ''}
            />
          </FormField>
          <Button
            onClick={saveDailySchedule}
            disabled={!isBackupScheduleDirty || isBackupScheduleSaving || !activeTargetTimeLocalDraftValid}
          >
            {isBackupScheduleSaving ? 'Saving...' : 'Save Schedule'}
          </Button>
        </div>
      )}
    </Card>
  );
}
