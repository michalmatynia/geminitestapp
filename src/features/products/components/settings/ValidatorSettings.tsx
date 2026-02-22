'use client';

import { FormSection, StatusToggle } from '@/shared/ui';

import { useValidatorSettingsController } from './validator-settings/useValidatorSettingsController';
import {
  ValidatorDocTooltip,
  useValidatorDocsTooltips,
} from './validator-settings/ValidatorDocsTooltips';
import { ValidatorInstanceBehaviorPanel } from './validator-settings/ValidatorInstanceBehaviorPanel';
import { ValidatorPatternModal } from './validator-settings/ValidatorPatternModal';
import { ValidatorPatternTablePanel } from './validator-settings/ValidatorPatternTablePanel';
import { ValidatorSettingsProvider } from './validator-settings/ValidatorSettingsContext';

/**
 * Validator docs: see docs/validator/function-reference.md#ui.validatorsettings
 */
export function ValidatorSettings(): React.JSX.Element {
  const controller = useValidatorSettingsController();

  return (
    <ValidatorSettingsProvider value={controller}>
      <div className='space-y-5'>
        <ValidatorDocsTooltipsPanel />
        <ValidatorInstanceBehaviorPanel />
        <ValidatorPatternTablePanel />
        <ValidatorPatternModal />
      </div>
    </ValidatorSettingsProvider>
  );
}

function ValidatorDocsTooltipsPanel(): React.JSX.Element {
  const { enabled, setEnabled } = useValidatorDocsTooltips();
  return (
    <FormSection
      title='Documentation Tooltips'
      description='Enable hover tooltips powered by validator docs for controls and actions.'
      variant='subtle'
      className='p-4'
      actions={(
        <ValidatorDocTooltip docId='validator.docs.toggle'>
          <StatusToggle
            enabled={enabled}
            onToggle={() => {
              setEnabled(!enabled);
            }}
          />
        </ValidatorDocTooltip>
      )}
    >
      <p className='text-xs text-gray-400'>
        Turn this on to view inline docs hints for validator controls while adjusting settings.
      </p>
    </FormSection>
  );
}
