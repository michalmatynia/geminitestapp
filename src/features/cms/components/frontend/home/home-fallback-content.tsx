'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { CmsAppearanceTone } from '@/features/cms/components/frontend/CmsStorefrontAppearance';
import type { ProductWithImages } from '@/shared/contracts/products';

import { HomeFallbackCollections } from './home-fallback-content.collections';
import {
  HomeFallbackFooterWithTheme,
  type SocialThemeSettings,
} from './home-fallback-content.footer';
import { HomeFallbackHeader } from './home-fallback-content.header';
import { HomeFallbackHero } from './home-fallback-content.hero';
import { HomeFallbackHighlights } from './home-fallback-content.highlights';
import { HomeFallbackNextSteps } from './home-fallback-content.next-steps';
import { HomeFallbackProducts } from './home-fallback-content.products';
import { HomeFallbackSignature } from './home-fallback-content.signature';
import { SectionDivider } from './home-fallback-content.section-divider';

export type HomeFallbackContentProps = {
  showFallbackHeader: boolean;
  products: ProductWithImages[];
  themeSettings: SocialThemeSettings;
  appearanceTone?: CmsAppearanceTone;
};

export function renderHomeFallbackContent({
  showFallbackHeader,
  products,
  themeSettings,
  appearanceTone,
}: HomeFallbackContentProps): React.JSX.Element {
  const dividerTranslations = useTranslations('FallbackHome.Dividers');

  return (
    <div className='flex min-h-screen flex-col'>
      {showFallbackHeader ? <HomeFallbackHeader appearanceTone={appearanceTone} /> : null}

      <div className='flex-1'>
        <HomeFallbackHero appearanceTone={appearanceTone} collectionCount={5} />

        <SectionDivider label={dividerTranslations('editorial')} />
        <HomeFallbackSignature products={products} />

        <SectionDivider label={dividerTranslations('highlights')} />
        <HomeFallbackHighlights />

        <SectionDivider label={dividerTranslations('collections')} />
        <HomeFallbackCollections />

        <SectionDivider label={dividerTranslations('catalog')} />
        <HomeFallbackProducts products={products} />

        <HomeFallbackNextSteps />
      </div>

      {showFallbackHeader ? <HomeFallbackFooterWithTheme themeSettings={themeSettings} /> : null}
    </div>
  );
}
