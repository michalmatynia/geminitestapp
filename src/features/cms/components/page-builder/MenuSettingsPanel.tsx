"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Button,
} from "@/shared/ui";
import { useSettingsMap, useUpdateSetting } from "@/shared/hooks/useSettings";
import { parseJsonSetting, serializeSetting } from "@/shared/utils/settings-json";
import {
  CMS_MENU_SETTINGS_KEY,
  DEFAULT_MENU_SETTINGS,
  getCmsMenuSettingsKey,
  type MenuItem,
  type MenuSettings,
  normalizeMenuSettings,
} from "@/features/cms/types/menu-settings";
import { useThemeSettings } from "./ThemeSettingsContext";
import { ANIMATION_PRESETS } from "@/features/gsap/types/animation";
import { useCmsDomainSelection } from "@/features/cms/hooks/useCmsDomainSelection";
import type { ColorScheme } from "@/features/cms/types/theme-settings";
import type { CmsDomain } from "@/features/cms/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Types imported from menu-settings.ts

const MENU_SECTIONS = [
  "Visibility & Placement",
  "Menu Layout",
  "Menu Items",
  "Menu Images",
  "Typography",
  "Colors",
  "Spacing",
  "Mobile Menu",
  "Dropdown Style",
  "Sticky Behaviour",
  "Active State",
  "Hover Effects",
  "Animations",
];

const COLOR_SCHEME_FALLBACK = [
  { label: "Custom colors", value: "custom" },
];

const FONT_FAMILY_OPTIONS = [
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Palatino", value: "'Palatino Linotype', serif" },
  { label: "System UI", value: "system-ui, sans-serif" },
];

const FONT_WEIGHT_OPTIONS = [
  { label: "100 – Thin", value: "100" },
  { label: "200 – Extra Light", value: "200" },
  { label: "300 – Light", value: "300" },
  { label: "400 – Normal", value: "400" },
  { label: "500 – Medium", value: "500" },
  { label: "600 – Semi Bold", value: "600" },
  { label: "700 – Bold", value: "700" },
  { label: "800 – Extra Bold", value: "800" },
  { label: "900 – Black", value: "900" },
];

// ---------------------------------------------------------------------------
// Reusable helpers
// ---------------------------------------------------------------------------

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}): React.ReactNode {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-gray-500">{label}</Label>
      <div className="flex items-center gap-2">
        <label className="relative flex size-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-border/50">
          <input
            type="color"
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
          <div className="size-full rounded" style={{ backgroundColor: value }} />
        </label>
        <Input
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          className="h-7 flex-1 bg-gray-800/40 text-xs"
        />
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
}): React.ReactNode {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-gray-500">{label}</Label>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))}
          className="h-7 flex-1 bg-gray-800/40 text-xs"
        />
        {suffix && <span className="text-[10px] text-gray-500">{suffix}</span>}
      </div>
    </div>
  );
}

