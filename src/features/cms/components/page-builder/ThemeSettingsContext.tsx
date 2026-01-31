"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export interface ColorSchemeColors {
  background: string;
  surface: string;
  text: string;
  accent: string;
  border: string;
}

export interface ColorScheme {
  id: string;
  name: string;
  colors: ColorSchemeColors;
}

export interface ThemeSettings {
  // Colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  errorColor: string;
  successColor: string;
  colorSchemes: ColorScheme[];
  activeColorSchemeId: string;
  // Typography
  headingFont: string;
  bodyFont: string;
  baseSize: number;
  headingWeight: string;
  bodyWeight: string;
  lineHeight: number;
  headingLineHeight: number;
  // Layout
  maxContentWidth: number;
  gridGutter: number;
  sectionSpacing: number;
  containerPadding: number;
  borderRadius: number;
  // Animations
  enableAnimations: boolean;
  animationDuration: number;
  animationEasing: string;
  scrollReveal: boolean;
  hoverScale: number;
  // Buttons
  btnPaddingX: number;
  btnPaddingY: number;
  btnFontSize: number;
  btnFontWeight: string;
  btnRadius: number;
  btnPrimaryBg: string;
  btnPrimaryText: string;
  btnSecondaryBg: string;
  btnSecondaryText: string;
  btnOutlineBorder: string;
  // Variant Pills
  pillRadius: number;
  pillPaddingX: number;
  pillPaddingY: number;
  pillFontSize: number;
  pillBg: string;
  pillText: string;
  pillActiveBg: string;
  pillActiveText: string;
  // Inputs
  inputHeight: number;
  inputRadius: number;
  inputBorderColor: string;
  inputBg: string;
  inputText: string;
  inputFocusBorder: string;
  inputPlaceholder: string;
  inputFontSize: number;
  // Product Cards
  cardImageRatio: string;
  cardRadius: number;
  cardShadow: string;
  cardBg: string;
  cardHoverShadow: string;
  showBadge: boolean;
  showQuickAdd: boolean;
  // Collection Cards
  collectionRatio: string;
  collectionRadius: number;
  collectionOverlay: boolean;
  collectionOverlayColor: string;
  collectionTextAlign: string;
  // Blog Cards
  blogRatio: string;
  blogRadius: number;
  blogShowDate: boolean;
  blogShowExcerpt: boolean;
  blogExcerptLines: number;
  // Content Containers
  containerBg: string;
  containerBorderColor: string;
  containerRadius: number;
  containerPaddingInner: number;
  containerShadow: string;
  // Media
  imageRadius: number;
  imageBorderColor: string;
  imagePlaceholderBg: string;
  videoRatio: string;
  // Dropdowns and pop-ups
  dropdownBg: string;
  dropdownBorder: string;
  dropdownRadius: number;
  dropdownShadow: string;
  popupOverlayColor: string;
  popupRadius: number;
  // Drawers
  drawerWidth: number;
  drawerBg: string;
  drawerOverlayColor: string;
  drawerPosition: string;
  // Badges
  badgeFontSize: number;
  badgeRadius: number;
  badgePaddingX: number;
  badgePaddingY: number;
  badgeDefaultBg: string;
  badgeDefaultText: string;
  badgeSaleBg: string;
  badgeSaleText: string;
  // Brand Information
  brandName: string;
  brandTagline: string;
  brandEmail: string;
  brandPhone: string;
  brandAddress: string;
  // Social Media
  socialFacebook: string;
  socialInstagram: string;
  socialTwitter: string;
  socialLinkedin: string;
  socialYoutube: string;
  socialTiktok: string;
  // Search Behaviour
  searchPlaceholder: string;
  searchMinChars: number;
  searchShowSuggestions: boolean;
  searchMaxResults: number;
  // Currency Format
  currencyCode: string;
  currencySymbol: string;
  currencyPosition: string;
  thousandsSeparator: string;
  decimalSeparator: string;
  decimalPlaces: number;
  // Cart
  cartStyle: string;
  cartIconStyle: string;
  showCartCount: boolean;
  cartEmptyText: string;
  // Custom CSS
  customCss: string;
  // Theme Style
  themePreset: string;
  darkMode: boolean;
}

