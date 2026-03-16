'use client';

import React from 'react';
import { FormSection, SelectSimple } from '@/features/kangur/shared/ui';
import {
  KANGUR_STOREFRONT_THEME_OPTIONS,
  type KangurStorefrontAppearanceMode,
} from '@/features/kangur/storefront-appearance-settings';
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
          onValueChange={(val) => void handleDefaultModeChange(val as KangurStorefrontAppearanceMode)}
          disabled={isDefaultModeSaving}
         ariaLabel='Select option' title='Select option'/>
      </div>
    </FormSection>
  );
}
