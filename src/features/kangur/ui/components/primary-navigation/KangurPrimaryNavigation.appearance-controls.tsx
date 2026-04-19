'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import {
  useOptionalCmsStorefrontAppearance,
} from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';

const CmsStorefrontAppearanceButtons = dynamic(() =>
  import('@/shared/ui/cms-appearance/CmsStorefrontAppearance').then((m) => ({
    default: m.CmsStorefrontAppearanceButtons,
  }))
);

const KANGUR_PRIMARY_NAV_APPEARANCE_LABELS = {
  default: 'Daily',
  dawn: 'Dawn',
  sunset: 'Sunset',
  dark: 'Nightly',
} satisfies Record<'dark' | 'dawn' | 'default' | 'sunset', string>;

const KANGUR_PRIMARY_NAV_APPEARANCE_MODES = ['default', 'dawn', 'sunset', 'dark'] as const;

export function useKangurPrimaryNavigationHasAppearanceControls(): boolean {
  return useOptionalCmsStorefrontAppearance() != null;
}

export function KangurPrimaryNavigationAppearanceControls({
  inline,
  tone,
}: {
  inline?: boolean;
  tone: ReturnType<typeof useKangurStorefrontAppearance>['tone'];
}): React.ReactNode {
  const storefrontAppearance = useOptionalCmsStorefrontAppearance();

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
      modeLabels={KANGUR_PRIMARY_NAV_APPEARANCE_LABELS}
      modes={[...KANGUR_PRIMARY_NAV_APPEARANCE_MODES]}
      testId={appearanceControlsTestId}
      tone={tone}
    />
  );
}
