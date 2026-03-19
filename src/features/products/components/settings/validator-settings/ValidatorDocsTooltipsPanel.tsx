'use client';

import { FormSection, StatusToggle } from '@/shared/ui';

import { ValidatorDocTooltip, useValidatorDocsTooltips } from './ValidatorDocsTooltips';

export function ValidatorDocsTooltipsPanel(): React.JSX.Element {
  const { enabled, setEnabled } = useValidatorDocsTooltips();

  return (
    <FormSection
      title='Documentation Tooltips'
      description='Enable hover tooltips powered by validator docs for controls and actions.'
      variant='subtle'
      className='p-4'
      actions={
        <ValidatorDocTooltip docId='validator.docs.toggle'>
          <StatusToggle
            enabled={enabled}
            onToggle={() => {
              setEnabled(!enabled);
            }}
          />
        </ValidatorDocTooltip>
      }
    >
      <p className='text-xs text-gray-400'>
        Turn this on to view inline docs hints for validator controls while adjusting settings.
      </p>
    </FormSection>
  );
}
