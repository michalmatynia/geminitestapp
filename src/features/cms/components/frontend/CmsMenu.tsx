'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { getGsapFromVars } from '@/features/gsap/utils/presets';
import type { MenuSettings } from '@/shared/contracts/cms-menu';
import type { ColorSchemeColors } from '@/shared/contracts/cms-theme';

const isExternalUrl = (url: string): boolean => /^https?:\/\//i.test(url);

type CmsMenuProps = {
  menu: MenuSettings;
  colorSchemes?: Record<string, ColorSchemeColors>;
  animationsEnabled?: boolean;
};

export function CmsMenu({
  menu,
  colorSchemes,
  animationsEnabled = true,
}: CmsMenuProps): React.ReactNode {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const itemsRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(
    menu.collapsible ? menu.collapsedByDefault : false
  );
  const positionMode = menu.positionMode ?? (menu.stickyEnabled ? 'sticky' : 'static');
  const isSide = menu.menuPlacement === 'left' || menu.menuPlacement === 'right';
  const isStickyMode = positionMode === 'sticky';
  const allowHideOnScroll = menu.hideOnScroll && (isSide || isStickyMode);
  const showOnScrollUpAfterPx = Math.max(0, menu.showOnScrollUpAfterPx ?? 0);
  const [isHiddenOnScroll, setIsHiddenOnScroll] = useState<boolean>(false);

  useEffect(() => {
    setCollapsed(menu.collapsible ? menu.collapsedByDefault : false);
  }, [menu.collapsible, menu.collapsedByDefault, menu.menuPlacement]);

  useEffect(() => {
    setIsHiddenOnScroll(false);
  }, [menu.menuPlacement, menu.hideOnScroll, positionMode]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!allowHideOnScroll) {
      setIsHiddenOnScroll(false);
      return;
    }
    let lastY = typeof window !== 'undefined' ? window.scrollY : 0;
    let hiddenAtY = lastY;
    const threshold = 8;
    const handleScroll = (): void => {
      const currentY = window.scrollY;
      const delta = currentY - lastY;
      if (Math.abs(delta) < threshold) return;
      if (currentY <= 0) {
        setIsHiddenOnScroll(false);
        hiddenAtY = 0;
      } else if (delta > 0) {
        setIsHiddenOnScroll(true);
        hiddenAtY = currentY;
      } else {
        if (showOnScrollUpAfterPx <= 0 || hiddenAtY - currentY >= showOnScrollUpAfterPx) {
          setIsHiddenOnScroll(false);
        }
      }
      lastY = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return (): void => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [allowHideOnScroll, showOnScrollUpAfterPx]);

  const resolvedColors = useMemo((): {
    background?: string;
    text?: string;
    border?: string;
    accent?: string;
  } => {
    if (menu.menuColorSchemeId && menu.menuColorSchemeId !== 'custom') {
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
    if (menu.menuEntryAnimation === 'none') return;
    let ctx: { revert?: () => void } | null = null;
    let cancelled = false;
    void import('gsap').then((module: typeof import('gsap')) => {
      const { gsap } = module;
      if (cancelled) return;
      const items = itemsRef.current?.querySelectorAll('[data-menu-item]');
      if (!items || items.length === 0) return;
      const vars: GSAPTweenVars = getGsapFromVars(menu.menuEntryAnimation);
      if (!vars) return;
      const entryVars: GSAPTweenVars = {
        ...vars,
        duration: 0.6,
        ease: 'power3.out',
        stagger: menu.menuEntryAnimation === 'stagger' ? 0.06 : 0,
      };
      ctx = gsap.context(() => {
        gsap.from(items, entryVars);
      }, itemsRef);
    });
    return (): void => {
      cancelled = true;
      ctx?.revert?.();
    };
  }, [menu.menuEntryAnimation, menu.items.length, animationsEnabled]);

  useEffect(() => {
    if (!animationsEnabled) return;
    if (menu.menuHoverAnimation === 'none') return;
    const fromVars: GSAPTweenVars = getGsapFromVars(menu.menuHoverAnimation);
    if (!fromVars) return;
    let cancelled = false;
    const cleanups: Array<() => void> = [];
    void import('gsap').then((module: typeof import('gsap')) => {
      const { gsap } = module;
      if (cancelled) return;
      const items = itemsRef.current?.querySelectorAll('[data-menu-item]');
      if (!items || items.length === 0) return;
      const resetVars: GSAPTweenVars = {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        rotationX: 0,
        rotationY: 0,
        skewX: 0,
        skewY: 0,
        filter: 'blur(0px)',
      };
      items.forEach((item: Element) => {
        const onEnter = (): void => {
          const hoverFromVars: GSAPTweenVars = { ...fromVars };
          const hoverToVars: GSAPTweenVars = { ...resetVars, duration: 0.3, ease: 'power2.out' };
          gsap.fromTo(item, hoverFromVars, hoverToVars);
        };
        const onLeave = (): void => {
          const hoverLeaveVars: GSAPTweenVars = { ...resetVars, duration: 0.2, ease: 'power2.out' };
          gsap.to(item, hoverLeaveVars);
        };
        item.addEventListener('mouseenter', onEnter);
        item.addEventListener('mouseleave', onLeave);
        cleanups.push((): void => {
          item.removeEventListener('mouseenter', onEnter);
          item.removeEventListener('mouseleave', onLeave);
        });
      });
    });
    return (): void => {
      cancelled = true;
      cleanups.forEach((fn: () => void) => fn());
    };
  }, [menu.menuHoverAnimation, menu.items.length, animationsEnabled]);

  if (!menu.showMenu) return null;

  const width = collapsed && menu.collapsible ? menu.collapsedWidth : menu.sideWidth;
  const hideTransform = isSide
    ? menu.menuPlacement === 'right'
      ? 'translateX(110%)'
      : 'translateX(-110%)'
    : 'translateY(-110%)';
  const transitions = [
    menu.collapsible ? 'width 200ms ease' : null,
    allowHideOnScroll ? 'transform 220ms ease, opacity 220ms ease' : null,
  ]
    .filter(Boolean)
    .join(', ');

  const navStyle: React.CSSProperties = {
    backgroundColor: resolvedColors.background,
    color: resolvedColors.text,
    borderBottom:
      !isSide && resolvedColors.border ? `1px solid ${resolvedColors.border}` : undefined,
    borderRight:
      menu.menuPlacement === 'left' && resolvedColors.border
        ? `1px solid ${resolvedColors.border}`
        : undefined,
    borderLeft:
      menu.menuPlacement === 'right' && resolvedColors.border
        ? `1px solid ${resolvedColors.border}`
        : undefined,
    paddingTop: menu.paddingTop,
    paddingBottom: menu.paddingBottom,
    paddingLeft: menu.paddingLeft,
    paddingRight: menu.paddingRight,
    fontFamily: menu.fontFamily,
    fontSize: `${menu.fontSize}px`,
    fontWeight: menu.fontWeight as React.CSSProperties['fontWeight'],
    letterSpacing: menu.letterSpacing ? `${menu.letterSpacing}px` : undefined,
    textTransform: menu.textTransform as React.CSSProperties['textTransform'],
    position: isSide ? 'fixed' : isStickyMode ? 'sticky' : 'relative',
    top: isSide ? 0 : isStickyMode ? menu.stickyOffset : undefined,
    bottom: isSide ? 0 : undefined,
    left: menu.menuPlacement === 'left' ? 0 : undefined,
    right: menu.menuPlacement === 'right' ? 0 : undefined,
    zIndex: isStickyMode || isSide ? 50 : undefined,
    width: isSide ? width : '100%',
    transition: transitions || undefined,
    transform: allowHideOnScroll && isHiddenOnScroll ? hideTransform : undefined,
    opacity: allowHideOnScroll && isHiddenOnScroll ? 0 : 1,
    pointerEvents: allowHideOnScroll && isHiddenOnScroll ? 'none' : undefined,
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: !isSide && menu.fullWidth ? undefined : menu.maxWidth,
    margin: !isSide && menu.fullWidth ? undefined : '0 auto',
    width: '100%',
    display: 'flex',
    flexDirection: menu.layoutStyle === 'vertical' || isSide ? 'column' : 'row',
    alignItems: menu.layoutStyle === 'vertical' || isSide ? 'flex-start' : 'center',
    justifyContent:
      menu.alignment === 'center'
        ? 'center'
        : menu.alignment === 'right'
          ? 'flex-end'
          : menu.alignment === 'space-between'
            ? 'space-between'
            : 'flex-start',
    gap: menu.itemGap,
  };

  const itemsStyle: React.CSSProperties = {
    display: collapsed && menu.collapsible ? 'none' : 'flex',
    flexDirection: menu.layoutStyle === 'vertical' || isSide ? 'column' : 'row',
    gap: menu.itemGap,
    alignItems: menu.layoutStyle === 'vertical' || isSide ? 'flex-start' : 'center',
  };

  return (
    <nav style={navStyle}>
      <div style={containerStyle}>
        {menu.collapsible && (
          <button
            type='button'
            onClick={(): void => setCollapsed((prev: boolean) => !prev)}
            className='mb-2 inline-flex items-center gap-2 rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/80 hover:bg-white/10'
          >
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
        )}
        <div style={itemsStyle} ref={itemsRef}>
          {menu.items.map((item: { id: string; url: string; label: string; imageUrl?: string }) => {
            const isActive = hydrated ? pathname === item.url : false;
            const color = isActive ? resolvedColors.accent : resolvedColors.text;
            const activeStyles: React.CSSProperties = {};
            if (isActive) {
              switch (menu.activeStyle) {
                case 'underline':
                  activeStyles.textDecoration = 'underline';
                  break;
                case 'bold':
                  activeStyles.fontWeight = '700';
                  break;
                case 'background':
                  activeStyles.backgroundColor = `${resolvedColors.accent}22`;
                  activeStyles.borderRadius = 6;
                  activeStyles.padding = '2px 6px';
                  break;
                case 'border-bottom':
                  activeStyles.borderBottom = `2px solid ${resolvedColors.accent}`;
                  break;
                default:
                  break;
              }
            }

            const content = (
              <>
                {menu.showItemImages && item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt=''
                    width={menu.itemImageSize}
                    height={menu.itemImageSize}
                    style={{ objectFit: 'cover', borderRadius: 6 }}
                  />
                )}
                <span>{item.label}</span>
              </>
            );
            const className = 'inline-flex items-center gap-2';
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
                target='_blank'
                rel='noreferrer'
                data-menu-item
              >
                {content}
              </a>
            ) : (
              <Link
                key={item.id}
                href={item.url || '/'}
                className={className}
                style={style}
                data-menu-item
              >
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
