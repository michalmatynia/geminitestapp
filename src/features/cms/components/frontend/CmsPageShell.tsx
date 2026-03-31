import { CmsMenu } from '@/features/cms/components/frontend/CmsMenu';
import {
  resolveCmsStorefrontAppearance,
  useOptionalCmsStorefrontAppearance,
} from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';
import type { MenuSettings } from '@/shared/contracts/cms-menu';
import type { ColorSchemeColors, ThemeSettings } from '@/shared/contracts/cms-theme';

import type { CSSProperties } from 'react';

type CmsPageShellProps = {
  menu: MenuSettings;
  theme: ThemeSettings;
  colorSchemes: Record<string, ColorSchemeColors>;
  showMenu?: boolean;
  children: React.ReactNode;
};

export function CmsPageShell(props: CmsPageShellProps): React.ReactNode {
  const { menu, theme, colorSchemes, showMenu = true, children } = props;

  const menuVisible = menu.showMenu && showMenu;
  const basePadding = typeof theme.pagePadding === 'number' ? theme.pagePadding : 0;
  const baseMargin = typeof theme.pageMargin === 'number' ? theme.pageMargin : 0;
  const paddingTop = typeof theme.pagePaddingTop === 'number' ? theme.pagePaddingTop : basePadding;
  const paddingRight =
    typeof theme.pagePaddingRight === 'number' ? theme.pagePaddingRight : basePadding;
  const paddingBottom =
    typeof theme.pagePaddingBottom === 'number' ? theme.pagePaddingBottom : basePadding;
  const paddingLeft =
    typeof theme.pagePaddingLeft === 'number' ? theme.pagePaddingLeft : basePadding;
  const marginTop = typeof theme.pageMarginTop === 'number' ? theme.pageMarginTop : baseMargin;
  const marginRight =
    typeof theme.pageMarginRight === 'number' ? theme.pageMarginRight : baseMargin;
  const marginBottom =
    typeof theme.pageMarginBottom === 'number' ? theme.pageMarginBottom : baseMargin;
  const marginLeft = typeof theme.pageMarginLeft === 'number' ? theme.pageMarginLeft : baseMargin;
  const isSideMenu =
    menuVisible && (menu.menuPlacement === 'left' || menu.menuPlacement === 'right');
  const sideOffset = isSideMenu ? menu.sideWidth : 0;
  const pageRadius = typeof theme.borderRadius === 'number' ? theme.borderRadius : 0;
  const contentStyle: CSSProperties = {
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
  };

  if (isSideMenu) {
    if (menu.menuPlacement === 'left') {
      contentStyle.paddingLeft = paddingLeft + sideOffset;
    } else {
      contentStyle.paddingRight = paddingRight + sideOffset;
    }
  }

  return (
    <CmsPageShellFrame
      menu={menu}
      theme={theme}
      colorSchemes={colorSchemes}
      animationsEnabled={theme.enableAnimations}
      menuVisible={menuVisible}
      pageRadius={pageRadius}
      contentStyle={contentStyle}
    >
      {children}
    </CmsPageShellFrame>
  );
}

function CmsPageShellFrame({
  menu,
  theme,
  colorSchemes,
  animationsEnabled,
  menuVisible,
  pageRadius,
  contentStyle,
  children,
}: {
  menu: MenuSettings;
  theme: ThemeSettings;
  colorSchemes: Record<string, ColorSchemeColors>;
  animationsEnabled: boolean;
  menuVisible: boolean;
  pageRadius: number;
  contentStyle: CSSProperties;
  children: React.ReactNode;
}): React.JSX.Element {
  const appearance = useOptionalCmsStorefrontAppearance();
  const appearanceMode = appearance?.mode ?? 'default';
  const storefrontAppearance = resolveCmsStorefrontAppearance(theme, appearanceMode);
  const menuConfig = menu;
  const menuColorSchemes = colorSchemes;
  const menuAnimationsEnabled = animationsEnabled;

  const pageStyle: CSSProperties = {
    backgroundColor: storefrontAppearance.pageTone.background,
    color: storefrontAppearance.pageTone.text,
    borderRadius: pageRadius > 0 ? pageRadius : undefined,
    overflow: pageRadius > 0 ? 'hidden' : undefined,
    ...storefrontAppearance.vars,
  };

  return (
    <div
      style={pageStyle}
      data-appearance-mode={appearanceMode}
      data-cms-appearance-scope='true'
      suppressHydrationWarning
    >
      {menuVisible ? (
        <CmsMenu
          menu={menuConfig}
          colorSchemes={menuColorSchemes}
          animationsEnabled={menuAnimationsEnabled}
        />
      ) : null}
      <div style={contentStyle} suppressHydrationWarning>
        {children}
      </div>
    </div>
  );
}
