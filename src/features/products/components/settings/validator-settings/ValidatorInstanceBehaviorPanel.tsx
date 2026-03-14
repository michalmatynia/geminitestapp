'use client';

import type { ProductValidationInstanceScope } from '@/shared/contracts/products';
import { FormSection, SelectSimple } from '@/shared/ui';

import { INSTANCE_SCOPE_LABELS } from './constants';
import { ValidatorDocTooltip } from './ValidatorDocsTooltips';
import { useValidatorSettingsContext } from './ValidatorSettingsContext';

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
                    options={[
                      { value: 'mute_session', label: 'Stop For This Session' },
                      { value: 'ask_again', label: 'Ask Again Next Validation' },
                    ]}
                    ariaLabel={`${INSTANCE_SCOPE_LABELS[scope]} deny behavior`}
                    disabled={settingsBusy}
                   title="Select option"/>
                </ValidatorDocTooltip>
              </div>
            </div>
          )
        )}
      </div>
    </FormSection>
  );
}
