'use client';

import { SectionPanel } from '@/shared/ui';

import { ToggleButton } from './ToggleButton';

type ValidatorDefaultPanelProps = {
  enabledByDefault: boolean;
  disabled: boolean;
  onToggle: () => void;
};

export function ValidatorDefaultPanel({
  enabledByDefault,
  disabled,
  onToggle,
}: ValidatorDefaultPanelProps): React.JSX.Element {
  return (
    <SectionPanel variant='subtle' className='p-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='space-y-1'>
          <p className='text-sm font-semibold text-white'>Product Validator Default</p>
          <p className='text-xs text-gray-400'>
            Controls whether validator checks are ON by default in Product Create/Edit forms.
          </p>
        </div>
        <ToggleButton enabled={enabledByDefault} disabled={disabled} onClick={onToggle} />
      </div>
    </SectionPanel>
  );
}
