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
  const contentPadding = themeSettings.pagePadding ?? 0;
  const contentMargin = themeSettings.pageMargin ?? 0;
  const isSideMenu = menu.showMenu && (menu.menuPlacement === "left" || menu.menuPlacement === "right");
  const sideOffset = isSideMenu ? menu.sideWidth : 0;
  const contentStyle: CSSProperties = {
    padding: contentPadding,
    margin: contentMargin,
  };
  if (isSideMenu) {
    if (menu.menuPlacement === "left") {
      contentStyle.paddingLeft = contentPadding + sideOffset;
    } else {
      contentStyle.paddingRight = contentPadding + sideOffset;
    }
  }

  return (
    <div>
      <CmsMenu menu={menu} colorSchemes={colorSchemes} animationsEnabled={themeSettings.enableAnimations} />
      <main style={contentStyle}>{children}</main>
    </div>
  );
}
