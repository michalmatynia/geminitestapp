import type { CSSProperties, JSX } from "react";
import { getCmsMenuSettings } from "@/features/cms/services/cms-menu-settings";
import { getCmsThemeSettings } from "@/features/cms/services/cms-theme-settings";
import { CmsMenu } from "@/features/cms/components/frontend/CmsMenu";
import { buildColorSchemeMap } from "@/features/cms/types/theme-settings";

export default async function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  const menu = await getCmsMenuSettings();
  const themeSettings = await getCmsThemeSettings();
  const colorSchemes = buildColorSchemeMap(themeSettings);
  const basePadding = typeof themeSettings.pagePadding === "number" ? themeSettings.pagePadding : 0;
  const baseMargin = typeof themeSettings.pageMargin === "number" ? themeSettings.pageMargin : 0;
  const paddingTop = typeof themeSettings.pagePaddingTop === "number" ? themeSettings.pagePaddingTop : basePadding;
  const paddingRight = typeof themeSettings.pagePaddingRight === "number" ? themeSettings.pagePaddingRight : basePadding;
  const paddingBottom = typeof themeSettings.pagePaddingBottom === "number" ? themeSettings.pagePaddingBottom : basePadding;
  const paddingLeft = typeof themeSettings.pagePaddingLeft === "number" ? themeSettings.pagePaddingLeft : basePadding;
  const marginTop = typeof themeSettings.pageMarginTop === "number" ? themeSettings.pageMarginTop : baseMargin;
  const marginRight = typeof themeSettings.pageMarginRight === "number" ? themeSettings.pageMarginRight : baseMargin;
  const marginBottom = typeof themeSettings.pageMarginBottom === "number" ? themeSettings.pageMarginBottom : baseMargin;
  const marginLeft = typeof themeSettings.pageMarginLeft === "number" ? themeSettings.pageMarginLeft : baseMargin;
  const isSideMenu = menu.showMenu && (menu.menuPlacement === "left" || menu.menuPlacement === "right");
  const sideOffset = isSideMenu ? menu.sideWidth : 0;
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
    <div>
      <CmsMenu menu={menu} colorSchemes={colorSchemes} animationsEnabled={themeSettings.enableAnimations} />
      <main style={contentStyle}>{children}</main>
    </div>
  );
}
