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

export function CmsMenu({ menu, colorSchemes: _colorSchemes, animationsEnabled: _animationsEnabled = true }: CmsMenuProps): React.JSX.Element | null {
  const app = useOptionalCmsStorefrontAppearance(); const path = usePathname(); const trans = useTranslations('CmsMenu');
  const itemListId = useId();
  const [hydrated, setHydrated] = useState(false); const [collapsed, setCollapsed] = useState(menu.collapsible ? menu.collapsedByDefault : false);
  const isSide = menu.menuPlacement === 'left' || menu.menuPlacement === 'right';
  useEffect(() => { setCollapsed(menu.collapsible ? menu.collapsedByDefault : false); }, [menu.collapsible, menu.collapsedByDefault]);
  useEffect(() => { setHydrated(true); }, []);
  const colors = useMemo(() => resolveStorefrontAppearanceTone({ background: menu.backgroundColor ?? '#ffffff', text: menu.textColor ?? '#000000', border: menu.borderColor ?? '#cccccc', accent: menu.activeColor ?? menu.activeItemColor ?? menu.textColor ?? '#000000' }, app?.mode ?? 'default'), [menu, app?.mode]);
  const normPath = normalizePath(stripSiteLocalePrefix(path));
  return (
    <nav aria-label={trans('siteNavigation')} style={{ backgroundColor: colors.background, color: colors.text, position: isSide ? 'fixed' : (menu.stickyEnabled ? 'sticky' : 'relative'), width: isSide ? (collapsed && menu.collapsible ? menu.collapsedWidth : menu.sideWidth) : '100%' }} data-cms-menu='true' data-appearance-mode={app?.mode ?? 'default'}>
      <div style={{ maxWidth: !isSide && menu.fullWidth ? undefined : menu.maxWidth, margin: !isSide && menu.fullWidth ? undefined : '0 auto', display: 'flex', flexDirection: menu.layoutStyle === 'vertical' || isSide ? 'column' : 'row', gap: menu.itemGap }}>
        {menu.collapsible && <button type='button' onClick={() => setCollapsed(!collapsed)} className='mb-2' aria-controls={itemListId} aria-expanded={!collapsed}>{collapsed ? trans('expandNavigation') : trans('collapseNavigation')}</button>}
        <ul id={itemListId} className='list-none p-0 m-0' style={{ display: collapsed && menu.collapsible ? 'none' : 'flex', flexDirection: menu.layoutStyle === 'vertical' || isSide ? 'column' : 'row', gap: menu.itemGap }}>
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
