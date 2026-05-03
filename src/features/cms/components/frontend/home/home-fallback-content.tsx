'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { CmsAppearanceTone } from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';
import type { ProductWithImages } from '@/shared/contracts/products/product';

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

import { createContext, useContext } from 'react';

type HomeFallbackContextValue = {
  products: ProductWithImages[];
  themeSettings: SocialThemeSettings;
  appearanceTone?: CmsAppearanceTone;
};

const HomeFallbackContext = createContext<HomeFallbackContextValue | null>(null);

export function useHomeFallback(): HomeFallbackContextValue {
  const context = useContext(HomeFallbackContext);
  if (!context) {
    throw new Error('useHomeFallback must be used within HomeFallbackContent');
  }
  return context;
}

export function HomeFallbackContent({
  showFallbackHeader,
  products,
  themeSettings,
  appearanceTone,
}: HomeFallbackContentProps): React.JSX.Element {
  const dividerTranslations = useTranslations('FallbackHome.Dividers');

  return (
    <HomeFallbackContext.Provider value={{ products, themeSettings, appearanceTone }}>
      <div className='flex min-h-screen flex-col'>
        {showFallbackHeader ? <HomeFallbackHeader /> : null}

        <div className='flex-1'>
          <HomeFallbackHero collectionCount={5} />

          <SectionDivider label={dividerTranslations('editorial')} />
          <HomeFallbackSignature />

          <SectionDivider label={dividerTranslations('highlights')} />
          <HomeFallbackHighlights />

          <SectionDivider label={dividerTranslations('collections')} />
          <HomeFallbackCollections />

          <SectionDivider label={dividerTranslations('catalog')} />
          <HomeFallbackProducts />

          <HomeFallbackNextSteps />
        </div>

        {showFallbackHeader ? <HomeFallbackFooterWithTheme /> : null}
      </div>
    </HomeFallbackContext.Provider>
  );
}

export function renderHomeFallbackContent(props: HomeFallbackContentProps): React.JSX.Element {
  return <HomeFallbackContent {...props} />;
}
