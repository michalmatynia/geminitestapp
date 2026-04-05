'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Link as LocaleLink } from '@/i18n/navigation';
import { getGsapFromVars } from '@/features/gsap/public';
import {
  CmsStorefrontAppearanceButtons,
  resolveStorefrontAppearanceTone,
  useOptionalCmsStorefrontAppearance,
} from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';
import type { MenuSettings } from '@/shared/contracts/cms-menu';
import type { ColorSchemeColors } from '@/shared/contracts/cms-theme';
import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';

const isExternalUrl = (url: string): boolean => /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i.test(url);
const isHashLink = (url: string): boolean => url.trim().startsWith('#');
const isLocaleRoutedUrl = (url: string): boolean => {
  const trimmed = url.trim();
  return trimmed.length === 0 || (trimmed.startsWith('/') && !trimmed.startsWith('//'));
};

type CmsMenuProps = {
  menu: MenuSettings;
  colorSchemes?: Record<string, ColorSchemeColors>;
  animationsEnabled?: boolean;
};

const normalizePathname = (value: string): string => {
  if (!value) return '/';
  if (value === '/') return '/';
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

export function CmsMenu({
  menu,
  colorSchemes,
  animationsEnabled = true,
}: CmsMenuProps): React.ReactNode {
  const appearance = useOptionalCmsStorefrontAppearance();
  const pathname = usePathname();
  const translations = useTranslations('CmsMenu');
  const [hydrated, setHydrated] = useState(false);
  const itemsRef = useRef<HTMLUListElement | null>(null);
  const itemsId = React.useId();
  const [collapsed, setCollapsed] = useState<boolean>(
    menu.collapsible ? menu.collapsedByDefault : false
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const positionMode = menu.positionMode ?? (menu.stickyEnabled ? 'sticky' : 'static');
  const isSide = menu.menuPlacement === 'left' || menu.menuPlacement === 'right';
  const isStickyMode = positionMode === 'sticky';
  const allowHideOnScroll = menu.hideOnScroll && (isSide || isStickyMode);
  const showOnScrollUpAfterPx = Math.max(0, menu.showOnScrollUpAfterPx ?? 0);
  const [isHiddenOnScroll, setIsHiddenOnScroll] = useState<boolean>(false);
  const [isShrunk, setIsShrunk] = useState<boolean>(false);

  useEffect(() => {
    setCollapsed(menu.collapsible ? menu.collapsedByDefault : false);
  }, [menu.collapsible, menu.collapsedByDefault, menu.menuPlacement]);

  useEffect(() => {
    setIsHiddenOnScroll(false);
  }, [menu.menuPlacement, menu.hideOnScroll, positionMode]);

  useEffect(() => {
    if (!menu.shrinkOnScroll || isSide || !isStickyMode) {
      setIsShrunk(false);
      return;
    }
    const threshold = 32;
    const handleScroll = (): void => {
      setIsShrunk(window.scrollY > threshold);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return (): void => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [menu.shrinkOnScroll, isSide, isStickyMode]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (): void => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    handleChange();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return (): void => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }

    mediaQuery.addListener(handleChange);
    return (): void => {
      mediaQuery.removeListener(handleChange);
    };
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

  const displayColors = useMemo(
    () =>
      resolveStorefrontAppearanceTone(
        resolvedColors,
        appearance?.mode ?? 'default'
      ),
    [appearance?.mode, resolvedColors]
  );

  const allowAnimations = animationsEnabled && !prefersReducedMotion;
  const normalizedPathname = normalizePathname(stripSiteLocalePrefix(pathname));

  useEffect(() => {
    if (!allowAnimations) return;
    if (menu.menuEntryAnimation === 'none') return;
    let ctx: { revert?: () => void } | null = null;
    let cancelled = false;
    void import('gsap').then((module: typeof import('gsap')) => {
      const { gsap } = module;
      if (cancelled) return;
      const scope = itemsRef.current;
      const items = scope?.querySelectorAll('[data-menu-item]');
      if (!scope || !items || items.length === 0) return;
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
      }, scope);
    });
    return (): void => {
      cancelled = true;
      ctx?.revert?.();
    };
  }, [menu.menuEntryAnimation, menu.items.length, allowAnimations]);

  useEffect(() => {
    if (!allowAnimations) return;
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
  }, [menu.menuHoverAnimation, menu.items.length, allowAnimations]);

  if (!menu.showMenu) return null;

  const width = collapsed && menu.collapsible ? menu.collapsedWidth : menu.sideWidth;
  const hideTransform = isSide
    ? menu.menuPlacement === 'right'
      ? 'translateX(110%)'
      : 'translateX(-110%)'
    : 'translateY(-110%)';
  const transitions = [
    prefersReducedMotion ? null : menu.collapsible ? 'width 200ms ease' : null,
    prefersReducedMotion ? null : allowHideOnScroll ? 'transform 220ms ease, opacity 220ms ease' : null,
  ]
    .filter(Boolean)
    .join(', ');

  const shrinkFactor = isShrunk ? 0.72 : 1;
  const navStyle: React.CSSProperties = {
    backgroundColor: displayColors.background,
    color: displayColors.text,
    borderBottom:
      !isSide && displayColors.border ? `1px solid ${displayColors.border}` : undefined,
    borderRight:
      menu.menuPlacement === 'left' && displayColors.border
        ? `1px solid ${displayColors.border}`
        : undefined,
    borderLeft:
      menu.menuPlacement === 'right' && displayColors.border
        ? `1px solid ${displayColors.border}`
        : undefined,
    paddingTop: Math.max(8, menu.paddingTop * shrinkFactor),
    paddingBottom: Math.max(8, menu.paddingBottom * shrinkFactor),
    paddingLeft: Math.max(12, menu.paddingLeft * shrinkFactor),
    paddingRight: Math.max(12, menu.paddingRight * shrinkFactor),
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
    ...({
      '--cms-menu-hover-bg': `color-mix(in srgb, ${displayColors.accent} 14%, ${displayColors.background})`,
      '--cms-menu-active-bg': `color-mix(in srgb, ${displayColors.accent} 22%, ${displayColors.background})`,
    } as React.CSSProperties),
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: !isSide && menu.fullWidth ? undefined : menu.maxWidth,
    margin: !isSide && menu.fullWidth ? undefined : '0 auto',
    width: '100%',
    display: 'flex',
    flexDirection: menu.layoutStyle === 'vertical' || isSide ? 'column' : 'row',
    alignItems: menu.layoutStyle === 'vertical' || isSide ? 'flex-start' : 'center',
    flexWrap: !isSide && menu.layoutStyle !== 'vertical' ? 'wrap' : undefined,
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
    flexWrap: !isSide && menu.layoutStyle !== 'vertical' ? 'wrap' : undefined,
  };

  return (
    <nav
      aria-label={translations('siteNavigation')}
      style={navStyle}
      data-cms-menu='true'
      data-menu-placement={menu.menuPlacement}
      data-menu-position={positionMode}
      data-active-style={menu.activeStyle || 'none'}
      data-appearance-mode={appearance?.mode ?? 'default'}
      onFocusCapture={() => {
        if (isHiddenOnScroll) {
          setIsHiddenOnScroll(false);
        }
      }}
    >
      <div style={containerStyle}>
        {menu.collapsible && (
          <button
            type='button'
            onClick={(): void => setCollapsed((prev: boolean) => !prev)}
            aria-controls={itemsId}
            aria-expanded={!collapsed}
            aria-label={
              collapsed ? translations('expandNavigation') : translations('collapseNavigation')
            }
            className='mb-2 inline-flex items-center gap-2 rounded px-2 py-1 text-[11px] transition-colors'
            style={{
              border: `1px solid ${displayColors.border}`,
              backgroundColor: `color-mix(in srgb, ${displayColors.background} 92%, ${displayColors.text})`,
              color: displayColors.text,
            }}
          >
            {collapsed ? translations('expandNavigation') : translations('collapseNavigation')}
          </button>
        )}
        <ul
          id={itemsId}
          style={itemsStyle}
          ref={(node) => {
            itemsRef.current = node;
          }}
          className='list-none p-0 m-0'
        >
          {menu.items.map((item: { id: string; url: string; label: string; imageUrl?: string }) => {
            const isExternal = isExternalUrl(item.url);
            const isHash = isHashLink(item.url);
            const isLocaleRouted = isLocaleRoutedUrl(item.url);
            const isActive = hydrated
              ? isLocaleRouted &&
                normalizePathname(stripSiteLocalePrefix(item.url)) === normalizedPathname
              : false;
            const color = isActive ? displayColors.accent : displayColors.text;
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
                  activeStyles.backgroundColor = `color-mix(in srgb, ${displayColors.accent} 18%, ${displayColors.background})`;
                  activeStyles.borderRadius = 6;
                  activeStyles.padding = '2px 6px';
                  break;
                case 'border-bottom':
                  activeStyles.borderBottom = `2px solid ${displayColors.accent}`;
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
                    aria-hidden='true'
                    width={menu.itemImageSize}
                    height={menu.itemImageSize}
                    style={{ objectFit: 'cover', borderRadius: 6 }}
                  />
                )}
                <span>{item.label}</span>
                {isExternal ? (
                  <span className='sr-only'> ({translations('opensInNewTab')})</span>
                ) : null}
              </>
            );
            const className = 'inline-flex items-center gap-2';
            const style = {
              color,
              transition: prefersReducedMotion
                ? undefined
                : `color ${menu.transitionSpeed}ms ease`,
              ...activeStyles,
            } as React.CSSProperties;
            return (
              <li key={item.id}>
                {isExternal ? (
                  <a
                    href={item.url}
                    className={className}
                    style={style}
                    target='_blank'
                    rel='noopener noreferrer'
                    data-menu-item
                    aria-label={item.label}
                  >
                    {content}
                  </a>
                ) : isHash || !isLocaleRouted ? (
                  <a
                    href={item.url || '/'}
                    className={className}
                    style={style}
                    data-menu-item
                    aria-label={item.label}
                  >
                    {content}
                  </a>
                ) : (
                  <LocaleLink
                    href={item.url || '/'}
                    className={className}
                    style={style}
                    data-menu-item
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={item.label}
                  >
                    {content}
                  </LocaleLink>
                )}
              </li>
            );
          })}
        </ul>
        <CmsStorefrontAppearanceButtons
          tone={displayColors}
          className={isSide ? 'mt-3' : 'ml-auto'}
          label={translations('siteAppearance')}
        />
      </div>
    </nav>
  );
}
