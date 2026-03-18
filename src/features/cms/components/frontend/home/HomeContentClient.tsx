'use client';

import React from 'react';

import type { PageComponent } from '@/shared/contracts/cms';
import type { MenuSettings } from '@/shared/contracts/cms-menu';
import type { ColorSchemeColors, ThemeSettings } from '@/shared/contracts/cms-theme';
import type { ProductWithImages } from '@/shared/contracts/products';

const LazyCmsPageShell = React.lazy(() =>
  import('@/features/cms/components/frontend/CmsPageShell').then((mod) => ({
    default: mod.CmsPageShell,
  }))
);
const LazyHomeCmsDefaultContent = React.lazy(() =>
  import('./home-cms-default-content').then((mod) => ({
    default: mod.HomeCmsDefaultContent,
  }))
);
const LazyHomeFallbackContent = React.lazy(() =>
  import('./home-fallback-content').then((mod) => ({
    default: mod.HomeFallbackContent,
  }))
);

type CmsVariantProps = {
  variant: 'cms';
  menu: MenuSettings;
  theme: ThemeSettings;
  colorSchemes: Record<string, ColorSchemeColors>;
  showMenu: boolean;
  loadingLabel: string;
  hasCmsContent: boolean;
  defaultSlug: string;
  rendererComponents: PageComponent[];
};

type FallbackVariantProps = {
  variant: 'fallback';
  menu: MenuSettings;
  theme: ThemeSettings;
  colorSchemes: Record<string, ColorSchemeColors>;
  showMenu: boolean;
  loadingLabel: string;
  products: ProductWithImages[];
  showFallbackHeader: boolean;
  appearanceTone: {
    background: string;
    text: string;
    border: string;
    accent: string;
  };
};

type HomeContentClientProps = CmsVariantProps | FallbackVariantProps;

export function HomeContentClient(props: HomeContentClientProps): React.JSX.Element {
  return (
    <React.Suspense
      fallback={
        <div
          className='min-h-[420px] rounded-xl border border-border/40 bg-card/20 p-6 text-sm text-muted-foreground'
          role='status'
          aria-live='polite'
          aria-atomic='true'
        >
          {props.loadingLabel}
        </div>
      }
    >
      <LazyCmsPageShell
        menu={props.menu}
        theme={props.theme}
        colorSchemes={props.colorSchemes}
        showMenu={props.showMenu}
      >
        {props.variant === 'cms' ? (
          <LazyHomeCmsDefaultContent
            themeSettings={props.theme}
            colorSchemes={props.colorSchemes}
            hasCmsContent={props.hasCmsContent}
            defaultSlug={props.defaultSlug}
            rendererComponents={props.rendererComponents}
          />
        ) : (
          <LazyHomeFallbackContent
            showFallbackHeader={props.showFallbackHeader}
            products={props.products}
            themeSettings={props.theme}
            appearanceTone={props.appearanceTone}
          />
        )}
      </LazyCmsPageShell>
    </React.Suspense>
  );
}
