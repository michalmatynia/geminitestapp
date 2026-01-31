import type { AnimationPreset } from "@/features/gsap/types/animation";
import { ANIMATION_PRESETS } from "@/features/gsap/types/animation";

export const CMS_MENU_SETTINGS_KEY = "cms_menu_settings.v1";
export const CMS_MENU_SETTINGS_ZONE_PREFIX = `${CMS_MENU_SETTINGS_KEY}.zone.`;

export const getCmsMenuSettingsKey = (domainId?: string | null): string => {
  if (!domainId) return CMS_MENU_SETTINGS_KEY;
  return `${CMS_MENU_SETTINGS_ZONE_PREFIX}${domainId}`;
};

export interface MenuItem {
  id: string;
  label: string;
  url: string;
  imageUrl: string;
}

export interface MenuSettings {
  // Visibility
  showMenu: boolean;
  menuPlacement: "top" | "left" | "right";
  collapsible: boolean;
  collapsedByDefault: boolean;
  sideWidth: number;
  collapsedWidth: number;
  // Layout
  layoutStyle: string;
  alignment: string;
  maxWidth: number;
  fullWidth: boolean;
  menuColorSchemeId: string;
  // Items
  items: MenuItem[];
  showItemImages: boolean;
  itemImageSize: number;
  // Typography
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  letterSpacing: number;
  textTransform: string;
  // Colors
  backgroundColor: string;
  textColor: string;
  activeItemColor: string;
  borderColor: string;
  // Spacing
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  itemGap: number;
  // Mobile
  mobileBreakpoint: string;
  mobileAnimation: string;
  hamburgerColor: string;
  mobileOverlay: boolean;
  // Dropdown
  dropdownBg: string;
  dropdownTextColor: string;
  dropdownRadius: number;
  dropdownShadow: string;
  dropdownMinWidth: number;
  // Sticky
  stickyEnabled: boolean;
  stickyOffset: number;
  shrinkOnScroll: boolean;
  stickyBackground: string;
  // Active
  activeStyle: string;
  activeColor: string;
  // Hover
  hoverStyle: string;
  hoverColor: string;
  transitionSpeed: number;
  // Animations
  menuEntryAnimation: AnimationPreset;
  menuHoverAnimation: AnimationPreset;
}

export const DEFAULT_MENU_SETTINGS: MenuSettings = {
  showMenu: true,
  menuPlacement: "top",
  collapsible: false,
  collapsedByDefault: false,
  sideWidth: 260,
  collapsedWidth: 72,
  layoutStyle: "horizontal",
  alignment: "left",
  maxWidth: 1200,
  fullWidth: false,
  menuColorSchemeId: "custom",
  items: [
    { id: "1", label: "Home", url: "/", imageUrl: "" },
    { id: "2", label: "About", url: "/about", imageUrl: "" },
    { id: "3", label: "Contact", url: "/contact", imageUrl: "" },
  ],
  showItemImages: false,
  itemImageSize: 20,
  fontFamily: "Inter, sans-serif",
  fontSize: 14,
  fontWeight: "500",
  letterSpacing: 0,
  textTransform: "none",
  backgroundColor: "#111827",
  textColor: "#d1d5db",
  activeItemColor: "#3b82f6",
  borderColor: "#1f2937",
  paddingTop: 12,
  paddingRight: 24,
  paddingBottom: 12,
  paddingLeft: 24,
  itemGap: 16,
  mobileBreakpoint: "768",
  mobileAnimation: "slide-left",
  hamburgerColor: "#d1d5db",
  mobileOverlay: true,
  dropdownBg: "#1f2937",
  dropdownTextColor: "#d1d5db",
  dropdownRadius: 8,
  dropdownShadow: "medium",
  dropdownMinWidth: 200,
  stickyEnabled: true,
  stickyOffset: 0,
  shrinkOnScroll: false,
  stickyBackground: "#111827",
  activeStyle: "underline",
  activeColor: "#3b82f6",
  hoverStyle: "color-shift",
  hoverColor: "#ffffff",
  transitionSpeed: 200,
  menuEntryAnimation: "none",
  menuHoverAnimation: "none",
};

const normalizeItem = (item: Partial<MenuItem> | null | undefined, index: number): MenuItem => {
  return {
    id: typeof item?.id === "string" && item.id.length > 0 ? item.id : `item-${index + 1}`,
    label: typeof item?.label === "string" ? item.label : `Link ${index + 1}`,
    url: typeof item?.url === "string" ? item.url : "/",
    imageUrl: typeof item?.imageUrl === "string" ? item.imageUrl : "",
  };
};

const animationPresetSet = new Set(ANIMATION_PRESETS.map((preset) => preset.value));
const normalizeAnimationPreset = (value: unknown, fallback: AnimationPreset): AnimationPreset => {
  if (typeof value !== "string") return fallback;
  return animationPresetSet.has(value as AnimationPreset) ? (value as AnimationPreset) : fallback;
};

export const normalizeMenuSettings = (input?: Partial<MenuSettings> | null): MenuSettings => {
  const merged: MenuSettings = {
    ...DEFAULT_MENU_SETTINGS,
    ...(input ?? {}),
  };

  merged.showMenu = typeof input?.showMenu === "boolean" ? input.showMenu : DEFAULT_MENU_SETTINGS.showMenu;
  merged.menuPlacement =
    input?.menuPlacement === "left" || input?.menuPlacement === "right" || input?.menuPlacement === "top"
      ? input.menuPlacement
      : DEFAULT_MENU_SETTINGS.menuPlacement;
  merged.collapsible = typeof input?.collapsible === "boolean" ? input.collapsible : DEFAULT_MENU_SETTINGS.collapsible;
  merged.collapsedByDefault =
    typeof input?.collapsedByDefault === "boolean" ? input.collapsedByDefault : DEFAULT_MENU_SETTINGS.collapsedByDefault;
  merged.sideWidth = typeof input?.sideWidth === "number" ? input.sideWidth : DEFAULT_MENU_SETTINGS.sideWidth;
  merged.collapsedWidth = typeof input?.collapsedWidth === "number" ? input.collapsedWidth : DEFAULT_MENU_SETTINGS.collapsedWidth;
  merged.menuColorSchemeId =
    typeof input?.menuColorSchemeId === "string" && input.menuColorSchemeId.length > 0
      ? input.menuColorSchemeId
      : DEFAULT_MENU_SETTINGS.menuColorSchemeId;
  merged.showItemImages = typeof input?.showItemImages === "boolean" ? input.showItemImages : DEFAULT_MENU_SETTINGS.showItemImages;
  merged.itemImageSize = typeof input?.itemImageSize === "number" ? input.itemImageSize : DEFAULT_MENU_SETTINGS.itemImageSize;
  merged.menuEntryAnimation =
    normalizeAnimationPreset(input?.menuEntryAnimation, DEFAULT_MENU_SETTINGS.menuEntryAnimation);
  merged.menuHoverAnimation =
    normalizeAnimationPreset(input?.menuHoverAnimation, DEFAULT_MENU_SETTINGS.menuHoverAnimation);

  const rawItems = Array.isArray(input?.items) ? input?.items : merged.items;
  const normalizedItems = Array.isArray(rawItems) ? rawItems.map((item, index) => normalizeItem(item, index)) : DEFAULT_MENU_SETTINGS.items;
  merged.items = normalizedItems.length > 0 ? normalizedItems : DEFAULT_MENU_SETTINGS.items;

  return merged;
};
