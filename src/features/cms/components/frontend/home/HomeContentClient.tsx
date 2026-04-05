import type { PageComponentInput } from '@/shared/contracts/cms';
import type { MenuSettings } from '@/shared/contracts/cms-menu';
import type { ColorSchemeColors, ThemeSettings } from '@/shared/contracts/cms-theme';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { CmsPageShell } from '@/features/cms/components/frontend/CmsPageShell';

import { HomeCmsDefaultContent } from './home-cms-default-content';
import { HomeFallbackContent } from './home-fallback-content';

type CmsVariantProps = {
  variant: 'cms';
  menu: MenuSettings;
  theme: ThemeSettings;
  colorSchemes: Record<string, ColorSchemeColors>;
  showMenu: boolean;
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
      <HomeCmsDefaultContent
        themeSettings={props.theme}
        colorSchemes={props.colorSchemes}
        hasCmsContent={props.hasCmsContent}
        defaultSlug={props.defaultSlug}
        rendererComponents={props.rendererComponents}
      />
    );
  }

  return (
    <HomeFallbackContent
      showFallbackHeader={props.showFallbackHeader}
      products={props.products}
      themeSettings={props.theme}
      appearanceTone={props.appearanceTone}
    />
  );
}

function renderHomeContentClientShell(props: HomeContentClientProps): React.JSX.Element {
  return (
    <CmsPageShell
      menu={props.menu}
      theme={props.theme}
      colorSchemes={props.colorSchemes}
      showMenu={props.showMenu}
    >
      {renderHomeContentVariant(props)}
    </CmsPageShell>
  );
}

export function HomeContentClient(props: HomeContentClientProps): React.JSX.Element {
  return renderHomeContentClientShell(props);
}
