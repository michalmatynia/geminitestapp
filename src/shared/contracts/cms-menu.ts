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
