'use client';

import type { JSX } from 'react';
import { Button, Card, Input, Label, Switch } from '@/shared/ui/primitives.public';
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
      <div className='flex items-center justify-between gap-3'>
        <Label htmlFor='database-backup-scheduler-enabled' className='font-medium text-white'>
          Scheduler
        </Label>
        <Switch
          id='database-backup-scheduler-enabled'
          checked={schedulerEnabledDraft}
          onCheckedChange={handleSchedulerEnabledDraftChange}
        />
      </div>
      
      {schedulerEnabledDraft && (
        <div className='space-y-4 pt-2'>
          <div className='flex items-center justify-between gap-3'>
            <Label htmlFor='database-backup-repeat-tick' className='text-sm text-white'>
              Repeat Tick
            </Label>
            <Switch
              id='database-backup-repeat-tick'
              checked={repeatTickEnabledDraft}
              onCheckedChange={handleRepeatSchedulerTickDraftChange}
            />
          </div>
          <div className='flex items-center justify-between gap-3'>
            <Label htmlFor='database-backup-active-target' className='text-sm text-white'>
              Active Target Enabled
            </Label>
            <Switch
              id='database-backup-active-target'
              checked={activeTargetEnabledDraft}
              onCheckedChange={handleActiveTargetEnabledDraftChange}
            />
          </div>
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
