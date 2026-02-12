'use client';

import { FormSection, StatusToggle } from '@/shared/ui';

import { useValidatorSettingsContext } from './ValidatorSettingsContext';

export function ValidatorDefaultPanel(): React.JSX.Element {
  const { enabledByDefault, settingsBusy, handleToggleDefault } = useValidatorSettingsContext();
  return (
    <FormSection
      title='Product Validator Default'
      description='Controls whether validator checks are ON by default in Product Create/Edit forms.'
      variant='subtle'
      className='p-4'
      actions={(
        <StatusToggle
          enabled={enabledByDefault}
          disabled={settingsBusy}
          onToggle={() => {
            void handleToggleDefault();
          }}
        />
      )}
    />
  );
}
