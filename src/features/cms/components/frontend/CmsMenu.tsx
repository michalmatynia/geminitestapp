'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';

import { Link as LocaleLink } from '@/i18n/navigation';
import { CmsStorefrontAppearanceButtons, resolveStorefrontAppearanceTone, useOptionalCmsStorefrontAppearance } from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';
import type { MenuSettings, MenuItem as MenuItemSettings } from '@/shared/contracts/cms-menu';
import type { ColorSchemeColors } from '@/shared/contracts/cms-theme';
import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';

const isExternal = (u: string): boolean => /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i.test(u);
const isHash = (u: string): boolean => u.trim().startsWith('#');
const isLocale = (u: string): boolean => { const t = u.trim(); return t === '' || (t.startsWith('/') && !t.startsWith('//')); };
const normalizePath = (v: string): string => { if (v === '') return '/'; return v === '/' ? '/' : v.endsWith('/') ? v.slice(0, -1) : v; };

type CmsMenuProps = { menu: MenuSettings; colorSchemes?: Record<string, ColorSchemeColors>; animationsEnabled?: boolean; };

const MenuLink = ({ item, isActive, color, style, content }: { item: MenuItemSettings; isActive: boolean; color: string; style: React.CSSProperties; content: React.ReactNode }): React.JSX.Element => {
  const ext = isExternal(item.url); const h = isHash(item.url); const l = isLocale(item.url);
  const className = 'inline-flex items-center gap-2';
  const itemStyle = { ...style, color };
  if (ext) return <a href={item.url} className={className} style={itemStyle} target='_blank' rel='noopener noreferrer' aria-label={item.label}>{content}</a>;
  if (h || !l) return <a href={item.url || '/'} className={className} style={itemStyle} aria-label={item.label}>{content}</a>;
  return <LocaleLink href={item.url || '/'} className={className} style={itemStyle} aria-current={isActive ? 'page' : undefined} aria-label={item.label}>{content}</LocaleLink>;
};

export function CmsMenu({ menu, colorSchemes, animationsEnabled = true }: CmsMenuProps): React.JSX.Element | null {
  const app = useOptionalCmsStorefrontAppearance(); const path = usePathname(); const trans = useTranslations('CmsMenu');
  const [hydrated, setHydrated] = useState(false); const [collapsed, setCollapsed] = useState(menu.collapsible ? menu.collapsedByDefault : false);
  const isSide = menu.menuPlacement === 'left' || menu.menuPlacement === 'right';
  useEffect(() => { setCollapsed(menu.collapsible ? menu.collapsedByDefault : false); }, [menu.collapsible, menu.collapsedByDefault]);
  useEffect(() => { setHydrated(true); }, []);
  const colors = useMemo(() => resolveStorefrontAppearanceTone({ background: menu.backgroundColor ?? '#ffffff', text: menu.textColor ?? '#000000', border: menu.borderColor ?? '#cccccc', accent: menu.activeColor ?? menu.activeItemColor ?? menu.textColor ?? '#000000' }, app?.mode ?? 'default'), [menu, app?.mode]);
  const normPath = normalizePath(stripSiteLocalePrefix(path));
  return (
    <nav aria-label={trans('siteNavigation')} style={{ backgroundColor: colors.background, color: colors.text, position: isSide ? 'fixed' : (menu.stickyEnabled ? 'sticky' : 'relative'), width: isSide ? (collapsed && menu.collapsible ? menu.collapsedWidth : menu.sideWidth) : '100%' }} data-cms-menu='true'>
      <div style={{ maxWidth: !isSide && menu.fullWidth ? undefined : menu.maxWidth, margin: !isSide && menu.fullWidth ? undefined : '0 auto', display: 'flex', flexDirection: menu.layoutStyle === 'vertical' || isSide ? 'column' : 'row', gap: menu.itemGap }}>
        {menu.collapsible && <button type='button' onClick={() => setCollapsed(!collapsed)} className='mb-2'>{collapsed ? trans('expandNavigation') : trans('collapseNavigation')}</button>}
        <ul className='list-none p-0 m-0' style={{ display: collapsed && menu.collapsible ? 'none' : 'flex', flexDirection: menu.layoutStyle === 'vertical' || isSide ? 'column' : 'row', gap: menu.itemGap }}>
          {menu.items.map((item) => {
            const isActive = hydrated && isLocale(item.url) && normalizePath(stripSiteLocalePrefix(item.url)) === normPath;
            const content = (
              <>
                {menu.showItemImages && item.imageUrl && <Image src={item.imageUrl} alt='' width={menu.itemImageSize ?? 24} height={menu.itemImageSize ?? 24} />}
                <span>{item.label}</span>
              </>
            );
            return <li key={item.id}><MenuLink item={item} isActive={isActive} color={isActive ? colors.accent : colors.text} style={{ transition: `color ${menu.transitionSpeed}ms ease` }} content={content} /></li>;
          })}
        </ul>
        <CmsStorefrontAppearanceButtons tone={colors} className={isSide ? 'mt-3' : 'ml-auto'} label={trans('siteAppearance')} />
      </div>
    </nav>
  );
}
