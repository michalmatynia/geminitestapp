'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useEffect, useId, useMemo, useState } from 'react';

import { CmsStorefrontAppearanceButtons, resolveStorefrontAppearanceTone, useOptionalCmsStorefrontAppearance } from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';
import type { MenuSettings } from '@/shared/contracts/cms-menu';
import type { ColorSchemeColors } from '@/shared/contracts/cms-theme';
import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';
import { 
  isLocale, 
  MenuLink,
  normalizePath, 
} from './cms-menu-utils';

type CmsMenuProps = { menu: MenuSettings; colorSchemes?: Record<string, ColorSchemeColors>; animationsEnabled?: boolean; };

function MenuToggle({ id, collapsed, toggle, trans }: { id: string; collapsed: boolean; toggle: () => void; trans: (key: string) => string }): React.JSX.Element {
  return (
    <button
      type='button'
      onClick={toggle}
      className='mb-2'
      aria-controls={id}
      aria-expanded={!collapsed}
    >
      {collapsed ? trans('expandNavigation') : trans('collapseNavigation')}
    </button>
  );
}

type MenuItem = MenuSettings['items'][number];

function MenuListItem({ item, normPath, colors, menu }: { item: MenuItem, normPath: string, colors: ColorSchemeColors, menu: MenuSettings }): React.JSX.Element {
  const isActive = isLocale(item.url) && normalizePath(stripSiteLocalePrefix(item.url)) === normPath;
  const color = isActive ? colors.accent : colors.text;
  
  const content = (
    <>
      {menu.showItemImages && typeof item.imageUrl === 'string' && item.imageUrl !== '' && (
        <Image src={item.imageUrl} alt='' width={menu.itemImageSize} height={menu.itemImageSize} />
      )}
      <span>{item.label}</span>
    </>
  );

  return (
    <li>
      <MenuLink
        item={item}
        isActive={isActive}
        color={color}
        style={{ transition: `color ${menu.transitionSpeed}ms ease` }}
        content={content}
      />
    </li>
  );
}

function MenuList({ menu, normPath, colors, hydrated }: { menu: MenuSettings; normPath: string; colors: ColorSchemeColors; hydrated: boolean }): React.JSX.Element {
  if (!hydrated) return <></>;
  return (
    <ul className='list-none p-0 m-0' style={{ display: 'flex', flexDirection: 'row', gap: menu.itemGap }}>
      {menu.items.map((item) => (
        <MenuListItem key={item.id} item={item} normPath={normPath} colors={colors} menu={menu} />
      ))}
    </ul>
  );
}

const getColors = (menu: MenuSettings, appMode: string | undefined): ColorSchemeColors => resolveStorefrontAppearanceTone({ 
    background: menu.backgroundColor, 
    text: menu.textColor, 
    border: menu.borderColor, 
    accent: menu.activeColor ?? menu.activeItemColor ?? menu.textColor
}, appMode ?? 'default');

const getNavStyle = (isSide: boolean, menu: MenuSettings, collapsed: boolean): React.CSSProperties => {
  const isSticky = menu.stickyEnabled ?? false;
  const isCollapsible = menu.collapsible ?? false;
  const position = isSide ? 'fixed' : isSticky ? 'sticky' : 'relative';
  const width = isSide
    ? collapsed && isCollapsible
      ? menu.collapsedWidth ?? '50px'
      : menu.sideWidth ?? '200px'
    : '100%';
  return {
    backgroundColor: 'inherit',
    color: 'inherit',
    position,
    width
  };
};

const getNavContainerStyle = (isSide: boolean, menu: MenuSettings): React.CSSProperties => ({
  maxWidth: !isSide && (menu.fullWidth ?? false) ? undefined : (menu.maxWidth ?? undefined),
  margin: !isSide && (menu.fullWidth ?? false) ? undefined : '0 auto',
  display: 'flex',
  flexDirection: menu.layoutStyle === 'vertical' || isSide ? 'column' : 'row',
  gap: menu.itemGap ?? undefined,
});

export function CmsMenu({ menu, colorSchemes: _colorSchemes, animationsEnabled: _animationsEnabled = true }: CmsMenuProps): React.JSX.Element | null {
  const path = usePathname();
  const trans = useTranslations('CmsMenu');
  const app = useOptionalCmsStorefrontAppearance();
  const itemListId = useId();
  
  const [hydrated, setHydrated] = useState(false);
  const [collapsed, setCollapsed] = useState(menu.collapsible ? menu.collapsedByDefault : false);
  
  useEffect(() => { setCollapsed(menu.collapsible ? menu.collapsedByDefault : false); }, [menu.collapsible, menu.collapsedByDefault]);
  useEffect(() => { setHydrated(true); }, []);
  
  const colors = useMemo(() => getColors(menu, app?.mode), [menu, app?.mode]);
  const normPath = normalizePath(stripSiteLocalePrefix(path));
  const isSide = menu.menuPlacement === 'left' || menu.menuPlacement === 'right';

  const navStyle = getNavStyle(isSide, menu, collapsed);
  const containerStyle = getNavContainerStyle(isSide, menu);
  const appearanceClasses = isSide ? 'mt-3' : 'ml-auto';

  return (
    <nav 
        aria-label={trans('siteNavigation')} 
        style={{ ...navStyle, backgroundColor: colors.background, color: colors.text }} 
        data-cms-menu='true' 
        data-appearance-mode={app?.mode ?? 'default'}
    >
      <div style={containerStyle}>
        {menu.collapsible && <MenuToggle id={itemListId} collapsed={collapsed} toggle={() => setCollapsed(!collapsed)} trans={trans} />}
        <MenuList menu={menu} normPath={normPath} colors={colors} hydrated={hydrated} />
        <CmsStorefrontAppearanceButtons 
          tone={colors} 
          className={appearanceClasses} 
          label={trans('siteAppearance')} 
        />
      </div>
    </nav>
  );
}
