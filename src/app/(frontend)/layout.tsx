import type { CSSProperties, JSX } from "react";
import Link from "next/link";
import { getCmsMenuSettings } from "@/features/cms/services/cms-menu-settings";
import { getCmsThemeSettings } from "@/features/cms/services/cms-theme-settings";

const isExternalUrl = (url: string): boolean => /^https?:\/\//i.test(url);

export default async function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  const menu = await getCmsMenuSettings();
  const themeSettings = await getCmsThemeSettings();
  const hasMenu = menu.showMenu;

  const navStyle: CSSProperties = {
    backgroundColor: menu.backgroundColor,
    color: menu.textColor,
    borderBottom: menu.borderColor ? `1px solid ${menu.borderColor}` : undefined,
    paddingTop: menu.paddingTop,
    paddingBottom: menu.paddingBottom,
    paddingLeft: menu.paddingLeft,
    paddingRight: menu.paddingRight,
    fontFamily: menu.fontFamily,
    fontSize: `${menu.fontSize}px`,
    fontWeight: menu.fontWeight as React.CSSProperties["fontWeight"],
    letterSpacing: menu.letterSpacing ? `${menu.letterSpacing}px` : undefined,
    textTransform: menu.textTransform as React.CSSProperties["textTransform"],
    position: menu.stickyEnabled ? "sticky" : "relative",
    top: menu.stickyEnabled ? menu.stickyOffset : undefined,
    zIndex: menu.stickyEnabled ? 50 : undefined,
  };

  const containerStyle: CSSProperties = {
    maxWidth: menu.fullWidth ? undefined : menu.maxWidth,
    margin: menu.fullWidth ? undefined : "0 auto",
    width: "100%",
    display: "flex",
    flexDirection: menu.layoutStyle === "vertical" ? "column" : "row",
    alignItems: menu.layoutStyle === "vertical" ? "flex-start" : "center",
    justifyContent:
      menu.alignment === "center"
        ? "center"
        : menu.alignment === "right"
          ? "flex-end"
          : menu.alignment === "space-between"
            ? "space-between"
            : "flex-start",
    gap: menu.layoutStyle === "vertical" ? menu.itemGap : menu.itemGap,
  };

  const itemsStyle: CSSProperties = {
    display: "flex",
    flexDirection: menu.layoutStyle === "vertical" ? "column" : "row",
    gap: menu.itemGap,
    alignItems: menu.layoutStyle === "vertical" ? "flex-start" : "center",
  };

  return (
    <div>
      {hasMenu && (
        <nav style={navStyle}>
          <div style={containerStyle}>
            <div style={itemsStyle}>
              {menu.items.map((item) =>
                isExternalUrl(item.url) ? (
                  <a
                    key={item.id}
                    href={item.url}
                    className="transition-colors duration-200 hover:opacity-90"
                    style={{ color: menu.textColor }}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.id}
                    href={item.url || "/"}
                    className="transition-colors duration-200 hover:opacity-90"
                    style={{ color: menu.textColor }}
                  >
                    {item.label}
                  </Link>
                )
              )}
            </div>
          </div>
        </nav>
      )}
      <main style={{ padding: themeSettings.pagePadding, margin: themeSettings.pageMargin }}>{children}</main>
    </div>
  );
}
