import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductValidationInstanceScope } from '@/shared/contracts/products';
import { FormSection } from '@/shared/ui/form-section';
import { SelectSimple } from '@/shared/ui/select-simple';

import { INSTANCE_SCOPE_LABELS } from './constants';
import { ValidatorDocTooltip } from './ValidatorDocsTooltips';
import { useValidatorSettingsContext } from './ValidatorSettingsContext';

const INSTANCE_DENY_BEHAVIOR_OPTIONS: Array<LabeledOptionDto<'mute_session' | 'ask_again'>> = [
  { value: 'mute_session', label: 'Stop For This Session' },
  { value: 'ask_again', label: 'Ask Again Next Validation' },
];

/**
 * Validator docs: see docs/validator/function-reference.md#ui.validatorinstancebehaviorpanel
 */
export function ValidatorInstanceBehaviorPanel(): React.JSX.Element {
  const { instanceDenyBehavior, settingsBusy, handleInstanceBehaviorChange } =
    useValidatorSettingsContext();
  return (
    <FormSection
      title='Instance Behavior'
      description='Set how deny actions behave in each form instance. This controls draft/new/edit contexts separately.'
      variant='subtle'
      className='p-4'
    >
      <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-3'>
        {(Object.keys(INSTANCE_SCOPE_LABELS) as ProductValidationInstanceScope[]).map(
          (scope: ProductValidationInstanceScope) => (
            <div key={scope} className='rounded-md border border-border/70 bg-background/30 p-3'>
              <p className='text-xs font-medium text-white'>{INSTANCE_SCOPE_LABELS[scope]}</p>
              <p className='mt-1 text-[11px] text-gray-400'>When a correction is denied</p>
              <div className='mt-2'>
                <ValidatorDocTooltip docId='validator.instance.behavior.select'>
                  <SelectSimple
                    size='sm'
                    value={instanceDenyBehavior[scope]}
                    onValueChange={(value: string): void => {
                      void handleInstanceBehaviorChange(
                        scope,
                        value === 'ask_again' ? 'ask_again' : 'mute_session'
                      );
                    }}
                    options={INSTANCE_DENY_BEHAVIOR_OPTIONS}
                    ariaLabel={`${INSTANCE_SCOPE_LABELS[scope]} deny behavior`}
                    disabled={settingsBusy}
                   title='Select option'/>
                </ValidatorDocTooltip>
              </div>
            </div>
          )
        )}
      </div>
    </FormSection>
  );
}
