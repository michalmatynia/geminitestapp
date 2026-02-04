import type { CSSProperties } from "react";
import { CmsMenu } from "@/features/cms/components/frontend/CmsMenu";
import type { MenuSettings } from "@/features/cms/types/menu-settings";
import type { ColorSchemeColors, ThemeSettings } from "@/features/cms/types/theme-settings";

type CmsPageShellProps = {
  menu: MenuSettings;
  theme: ThemeSettings;
  colorSchemes: Record<string, ColorSchemeColors>;
  showMenu?: boolean;
  children: React.ReactNode;
};

export function CmsPageShell({
  menu,
  theme,
  colorSchemes,
  showMenu = true,
  children,
}: CmsPageShellProps): React.ReactNode {
  const menuVisible = menu.showMenu && showMenu;
  const basePadding = typeof theme.pagePadding === "number" ? theme.pagePadding : 0;
  const baseMargin = typeof theme.pageMargin === "number" ? theme.pageMargin : 0;
  const paddingTop = typeof theme.pagePaddingTop === "number" ? theme.pagePaddingTop : basePadding;
  const paddingRight = typeof theme.pagePaddingRight === "number" ? theme.pagePaddingRight : basePadding;
  const paddingBottom = typeof theme.pagePaddingBottom === "number" ? theme.pagePaddingBottom : basePadding;
  const paddingLeft = typeof theme.pagePaddingLeft === "number" ? theme.pagePaddingLeft : basePadding;
  const marginTop = typeof theme.pageMarginTop === "number" ? theme.pageMarginTop : baseMargin;
  const marginRight = typeof theme.pageMarginRight === "number" ? theme.pageMarginRight : baseMargin;
  const marginBottom = typeof theme.pageMarginBottom === "number" ? theme.pageMarginBottom : baseMargin;
  const marginLeft = typeof theme.pageMarginLeft === "number" ? theme.pageMarginLeft : baseMargin;
  const isSideMenu = menuVisible && (menu.menuPlacement === "left" || menu.menuPlacement === "right");
  const sideOffset = isSideMenu ? menu.sideWidth : 0;
  const pageRadius = typeof theme.borderRadius === "number" ? theme.borderRadius : 0;
  const pageStyle: CSSProperties = {
    backgroundColor: theme.backgroundColor,
    borderRadius: pageRadius > 0 ? pageRadius : undefined,
    overflow: pageRadius > 0 ? "hidden" : undefined,
  };
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
    if (menu.menuPlacement === "left") {
      contentStyle.paddingLeft = paddingLeft + sideOffset;
    } else {
      contentStyle.paddingRight = paddingRight + sideOffset;
    }
  }

  return (
    <div style={pageStyle} suppressHydrationWarning>
      {menuVisible ? (
        <CmsMenu
          menu={menu}
          colorSchemes={colorSchemes}
          animationsEnabled={theme.enableAnimations}
        />
      ) : null}
      <main style={contentStyle} suppressHydrationWarning>{children}</main>
    </div>
  );
}
