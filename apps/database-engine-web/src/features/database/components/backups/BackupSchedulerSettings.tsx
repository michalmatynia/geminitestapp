'use client';

import type { JSX } from 'react';
import type { ChangeEvent } from 'react';
import { Button, Card, Input, Label, Switch } from '@/shared/ui/primitives.public';
import { FormField } from '@/shared/ui/forms-and-actions.public';
import { useDatabaseBackupsActionsContext, useDatabaseBackupsStateContext } from '../../context/DatabaseBackupsContext';

type BackupSchedulerSettingsProps = {
  schedulerEnabledDraft: boolean;
  repeatTickEnabledDraft: boolean;
  activeTargetEnabledDraft: boolean;
  activeTargetTimeLocalDraft: string;
  activeTargetTimeLocalDraftValid: boolean;
  isBackupScheduleDirty: boolean;
  isBackupScheduleSaving: boolean;
  handleSchedulerEnabledDraftChange: (checked: boolean) => void;
  handleRepeatSchedulerTickDraftChange: (checked: boolean) => void;
  handleActiveTargetEnabledDraftChange: (checked: boolean) => void;
  handleActiveTargetTimeLocalChange: (value: string) => void;
  saveDailySchedule: () => Promise<unknown>;
};

type BackupSchedulerActiveTargetProps = {
  activeTargetTimeLocalDraft: string;
  activeTargetTimeLocalDraftValid: boolean;
  isBackupScheduleDirty: boolean;
  isBackupScheduleSaving: boolean;
  handleActiveTargetTimeLocalChange: (value: string) => void;
  onSave: () => void;
};

type BackupSchedulerTogglesProps = {
  repeatTickEnabledDraft: boolean;
  activeTargetEnabledDraft: boolean;
  handleRepeatSchedulerTickDraftChange: (checked: boolean) => void;
  handleActiveTargetEnabledDraftChange: (checked: boolean) => void;
};

function BackupSchedulerActiveTargetSection({
  activeTargetTimeLocalDraft,
  activeTargetTimeLocalDraftValid,
  isBackupScheduleDirty,
  isBackupScheduleSaving,
  handleActiveTargetTimeLocalChange,
  onSave,
}: BackupSchedulerActiveTargetProps): JSX.Element {
  const handleTargetTimeChange = (event: ChangeEvent<HTMLInputElement>): void => {
    handleActiveTargetTimeLocalChange(event.target.value);
  };

  return (
    <div className='space-y-4 pt-2'>
      <FormField label='Active Target Time (Local)'>
        <Input
          type='time'
          value={activeTargetTimeLocalDraft}
          onChange={handleTargetTimeChange}
          className={!activeTargetTimeLocalDraftValid ? 'border-red-500' : ''}
        />
      </FormField>
      <Button
        onClick={onSave}
        disabled={!isBackupScheduleDirty || isBackupScheduleSaving || !activeTargetTimeLocalDraftValid}
      >
        {isBackupScheduleSaving ? 'Saving...' : 'Save Schedule'}
      </Button>
    </div>
  );
}

function BackupSchedulerTogglesSection({
  repeatTickEnabledDraft,
  activeTargetEnabledDraft,
  handleRepeatSchedulerTickDraftChange,
  handleActiveTargetEnabledDraftChange,
}: BackupSchedulerTogglesProps): JSX.Element {
  return (
    <>
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
    </>
  );
}

function BackupSchedulerControls({
  schedulerEnabledDraft,
  repeatTickEnabledDraft,
  activeTargetEnabledDraft,
  activeTargetTimeLocalDraft,
  activeTargetTimeLocalDraftValid,
  isBackupScheduleDirty,
  isBackupScheduleSaving,
  handleSchedulerEnabledDraftChange,
  handleRepeatSchedulerTickDraftChange,
  handleActiveTargetEnabledDraftChange,
  handleActiveTargetTimeLocalChange,
  saveDailySchedule,
}: BackupSchedulerSettingsProps): JSX.Element {
  const onSave = (): void => {
    void saveDailySchedule();
  };

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
        <>
          <BackupSchedulerTogglesSection
            repeatTickEnabledDraft={repeatTickEnabledDraft}
            activeTargetEnabledDraft={activeTargetEnabledDraft}
            handleRepeatSchedulerTickDraftChange={handleRepeatSchedulerTickDraftChange}
            handleActiveTargetEnabledDraftChange={handleActiveTargetEnabledDraftChange}
          />
          <BackupSchedulerActiveTargetSection
            activeTargetTimeLocalDraft={activeTargetTimeLocalDraft}
            activeTargetTimeLocalDraftValid={activeTargetTimeLocalDraftValid}
            isBackupScheduleDirty={isBackupScheduleDirty}
            isBackupScheduleSaving={isBackupScheduleSaving}
            handleActiveTargetTimeLocalChange={handleActiveTargetTimeLocalChange}
            onSave={onSave}
          />
        </>
      )}
    </Card>
  );
}

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
    <BackupSchedulerControls
      schedulerEnabledDraft={schedulerEnabledDraft}
      repeatTickEnabledDraft={repeatTickEnabledDraft}
      activeTargetEnabledDraft={activeTargetEnabledDraft}
      activeTargetTimeLocalDraft={activeTargetTimeLocalDraft}
      activeTargetTimeLocalDraftValid={activeTargetTimeLocalDraftValid}
      isBackupScheduleDirty={isBackupScheduleDirty}
      isBackupScheduleSaving={isBackupScheduleSaving}
      handleSchedulerEnabledDraftChange={handleSchedulerEnabledDraftChange}
      handleRepeatSchedulerTickDraftChange={handleRepeatSchedulerTickDraftChange}
      handleActiveTargetEnabledDraftChange={handleActiveTargetEnabledDraftChange}
      handleActiveTargetTimeLocalChange={handleActiveTargetTimeLocalChange}
      saveDailySchedule={saveDailySchedule}
    />
  );
}
