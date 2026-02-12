'use client';

import type {
  ProductValidationDenyBehavior,
  ProductValidationInstanceDenyBehaviorMap,
  ProductValidationInstanceScope,
} from '@/shared/types/domain/products';
import { SectionPanel, UnifiedSelect } from '@/shared/ui';

import { INSTANCE_SCOPE_LABELS } from './constants';

type ValidatorInstanceBehaviorPanelProps = {
  instanceDenyBehavior: ProductValidationInstanceDenyBehaviorMap;
  disabled: boolean;
  onScopeChange: (
    scope: ProductValidationInstanceScope,
    value: ProductValidationDenyBehavior
  ) => void;
};

export function ValidatorInstanceBehaviorPanel({
  instanceDenyBehavior,
  disabled,
  onScopeChange,
}: ValidatorInstanceBehaviorPanelProps): React.JSX.Element {
  return (
    <SectionPanel variant='subtle' className='p-4'>
      <div className='space-y-1'>
        <p className='text-sm font-semibold text-white'>Instance Behavior</p>
        <p className='text-xs text-gray-400'>
          Set how deny actions behave in each form instance. This controls draft/new/edit contexts separately.
        </p>
      </div>
      <div className='mt-3 grid grid-cols-1 gap-3 md:grid-cols-3'>
        {(Object.keys(INSTANCE_SCOPE_LABELS) as ProductValidationInstanceScope[]).map(
          (scope: ProductValidationInstanceScope) => (
            <div key={scope} className='rounded-md border border-border/70 bg-background/30 p-3'>
              <p className='text-xs font-medium text-white'>{INSTANCE_SCOPE_LABELS[scope]}</p>
              <p className='mt-1 text-[11px] text-gray-400'>When a correction is denied</p>
              <div className='mt-2'>
                <UnifiedSelect
                  value={instanceDenyBehavior[scope]}
                  onValueChange={(value: string): void => {
                    onScopeChange(scope, value === 'ask_again' ? 'ask_again' : 'mute_session');
                  }}
                  options={[
                    { value: 'mute_session', label: 'Stop For This Session' },
                    { value: 'ask_again', label: 'Ask Again Next Validation' },
                  ]}
                  disabled={disabled}
                />
              </div>
            </div>
          )
        )}
      </div>
    </SectionPanel>
  );
}
