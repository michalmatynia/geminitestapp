import { z } from 'zod';

import { animationPresetSchema } from './gsap';

/**
 * CMS Menu DTOs
 */

export const menuItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string(),
  imageUrl: z.string(),
});

export type MenuItemDto = z.infer<typeof menuItemSchema>;
export type MenuItem = MenuItemDto;

export const menuSettingsSchema = z.object({
  // Visibility
  showMenu: z.boolean(),
  menuPlacement: z.enum(['top', 'left', 'right']),
  positionMode: z.enum(['sticky', 'static']),
  collapsible: z.boolean(),
  collapsedByDefault: z.boolean(),
  sideWidth: z.number(),
  collapsedWidth: z.number(),
  // Layout
  layoutStyle: z.string(),
  alignment: z.string(),
  maxWidth: z.number(),
  fullWidth: z.boolean(),
  menuColorSchemeId: z.string(),
  // Items
  items: z.array(menuItemSchema),
  showItemImages: z.boolean(),
  itemImageSize: z.number(),
  // Typography
  fontFamily: z.string(),
  fontSize: z.number(),
  fontWeight: z.string(),
  letterSpacing: z.number(),
  textTransform: z.string(),
  // Colors
  backgroundColor: z.string(),
  textColor: z.string(),
  activeItemColor: z.string(),
  borderColor: z.string(),
  // Spacing
  paddingTop: z.number(),
  paddingRight: z.number(),
  paddingBottom: z.number(),
  paddingLeft: z.number(),
  itemGap: z.number(),
  // Mobile
  mobileBreakpoint: z.string(),
  mobileAnimation: z.string(),
  hamburgerColor: z.string(),
  mobileOverlay: z.boolean(),
  // Dropdown
  dropdownBg: z.string(),
  dropdownTextColor: z.string(),
  dropdownRadius: z.number(),
  dropdownShadow: z.string(),
  dropdownMinWidth: z.number(),
  // Sticky
  stickyEnabled: z.boolean(),
  stickyOffset: z.number(),
  shrinkOnScroll: z.boolean(),
  stickyBackground: z.string(),
  hideOnScroll: z.boolean(),
  showOnScrollUpAfterPx: z.number(),
  // Active
  activeStyle: z.string(),
  activeColor: z.string(),
  // Hover
  hoverStyle: z.string(),
  hoverColor: z.string(),
  transitionSpeed: z.number(),
  // Animations
  menuEntryAnimation: animationPresetSchema,
  menuHoverAnimation: animationPresetSchema,
});

export type MenuSettingsDto = z.infer<typeof menuSettingsSchema>;
export type MenuSettings = MenuSettingsDto;

export const CMS_MENU_SETTINGS_KEY = 'cms_menu_settings.v1';
export const CMS_MENU_SETTINGS_ZONE_PREFIX = 'cms_menu_settings.v1.zone.';

export const DEFAULT_MENU_SETTINGS: MenuSettings = {
  showMenu: true,
  menuPlacement: 'top',
  positionMode: 'sticky',
  collapsible: false,
  collapsedByDefault: false,
  sideWidth: 260,
  collapsedWidth: 72,
  layoutStyle: 'horizontal',
  alignment: 'left',
  maxWidth: 1200,
  fullWidth: false,
  menuColorSchemeId: 'custom',
  items: [
    { id: '1', label: 'Home', url: '/', imageUrl: '' },
    { id: '2', label: 'About', url: '/about', imageUrl: '' },
    { id: '3', label: 'Contact', url: '/contact', imageUrl: '' },
  ],
  showItemImages: false,
  itemImageSize: 20,
  fontFamily: 'Inter, sans-serif',
  fontSize: 14,
  fontWeight: '500',
  letterSpacing: 0,
  textTransform: 'none',
  backgroundColor: '#111827',
  textColor: '#d1d5db',
  activeItemColor: '#3b82f6',
  borderColor: '#1f2937',
  paddingTop: 12,
  paddingRight: 24,
  paddingBottom: 12,
  paddingLeft: 24,
  itemGap: 16,
  mobileBreakpoint: '768',
  mobileAnimation: 'slide-left',
  hamburgerColor: '#d1d5db',
  mobileOverlay: true,
  dropdownBg: '#1f2937',
  dropdownTextColor: '#d1d5db',
  dropdownRadius: 8,
  dropdownShadow: 'medium',
  dropdownMinWidth: 200,
  stickyEnabled: true,
  stickyOffset: 0,
  shrinkOnScroll: false,
  stickyBackground: '#111827',
  hideOnScroll: false,
  showOnScrollUpAfterPx: 80,
  activeStyle: 'underline',
  activeColor: '#3b82f6',
  hoverStyle: 'color-shift',
  hoverColor: '#ffffff',
  transitionSpeed: 200,
  menuEntryAnimation: 'none',
  menuHoverAnimation: 'none',
};

export function getCmsMenuSettingsKey(domainId?: string | null): string {
  if (!domainId) return CMS_MENU_SETTINGS_KEY;
  return `${CMS_MENU_SETTINGS_ZONE_PREFIX}${domainId}`;
}

export function normalizeMenuSettings(input: unknown): MenuSettings {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const record = input as Record<string, unknown>;
    return {
      ...DEFAULT_MENU_SETTINGS,
      ...record,
      items: Array.isArray(record['items'])
        ? (record['items'] as MenuItemDto[])
        : DEFAULT_MENU_SETTINGS.items,
      showMenu:
        typeof record['showMenu'] === 'boolean'
          ? record['showMenu']
          : DEFAULT_MENU_SETTINGS.showMenu,
    } as MenuSettings;
  }
  return DEFAULT_MENU_SETTINGS;
}
