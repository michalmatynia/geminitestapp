'use client';

import { ConfirmModal } from '@/shared/ui/templates/modals';

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

              <ConfirmModal

                isOpen={!!controller.patternToDelete}
          onClose={() => controller.setPatternToDelete(null)}
          onConfirm={controller.handleDelete}
          title='Delete Pattern'
          message={`Delete validator pattern "${controller.patternToDelete?.label}"? This cannot be undone.`}
          confirmText='Delete'
          isDangerous={true}
        />

        <ValidatorPatternModal />
      </div>
    </ValidatorSettingsProvider>
  );
}
