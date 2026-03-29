'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { FormSection, SelectSimple } from '@/features/kangur/shared/ui';
import {
  type KangurStorefrontAppearanceMode,
} from '@/features/kangur/appearance/storefront-appearance-settings';
import { useAppearancePage } from './AppearancePage.context';
import {
  buildAppearanceModeOptions,
  getAppearanceModeSelectorCopy,
  resolveAppearanceAdminLocale,
} from './appearance.copy';

export function AppearanceModeSelector(): React.JSX.Element {
  const locale = resolveAppearanceAdminLocale(useLocale());
  const copy = getAppearanceModeSelectorCopy(locale);
  const { defaultModeDraft, isDefaultModeSaving, handleDefaultModeChange } = useAppearancePage();

  return (
    <FormSection
      title={copy.title}
      description={copy.description}
    >
      <div className='max-w-md'>
        <SelectSimple
          value={defaultModeDraft}
          options={buildAppearanceModeOptions(locale)}
          onValueChange={(val) => void handleDefaultModeChange(val as KangurStorefrontAppearanceMode)}
          disabled={isDefaultModeSaving}
          ariaLabel={copy.selectAriaLabel}
          title={copy.selectAriaLabel}
        />
      </div>
    </FormSection>
  );
}
