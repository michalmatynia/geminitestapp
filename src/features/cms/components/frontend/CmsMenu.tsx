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

function MenuList({ menu, normPath, colors, hydrated }: { menu: MenuSettings; normPath: string; colors: any; hydrated: boolean }): React.JSX.Element {
  return (
    <ul className='list-none p-0 m-0' style={{ display: 'flex', flexDirection: 'row', gap: menu.itemGap }}>
      {menu.items.map((item) => {
        const isActive = hydrated && isLocale(item.url) && normalizePath(stripSiteLocalePrefix(item.url)) === normPath;
        const color = isActive ? colors.accent : colors.text;
        
        const content = (
          <>
            {menu.showItemImages && typeof item.imageUrl === 'string' && item.imageUrl !== '' && (
                <Image src={item.imageUrl} alt='' width={menu.itemImageSize ?? 24} height={menu.itemImageSize ?? 24} />
            )}
            <span>{item.label}</span>
          </>
        );
        return (
          <li key={item.id}>
            <MenuLink
              item={item}
              isActive={isActive}
              color={color}
              style={{ transition: `color ${menu.transitionSpeed}ms ease` }}
              content={content}
            />
          </li>
        );
      })}
    </ul>
  );
}

const getColors = (menu: MenuSettings, appMode: string | undefined): any => resolveStorefrontAppearanceTone({ 
    background: menu.backgroundColor ?? '#ffffff', 
    text: menu.textColor ?? '#000000', 
    border: menu.borderColor ?? '#cccccc', 
    accent: menu.activeColor ?? menu.activeItemColor ?? menu.textColor ?? '#000000' 
}, appMode ?? 'default');

const getNavStyle = (isSide: boolean, menu: MenuSettings, collapsed: boolean): React.CSSProperties => ({
    backgroundColor: 'inherit',
    color: 'inherit',
    position: isSide ? 'fixed' : (menu.stickyEnabled ? 'sticky' : 'relative'),
    width: isSide ? (collapsed && menu.collapsible ? menu.collapsedWidth : menu.sideWidth) : '100%'
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

  return (
    <nav 
        aria-label={trans('siteNavigation')} 
        style={{ ...getNavStyle(isSide, menu, collapsed), backgroundColor: colors.background, color: colors.text }} 
        data-cms-menu='true' 
        data-appearance-mode={app?.mode ?? 'default'}
    >
      <div style={{ 
          maxWidth: !isSide && menu.fullWidth ? undefined : menu.maxWidth, 
          margin: !isSide && menu.fullWidth ? undefined : '0 auto', 
          display: 'flex', 
          flexDirection: menu.layoutStyle === 'vertical' || isSide ? 'column' : 'row', 
          gap: menu.itemGap 
      }}>
        {menu.collapsible && <MenuToggle id={itemListId} collapsed={collapsed} toggle={() => setCollapsed(!collapsed)} trans={trans} />}
        {!collapsed && <MenuList menu={menu} normPath={normPath} colors={colors} hydrated={hydrated} />}
        <CmsStorefrontAppearanceButtons tone={colors} className={isSide ? 'mt-3' : 'ml-auto'} label={trans('siteAppearance')} />
      </div>
    </nav>
  );
}
