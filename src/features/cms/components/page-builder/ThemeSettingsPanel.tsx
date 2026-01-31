"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ArrowLeft } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
} from "@/shared/ui";
import { useThemeSettings } from "./ThemeSettingsContext";
import type { ColorSchemeColors } from "@/features/cms/types/theme-settings";

const THEME_SECTIONS = [
  "Logo",
  "Colors",
  "Typography",
  "Layout",
  "Animations",
  "Buttons",
  "Variant Pills",
  "Inputs",
  "Product Cards",
  "Collection Cards",
  "Blog Cards",
  "Content Containers",
  "Media",
  "Dropdowns and pop-ups",
  "Drawers",
  "Badges",
  "Brand Information",
  "Social Media",
  "Search Behaviour",
  "Currency Format",
  "Cart",
  "Custom CSS",
  "Theme Style",
];

const FONT_OPTIONS = [
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

const WEIGHT_OPTIONS = [
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

const DEFAULT_SCHEME_COLORS: ColorSchemeColors = {
  background: "#0b1220",
  surface: "#111827",
  text: "#f3f4f6",
  accent: "#3b82f6",
  border: "#1f2937",
};

// ---------------------------------------------------------------------------
// Reusable field components
// ---------------------------------------------------------------------------

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }): React.ReactNode {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-gray-500">{label}</Label>
      <div className="flex items-center gap-2">
        <label className="relative flex size-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-border/50">
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
          <div className="size-full rounded" style={{ backgroundColor: value }} />
        </label>
        <Input value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} className="h-7 flex-1 bg-gray-800/40 text-xs" />
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, suffix, min, max }: { label: string; value: number; onChange: (v: number) => void; suffix?: string; min?: number; max?: number }): React.ReactNode {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-gray-500">{label}</Label>
      <div className="flex items-center gap-1.5">
        <Input type="number" value={value} min={min} max={max} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))} className="h-7 flex-1 bg-gray-800/40 text-xs" />
        {suffix && <span className="text-[10px] text-gray-500">{suffix}</span>}
      </div>
    </div>
  );
}

