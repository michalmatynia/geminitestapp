'use client';

import React from 'react';

import { FormSection } from '@/shared/ui/form-section';

import {
  DynamicMathFields,
  DynamicPaddingFields,
  DynamicResultFields,
  DynamicSourceField,
  DynamicSourceParsingFields,
} from './ValidatorPatternModalDynamicSection.fields';
import {
  DynamicLogicConditionFields,
  DynamicLogicOperatorField,
} from './ValidatorPatternModalDynamicSection.logic';
import { useValidatorSettingsContext } from '../ValidatorSettingsContext';

export function ValidatorPatternModalDynamicSection(): React.JSX.Element | null {
  const { formData } = useValidatorSettingsContext();

  if (formData.replacementMode !== 'dynamic') return null;

  return (
    <FormSection
      title='Dynamic Replacer Config'
      variant='subtle'
      className='border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-4'
    >
      <div className='space-y-4 mt-4'>
        <DynamicSourceField />
        <DynamicSourceParsingFields />
        <DynamicMathFields />
        <DynamicLogicOperatorField />
        <DynamicLogicConditionFields />
        <DynamicResultFields />
        <DynamicPaddingFields />
      </div>
    </FormSection>
  );
}
