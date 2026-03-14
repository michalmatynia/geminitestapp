'use client';

import React from 'react';
import { FormSection, SelectSimple } from '@/shared/ui';
import { KANGUR_STOREFRONT_THEME_OPTIONS } from '@/features/kangur/storefront-appearance-settings';
import { useAppearancePage } from './AppearancePage.context';

export function AppearanceModeSelector(): React.JSX.Element {
  const { defaultModeDraft, isDefaultModeSaving, handleDefaultModeChange } = useAppearancePage();

  return (
    <FormSection
      title='System startowy'
      description='Wybierz który system wizualny (jasny/ciemny) ma być ładowany domyślnie przy starcie aplikacji.'
    >
      <div className='max-w-md'>
        <SelectSimple
          value={defaultModeDraft}
          options={KANGUR_STOREFRONT_THEME_OPTIONS}
          onChange={(val) => void handleDefaultModeChange(val as any)}
          disabled={isDefaultModeSaving}
        />
      </div>
    </FormSection>
  );
}
