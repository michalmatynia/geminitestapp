import React from 'react';
import Image from 'next/image';
import type { MenuSettings } from '@/shared/contracts/cms-menu';
import type { ColorSchemeColors } from '@/shared/contracts/cms-theme';
import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';
import { isLocale, MenuLink, normalizePath } from '../cms-menu-utils';

export const MenuListItem = ({ item, normPath, colors, menu }: { item: MenuSettings['items'][number], normPath: string, colors: ColorSchemeColors, menu: MenuSettings }): React.JSX.Element => {
  const isActive = isLocale(item.url) && normalizePath(stripSiteLocalePrefix(item.url)) === normPath;
  const color = isActive ? colors.accent : colors.text;
  
  const content = (
    <>
      {menu.showItemImages && item.imageUrl && (
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
};

export const MenuList = ({ menu, normPath, colors, hydrated }: { menu: MenuSettings; normPath: string; colors: ColorSchemeColors; hydrated: boolean }): React.JSX.Element => {
  if (!hydrated) return <></>;
  return (
    <ul className='list-none p-0 m-0' style={{ display: 'flex', flexDirection: 'row', gap: menu.itemGap ?? undefined }}>
      {menu.items.map((item) => (
        <MenuListItem key={item.id} item={item} normPath={normPath} colors={colors} menu={menu} />
      ))}
    </ul>
  );
};
