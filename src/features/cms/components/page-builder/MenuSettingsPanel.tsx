"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import {
  Input,
  Label,
  UnifiedSelect,
  Checkbox,
  Button,
  PanelHeader,
  SectionPanel,
} from "@/shared/ui";
import { useSettingsMap, useUpdateSetting } from "@/shared/hooks/use-settings";
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
import { ANIMATION_PRESETS, type AnimationPreset } from "@/features/gsap/types/animation";
import { useCmsDomainSelection } from "@/features/cms/hooks/useCmsDomainSelection";
import type { ColorScheme } from "@/features/cms/types/theme-settings";
import type { CmsDomain } from "@/features/cms/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  { label: "Bebas Neue", value: "'Bebas Neue', sans-serif" },
  { label: "Space Grotesk", value: "'Space Grotesk', sans-serif" },
  { label: "Manrope", value: "Manrope, sans-serif" },
  { label: "Outfit", value: "Outfit, sans-serif" },
  { label: "Plus Jakarta Sans", value: "'Plus Jakarta Sans', sans-serif" },
  { label: "DM Sans", value: "'DM Sans', sans-serif" },
  { label: "Sora", value: "Sora, sans-serif" },
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
}): React.JSX.Element {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-gray-500">{label}</Label>
      <div className="flex items-center gap-2">
        <label className="relative flex size-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-border/50">
          <input
            type="color"
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
          <div className="size-full rounded" style={{ backgroundColor: value }} />
        </label>
        <Input
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
          className="h-7 flex-1 bg-gray-800/40 text-xs font-mono"
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
}): React.JSX.Element {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-gray-500">{label}</Label>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(Number(e.target.value))}
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
}): React.JSX.Element {
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
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(Number(e.target.value))}
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
}): React.JSX.Element {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-gray-500">{label}</Label>
      <UnifiedSelect
        value={value}
        onValueChange={onChange}
        options={options}
        triggerClassName="h-7 bg-gray-800/40 text-xs"
      />
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
}): React.JSX.Element {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox
        checked={checked}
        onCheckedChange={(v: boolean | "indeterminate"): void => onChange(v === true)}
      />
      <span className="text-xs text-gray-300">{label}</span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function MenuSettingsPanel({ showHeader = true }: { showHeader?: boolean } = {}): React.JSX.Element {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const { theme } = useThemeSettings();
  const { domains, activeDomainId, zoningEnabled } = useCmsDomainSelection();
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();
  const hasHydratedRef = useRef(false);
  const loadedKeyRef = useRef<string | null>(null);
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

  const hasScopedMenu = useMemo((): boolean => {
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
    persistTimerRef.current = window.setTimeout((): void => {
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
        case "Visibility & Placement":
          return (
            <div className="space-y-3">
              <CheckboxField
                label="Show menu"
                checked={settings.showMenu}
                onChange={(v: boolean): void => update("showMenu", v)}
              />
              <SelectField
                label="Menu position"
                value={settings.menuPlacement}
                onChange={(v: string): void => update("menuPlacement", v as "top" | "left" | "right")}
                options={[
                  { label: "Top", value: "top" },
                  { label: "Left", value: "left" },
                  { label: "Right", value: "right" },
                ]}
              />
              <CheckboxField
                label="Collapsible menu"
                checked={settings.collapsible}
                onChange={(v: boolean): void => update("collapsible", v)}
              />
              {settings.collapsible && (
                <CheckboxField
                  label="Collapsed by default"
                  checked={settings.collapsedByDefault}
                  onChange={(v: boolean): void => update("collapsedByDefault", v)}
                />
              )}
              {(settings.menuPlacement === "left" || settings.menuPlacement === "right") && (
                <>
                  <RangeField
                    label="Side width"
                    value={settings.sideWidth}
                    onChange={(v: number): void => update("sideWidth", v)}
                    min={160}
                    max={420}
                    suffix="px"
                  />
                  {settings.collapsible && (
                    <RangeField
                      label="Collapsed width"
                      value={settings.collapsedWidth}
                      onChange={(v: number): void => update("collapsedWidth", v)}
                      min={48}
                      max={120}
                      suffix="px"
                    />
                  )}
                </>
              )}
            </div>
          );

        case "Menu Layout":
          return (
            <div className="space-y-3">
              <SelectField
                label="Layout style"
                value={settings.layoutStyle}
                onChange={(v: string): void => update("layoutStyle", v)}
                options={[
                  { label: "Horizontal", value: "horizontal" },
                  { label: "Vertical", value: "vertical" },
                  { label: "Centered", value: "centered" },
                ]}
              />
              <SelectField
                label="Alignment"
                value={settings.alignment}
                onChange={(v: string): void => update("alignment", v)}
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
                onChange={(v: number): void => update("maxWidth", v)}
                min={800}
                max={1400}
                suffix="px"
              />
              <CheckboxField
                label="Full width"
                checked={settings.fullWidth}
                onChange={(v: boolean): void => update("fullWidth", v)}
              />
            </div>
          );

        case "Menu Items":
          return (
            <div className="space-y-2">
              {settings.items.map((item: MenuItem) => (
                <SectionPanel
                  key={item.id}
                  variant="subtle-compact"
                  className="flex items-start gap-1.5 p-2"
                >
                  <div className="flex-1 space-y-1.5">
                    <Input
                      value={item.label}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                        updateMenuItem(item.id, "label", e.target.value)
                      }
                      placeholder="Label"
                      className="h-7 bg-gray-800/40 text-xs"
                    />
                    <Input
                      value={item.url}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                        updateMenuItem(item.id, "url", e.target.value)
                      }
                      placeholder="URL"
                      className="h-7 bg-gray-800/40 text-xs"
                    />
                    {settings.showItemImages && (
                      <Input
                        value={item.imageUrl ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
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
                </SectionPanel>
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

        case "Menu Images":
          return (
            <div className="space-y-3">
              <CheckboxField
                label="Show item images"
                checked={settings.showItemImages}
                onChange={(v: boolean): void => update("showItemImages", v)}
              />
              {settings.showItemImages && (
                <RangeField
                  label="Image size"
                  value={settings.itemImageSize}
                  onChange={(v: number): void => update("itemImageSize", v)}
                  min={12}
                  max={48}
                  suffix="px"
                />
              )}
            </div>
          );

        case "Typography":
          return (
            <div className="space-y-3">
              <SelectField
                label="Font family"
                value={settings.fontFamily}
                onChange={(v: string): void => update("fontFamily", v)}
                options={FONT_FAMILY_OPTIONS}
              />
              <NumberField
                label="Font size"
                value={settings.fontSize}
                onChange={(v: number): void => update("fontSize", v)}
                suffix="px"
                min={10}
                max={32}
              />
              <SelectField
                label="Font weight"
                value={settings.fontWeight}
                onChange={(v: string): void => update("fontWeight", v)}
                options={FONT_WEIGHT_OPTIONS}
              />
              <NumberField
                label="Letter spacing"
                value={settings.letterSpacing}
                onChange={(v: number): void => update("letterSpacing", v)}
                suffix="px"
                min={-2}
                max={10}
              />
              <SelectField
                label="Text transform"
                value={settings.textTransform}
                onChange={(v: string): void => update("textTransform", v)}
                options={[
                  { label: "None", value: "none" },
                  { label: "Uppercase", value: "uppercase" },
                  { label: "Capitalize", value: "capitalize" },
                ]}
              />
            </div>
          );

        case "Colors":
          return (
            <div className="space-y-3">
              <SelectField
                label="Color scheme"
                value={menuColorSchemeId}
                onChange={(v: string): void => update("menuColorSchemeId", v)}
                options={colorSchemeOptions}
              />
              {menuColorSchemeId === "custom" && (
                <>
                  <ColorField
                    label="Background"
                    value={settings.backgroundColor}
                    onChange={(v: string): void => update("backgroundColor", v)}
                  />
                  <ColorField
                    label="Text color"
                    value={settings.textColor}
                    onChange={(v: string): void => update("textColor", v)}
                  />
                  <ColorField
                    label="Active item"
                    value={settings.activeItemColor}
                    onChange={(v: string): void => update("activeItemColor", v)}
                  />
                  <ColorField
                    label="Border"
                    value={settings.borderColor}
                    onChange={(v: string): void => update("borderColor", v)}
                  />
                </>
              )}
            </div>
          );

        case "Spacing":
          return (
            <div className="space-y-3">
              <Label className="text-[10px] uppercase tracking-wider text-gray-500">Padding</Label>
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Top" value={settings.paddingTop} onChange={(v: number): void => update("paddingTop", v)} suffix="px" min={0} max={100} />
                <NumberField label="Right" value={settings.paddingRight} onChange={(v: number): void => update("paddingRight", v)} suffix="px" min={0} max={100} />
                <NumberField label="Bottom" value={settings.paddingBottom} onChange={(v: number): void => update("paddingBottom", v)} suffix="px" min={0} max={100} />
                <NumberField label="Left" value={settings.paddingLeft} onChange={(v: number): void => update("paddingLeft", v)} suffix="px" min={0} max={100} />
              </div>
              <RangeField
                label="Item gap"
                value={settings.itemGap}
                onChange={(v: number): void => update("itemGap", v)}
                min={0}
                max={40}
                suffix="px"
              />
            </div>
          );

        case "Mobile Menu":
          return (
            <div className="space-y-3">
              <SelectField
                label="Breakpoint"
                value={settings.mobileBreakpoint}
                onChange={(v: string): void => update("mobileBreakpoint", v)}
                options={[
                  { label: "768px (Tablet)", value: "768" },
                  { label: "1024px (Small desktop)", value: "1024" },
                  { label: "1280px (Large desktop)", value: "1280" },
                ]}
              />
              <SelectField
                label="Animation"
                value={settings.mobileAnimation}
                onChange={(v: string): void => update("mobileAnimation", v)}
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
                onChange={(v: string): void => update("hamburgerColor", v)}
              />
              <CheckboxField
                label="Show overlay"
                checked={settings.mobileOverlay}
                onChange={(v: boolean): void => update("mobileOverlay", v)}
              />
            </div>
          );

        case "Dropdown Style":
          return (
            <div className="space-y-3">
              <ColorField
                label="Background"
                value={settings.dropdownBg}
                onChange={(v: string): void => update("dropdownBg", v)}
              />
              <ColorField
                label="Text color"
                value={settings.dropdownTextColor}
                onChange={(v: string): void => update("dropdownTextColor", v)}
              />
              <NumberField
                label="Border radius"
                value={settings.dropdownRadius}
                onChange={(v: number): void => update("dropdownRadius", v)}
                suffix="px"
                min={0}
                max={24}
              />
              <SelectField
                label="Shadow"
                value={settings.dropdownShadow}
                onChange={(v: string): void => update("dropdownShadow", v)}
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
                onChange={(v: number): void => update("dropdownMinWidth", v)}
                suffix="px"
                min={100}
                max={400}
              />
            </div>
          );

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
                onChange={(v: string): void => update("positionMode", v as "static" | "sticky")}
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
                    onChange={(v: number): void => update("stickyOffset", v)}
                    suffix="px"
                    min={0}
                    max={200}
                  />
                  <CheckboxField
                    label="Shrink on scroll"
                    checked={settings.shrinkOnScroll}
                    onChange={(v: boolean): void => update("shrinkOnScroll", v)}
                  />
                  <ColorField
                    label="Sticky background"
                    value={settings.stickyBackground}
                    onChange={(v: string): void => update("stickyBackground", v)}
                  />
                </>
              )}
              {canHideOnScroll && (
                <>
                  <CheckboxField
                    label="Hide on scroll"
                    checked={settings.hideOnScroll}
                    onChange={(v: boolean): void => update("hideOnScroll", v)}
                  />
                  {settings.hideOnScroll && (
                    <NumberField
                      label="Show on scroll up after"
                      value={settings.showOnScrollUpAfterPx}
                      onChange={(v: number): void => update("showOnScrollUpAfterPx", v)}
                      suffix="px"
                      min={0}
                      max={600}
                    />
                  )}
                </>
              )}
            </div>
          );

        case "Active State":
          return (
            <div className="space-y-3">
              <SelectField
                label="Style"
                value={settings.activeStyle}
                onChange={(v: string): void => update("activeStyle", v)}
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
                onChange={(v: string): void => update("activeColor", v)}
              />
            </div>
          );

        case "Hover Effects":
          return (
            <div className="space-y-3">
              <SelectField
                label="Style"
                value={settings.hoverStyle}
                onChange={(v: string): void => update("hoverStyle", v)}
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
                onChange={(v: string): void => update("hoverColor", v)}
              />
              <RangeField
                label="Transition speed"
                value={settings.transitionSpeed}
                onChange={(v: number): void => update("transitionSpeed", v)}
                min={100}
                max={500}
                suffix="ms"
              />
            </div>
          );

        case "Animations":
          return (
            <div className="space-y-3">
              <SelectField
                label="Entry animation"
                value={settings.menuEntryAnimation}
                onChange={(v: string): void => update("menuEntryAnimation", v as AnimationPreset)}
                options={ANIMATION_PRESETS}
              />
              <SelectField
                label="Hover animation"
                value={settings.menuHoverAnimation}
                onChange={(v: string): void => update("menuHoverAnimation", v as AnimationPreset)}
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
        <PanelHeader
          title="Menu settings"
          subtitle="Configure the look and behaviour of your page navigation."
        />
      )}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          <SectionPanel variant="subtle" className="p-3">
            <Label className="text-[10px] uppercase tracking-wider text-gray-500">
              Menu scope
            </Label>
            {zoningEnabled ? (
              <div className="mt-2 space-y-2">
                <UnifiedSelect
                  value={menuScopeId}
                  onValueChange={(value: string): void => {
                    setUserMenuScopeId(value);
                  }}
                  options={[
                    { value: "default", label: "Default (fallback)" },
                    ...domains.map((domain: CmsDomain) => ({
                      value: domain.id,
                      label: domain.domain,
                      description: domain.id === activeDomainId ? "active" : undefined
                    }))
                  ]}
                  placeholder="Select zone"
                  triggerClassName="h-8 text-xs"
                />
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
          </SectionPanel>
          <div className="space-y-2">
          {MENU_SECTIONS.map((section: string) => {
            const isOpen = openSections.has(section);
            return (
              <SectionPanel
                key={section}
                variant="subtle"
                className="p-0 overflow-hidden"
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
              </SectionPanel>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}
