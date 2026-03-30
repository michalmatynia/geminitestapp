import React from 'react';

import type { PageComponentInput } from '@/shared/contracts/cms';
import type { MenuSettings } from '@/shared/contracts/cms-menu';
import type { ColorSchemeColors, ThemeSettings } from '@/shared/contracts/cms-theme';
import type { ProductWithImages } from '@/shared/contracts/products';
import { LoadingPanel } from '@/shared/ui/LoadingPanel';

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
    default: function LazyHomeFallbackContentEntry(props: import('./home-fallback-content').HomeFallbackContentProps) {
      return mod.renderHomeFallbackContent(props);
    },
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
  rendererComponents: PageComponentInput[];
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

function renderHomeContentVariant(props: HomeContentClientProps): React.JSX.Element {
  if (props.variant === 'cms') {
    return (
      <LazyHomeCmsDefaultContent
        themeSettings={props.theme}
        colorSchemes={props.colorSchemes}
        hasCmsContent={props.hasCmsContent}
        defaultSlug={props.defaultSlug}
        rendererComponents={props.rendererComponents}
      />
    );
  }

  return (
    <LazyHomeFallbackContent
      showFallbackHeader={props.showFallbackHeader}
      products={props.products}
      themeSettings={props.theme}
      appearanceTone={props.appearanceTone}
    />
  );
}

function renderHomeContentClientShell(props: HomeContentClientProps): React.JSX.Element {
  return (
    <React.Suspense
      fallback={<LoadingPanel>{props.loadingLabel}</LoadingPanel>}
    >
      <LazyCmsPageShell
        menu={props.menu}
        theme={props.theme}
        colorSchemes={props.colorSchemes}
        showMenu={props.showMenu}
      >
        <React.Suspense
          fallback={<LoadingPanel>{props.loadingLabel}</LoadingPanel>}
        >
          {renderHomeContentVariant(props)}
        </React.Suspense>
      </LazyCmsPageShell>
    </React.Suspense>
  );
}

export function HomeContentClient(props: HomeContentClientProps): React.JSX.Element {
  return renderHomeContentClientShell(props);
}
