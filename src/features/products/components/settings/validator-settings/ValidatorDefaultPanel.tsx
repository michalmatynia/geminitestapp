'use client';

import { FormSection, ValidatorFormatterToggle } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { ValidatorDocTooltip } from './ValidatorDocsTooltips';
import { useValidatorSettingsContext } from './ValidatorSettingsContext';

type ValidatorDefaultControls = {
  enabledByDefault: boolean;
  formatterEnabledByDefault: boolean;
  settingsBusy: boolean;
  handleToggleDefault: (enabled: boolean) => Promise<void>;
  handleToggleFormatterDefault: (enabled: boolean) => Promise<void>;
};

/**
 * Validator docs: see docs/validator/function-reference.md#ui.validatordefaultpanel
 */
export function ValidatorDefaultPanel(): React.JSX.Element {
  const {
    enabledByDefault,
    formatterEnabledByDefault,
    settingsBusy,
    handleToggleDefault,
    handleToggleFormatterDefault,
  } = useValidatorSettingsContext() as ValidatorDefaultControls;
  return (
    <FormSection
      title='Product Validator Default'
      description='Controls whether validator checks are ON by default and whether formatter auto-accept is enabled by default.'
      variant='subtle'
      className='p-4'
      actions={(
        <ValidatorDocTooltip docId='validator.default.toggle'>
          <div className={cn(settingsBusy && 'pointer-events-none opacity-70')}>
            <ValidatorFormatterToggle
              validatorEnabled={enabledByDefault}
              formatterEnabled={formatterEnabledByDefault}
              onValidatorChange={(next: boolean): void => {
                void handleToggleDefault(next);
              }}
              onFormatterChange={(next: boolean): void => {
                void handleToggleFormatterDefault(next);
              }}
            />
          </div>
        </ValidatorDocTooltip>
      )}
    />
  );
}