export const DEFAULT_THEME: ThemeSettings = {
  primaryColor: "#3b82f6",
  secondaryColor: "#6366f1",
  accentColor: "#f59e0b",
  backgroundColor: "#030712",
  surfaceColor: "#111827",
  textColor: "#f3f4f6",
  mutedTextColor: "#9ca3af",
  borderColor: "#1f2937",
  errorColor: "#ef4444",
  successColor: "#22c55e",
  colorSchemes: [
    {
      id: "scheme-1",
      name: "Scheme 1",
      colors: {
        background: "#030712",
        surface: "#111827",
        text: "#f3f4f6",
        accent: "#3b82f6",
        border: "#1f2937",
      },
    },
    {
      id: "scheme-2",
      name: "Scheme 2",
      colors: {
        background: "#0b1220",
        surface: "#111827",
        text: "#e5e7eb",
        accent: "#6366f1",
        border: "#1f2937",
      },
    },
    {
      id: "scheme-3",
      name: "Scheme 3",
      colors: {
        background: "#111827",
        surface: "#1f2937",
        text: "#f9fafb",
        accent: "#f59e0b",
        border: "#334155",
      },
    },
    {
      id: "scheme-4",
      name: "Scheme 4",
      colors: {
        background: "#0f172a",
        surface: "#1e293b",
        text: "#e2e8f0",
        accent: "#22c55e",
        border: "#334155",
      },
    },
    {
      id: "scheme-5",
      name: "Scheme 5",
      colors: {
        background: "#0b0f1f",
        surface: "#111827",
        text: "#f3f4f6",
        accent: "#ec4899",
        border: "#1f2937",
      },
    },
  ],
  activeColorSchemeId: "scheme-1",
  headingFont: "Inter, sans-serif",
  bodyFont: "Inter, sans-serif",
  baseSize: 16,
  headingWeight: "700",
  bodyWeight: "400",
  lineHeight: 1.6,
  headingLineHeight: 1.2,
  maxContentWidth: 1200,
  gridGutter: 24,
  sectionSpacing: 64,
  containerPadding: 24,
  borderRadius: 8,
  enableAnimations: true,
  animationDuration: 300,
  animationEasing: "ease-out",
  scrollReveal: true,
  hoverScale: 1.02,
  btnPaddingX: 20,
  btnPaddingY: 10,
  btnFontSize: 14,
  btnFontWeight: "600",
  btnRadius: 8,
  btnPrimaryBg: "#3b82f6",
  btnPrimaryText: "#ffffff",
  btnSecondaryBg: "#374151",
  btnSecondaryText: "#f3f4f6",
  btnOutlineBorder: "#4b5563",
  pillRadius: 999,
  pillPaddingX: 12,
  pillPaddingY: 4,
  pillFontSize: 12,
  pillBg: "#1f2937",
  pillText: "#d1d5db",
  pillActiveBg: "#3b82f6",
  pillActiveText: "#ffffff",
  inputHeight: 40,
  inputRadius: 8,
  inputBorderColor: "#374151",
  inputBg: "#111827",
  inputText: "#f3f4f6",
  inputFocusBorder: "#3b82f6",
  inputPlaceholder: "#6b7280",
  inputFontSize: 14,
  cardImageRatio: "3:4",
  cardRadius: 12,
  cardShadow: "small",
  cardBg: "#111827",
  cardHoverShadow: "medium",
  showBadge: true,
  showQuickAdd: true,
  collectionRatio: "16:9",
  collectionRadius: 12,
  collectionOverlay: true,
  collectionOverlayColor: "#00000066",
  collectionTextAlign: "center",
  blogRatio: "16:9",
  blogRadius: 12,
  blogShowDate: true,
  blogShowExcerpt: true,
  blogExcerptLines: 2,
  containerBg: "#111827",
  containerBorderColor: "#1f2937",
  containerRadius: 12,
  containerPaddingInner: 24,
  containerShadow: "none",
  imageRadius: 8,
  imageBorderColor: "#1f2937",
  imagePlaceholderBg: "#1f2937",
  videoRatio: "16:9",
  dropdownBg: "#1f2937",
  dropdownBorder: "#374151",
  dropdownRadius: 8,
  dropdownShadow: "medium",
  popupOverlayColor: "#000000aa",
  popupRadius: 16,
  drawerWidth: 400,
  drawerBg: "#111827",
  drawerOverlayColor: "#000000aa",
  drawerPosition: "right",
  badgeFontSize: 11,
  badgeRadius: 4,
  badgePaddingX: 8,
  badgePaddingY: 2,
  badgeDefaultBg: "#374151",
  badgeDefaultText: "#d1d5db",
  badgeSaleBg: "#ef4444",
  badgeSaleText: "#ffffff",
  brandName: "",
  brandTagline: "",
  brandEmail: "",
  brandPhone: "",
  brandAddress: "",
  socialFacebook: "",
  socialInstagram: "",
  socialTwitter: "",
  socialLinkedin: "",
  socialYoutube: "",
  socialTiktok: "",
  searchPlaceholder: "Search...",
  searchMinChars: 2,
  searchShowSuggestions: true,
  searchMaxResults: 8,
  currencyCode: "USD",
  currencySymbol: "$",
  currencyPosition: "before",
  thousandsSeparator: ",",
  decimalSeparator: ".",
  decimalPlaces: 2,
  cartStyle: "drawer",
  cartIconStyle: "bag",
  showCartCount: true,
  cartEmptyText: "Your cart is empty",
  customCss: "",
  themePreset: "default",
  darkMode: true,
};

interface ThemeSettingsContextValue {
  theme: ThemeSettings;
  setTheme: React.Dispatch<React.SetStateAction<ThemeSettings>>;
  update: <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => void;
}

const ThemeSettingsContext = createContext<ThemeSettingsContextValue | undefined>(undefined);

export function ThemeSettingsProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
  const update = useCallback(<K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
  }, []);
  const value = useMemo(() => ({ theme, setTheme, update }), [theme, update]);
  return (
    <ThemeSettingsContext.Provider value={value}>
      {children}
    </ThemeSettingsContext.Provider>
  );
}

export function useThemeSettings(): ThemeSettingsContextValue {
  const ctx = useContext(ThemeSettingsContext);
  if (!ctx) {
    throw new Error("useThemeSettings must be used within ThemeSettingsProvider");
  }
  return ctx;
}
