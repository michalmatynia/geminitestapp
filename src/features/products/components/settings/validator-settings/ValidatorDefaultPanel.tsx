import {
  useUpdateValidatorSettingsMutation,
  useValidatorSettings,
} from '@/features/products/hooks/useProductSettingsQueries';
import { FormSection } from '@/shared/ui/form-section';
import { ValidatorFormatterToggle } from '@/shared/ui/validator-formatter-toggle';

import { cn } from '@/shared/utils/ui-utils';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { ValidatorDocTooltip } from './ValidatorDocsTooltips';

/**
 * Validator docs: see docs/validator/function-reference.md#ui.validatordefaultpanel
 */
export function ValidatorDefaultPanel(): React.JSX.Element {
  const settingsQuery = useValidatorSettings();
  const updateSettings = useUpdateValidatorSettingsMutation();
  const enabledByDefault = settingsQuery.data?.enabledByDefault ?? true;
  const formatterEnabledByDefault = settingsQuery.data?.formatterEnabledByDefault ?? false;
  const settingsBusy = settingsQuery.isLoading || updateSettings.isPending;

  const handleToggleDefault = async (enabled: boolean): Promise<void> => {
    try {
      await updateSettings.mutateAsync({ enabledByDefault: enabled });
    } catch (error) {
      logClientCatch(error, {
        source: 'ValidatorDefaultPanel',
        action: 'toggleDefault',
      });
    }
  };

  const handleToggleFormatterDefault = async (enabled: boolean): Promise<void> => {
    try {
      await updateSettings.mutateAsync({ formatterEnabledByDefault: enabled });
    } catch (error) {
      logClientCatch(error, {
        source: 'ValidatorDefaultPanel',
        action: 'toggleFormatterDefault',
      });
    }
  };

  return (
    <FormSection
      title='Product Validator Default'
      description='Controls whether validator checks are ON by default and whether formatter auto-accept is enabled by default.'
      variant='subtle'
      className='p-4'
      actions={
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
      }
    />
  );
}