function RangeField({ label, value, onChange, min, max, suffix, step }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; suffix?: string; step?: number }): React.ReactNode {
  const safeValue = Number.isFinite(value) ? value : min;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] uppercase tracking-wider text-gray-500">{label}</Label>
        <span className="text-[11px] text-gray-300">{safeValue}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={safeValue} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-blue-500" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }): React.ReactNode {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-gray-500">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 bg-gray-800/40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }): React.ReactNode {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <span className="text-xs text-gray-300">{label}</span>
    </label>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }): React.ReactNode {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-gray-500">{label}</Label>
      <Input value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} placeholder={placeholder} className="h-7 bg-gray-800/40 text-xs" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const userPreferencesQueryKey = ["user-preferences"] as const;

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function ThemeSettingsPanel({ showHeader = true }: { showHeader?: boolean } = {}): React.ReactNode {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const { theme, setTheme, update } = useThemeSettings();
  const [schemeView, setSchemeView] = useState<"list" | "edit">("list");
  const [editingSchemeId, setEditingSchemeId] = useState<string | null>(null);
  const [newSchemeName, setNewSchemeName] = useState("");
  const [newSchemeColors, setNewSchemeColors] = useState<ColorSchemeColors>(DEFAULT_SCHEME_COLORS);
  const [isGlobalPaletteOpen, setIsGlobalPaletteOpen] = useState(false);

  // Logo-specific state (file picker)
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoWidth, setLogoWidth] = useState<number>(180);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Accordion open-state persistence
  const hasHydratedRef = useRef(false);
  const lastSavedRef = useRef<string>("[]");
  const persistTimerRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

  const preferencesQuery = useQuery({
    queryKey: userPreferencesQueryKey,
    queryFn: async (): Promise<{ cmsThemeOpenSections?: string[] | null }> => {
      const res = await fetch("/api/user/preferences");
      if (!res.ok) throw new Error("Failed to load user preferences");
      return (await res.json()) as { cmsThemeOpenSections?: string[] | null };
    },
    staleTime: 1000 * 60 * 5,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (payload: { cmsThemeOpenSections: string[] }): Promise<void> => {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update user preferences");
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: userPreferencesQueryKey }); },
    onError: (error: Error) => { console.warn("[CMS] Failed to persist theme settings state.", error); },
  });

  useEffect(() => {
    if (hasHydratedRef.current) return;
    if (!preferencesQuery.isFetched) return;
    const saved = preferencesQuery.data?.cmsThemeOpenSections ?? [];
    const filtered = saved.filter((item) => typeof item === "string");
    setOpenSections(new Set(filtered));
    lastSavedRef.current = JSON.stringify(filtered);
    hasHydratedRef.current = true;
  }, [preferencesQuery.data, preferencesQuery.isFetched]);

  const openSectionsArray = useMemo(() => Array.from(openSections), [openSections]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    const nextSerialized = JSON.stringify(openSectionsArray);
    if (nextSerialized === lastSavedRef.current) return;
    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      lastSavedRef.current = nextSerialized;
      updatePreferencesMutation.mutate({ cmsThemeOpenSections: openSectionsArray });
    }, 400);
  }, [openSectionsArray, updatePreferencesMutation]);

  useEffect(() => {
    return () => { if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current); };
  }, []);

  useEffect(() => {
    if (!theme.colorSchemes.length) return;
    if (theme.colorSchemes.some((scheme) => scheme.id === theme.activeColorSchemeId)) return;
    setTheme((prev) => ({
      ...prev,
      activeColorSchemeId: prev.colorSchemes[0]?.id ?? "",
    }));
  }, [theme.colorSchemes, theme.activeColorSchemeId, setTheme]);

  // Logo file preview
  useEffect(() => {
    if (!logoFile) {
      if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null; }
      setLogoPreviewUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(logoFile);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = nextUrl;
    setLogoPreviewUrl(nextUrl);
    return () => {
      if (previewUrlRef.current === nextUrl) { URL.revokeObjectURL(nextUrl); previewUrlRef.current = null; }
    };
  }, [logoFile]);

  const toggleSection = useCallback((section: string) => {
    setOpenSections((prev) => {
      if (!hasHydratedRef.current) hasHydratedRef.current = true;
      const next = new Set(prev);
      if (next.has(section)) { next.delete(section); } else { next.add(section); }
      return next;
    });
  }, []);

  const activeScheme = useMemo(() => {
    if (!theme.colorSchemes.length) return null;
    return theme.colorSchemes.find((scheme) => scheme.id === theme.activeColorSchemeId) ?? theme.colorSchemes[0];
  }, [theme.colorSchemes, theme.activeColorSchemeId]);

  const startAddScheme = useCallback(() => {
    setNewSchemeName("");
    setNewSchemeColors(activeScheme?.colors ?? DEFAULT_SCHEME_COLORS);
    setEditingSchemeId(null);
    setSchemeView("edit");
  }, [activeScheme]);

  const startEditScheme = useCallback((schemeId: string) => {
    const scheme = theme.colorSchemes.find((item) => item.id === schemeId);
    if (!scheme) return;
    setEditingSchemeId(schemeId);
    setNewSchemeName(scheme.name);
    setNewSchemeColors({ ...scheme.colors });
    setSchemeView("edit");
  }, [theme.colorSchemes]);

  const handleSaveScheme = useCallback(() => {
    const trimmed = newSchemeName.trim();
    const currentName = editingSchemeId
      ? theme.colorSchemes.find((scheme) => scheme.id === editingSchemeId)?.name
      : undefined;
    const schemeName = trimmed || currentName || `Scheme ${theme.colorSchemes.length + 1}`;

    if (editingSchemeId) {
      setTheme((prev) => ({
        ...prev,
        colorSchemes: prev.colorSchemes.map((scheme) =>
          scheme.id === editingSchemeId
            ? { ...scheme, name: schemeName, colors: { ...newSchemeColors } }
            : scheme
        ),
        activeColorSchemeId: editingSchemeId,
      }));
    } else {
      const id = `custom-${Date.now().toString(36)}`;
      setTheme((prev) => ({
        ...prev,
        colorSchemes: [
          ...prev.colorSchemes,
          { id, name: schemeName, colors: { ...newSchemeColors } },
        ],
        activeColorSchemeId: id,
      }));
    }

    setSchemeView("list");
    setEditingSchemeId(null);
    setNewSchemeName("");
  }, [editingSchemeId, newSchemeColors, newSchemeName, theme.colorSchemes, setTheme]);

  const handlePickLogo = useCallback(() => { fileInputRef.current?.click(); }, []);
  const handleLogoChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setLogoFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }, []);

  // ---------------------------------------------------------------------------
  // Section bodies
  // ---------------------------------------------------------------------------

  const renderSectionBody = useCallback(
    (section: string): React.ReactNode => {
      switch (section) {

        // ---------------------------------------------------------------
        case "Logo":
          return (
            <div className="space-y-3">
              <div className="rounded border border-dashed border-border/50 bg-gray-800/30 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Logo preview</div>
                <div className="mt-3 flex items-center justify-center rounded border border-border/40 bg-gray-900/50 p-4">
                  {logoPreviewUrl ? (
                    <img src={logoPreviewUrl} alt="Logo preview" style={{ width: `${logoWidth}px` }} className="h-auto max-w-full object-contain" />
                  ) : (
                    <div className="text-xs text-gray-500">No logo selected</div>
                  )}
                </div>
              </div>
              <RangeField label="Desktop logo width" value={logoWidth} onChange={setLogoWidth} min={50} max={300} suffix="px" />
              <div className="space-y-2">
                <button type="button" onClick={handlePickLogo} className="flex w-full items-center justify-center rounded border border-dashed border-border/50 bg-gray-800/30 px-3 py-3 text-xs font-medium text-gray-300 hover:bg-muted/40">
                  Image upload box
                </button>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handlePickLogo}>Choose file</Button>
                  <span className="flex-1 truncate text-[11px] text-gray-500">{logoFile?.name ?? "No file selected"}</span>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Colors":
          return (
            <div className="space-y-4">
              <div className="rounded border border-border/40 bg-gray-900/60 p-3">
                <div className="flex items-center justify-end">
                  {schemeView === "list" ? (
                    <div className="flex items-center gap-2">
                      {activeScheme && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditScheme(activeScheme.id)}
                          className="h-7 px-2 text-[11px]"
                        >
                          Edit scheme
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={startAddScheme}
                        className="h-7 px-2 text-[11px]"
                      >
                        Add scheme
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSchemeView("list");
                        setEditingSchemeId(null);
                      }}
                      className="h-7 px-2 text-[11px] text-gray-400 hover:text-gray-200"
                    >
                      <ArrowLeft className="mr-1 size-3" />
                      Back to schemes
                    </Button>
                  )}
                </div>
                {schemeView === "list" ? (
                  theme.colorSchemes.length > 0 ? (
                    <div className="mt-3 flex flex-col gap-3">
                      {theme.colorSchemes.map((scheme) => {
                        const isActive = scheme.id === theme.activeColorSchemeId;
                        return (
                          <div
                            key={scheme.id}
                            className={`group rounded border p-2 text-left transition ${
                              isActive
                                ? "border-blue-500/60 bg-blue-500/10"
                                : "border-border/40 bg-gray-900/40 hover:border-border/70"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => update("activeColorSchemeId", scheme.id)}
                              className="w-full text-left"
                            >
                              <div className="mb-2 flex items-start justify-between gap-2 text-[11px] text-gray-300">
                                <span className="whitespace-normal break-words">{scheme.name}</span>
                                <div className="flex items-center gap-2">
                                  {isActive && (
                                    <span className="rounded-full border border-blue-500/40 bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-200">
                                      Active
                                    </span>
                                  )}
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      startEditScheme(scheme.id);
                                    }}
                                    className="h-6 px-2 text-[10px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-transparent hover:text-gray-200"
                                  >
                                    Edit
                                  </Button>
                                </div>
                              </div>
                              <div
                                className="rounded border p-2"
                                style={{ backgroundColor: scheme.colors.background, borderColor: scheme.colors.border }}
                              >
                                <div
                                  className="overflow-hidden rounded border"
                                  style={{ backgroundColor: scheme.colors.surface, borderColor: scheme.colors.border }}
                                >
                                  <div
                                    className="flex items-center justify-between border-b px-2 py-1"
                                    style={{ backgroundColor: scheme.colors.surface, borderColor: scheme.colors.border }}
                                  >
                                    <div
                                      className="h-1.5 w-10 rounded"
                                      style={{ backgroundColor: scheme.colors.text, opacity: 0.75 }}
                                    />
                                    <div
                                      className="h-1.5 w-6 rounded"
                                      style={{ backgroundColor: scheme.colors.accent }}
                                    />
                                  </div>
                                  <div className="space-y-2 p-2">
                                    <div
                                      className="rounded border p-2"
                                      style={{ backgroundColor: scheme.colors.surface, borderColor: scheme.colors.border }}
                                    >
                                      <div
                                        className="h-2 w-4/5 rounded"
                                        style={{ backgroundColor: scheme.colors.text, opacity: 0.8 }}
                                      />
                                      <div
                                        className="mt-1 h-2 w-2/3 rounded"
                                        style={{ backgroundColor: scheme.colors.text, opacity: 0.6 }}
                                      />
                                      <div className="mt-2 flex gap-2">
                                        <div
                                          className="h-2 w-8 rounded"
                                          style={{ backgroundColor: scheme.colors.accent }}
                                        />
                                        <div
                                          className="h-2 w-8 rounded"
                                          style={{ backgroundColor: scheme.colors.text, opacity: 0.35 }}
                                        />
                                      </div>
                                    </div>
                                    <div
                                      className="h-1 w-full rounded"
                                      style={{ backgroundColor: scheme.colors.border, opacity: 0.7 }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-gray-500">No schemes yet.</div>
                  )
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        {editingSchemeId ? "Edit scheme" : "New scheme"}
                      </div>
                      <Button
                        size="sm"
                        onClick={handleSaveScheme}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {editingSchemeId ? "Save scheme" : "Create scheme"}
                      </Button>
                    </div>
                    <TextField
                      label="Scheme name"
                      value={newSchemeName}
                      onChange={setNewSchemeName}
                      placeholder="e.g. Midnight"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <ColorField
                        label="Background"
                        value={newSchemeColors.background}
                        onChange={(value) => setNewSchemeColors((prev) => ({ ...prev, background: value }))}
                      />
                      <ColorField
                        label="Surface"
                        value={newSchemeColors.surface}
                        onChange={(value) => setNewSchemeColors((prev) => ({ ...prev, surface: value }))}
                      />
                      <ColorField
                        label="Text"
                        value={newSchemeColors.text}
                        onChange={(value) => setNewSchemeColors((prev) => ({ ...prev, text: value }))}
                      />
                      <ColorField
                        label="Accent"
                        value={newSchemeColors.accent}
                        onChange={(value) => setNewSchemeColors((prev) => ({ ...prev, accent: value }))}
                      />
                      <ColorField
                        label="Border"
                        value={newSchemeColors.border}
                        onChange={(value) => setNewSchemeColors((prev) => ({ ...prev, border: value }))}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded border border-border/40 bg-gray-900/40 p-3">
                <button
                  type="button"
                  onClick={() => setIsGlobalPaletteOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <span className="text-[10px] uppercase tracking-wider text-gray-500">Global palette</span>
                  <ChevronDown className={`size-3 text-gray-500 transition ${isGlobalPaletteOpen ? "rotate-180" : ""}`} />
                </button>
                {isGlobalPaletteOpen && (
                  <div className="mt-3 space-y-3">
                    <ColorField label="Primary" value={theme.primaryColor} onChange={(v) => update("primaryColor", v)} />
                    <ColorField label="Secondary" value={theme.secondaryColor} onChange={(v) => update("secondaryColor", v)} />
                    <ColorField label="Accent" value={theme.accentColor} onChange={(v) => update("accentColor", v)} />
                    <ColorField label="Background" value={theme.backgroundColor} onChange={(v) => update("backgroundColor", v)} />
                    <ColorField label="Surface" value={theme.surfaceColor} onChange={(v) => update("surfaceColor", v)} />
                    <ColorField label="Text" value={theme.textColor} onChange={(v) => update("textColor", v)} />
                    <ColorField label="Muted text" value={theme.mutedTextColor} onChange={(v) => update("mutedTextColor", v)} />
                    <ColorField label="Border" value={theme.borderColor} onChange={(v) => update("borderColor", v)} />
                    <ColorField label="Error" value={theme.errorColor} onChange={(v) => update("errorColor", v)} />
                    <ColorField label="Success" value={theme.successColor} onChange={(v) => update("successColor", v)} />
                  </div>
                )}
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Typography":
          return (
            <div className="space-y-3">
              <NumberField label="Base size" value={theme.baseSize} onChange={(v) => update("baseSize", v)} suffix="px" min={12} max={24} />
              <SelectField label="Heading font" value={theme.headingFont} onChange={(v) => update("headingFont", v)} options={FONT_OPTIONS} />
              <RangeField label="Heading size scale" value={theme.headingSizeScale} onChange={(v) => update("headingSizeScale", v)} min={0.5} max={2} step={0.05} suffix="x" />
              <SelectField label="Heading weight" value={theme.headingWeight} onChange={(v) => update("headingWeight", v)} options={WEIGHT_OPTIONS} />
              <RangeField label="Heading line height" value={theme.headingLineHeight} onChange={(v) => update("headingLineHeight", v)} min={1} max={2} step={0.1} />
              <SelectField label="Body font" value={theme.bodyFont} onChange={(v) => update("bodyFont", v)} options={FONT_OPTIONS} />
              <RangeField label="Body size scale" value={theme.bodySizeScale} onChange={(v) => update("bodySizeScale", v)} min={0.5} max={2} step={0.05} suffix="x" />
              <SelectField label="Body weight" value={theme.bodyWeight} onChange={(v) => update("bodyWeight", v)} options={WEIGHT_OPTIONS} />
              <RangeField label="Body line height" value={theme.lineHeight} onChange={(v) => update("lineHeight", v)} min={1} max={2.5} step={0.1} />
            </div>
          );

        // ---------------------------------------------------------------
        case "Layout":
          return (
            <div className="space-y-3">
              <CheckboxField label="Full width page" checked={theme.fullWidth} onChange={(v) => update("fullWidth", v)} />
              <RangeField label="Max content width" value={theme.maxContentWidth} onChange={(v) => update("maxContentWidth", v)} min={800} max={1600} suffix="px" />
              <RangeField label="Grid gutter" value={theme.gridGutter} onChange={(v) => update("gridGutter", v)} min={8} max={48} suffix="px" />
              <RangeField label="Section spacing" value={theme.sectionSpacing} onChange={(v) => update("sectionSpacing", v)} min={16} max={128} suffix="px" />
              <RangeField label="Container padding" value={theme.containerPadding} onChange={(v) => update("containerPadding", v)} min={8} max={64} suffix="px" />
              <RangeField label="Page padding" value={theme.pagePadding} onChange={(v) => update("pagePadding", v)} min={0} max={200} suffix="px" />
              <RangeField label="Page margin" value={theme.pageMargin} onChange={(v) => update("pageMargin", v)} min={0} max={200} suffix="px" />
              <RangeField label="Border radius" value={theme.borderRadius} onChange={(v) => update("borderRadius", v)} min={0} max={24} suffix="px" />
            </div>
          );

        // ---------------------------------------------------------------
        case "Animations":
          return (
            <div className="space-y-3">
              <CheckboxField label="Enable animations" checked={theme.enableAnimations} onChange={(v) => update("enableAnimations", v)} />
              {theme.enableAnimations && (
                <>
                  <RangeField label="Duration" value={theme.animationDuration} onChange={(v) => update("animationDuration", v)} min={100} max={1000} suffix="ms" />
                  <SelectField label="Easing" value={theme.animationEasing} onChange={(v) => update("animationEasing", v)} options={[
                    { label: "Ease out", value: "ease-out" },
                    { label: "Ease in-out", value: "ease-in-out" },
                    { label: "Ease in", value: "ease-in" },
                    { label: "Linear", value: "linear" },
                    { label: "Spring", value: "cubic-bezier(.68,-0.55,.27,1.55)" },
                  ]} />
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-gray-500">Reveal sections on scroll</Label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={theme.scrollReveal ? "secondary" : "outline"}
                        onClick={() => update("scrollReveal", true)}
                        className="h-7 flex-1 text-[11px]"
                      >
                        On
                      </Button>
                      <Button
                        size="sm"
                        variant={!theme.scrollReveal ? "secondary" : "outline"}
                        onClick={() => update("scrollReveal", false)}
                        className="h-7 flex-1 text-[11px]"
                      >
                        Off
                      </Button>
                    </div>
                  </div>
                  <SelectField
                    label="Hover effect"
                    value={theme.hoverEffect}
                    onChange={(v) => update("hoverEffect", v)}
                    options={[
                      { label: "Vertical lift", value: "vertical-lift" },
                      { label: "3D lift", value: "lift-3d" },
                    ]}
                  />
                  <RangeField label="Hover scale" value={theme.hoverScale} onChange={(v) => update("hoverScale", v)} min={1} max={1.2} step={0.01} suffix="x" />
                </>
              )}
            </div>
          );

        // ---------------------------------------------------------------
        case "Buttons":
          return (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Padding X" value={theme.btnPaddingX} onChange={(v) => update("btnPaddingX", v)} suffix="px" min={4} max={48} />
                <NumberField label="Padding Y" value={theme.btnPaddingY} onChange={(v) => update("btnPaddingY", v)} suffix="px" min={4} max={24} />
              </div>
              <NumberField label="Font size" value={theme.btnFontSize} onChange={(v) => update("btnFontSize", v)} suffix="px" min={10} max={24} />
              <SelectField label="Font weight" value={theme.btnFontWeight} onChange={(v) => update("btnFontWeight", v)} options={WEIGHT_OPTIONS} />
              <NumberField label="Radius" value={theme.btnRadius} onChange={(v) => update("btnRadius", v)} suffix="px" min={0} max={24} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Primary</Label>
                <div className="space-y-2">
                  <ColorField label="Background" value={theme.btnPrimaryBg} onChange={(v) => update("btnPrimaryBg", v)} />
                  <ColorField label="Text" value={theme.btnPrimaryText} onChange={(v) => update("btnPrimaryText", v)} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Secondary</Label>
                <div className="space-y-2">
                  <ColorField label="Background" value={theme.btnSecondaryBg} onChange={(v) => update("btnSecondaryBg", v)} />
                  <ColorField label="Text" value={theme.btnSecondaryText} onChange={(v) => update("btnSecondaryText", v)} />
                </div>
              </div>
              <ColorField label="Outline border" value={theme.btnOutlineBorder} onChange={(v) => update("btnOutlineBorder", v)} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <NumberField label="Thickness" value={theme.btnBorderWidth} onChange={(v) => update("btnBorderWidth", v)} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.btnBorderOpacity} onChange={(v) => update("btnBorderOpacity", v)} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.btnBorderRadius} onChange={(v) => update("btnBorderRadius", v)} suffix="px" min={0} max={48} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.btnShadowOpacity} onChange={(v) => update("btnShadowOpacity", v)} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.btnShadowX} onChange={(v) => update("btnShadowX", v)} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.btnShadowY} onChange={(v) => update("btnShadowY", v)} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.btnShadowBlur} onChange={(v) => update("btnShadowBlur", v)} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Variant Pills":
          return (
            <div className="space-y-3">
              <NumberField label="Corner radius" value={theme.pillRadius} onChange={(v) => update("pillRadius", v)} suffix="px" min={0} max={999} />
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Padding X" value={theme.pillPaddingX} onChange={(v) => update("pillPaddingX", v)} suffix="px" min={4} max={32} />
                <NumberField label="Padding Y" value={theme.pillPaddingY} onChange={(v) => update("pillPaddingY", v)} suffix="px" min={2} max={16} />
              </div>
              <NumberField label="Font size" value={theme.pillFontSize} onChange={(v) => update("pillFontSize", v)} suffix="px" min={10} max={18} />
              <ColorField label="Background" value={theme.pillBg} onChange={(v) => update("pillBg", v)} />
              <ColorField label="Text" value={theme.pillText} onChange={(v) => update("pillText", v)} />
              <ColorField label="Active background" value={theme.pillActiveBg} onChange={(v) => update("pillActiveBg", v)} />
              <ColorField label="Active text" value={theme.pillActiveText} onChange={(v) => update("pillActiveText", v)} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <ColorField label="Border" value={theme.pillBorderColor} onChange={(v) => update("pillBorderColor", v)} />
                  <NumberField label="Thickness" value={theme.pillBorderWidth} onChange={(v) => update("pillBorderWidth", v)} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.pillBorderOpacity} onChange={(v) => update("pillBorderOpacity", v)} min={0} max={100} suffix="%" />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.pillShadowOpacity} onChange={(v) => update("pillShadowOpacity", v)} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.pillShadowX} onChange={(v) => update("pillShadowX", v)} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.pillShadowY} onChange={(v) => update("pillShadowY", v)} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.pillShadowBlur} onChange={(v) => update("pillShadowBlur", v)} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Inputs":
          return (
            <div className="space-y-3">
              <NumberField label="Height" value={theme.inputHeight} onChange={(v) => update("inputHeight", v)} suffix="px" min={28} max={56} />
              <NumberField label="Font size" value={theme.inputFontSize} onChange={(v) => update("inputFontSize", v)} suffix="px" min={10} max={20} />
              <ColorField label="Background" value={theme.inputBg} onChange={(v) => update("inputBg", v)} />
              <ColorField label="Text" value={theme.inputText} onChange={(v) => update("inputText", v)} />
              <ColorField label="Focus border" value={theme.inputFocusBorder} onChange={(v) => update("inputFocusBorder", v)} />
              <ColorField label="Placeholder" value={theme.inputPlaceholder} onChange={(v) => update("inputPlaceholder", v)} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <ColorField label="Border" value={theme.inputBorderColor} onChange={(v) => update("inputBorderColor", v)} />
                  <NumberField label="Thickness" value={theme.inputBorderWidth} onChange={(v) => update("inputBorderWidth", v)} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.inputBorderOpacity} onChange={(v) => update("inputBorderOpacity", v)} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.inputRadius} onChange={(v) => update("inputRadius", v)} suffix="px" min={0} max={24} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.inputShadowOpacity} onChange={(v) => update("inputShadowOpacity", v)} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.inputShadowX} onChange={(v) => update("inputShadowX", v)} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.inputShadowY} onChange={(v) => update("inputShadowY", v)} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.inputShadowBlur} onChange={(v) => update("inputShadowBlur", v)} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Product Cards":
          return (
            <div className="space-y-3">
              <SelectField label="Style" value={theme.cardStyle} onChange={(v) => update("cardStyle", v)} options={[
                { label: "Standard", value: "standard" },
                { label: "Card", value: "card" },
              ]} />
              <SelectField label="Image ratio" value={theme.cardImageRatio} onChange={(v) => update("cardImageRatio", v)} options={[
                { label: "1:1 Square", value: "1:1" },
                { label: "3:4 Portrait", value: "3:4" },
                { label: "4:3 Landscape", value: "4:3" },
                { label: "16:9 Wide", value: "16:9" },
              ]} />
              <RangeField label="Image padding" value={theme.cardImagePadding} onChange={(v) => update("cardImagePadding", v)} min={0} max={20} suffix="px" />
              <SelectField label="Text alignment" value={theme.cardTextAlignment} onChange={(v) => update("cardTextAlignment", v)} options={[
                { label: "Left", value: "left" },
                { label: "Center", value: "center" },
                { label: "Right", value: "right" },
              ]} />
              <SelectField label="Color scheme" value={theme.cardColorScheme} onChange={(v) => update("cardColorScheme", v)} options={
                theme.colorSchemes.map((scheme) => ({ label: scheme.name, value: scheme.id }))
              } />
              <NumberField label="Radius" value={theme.cardRadius} onChange={(v) => update("cardRadius", v)} suffix="px" min={0} max={24} />
              <ColorField label="Background" value={theme.cardBg} onChange={(v) => update("cardBg", v)} />
              <SelectField label="Shadow" value={theme.cardShadow} onChange={(v) => update("cardShadow", v)} options={[
                { label: "None", value: "none" }, { label: "Small", value: "small" }, { label: "Medium", value: "medium" }, { label: "Large", value: "large" },
              ]} />
              <SelectField label="Hover shadow" value={theme.cardHoverShadow} onChange={(v) => update("cardHoverShadow", v)} options={[
                { label: "None", value: "none" }, { label: "Small", value: "small" }, { label: "Medium", value: "medium" }, { label: "Large", value: "large" },
              ]} />
              <CheckboxField label="Show badge" checked={theme.showBadge} onChange={(v) => update("showBadge", v)} />
              <CheckboxField label="Show quick-add button" checked={theme.showQuickAdd} onChange={(v) => update("showQuickAdd", v)} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <NumberField label="Thickness" value={theme.cardBorderWidth} onChange={(v) => update("cardBorderWidth", v)} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.cardBorderOpacity} onChange={(v) => update("cardBorderOpacity", v)} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.cardBorderRadius} onChange={(v) => update("cardBorderRadius", v)} suffix="px" min={0} max={48} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.cardShadowOpacity} onChange={(v) => update("cardShadowOpacity", v)} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.cardShadowX} onChange={(v) => update("cardShadowX", v)} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.cardShadowY} onChange={(v) => update("cardShadowY", v)} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.cardShadowBlur} onChange={(v) => update("cardShadowBlur", v)} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Collection Cards":
          return (
            <div className="space-y-3">
              <SelectField label="Style" value={theme.collectionStyle} onChange={(v) => update("collectionStyle", v)} options={[
                { label: "Standard", value: "standard" },
                { label: "Card", value: "card" },
              ]} />
              <SelectField label="Image ratio" value={theme.collectionRatio} onChange={(v) => update("collectionRatio", v)} options={[
                { label: "1:1 Square", value: "1:1" }, { label: "3:4 Portrait", value: "3:4" }, { label: "4:3 Landscape", value: "4:3" }, { label: "16:9 Wide", value: "16:9" },
              ]} />
              <RangeField label="Image padding" value={theme.collectionImagePadding} onChange={(v) => update("collectionImagePadding", v)} min={0} max={20} suffix="px" />
              <SelectField label="Text alignment" value={theme.collectionTextAlign} onChange={(v) => update("collectionTextAlign", v)} options={[
                { label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" },
              ]} />
              <SelectField label="Color scheme" value={theme.collectionColorScheme} onChange={(v) => update("collectionColorScheme", v)} options={
                theme.colorSchemes.map((scheme) => ({ label: scheme.name, value: scheme.id }))
              } />
              <CheckboxField label="Show overlay" checked={theme.collectionOverlay} onChange={(v) => update("collectionOverlay", v)} />
              {theme.collectionOverlay && (
                <ColorField label="Overlay color" value={theme.collectionOverlayColor} onChange={(v) => update("collectionOverlayColor", v)} />
              )}
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <NumberField label="Thickness" value={theme.collectionBorderWidth} onChange={(v) => update("collectionBorderWidth", v)} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.collectionBorderOpacity} onChange={(v) => update("collectionBorderOpacity", v)} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.collectionRadius} onChange={(v) => update("collectionRadius", v)} suffix="px" min={0} max={24} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.collectionShadowOpacity} onChange={(v) => update("collectionShadowOpacity", v)} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.collectionShadowX} onChange={(v) => update("collectionShadowX", v)} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.collectionShadowY} onChange={(v) => update("collectionShadowY", v)} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.collectionShadowBlur} onChange={(v) => update("collectionShadowBlur", v)} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Blog Cards":
          return (
            <div className="space-y-3">
              <SelectField label="Style" value={theme.blogStyle} onChange={(v) => update("blogStyle", v)} options={[
                { label: "Standard", value: "standard" },
                { label: "Card", value: "card" },
              ]} />
              <SelectField label="Image ratio" value={theme.blogRatio} onChange={(v) => update("blogRatio", v)} options={[
                { label: "1:1 Square", value: "1:1" }, { label: "3:4 Portrait", value: "3:4" }, { label: "4:3 Landscape", value: "4:3" }, { label: "16:9 Wide", value: "16:9" },
              ]} />
              <RangeField label="Image padding" value={theme.blogImagePadding} onChange={(v) => update("blogImagePadding", v)} min={0} max={20} suffix="px" />
              <SelectField label="Text alignment" value={theme.blogTextAlignment} onChange={(v) => update("blogTextAlignment", v)} options={[
                { label: "Left", value: "left" },
                { label: "Center", value: "center" },
                { label: "Right", value: "right" },
              ]} />
              <SelectField label="Color scheme" value={theme.blogColorScheme} onChange={(v) => update("blogColorScheme", v)} options={
                theme.colorSchemes.map((scheme) => ({ label: scheme.name, value: scheme.id }))
              } />
              <NumberField label="Radius" value={theme.blogRadius} onChange={(v) => update("blogRadius", v)} suffix="px" min={0} max={24} />
              <CheckboxField label="Show date" checked={theme.blogShowDate} onChange={(v) => update("blogShowDate", v)} />
              <CheckboxField label="Show excerpt" checked={theme.blogShowExcerpt} onChange={(v) => update("blogShowExcerpt", v)} />
              {theme.blogShowExcerpt && (
                <NumberField label="Excerpt lines" value={theme.blogExcerptLines} onChange={(v) => update("blogExcerptLines", v)} min={1} max={5} />
              )}
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <NumberField label="Thickness" value={theme.blogBorderWidth} onChange={(v) => update("blogBorderWidth", v)} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.blogBorderOpacity} onChange={(v) => update("blogBorderOpacity", v)} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.blogBorderRadius} onChange={(v) => update("blogBorderRadius", v)} suffix="px" min={0} max={48} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.blogShadowOpacity} onChange={(v) => update("blogShadowOpacity", v)} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.blogShadowX} onChange={(v) => update("blogShadowX", v)} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.blogShadowY} onChange={(v) => update("blogShadowY", v)} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.blogShadowBlur} onChange={(v) => update("blogShadowBlur", v)} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Content Containers":
          return (
            <div className="space-y-3">
              <ColorField label="Background" value={theme.containerBg} onChange={(v) => update("containerBg", v)} />
              <ColorField label="Border color" value={theme.containerBorderColor} onChange={(v) => update("containerBorderColor", v)} />
              <NumberField label="Radius" value={theme.containerRadius} onChange={(v) => update("containerRadius", v)} suffix="px" min={0} max={24} />
              <NumberField label="Inner padding" value={theme.containerPaddingInner} onChange={(v) => update("containerPaddingInner", v)} suffix="px" min={8} max={64} />
              <SelectField label="Shadow" value={theme.containerShadow} onChange={(v) => update("containerShadow", v)} options={[
                { label: "None", value: "none" }, { label: "Small", value: "small" }, { label: "Medium", value: "medium" }, { label: "Large", value: "large" },
              ]} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <NumberField label="Thickness" value={theme.containerBorderWidth} onChange={(v) => update("containerBorderWidth", v)} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.containerBorderOpacity} onChange={(v) => update("containerBorderOpacity", v)} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.containerBorderRadius} onChange={(v) => update("containerBorderRadius", v)} suffix="px" min={0} max={48} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.containerShadowOpacity} onChange={(v) => update("containerShadowOpacity", v)} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.containerShadowX} onChange={(v) => update("containerShadowX", v)} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.containerShadowY} onChange={(v) => update("containerShadowY", v)} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.containerShadowBlur} onChange={(v) => update("containerShadowBlur", v)} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Media":
          return (
            <div className="space-y-3">
              <ColorField label="Placeholder bg" value={theme.imagePlaceholderBg} onChange={(v) => update("imagePlaceholderBg", v)} />
              <SelectField label="Video ratio" value={theme.videoRatio} onChange={(v) => update("videoRatio", v)} options={[
                { label: "16:9", value: "16:9" }, { label: "4:3", value: "4:3" }, { label: "1:1", value: "1:1" }, { label: "9:16 Vertical", value: "9:16" },
              ]} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <ColorField label="Border color" value={theme.imageBorderColor} onChange={(v) => update("imageBorderColor", v)} />
                  <NumberField label="Thickness" value={theme.imageBorderWidth} onChange={(v) => update("imageBorderWidth", v)} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.imageBorderOpacity} onChange={(v) => update("imageBorderOpacity", v)} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.imageRadius} onChange={(v) => update("imageRadius", v)} suffix="px" min={0} max={48} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.imageShadowOpacity} onChange={(v) => update("imageShadowOpacity", v)} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.imageShadowX} onChange={(v) => update("imageShadowX", v)} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.imageShadowY} onChange={(v) => update("imageShadowY", v)} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.imageShadowBlur} onChange={(v) => update("imageShadowBlur", v)} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Dropdowns and pop-ups":
          return (
            <div className="space-y-3">
              <ColorField label="Dropdown bg" value={theme.dropdownBg} onChange={(v) => update("dropdownBg", v)} />
              <ColorField label="Popup overlay" value={theme.popupOverlayColor} onChange={(v) => update("popupOverlayColor", v)} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <ColorField label="Border color" value={theme.dropdownBorder} onChange={(v) => update("dropdownBorder", v)} />
                  <NumberField label="Thickness" value={theme.dropdownBorderWidth} onChange={(v) => update("dropdownBorderWidth", v)} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.dropdownBorderOpacity} onChange={(v) => update("dropdownBorderOpacity", v)} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label="Dropdown radius" value={theme.dropdownRadius} onChange={(v) => update("dropdownRadius", v)} suffix="px" min={0} max={24} />
                    <NumberField label="Popup radius" value={theme.popupRadius} onChange={(v) => update("popupRadius", v)} suffix="px" min={0} max={32} />
                  </div>
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <SelectField label="Preset" value={theme.dropdownShadow} onChange={(v) => update("dropdownShadow", v)} options={[
                    { label: "None", value: "none" }, { label: "Small", value: "small" }, { label: "Medium", value: "medium" }, { label: "Large", value: "large" },
                  ]} />
                  <RangeField label="Opacity" value={theme.dropdownShadowOpacity} onChange={(v) => update("dropdownShadowOpacity", v)} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.dropdownShadowX} onChange={(v) => update("dropdownShadowX", v)} suffix="px" min={-30} max={30} />
                    <NumberField label="Vertical" value={theme.dropdownShadowY} onChange={(v) => update("dropdownShadowY", v)} suffix="px" min={-30} max={30} />
                    <NumberField label="Blur" value={theme.dropdownShadowBlur} onChange={(v) => update("dropdownShadowBlur", v)} suffix="px" min={0} max={60} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Drawers":
          return (
            <div className="space-y-3">
              <RangeField label="Width" value={theme.drawerWidth} onChange={(v) => update("drawerWidth", v)} min={280} max={600} suffix="px" />
              <ColorField label="Background" value={theme.drawerBg} onChange={(v) => update("drawerBg", v)} />
              <ColorField label="Overlay" value={theme.drawerOverlayColor} onChange={(v) => update("drawerOverlayColor", v)} />
              <SelectField label="Position" value={theme.drawerPosition} onChange={(v) => update("drawerPosition", v)} options={[
                { label: "Right", value: "right" }, { label: "Left", value: "left" },
              ]} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <ColorField label="Border color" value={theme.drawerBorderColor} onChange={(v) => update("drawerBorderColor", v)} />
                  <NumberField label="Thickness" value={theme.drawerBorderWidth} onChange={(v) => update("drawerBorderWidth", v)} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.drawerBorderOpacity} onChange={(v) => update("drawerBorderOpacity", v)} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.drawerRadius} onChange={(v) => update("drawerRadius", v)} suffix="px" min={0} max={32} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.drawerShadowOpacity} onChange={(v) => update("drawerShadowOpacity", v)} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.drawerShadowX} onChange={(v) => update("drawerShadowX", v)} suffix="px" min={-30} max={30} />
                    <NumberField label="Vertical" value={theme.drawerShadowY} onChange={(v) => update("drawerShadowY", v)} suffix="px" min={-30} max={30} />
                    <NumberField label="Blur" value={theme.drawerShadowBlur} onChange={(v) => update("drawerShadowBlur", v)} suffix="px" min={0} max={60} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Badges":
          return (
            <div className="space-y-3">
              <NumberField label="Font size" value={theme.badgeFontSize} onChange={(v) => update("badgeFontSize", v)} suffix="px" min={8} max={16} />
              <NumberField label="Radius" value={theme.badgeRadius} onChange={(v) => update("badgeRadius", v)} suffix="px" min={0} max={16} />
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Padding X" value={theme.badgePaddingX} onChange={(v) => update("badgePaddingX", v)} suffix="px" min={2} max={16} />
                <NumberField label="Padding Y" value={theme.badgePaddingY} onChange={(v) => update("badgePaddingY", v)} suffix="px" min={0} max={8} />
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Default</Label>
                <div className="space-y-2">
                  <ColorField label="Background" value={theme.badgeDefaultBg} onChange={(v) => update("badgeDefaultBg", v)} />
                  <ColorField label="Text" value={theme.badgeDefaultText} onChange={(v) => update("badgeDefaultText", v)} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Sale</Label>
                <div className="space-y-2">
                  <ColorField label="Background" value={theme.badgeSaleBg} onChange={(v) => update("badgeSaleBg", v)} />
                  <ColorField label="Text" value={theme.badgeSaleText} onChange={(v) => update("badgeSaleText", v)} />
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Brand Information":
          return (
            <div className="space-y-3">
              <TextField label="Brand name" value={theme.brandName} onChange={(v) => update("brandName", v)} placeholder="Your brand" />
              <TextField label="Tagline" value={theme.brandTagline} onChange={(v) => update("brandTagline", v)} placeholder="Your tagline" />
              <TextField label="Email" value={theme.brandEmail} onChange={(v) => update("brandEmail", v)} placeholder="hello@example.com" />
              <TextField label="Phone" value={theme.brandPhone} onChange={(v) => update("brandPhone", v)} placeholder="+1 234 567 890" />
              <TextField label="Address" value={theme.brandAddress} onChange={(v) => update("brandAddress", v)} placeholder="123 Main St" />
            </div>
          );

        // ---------------------------------------------------------------
        case "Social Media":
          return (
            <div className="space-y-3">
              <TextField label="Facebook" value={theme.socialFacebook} onChange={(v) => update("socialFacebook", v)} placeholder="https://facebook.com/..." />
              <TextField label="Instagram" value={theme.socialInstagram} onChange={(v) => update("socialInstagram", v)} placeholder="https://instagram.com/..." />
              <TextField label="Twitter / X" value={theme.socialTwitter} onChange={(v) => update("socialTwitter", v)} placeholder="https://x.com/..." />
              <TextField label="LinkedIn" value={theme.socialLinkedin} onChange={(v) => update("socialLinkedin", v)} placeholder="https://linkedin.com/..." />
              <TextField label="YouTube" value={theme.socialYoutube} onChange={(v) => update("socialYoutube", v)} placeholder="https://youtube.com/..." />
              <TextField label="TikTok" value={theme.socialTiktok} onChange={(v) => update("socialTiktok", v)} placeholder="https://tiktok.com/..." />
            </div>
          );

        // ---------------------------------------------------------------
        case "Search Behaviour":
          return (
            <div className="space-y-3">
              <TextField label="Placeholder text" value={theme.searchPlaceholder} onChange={(v) => update("searchPlaceholder", v)} />
              <NumberField label="Min characters" value={theme.searchMinChars} onChange={(v) => update("searchMinChars", v)} min={1} max={5} />
              <CheckboxField label="Show suggestions" checked={theme.searchShowSuggestions} onChange={(v) => update("searchShowSuggestions", v)} />
              <NumberField label="Max results" value={theme.searchMaxResults} onChange={(v) => update("searchMaxResults", v)} min={3} max={20} />
            </div>
          );

        // ---------------------------------------------------------------
        case "Currency Format":
          return (
            <div className="space-y-3">
              <SelectField label="Currency" value={theme.currencyCode} onChange={(v) => update("currencyCode", v)} options={[
                { label: "USD ($)", value: "USD" }, { label: "EUR (\u20ac)", value: "EUR" }, { label: "GBP (\u00a3)", value: "GBP" },
                { label: "CAD (C$)", value: "CAD" }, { label: "AUD (A$)", value: "AUD" }, { label: "JPY (\u00a5)", value: "JPY" },
              ]} />
              <TextField label="Symbol" value={theme.currencySymbol} onChange={(v) => update("currencySymbol", v)} />
              <SelectField label="Symbol position" value={theme.currencyPosition} onChange={(v) => update("currencyPosition", v)} options={[
                { label: "Before ($10)", value: "before" }, { label: "After (10$)", value: "after" },
              ]} />
              <TextField label="Thousands separator" value={theme.thousandsSeparator} onChange={(v) => update("thousandsSeparator", v)} />
              <TextField label="Decimal separator" value={theme.decimalSeparator} onChange={(v) => update("decimalSeparator", v)} />
              <NumberField label="Decimal places" value={theme.decimalPlaces} onChange={(v) => update("decimalPlaces", v)} min={0} max={4} />
            </div>
          );

        // ---------------------------------------------------------------
        case "Cart":
          return (
            <div className="space-y-3">
              <SelectField label="Cart style" value={theme.cartStyle} onChange={(v) => update("cartStyle", v)} options={[
                { label: "Drawer", value: "drawer" }, { label: "Page", value: "page" }, { label: "Dropdown", value: "dropdown" },
              ]} />
              <SelectField label="Icon style" value={theme.cartIconStyle} onChange={(v) => update("cartIconStyle", v)} options={[
                { label: "Bag", value: "bag" }, { label: "Cart", value: "cart" }, { label: "Basket", value: "basket" },
              ]} />
              <CheckboxField label="Show item count" checked={theme.showCartCount} onChange={(v) => update("showCartCount", v)} />
              <TextField label="Empty cart text" value={theme.cartEmptyText} onChange={(v) => update("cartEmptyText", v)} />
            </div>
          );

        // ---------------------------------------------------------------
        case "Custom CSS":
          return (
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-gray-500">Custom CSS</Label>
              <textarea
                value={theme.customCss}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => update("customCss", e.target.value)}
                placeholder={".my-class {\n  color: red;\n}"}
                className="w-full rounded border border-border/50 bg-gray-800/40 p-2 font-mono text-xs text-gray-300 placeholder:text-gray-600 focus:border-blue-500 focus:outline-none min-h-[120px] resize-y"
                spellCheck={false}
              />
            </div>
          );

        // ---------------------------------------------------------------
        case "Theme Style":
          return (
            <div className="space-y-3">
              <SelectField label="Preset" value={theme.themePreset} onChange={(v) => update("themePreset", v)} options={[
                { label: "Default", value: "default" },
                { label: "Minimal", value: "minimal" },
                { label: "Bold", value: "bold" },
                { label: "Elegant", value: "elegant" },
                { label: "Playful", value: "playful" },
              ]} />
              <CheckboxField label="Dark mode" checked={theme.darkMode} onChange={(v) => update("darkMode", v)} />
            </div>
          );

        // ---------------------------------------------------------------
        default:
          return <div className="text-xs text-gray-500">Settings coming soon.</div>;
      }
    },
    [
      activeScheme,
      handleSaveScheme,
      handleLogoChange,
      handlePickLogo,
      editingSchemeId,
      logoFile?.name,
      logoPreviewUrl,
      logoWidth,
      newSchemeColors,
      newSchemeName,
      startAddScheme,
      startEditScheme,
      schemeView,
      theme,
      update,
    ]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showHeader && (
        <div className="border-b border-border px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Theme settings
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Configure global styles and storefront components.
          </p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {THEME_SECTIONS.map((section) => {
            const isOpen = openSections.has(section);
            return (
              <div key={section} className="rounded border border-border/40 bg-gray-900/60">
                <button
                  type="button"
                  onClick={() => toggleSection(section)}
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
  );
}
