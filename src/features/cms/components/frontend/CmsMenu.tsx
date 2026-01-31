"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MenuSettings } from "@/features/cms/types/menu-settings";
import type { ColorSchemeColors } from "@/features/cms/types/theme-settings";
import type { AnimationPreset } from "@/features/gsap/types/animation";
import { getGsapFromVars } from "@/features/gsap/utils/presets";

const isExternalUrl = (url: string): boolean => /^https?:\/\//i.test(url);

type CmsMenuProps = {
  menu: MenuSettings;
  colorSchemes?: Record<string, ColorSchemeColors>;
  animationsEnabled?: boolean;
};

const getHoverAnimationVars = (preset: AnimationPreset): gsap.TweenVars | null => {
  if (preset === "none") return null;
  return getGsapFromVars(preset);
};

export function CmsMenu({ menu, colorSchemes, animationsEnabled = true }: CmsMenuProps): React.ReactNode {
  const pathname = usePathname();
  const itemsRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(
    menu.collapsible ? menu.collapsedByDefault : false
  );

  useEffect(() => {
    setCollapsed(menu.collapsible ? menu.collapsedByDefault : false);
  }, [menu.collapsible, menu.collapsedByDefault, menu.menuPlacement]);

  const resolvedColors = useMemo(() => {
    if (menu.menuColorSchemeId && menu.menuColorSchemeId !== "custom") {
      const scheme = colorSchemes?.[menu.menuColorSchemeId];
      if (scheme) {
        return {
          background: scheme.surface,
          text: scheme.text,
          border: scheme.border,
          accent: scheme.accent,
        };
      }
    }
    return {
      background: menu.backgroundColor,
      text: menu.textColor,
      border: menu.borderColor,
      accent: menu.activeColor || menu.activeItemColor || menu.textColor,
    };
  }, [menu, colorSchemes]);

  useEffect(() => {
    if (!animationsEnabled) return;
    if (menu.menuEntryAnimation === "none") return;
    let ctx: { revert?: () => void } | null = null;
    let cancelled = false;
    void import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      const items = itemsRef.current?.querySelectorAll("[data-menu-item]");
      if (!items || items.length === 0) return;
      const vars = getPresetVars(menu.menuEntryAnimation);
      if (!vars) return;
      ctx = gsap.context(() => {
        gsap.from(items, {
          ...vars,
          duration: 0.6,
          ease: "power3.out",
          stagger: menu.menuEntryAnimation === "stagger" ? 0.06 : 0,
        });
      }, itemsRef);
    });
    return () => {
      cancelled = true;
      ctx?.revert?.();
    };
  }, [menu.menuEntryAnimation, menu.items.length, animationsEnabled]);

  useEffect(() => {
    if (!animationsEnabled) return;
    if (menu.menuHoverAnimation === "none") return;
    const fromVars = getPresetVars(menu.menuHoverAnimation);
    if (!fromVars) return;
    let cancelled = false;
    const cleanups: Array<() => void> = [];
    void import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      const items = itemsRef.current?.querySelectorAll("[data-menu-item]");
      if (!items || items.length === 0) return;
      const resetVars: gsap.TweenVars = {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        rotationX: 0,
        rotationY: 0,
        skewX: 0,
        skewY: 0,
        filter: "blur(0px)",
      };
      items.forEach((item) => {
        const onEnter = () => {
          gsap.fromTo(item, { ...fromVars }, { ...resetVars, duration: 0.3, ease: "power2.out" });
        };
        const onLeave = () => {
          gsap.to(item, { ...resetVars, duration: 0.2, ease: "power2.out" });
        };
        item.addEventListener("mouseenter", onEnter);
        item.addEventListener("mouseleave", onLeave);
        cleanups.push(() => {
          item.removeEventListener("mouseenter", onEnter);
          item.removeEventListener("mouseleave", onLeave);
        });
      });
    });
    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
  }, [menu.menuHoverAnimation, menu.items.length, animationsEnabled]);

  if (!menu.showMenu) return null;

  const isSide = menu.menuPlacement === "left" || menu.menuPlacement === "right";
  const width = collapsed && menu.collapsible ? menu.collapsedWidth : menu.sideWidth;

  const navStyle: React.CSSProperties = {
    backgroundColor: resolvedColors.background,
    color: resolvedColors.text,
    borderBottom: !isSide && resolvedColors.border ? `1px solid ${resolvedColors.border}` : undefined,
    borderRight: menu.menuPlacement === "left" && resolvedColors.border ? `1px solid ${resolvedColors.border}` : undefined,
    borderLeft: menu.menuPlacement === "right" && resolvedColors.border ? `1px solid ${resolvedColors.border}` : undefined,
    paddingTop: menu.paddingTop,
    paddingBottom: menu.paddingBottom,
    paddingLeft: menu.paddingLeft,
    paddingRight: menu.paddingRight,
    fontFamily: menu.fontFamily,
    fontSize: `${menu.fontSize}px`,
    fontWeight: menu.fontWeight as React.CSSProperties["fontWeight"],
    letterSpacing: menu.letterSpacing ? `${menu.letterSpacing}px` : undefined,
    textTransform: menu.textTransform as React.CSSProperties["textTransform"],
    position: menu.stickyEnabled && !isSide ? "sticky" : isSide ? "fixed" : "relative",
    top: menu.stickyEnabled ? menu.stickyOffset : isSide ? 0 : undefined,
    bottom: isSide ? 0 : undefined,
    left: menu.menuPlacement === "left" ? 0 : undefined,
    right: menu.menuPlacement === "right" ? 0 : undefined,
    zIndex: menu.stickyEnabled || isSide ? 50 : undefined,
    width: isSide ? width : "100%",
    transition: menu.collapsible ? "width 200ms ease" : undefined,
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: !isSide && menu.fullWidth ? undefined : menu.maxWidth,
    margin: !isSide && menu.fullWidth ? undefined : "0 auto",
    width: "100%",
    display: "flex",
    flexDirection: menu.layoutStyle === "vertical" || isSide ? "column" : "row",
    alignItems: menu.layoutStyle === "vertical" || isSide ? "flex-start" : "center",
    justifyContent:
      menu.alignment === "center"
        ? "center"
        : menu.alignment === "right"
          ? "flex-end"
          : menu.alignment === "space-between"
            ? "space-between"
            : "flex-start",
    gap: menu.layoutStyle === "vertical" || isSide ? menu.itemGap : menu.itemGap,
  };

  const itemsStyle: React.CSSProperties = {
    display: collapsed && menu.collapsible ? "none" : "flex",
    flexDirection: menu.layoutStyle === "vertical" || isSide ? "column" : "row",
    gap: menu.itemGap,
    alignItems: menu.layoutStyle === "vertical" || isSide ? "flex-start" : "center",
  };

  return (
    <nav style={navStyle}>
      <div style={containerStyle}>
        {menu.collapsible && (
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="mb-2 inline-flex items-center gap-2 rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/80 hover:bg-white/10"
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        )}
        <div style={itemsStyle} ref={itemsRef}>
          {menu.items.map((item) => {
            const isActive = pathname === item.url;
            const color = isActive ? resolvedColors.accent : resolvedColors.text;
            const activeStyles: React.CSSProperties = {};
            if (isActive) {
              switch (menu.activeStyle) {
                case "underline":
                  activeStyles.textDecoration = "underline";
                  break;
                case "bold":
                  activeStyles.fontWeight = "700";
                  break;
                case "background":
                  activeStyles.backgroundColor = `${resolvedColors.accent}22`;
                  activeStyles.borderRadius = 6;
                  activeStyles.padding = "2px 6px";
                  break;
                case "border-bottom":
                  activeStyles.borderBottom = `2px solid ${resolvedColors.accent}`;
                  break;
                default:
                  break;
              }
            }

            const content = (
              <>
                {menu.showItemImages && item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt=""
                    width={menu.itemImageSize}
                    height={menu.itemImageSize}
                    style={{ width: menu.itemImageSize, height: menu.itemImageSize, objectFit: "cover", borderRadius: 6 }}
                  />
                )}
                <span>{item.label}</span>
              </>
            );
            const className = "inline-flex items-center gap-2";
            const style = {
              color,
              transition: `color ${menu.transitionSpeed}ms ease`,
              ...activeStyles,
            } as React.CSSProperties;
            return isExternalUrl(item.url) ? (
              <a
                key={item.id}
                href={item.url}
                className={className}
                style={style}
                target="_blank"
                rel="noreferrer"
                data-menu-item
              >
                {content}
              </a>
            ) : (
              <Link key={item.id} href={item.url || "/"} className={className} style={style} data-menu-item>
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