function RangeField({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix?: string;
}): React.ReactNode {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] uppercase tracking-wider text-gray-500">{label}</Label>
        <span className="text-[11px] text-gray-300">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}): React.ReactNode {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-gray-500">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 bg-gray-800/40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt: { label: string; value: string }) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): React.ReactNode {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox
        checked={checked}
        onCheckedChange={(v: boolean | "indeterminate") => onChange(v === true)}
      />
      <span className="text-xs text-gray-300">{label}</span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function MenuSettingsPanel({ showHeader = true }: { showHeader?: boolean } = {}): React.ReactNode {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const { theme } = useThemeSettings();
  const { domains, activeDomainId, zoningEnabled } = useCmsDomainSelection();
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();
  const hasHydratedRef = useRef(false);
  const loadedKeyRef = useRef<string | null>(null);
  const scopeTouchedRef = useRef(false);
  const persistTimerRef = useRef<number | null>(null);

  const initialMenuScopeId = useMemo((): string => {
    if (!zoningEnabled) return "default";
    return activeDomainId || "default";
  }, [zoningEnabled, activeDomainId]);

  const [userMenuScopeId, setUserMenuScopeId] = useState<string | null>(null);
  const menuScopeId = useMemo((): string => {
    if (!zoningEnabled) return "default";
    return userMenuScopeId ?? initialMenuScopeId;
  }, [initialMenuScopeId, userMenuScopeId, zoningEnabled]);

  const menuKey = useMemo((): string => {
    if (!zoningEnabled) return CMS_MENU_SETTINGS_KEY;
    if (!menuScopeId || menuScopeId === "default") return CMS_MENU_SETTINGS_KEY;
    return getCmsMenuSettingsKey(menuScopeId);
  }, [menuScopeId, zoningEnabled]);

  const initialSettings = useMemo((): MenuSettings => {
    if (!settingsQuery.isFetched) return DEFAULT_MENU_SETTINGS;
    const stored = parseJsonSetting<Partial<MenuSettings> | null>(
      settingsQuery.data?.get(menuKey),
      null
    );
    if (!stored && menuKey !== CMS_MENU_SETTINGS_KEY) {
      const fallback = parseJsonSetting<Partial<MenuSettings> | null>(
        settingsQuery.data?.get(CMS_MENU_SETTINGS_KEY),
        null
      );
      return normalizeMenuSettings(fallback);
    }
    return normalizeMenuSettings(stored);
  }, [menuKey, settingsQuery.data, settingsQuery.isFetched]);

  const [userSettings, setUserSettings] = useState<MenuSettings | null>(null);
  const settings = userSettings ?? initialSettings;

  const colorSchemeOptions = useMemo((): { label: string; value: string }[] => {
    const options = [...COLOR_SCHEME_FALLBACK];
    const schemes: ColorScheme[] = theme?.colorSchemes ?? [];
    schemes.forEach((scheme: ColorScheme) => {
      if (!scheme?.id) return;
      options.push({ label: scheme.name || scheme.id, value: scheme.id });
    });
    return options;
  }, [theme?.colorSchemes]);

  const availableColorSchemeIds = useMemo((): Set<string> => {
    return new Set((theme?.colorSchemes ?? []).map((scheme: ColorScheme) => scheme.id));
  }, [theme?.colorSchemes]);

  const menuColorSchemeId = useMemo((): string => {
    if (settings.menuColorSchemeId === "custom") return "custom";
    return availableColorSchemeIds.has(settings.menuColorSchemeId) ? settings.menuColorSchemeId : "custom";
  }, [availableColorSchemeIds, settings.menuColorSchemeId]);

  const hasScopedMenu = useMemo(() => {
    if (!zoningEnabled) return false;
    if (menuKey === CMS_MENU_SETTINGS_KEY) return false;
    return settingsQuery.data?.has(menuKey) ?? false;
  }, [menuKey, settingsQuery.data, zoningEnabled]);

  const update = useCallback(<K extends keyof MenuSettings>(key: K, value: MenuSettings[K]): void => {
    setUserSettings((prev: MenuSettings | null) => ({ ...(prev ?? initialSettings), [key]: value }));
  }, [initialSettings]);

  const addMenuItem = useCallback((): void => {
    setUserSettings((prev: MenuSettings | null) => {
      const current = prev ?? initialSettings;
      return {
        ...current,
        items: [
          ...current.items,
          { id: String(Date.now()), label: "New link", url: "/", imageUrl: "" },
        ],
      };
    });
  }, [initialSettings]);

  const updateMenuItem = useCallback((id: string, field: "label" | "url" | "imageUrl", value: string): void => {
    setUserSettings((prev: MenuSettings | null) => {
      const current = prev ?? initialSettings;
      return {
        ...current,
        items: current.items.map((item: MenuItem) =>
          item.id === id ? { ...item, [field]: value } : item
        ),
      };
    });
  }, [initialSettings]);

  const removeMenuItem = useCallback((id: string): void => {
    setUserSettings((prev: MenuSettings | null) => {
      const current = prev ?? initialSettings;
      return {
        ...current,
        items: current.items.filter((item: MenuItem) => item.id !== id),
      };
    });
  }, [initialSettings]);

  useEffect((): void => {
    if (!settingsQuery.isFetched) return;
    hasHydratedRef.current = true;
    loadedKeyRef.current = menuKey;
  }, [menuKey, settingsQuery.isFetched]);

  useEffect((): void => {
    if (!hasHydratedRef.current) return;
    if (loadedKeyRef.current !== menuKey) return;
    if (!userSettings) return;
    const nextSerialized = serializeSetting(userSettings);
    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      updateSetting.mutate({ key: menuKey, value: nextSerialized });
    }, 500);
  }, [menuKey, userSettings, updateSetting]);

  useEffect((): () => void => {
    return (): void => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    };
  }, []);

  const toggleSection = useCallback((section: string): void => {
    setOpenSections((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const renderSectionBody = useCallback(
    (section: string): React.ReactNode => {
      switch (section) {
        // ---------------------------------------------------------------
        // Visibility & Placement
        // ---------------------------------------------------------------
        case "Visibility & Placement":
          return (
            <div className="space-y-3">
              <CheckboxField
                label="Show menu"
                checked={settings.showMenu}
                onChange={(v: boolean) => update("showMenu", v)}
              />
              <SelectField
                label="Menu position"
                value={settings.menuPlacement}
                onChange={(v: MenuSettings["menuPlacement"]) => update("menuPlacement", v)}
                options={[
                  { label: "Top", value: "top" },
                  { label: "Left", value: "left" },
                  { label: "Right", value: "right" },
                ]}
              />
              <CheckboxField
                label="Collapsible menu"
                checked={settings.collapsible}
                onChange={(v: boolean) => update("collapsible", v)}
              />
              {settings.collapsible && (
                <CheckboxField
                  label="Collapsed by default"
                  checked={settings.collapsedByDefault}
                  onChange={(v: boolean) => update("collapsedByDefault", v)}
                />
              )}
              {(settings.menuPlacement === "left" || settings.menuPlacement === "right") && (
                <>
                  <RangeField
                    label="Side width"
                    value={settings.sideWidth}
                    onChange={(v: number) => update("sideWidth", v)}
                    min={160}
                    max={420}
                    suffix="px"
                  />
                  {settings.collapsible && (
                    <RangeField
                      label="Collapsed width"
                      value={settings.collapsedWidth}
                      onChange={(v: number) => update("collapsedWidth", v)}
                      min={48}
                      max={120}
                      suffix="px"
                    />
                  )}
                </>
              )}
            </div>
          );

        // ---------------------------------------------------------------
        // Menu Layout
        // ---------------------------------------------------------------
        case "Menu Layout":
          return (
            <div className="space-y-3">
              <SelectField
                label="Layout style"
                value={settings.layoutStyle}
                onChange={(v: string) => update("layoutStyle", v)}
                options={[
                  { label: "Horizontal", value: "horizontal" },
                  { label: "Vertical", value: "vertical" },
                  { label: "Centered", value: "centered" },
                ]}
              />
              <SelectField
                label="Alignment"
                value={settings.alignment}
                onChange={(v: string) => update("alignment", v)}
                options={[
                  { label: "Left", value: "left" },
                  { label: "Center", value: "center" },
                  { label: "Right", value: "right" },
                  { label: "Space between", value: "space-between" },
                ]}
              />
              <RangeField
                label="Max width"
                value={settings.maxWidth}
                onChange={(v: number) => update("maxWidth", v)}
                min={800}
                max={1400}
                suffix="px"
              />
              <CheckboxField
                label="Full width"
                checked={settings.fullWidth}
                onChange={(v: boolean) => update("fullWidth", v)}
              />
            </div>
          );

        // ---------------------------------------------------------------
        // Menu Items
        // ---------------------------------------------------------------
        case "Menu Items":
          return (
            <div className="space-y-2">
              {settings.items.map((item: MenuItem) => (
                <div
                  key={item.id}
                  className="flex items-start gap-1.5 rounded border border-border/40 bg-gray-800/30 p-2"
                >
                  <div className="flex-1 space-y-1.5">
                    <Input
                      value={item.label}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateMenuItem(item.id, "label", e.target.value)
                      }
                      placeholder="Label"
                      className="h-7 bg-gray-800/40 text-xs"
                    />
                    <Input
                      value={item.url}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateMenuItem(item.id, "url", e.target.value)
                      }
                      placeholder="URL"
                      className="h-7 bg-gray-800/40 text-xs"
                    />
                    {settings.showItemImages && (
                      <Input
                        value={item.imageUrl ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateMenuItem(item.id, "imageUrl", e.target.value)
                        }
                        placeholder="Image URL"
                        className="h-7 bg-gray-800/40 text-xs"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(): void => removeMenuItem(item.id)}
                    className="mt-1 rounded p-1 text-gray-500 hover:text-red-300 hover:bg-red-500/10"
                    title="Remove item"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={addMenuItem}
              >
                <Plus className="mr-1.5 size-3.5" />
                Add menu item
              </Button>
            </div>
          );

        // ---------------------------------------------------------------
        // Menu Images
        // ---------------------------------------------------------------
        case "Menu Images":
          return (
            <div className="space-y-3">
              <CheckboxField
                label="Show item images"
                checked={settings.showItemImages}
                onChange={(v: boolean) => update("showItemImages", v)}
              />
              {settings.showItemImages && (
                <RangeField
                  label="Image size"
                  value={settings.itemImageSize}
                  onChange={(v: number) => update("itemImageSize", v)}
                  min={12}
                  max={48}
                  suffix="px"
                />
              )}
            </div>
          );

        // ---------------------------------------------------------------
        // Typography
        // ---------------------------------------------------------------
        case "Typography":
          return (
            <div className="space-y-3">
              <SelectField
                label="Font family"
                value={settings.fontFamily}
                onChange={(v: string) => update("fontFamily", v)}
                options={FONT_FAMILY_OPTIONS}
              />
              <NumberField
                label="Font size"
                value={settings.fontSize}
                onChange={(v: number) => update("fontSize", v)}
                suffix="px"
                min={10}
                max={32}
              />
              <SelectField
                label="Font weight"
                value={settings.fontWeight}
                onChange={(v: string) => update("fontWeight", v)}
                options={FONT_WEIGHT_OPTIONS}
              />
              <NumberField
                label="Letter spacing"
                value={settings.letterSpacing}
                onChange={(v: number) => update("letterSpacing", v)}
                suffix="px"
                min={-2}
                max={10}
              />
              <SelectField
                label="Text transform"
                value={settings.textTransform}
                onChange={(v: string) => update("textTransform", v)}
                options={[
                  { label: "None", value: "none" },
                  { label: "Uppercase", value: "uppercase" },
                  { label: "Capitalize", value: "capitalize" },
                ]}
              />
            </div>
          );

        // ---------------------------------------------------------------
        // Colors
        // ---------------------------------------------------------------
        case "Colors":
          return (
            <div className="space-y-3">
              <SelectField
                label="Color scheme"
                value={menuColorSchemeId}
                onChange={(v: string) => update("menuColorSchemeId", v)}
                options={colorSchemeOptions}
              />
              {menuColorSchemeId === "custom" && (
                <>
                  <ColorField
                    label="Background"
                    value={settings.backgroundColor}
                    onChange={(v: string) => update("backgroundColor", v)}
                  />
                  <ColorField
                    label="Text color"
                    value={settings.textColor}
                    onChange={(v: string) => update("textColor", v)}
                  />
                  <ColorField
                    label="Active item"
                    value={settings.activeItemColor}
                    onChange={(v: string) => update("activeItemColor", v)}
                  />
                  <ColorField
                    label="Border"
                    value={settings.borderColor}
                    onChange={(v: string) => update("borderColor", v)}
                  />
                </>
              )}
            </div>
          );

        // ---------------------------------------------------------------
        // Spacing
        // ---------------------------------------------------------------
        case "Spacing":
          return (
            <div className="space-y-3">
              <Label className="text-[10px] uppercase tracking-wider text-gray-500">Padding</Label>
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Top" value={settings.paddingTop} onChange={(v: number) => update("paddingTop", v)} suffix="px" min={0} max={100} />
                <NumberField label="Right" value={settings.paddingRight} onChange={(v: number) => update("paddingRight", v)} suffix="px" min={0} max={100} />
                <NumberField label="Bottom" value={settings.paddingBottom} onChange={(v: number) => update("paddingBottom", v)} suffix="px" min={0} max={100} />
                <NumberField label="Left" value={settings.paddingLeft} onChange={(v: number) => update("paddingLeft", v)} suffix="px" min={0} max={100} />
              </div>
              <RangeField
                label="Item gap"
                value={settings.itemGap}
                onChange={(v: number) => update("itemGap", v)}
                min={0}
                max={40}
                suffix="px"
              />
            </div>
          );

        // ---------------------------------------------------------------
        // Mobile Menu
        // ---------------------------------------------------------------
        case "Mobile Menu":
          return (
            <div className="space-y-3">
              <SelectField
                label="Breakpoint"
                value={settings.mobileBreakpoint}
                onChange={(v: string) => update("mobileBreakpoint", v)}
                options={[
                  { label: "768px (Tablet)", value: "768" },
                  { label: "1024px (Small desktop)", value: "1024" },
                  { label: "1280px (Large desktop)", value: "1280" },
                ]}
              />
              <SelectField
                label="Animation"
                value={settings.mobileAnimation}
                onChange={(v: string) => update("mobileAnimation", v)}
                options={[
                  { label: "Slide left", value: "slide-left" },
                  { label: "Slide right", value: "slide-right" },
                  { label: "Slide down", value: "slide-down" },
                  { label: "Fade", value: "fade" },
                ]}
              />
              <ColorField
                label="Hamburger color"
                value={settings.hamburgerColor}
                onChange={(v: string) => update("hamburgerColor", v)}
              />
              <CheckboxField
                label="Show overlay"
                checked={settings.mobileOverlay}
                onChange={(v: boolean) => update("mobileOverlay", v)}
              />
            </div>
          );

        // ---------------------------------------------------------------
        // Dropdown Style
        // ---------------------------------------------------------------
        case "Dropdown Style":
          return (
            <div className="space-y-3">
              <ColorField
                label="Background"
                value={settings.dropdownBg}
                onChange={(v: string) => update("dropdownBg", v)}
              />
              <ColorField
                label="Text color"
                value={settings.dropdownTextColor}
                onChange={(v: string) => update("dropdownTextColor", v)}
              />
              <NumberField
                label="Border radius"
                value={settings.dropdownRadius}
                onChange={(v: number) => update("dropdownRadius", v)}
                suffix="px"
                min={0}
                max={24}
              />
              <SelectField
                label="Shadow"
                value={settings.dropdownShadow}
                onChange={(v: string) => update("dropdownShadow", v)}
                options={[
                  { label: "None", value: "none" },
                  { label: "Small", value: "small" },
                  { label: "Medium", value: "medium" },
                  { label: "Large", value: "large" },
                ]}
              />
              <NumberField
                label="Min width"
                value={settings.dropdownMinWidth}
                onChange={(v: number) => update("dropdownMinWidth", v)}
                suffix="px"
                min={100}
                max={400}
              />
            </div>
          );

        // ---------------------------------------------------------------
        // Sticky Behaviour
        // ---------------------------------------------------------------
        case "Sticky Behaviour":
          const positionMode =
            settings.positionMode ?? (settings.stickyEnabled ? "sticky" : "static");
          const isSticky = positionMode === "sticky";
          const isSide = settings.menuPlacement === "left" || settings.menuPlacement === "right";
          const canHideOnScroll = isSticky || isSide;
          return (
            <div className="space-y-3">
              <SelectField
                label="Menu position"
                value={positionMode}
                onChange={(v: MenuSettings["positionMode"]) => update("positionMode", v)}
                options={[
                  { label: "Glued to top", value: "sticky" },
                  { label: "Top of page", value: "static" },
                ]}
              />
              {isSticky && (
                <>
                  <NumberField
                    label="Sticky offset"
                    value={settings.stickyOffset}
                    onChange={(v: number) => update("stickyOffset", v)}
                    suffix="px"
                    min={0}
                    max={200}
                  />
                  <CheckboxField
                    label="Shrink on scroll"
                    checked={settings.shrinkOnScroll}
                    onChange={(v: boolean) => update("shrinkOnScroll", v)}
                  />
                  <ColorField
                    label="Sticky background"
                    value={settings.stickyBackground}
                    onChange={(v: string) => update("stickyBackground", v)}
                  />
                </>
              )}
              {canHideOnScroll && (
                <>
                  <CheckboxField
                    label="Hide on scroll"
                    checked={settings.hideOnScroll}
                    onChange={(v: boolean) => update("hideOnScroll", v)}
                  />
                  {settings.hideOnScroll && (
                    <NumberField
                      label="Show on scroll up after"
                      value={settings.showOnScrollUpAfterPx}
                      onChange={(v: number) => update("showOnScrollUpAfterPx", v)}
                      suffix="px"
                      min={0}
                      max={600}
                    />
                  )}
                </>
              )}
            </div>
          );

        // ---------------------------------------------------------------
        // Active State
        // ---------------------------------------------------------------
        case "Active State":
          return (
            <div className="space-y-3">
              <SelectField
                label="Style"
                value={settings.activeStyle}
                onChange={(v: string) => update("activeStyle", v)}
                options={[
                  { label: "Underline", value: "underline" },
                  { label: "Bold", value: "bold" },
                  { label: "Background", value: "background" },
                  { label: "Border bottom", value: "border-bottom" },
                  { label: "None", value: "none" },
                ]}
              />
              <ColorField
                label="Active color"
                value={settings.activeColor}
                onChange={(v: string) => update("activeColor", v)}
              />
            </div>
          );

        // ---------------------------------------------------------------
        // Hover Effects
        // ---------------------------------------------------------------
        case "Hover Effects":
          return (
            <div className="space-y-3">
              <SelectField
                label="Style"
                value={settings.hoverStyle}
                onChange={(v: string) => update("hoverStyle", v)}
                options={[
                  { label: "Underline", value: "underline" },
                  { label: "Color shift", value: "color-shift" },
                  { label: "Background", value: "background" },
                  { label: "Scale", value: "scale" },
                  { label: "None", value: "none" },
                ]}
              />
              <ColorField
                label="Hover color"
                value={settings.hoverColor}
                onChange={(v: string) => update("hoverColor", v)}
              />
              <RangeField
                label="Transition speed"
                value={settings.transitionSpeed}
                onChange={(v: number) => update("transitionSpeed", v)}
                min={100}
                max={500}
                suffix="ms"
              />
            </div>
          );

        // ---------------------------------------------------------------
        // Animations
        // ---------------------------------------------------------------
        case "Animations":
          return (
            <div className="space-y-3">
              <SelectField
                label="Entry animation"
                value={settings.menuEntryAnimation}
                onChange={(v: string) => update("menuEntryAnimation", v)}
                options={ANIMATION_PRESETS}
              />
              <SelectField
                label="Hover animation"
                value={settings.menuHoverAnimation}
                onChange={(v: string) => update("menuHoverAnimation", v)}
                options={ANIMATION_PRESETS}
              />
            </div>
          );

        default:
          return <div className="text-xs text-gray-500">Settings coming soon.</div>;
      }
    },
    [settings, update, addMenuItem, updateMenuItem, removeMenuItem, colorSchemeOptions, menuColorSchemeId]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showHeader && (
        <div className="border-b border-border px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Menu settings
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Configure the look and behaviour of your page navigation.
          </p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          <div className="rounded border border-border/40 bg-gray-900/50 p-3">
            <Label className="text-[10px] uppercase tracking-wider text-gray-500">
              Menu scope
            </Label>
            {zoningEnabled ? (
              <div className="mt-2 space-y-2">
                <Select
                  value={menuScopeId}
                  onValueChange={(value: string) => {
                    scopeTouchedRef.current = true;
                    setUserMenuScopeId(value);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (fallback)</SelectItem>
                    {domains.map((domain: CmsDomain) => (
                      <SelectItem key={domain.id} value={domain.id}>
                        {domain.domain}
                        {domain.id === activeDomainId ? " (active)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {menuScopeId !== "default" && !hasScopedMenu ? (
                  <p className="text-[10px] text-gray-500">
                    Using default menu until you customize this zone.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-gray-500">
                Simple routing enabled. This menu applies globally.
              </p>
            )}
          </div>
          <div className="space-y-2">
          {MENU_SECTIONS.map((section: string) => {
            const isOpen = openSections.has(section);
            return (
              <div
                key={section}
                className="rounded border border-border/40 bg-gray-900/60"
              >
                <button
                  type="button"
                  onClick={(): void => toggleSection(section)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-gray-200 hover:bg-muted/40"
                  aria-expanded={isOpen}
                >
                  <span>{section}</span>
                  <ChevronDown className={`size-4 text-gray-500 transition ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-3 pb-3">{renderSectionBody(section)}</div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}
