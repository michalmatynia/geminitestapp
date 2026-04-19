'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import {
  type useOptionalCmsStorefrontAppearance,
} from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';

import {
  type useKangurPrimaryNavigationState,
} from './KangurPrimaryNavigation.hooks';

const CmsStorefrontAppearanceButtons = dynamic(() =>
  import('@/shared/ui/cms-appearance/CmsStorefrontAppearance').then((m) => ({
    default: m.CmsStorefrontAppearanceButtons,
  }))
);

export function resolveAppearanceControls({
  inline,
  kangurAppearanceLabels,
  kangurAppearanceModes,
  kangurAppearanceTone,
  storefrontAppearance,
}: {
  inline?: boolean;
  kangurAppearanceLabels: Record<'dark' | 'dawn' | 'default' | 'sunset', string>;
  kangurAppearanceModes: readonly ['default', 'dawn', 'sunset', 'dark'];
  kangurAppearanceTone: ReturnType<typeof useKangurPrimaryNavigationState>['kangurAppearance']['tone'];
  storefrontAppearance: ReturnType<typeof useOptionalCmsStorefrontAppearance>;
}): React.ReactNode {
  if (!storefrontAppearance) {
    return null;
  }

  const appearanceControlsClassName =
    inline === true ? 'justify-start' : 'max-sm:w-full max-sm:justify-start';
  const appearanceControlsTestId =
    inline === true
      ? 'kangur-primary-nav-appearance-controls-inline'
      : 'kangur-primary-nav-appearance-controls';

  return (
    <CmsStorefrontAppearanceButtons
      className={appearanceControlsClassName}
      label='Kangur appearance'
      modeLabels={kangurAppearanceLabels}
      modes={[...kangurAppearanceModes]}
      testId={appearanceControlsTestId}
      tone={kangurAppearanceTone}
    />
  );
}
