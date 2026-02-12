'use client';

import { ConfirmDialog } from '@/shared/ui';

import { useValidatorSettingsController } from './validator-settings/useValidatorSettingsController';
import { ValidatorDefaultPanel } from './validator-settings/ValidatorDefaultPanel';
import { ValidatorInstanceBehaviorPanel } from './validator-settings/ValidatorInstanceBehaviorPanel';
import { ValidatorPatternModal } from './validator-settings/ValidatorPatternModal';
import { ValidatorPatternTablePanel } from './validator-settings/ValidatorPatternTablePanel';
import { ValidatorSettingsProvider } from './validator-settings/ValidatorSettingsContext';

export function ValidatorSettings(): React.JSX.Element {
  const controller = useValidatorSettingsController();

  return (
    <ValidatorSettingsProvider value={controller}>
      <div className='space-y-5'>
        <ValidatorDefaultPanel />
        <ValidatorInstanceBehaviorPanel />
        <ValidatorPatternTablePanel />

        <ConfirmDialog
          open={!!controller.patternToDelete}
          onOpenChange={(open: boolean) => {
            if (!open) controller.setPatternToDelete(null);
          }}
          onConfirm={() => {
            void controller.handleDelete();
          }}
          title='Delete Pattern'
          description={`Delete validator pattern "${controller.patternToDelete?.label}"? This cannot be undone.`}
          confirmText='Delete'
          variant='destructive'
        />

        <ValidatorPatternModal />
      </div>
    </ValidatorSettingsProvider>
  );
}
