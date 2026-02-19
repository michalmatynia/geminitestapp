'use client';

import Link from 'next/link';

import { FormSection, StatusToggle } from '@/shared/ui';

import { useValidatorSettingsController } from './validator-settings/useValidatorSettingsController';
import { ValidatorDefaultPanel } from './validator-settings/ValidatorDefaultPanel';
import {
  ValidatorDocTooltip,
  ValidatorDocsTooltipsProvider,
  useValidatorDocsTooltips,
} from './validator-settings/ValidatorDocsTooltips';
import { ValidatorInstanceBehaviorPanel } from './validator-settings/ValidatorInstanceBehaviorPanel';
import { ValidatorSettingsProvider } from './validator-settings/ValidatorSettingsContext';

/**
 * Validator docs: see docs/validator/function-reference.md#ui.validatorsettings
 */
export function ValidatorSettings(): React.JSX.Element {
  const controller = useValidatorSettingsController();

  return (
    <ValidatorDocsTooltipsProvider>
      <ValidatorSettingsProvider value={controller}>
        <div className='space-y-5'>          <ValidatorDocsTooltipsPanel />
          <ValidatorDefaultPanel />
          <ValidatorInstanceBehaviorPanel />
          <ValidatorPatternListLinkPanel />
        </div>
      </ValidatorSettingsProvider>
    </ValidatorDocsTooltipsProvider>
  );
}

function ValidatorPatternListLinkPanel(): React.JSX.Element {
  return (
    <FormSection
      title='Pattern Validations'
      description='Regex patterns are managed in the dedicated validator list page.'
      variant='subtle'
      className='p-4'
    >
      <Link
        href='/admin/validator'
        className='inline-flex items-center rounded-md border border-border/70 bg-card/40 px-3 py-2 text-sm text-white transition-colors hover:bg-card/70'
      >
        Open Pattern Validations List
      </Link>
    </FormSection>
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
        Turn this on to view inline docs hints for validator controls while editing patterns.
      </p>
    </FormSection>
  );
}
