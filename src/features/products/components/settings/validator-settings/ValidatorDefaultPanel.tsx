'use client';

import { SectionPanel, StatusToggle } from '@/shared/ui';

import { useValidatorSettingsContext } from './ValidatorSettingsContext';

export function ValidatorDefaultPanel(): React.JSX.Element {
  const { enabledByDefault, settingsBusy, handleToggleDefault } = useValidatorSettingsContext();
  return (
    <SectionPanel variant='subtle' className='p-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='space-y-1'>
          <p className='text-sm font-semibold text-white'>Product Validator Default</p>
          <p className='text-xs text-gray-400'>
            Controls whether validator checks are ON by default in Product Create/Edit forms.
          </p>
        </div>
        <StatusToggle
          enabled={enabledByDefault}
          disabled={settingsBusy}
          onToggle={() => {
            void handleToggleDefault();
          }}
        />
      </div>
    </SectionPanel>
  );
}
