import React from 'react';
import { Link as LocaleLink } from '@/i18n/navigation';
import type { MenuItem as MenuItemSettings } from '@/shared/contracts/cms-menu';

export const isExternal = (u: string): boolean => /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i.test(u);
export const isHash = (u: string): boolean => u.trim().length > 0 && u.trim().startsWith('#');
export const isLocale = (u: string): boolean => { 
  const t = u.trim(); 
  return t.length === 0 || (t.startsWith('/') && !t.startsWith('//')); 
};
export const normalizePath = (v: string): string => { 
  if (v.length === 0) return '/'; 
  return v === '/' ? '/' : v.endsWith('/') ? v.slice(0, -1) : v; 
};

export const MenuLink = ({ item, isActive, color, style, content }: { item: MenuItemSettings; isActive: boolean; color: string; style: React.CSSProperties; content: React.ReactNode }): React.JSX.Element => {
  const ext = isExternal(item.url); 
  const h = isHash(item.url); 
  const l = isLocale(item.url);
  const className = 'inline-flex items-center gap-2';
  const itemStyle = { ...style, color };
  
  if (ext) {
    return <a href={item.url} className={className} style={itemStyle} target='_blank' rel='noopener noreferrer' aria-label={item.label}>{content}</a>;
  }
  if (h || !l) {
    return <a href={item.url || '/'} className={className} style={itemStyle} aria-label={item.label}>{content}</a>;
  }
  return <LocaleLink href={item.url || '/'} className={className} style={itemStyle} aria-current={isActive ? 'page' : undefined} aria-label={item.label}>{content}</LocaleLink>;
};
