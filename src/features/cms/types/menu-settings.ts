export const CMS_MENU_SETTINGS_KEY = "cms_menu_settings.v1";

export interface MenuItem {
  id: string;
  label: string;
  url: string;
}

export interface MenuSettings {
  // Visibility
  showMenu: boolean;
  // Layout
  layoutStyle: string;
  alignment: string;
  maxWidth: number;
  fullWidth: boolean;
  // Items
  items: MenuItem[];
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
}

export const DEFAULT_MENU_SETTINGS: MenuSettings = {
  showMenu: true,
  layoutStyle: "horizontal",
  alignment: "left",
  maxWidth: 1200,
  fullWidth: false,
  items: [
    { id: "1", label: "Home", url: "/" },
    { id: "2", label: "About", url: "/about" },
    { id: "3", label: "Contact", url: "/contact" },
  ],
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
};

const normalizeItem = (item: Partial<MenuItem> | null | undefined, index: number): MenuItem => {
  return {
    id: typeof item?.id === "string" && item.id.length > 0 ? item.id : `item-${index + 1}`,
    label: typeof item?.label === "string" ? item.label : `Link ${index + 1}`,
    url: typeof item?.url === "string" ? item.url : "/",
  };
};

export const normalizeMenuSettings = (input?: Partial<MenuSettings> | null): MenuSettings => {
  const merged: MenuSettings = {
    ...DEFAULT_MENU_SETTINGS,
    ...(input ?? {}),
  };

  merged.showMenu = typeof input?.showMenu === "boolean" ? input.showMenu : DEFAULT_MENU_SETTINGS.showMenu;

  const rawItems = Array.isArray(input?.items) ? input?.items : merged.items;
  const normalizedItems = Array.isArray(rawItems) ? rawItems.map((item, index) => normalizeItem(item, index)) : DEFAULT_MENU_SETTINGS.items;
  merged.items = normalizedItems.length > 0 ? normalizedItems : DEFAULT_MENU_SETTINGS.items;

  return merged;
};
