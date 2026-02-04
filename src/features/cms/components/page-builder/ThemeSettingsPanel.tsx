"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { ArrowLeft, Bold, ChevronDown, Italic, Link2, List, ListOrdered } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  FileUploadButton,
  FileUploadTrigger,
} from "@/shared/ui";
import { useThemeSettings } from "./ThemeSettingsContext";
import { useCmsThemes } from "@/features/cms/hooks/useCmsQueries";
import type { ColorScheme, ColorSchemeColors, ThemeSettings } from "@/features/cms/types/theme-settings";
import type { CmsTheme } from "@/features/cms/types";
import {
  ColorField,
  NumberField,
  RangeField,
  SelectField,
  CheckboxField,
  TextField,
  ImagePickerField,
} from "./shared-fields";

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

const SAVED_THEME_PREFIX = "saved:";

const parseCssNumber = (value?: string | null): number | null => {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const applySavedThemePreset = (
  current: ThemeSettings,
  saved: CmsTheme,
  presetValue: string
): ThemeSettings => {
  const next = { ...current, themePreset: presetValue };

  const colors = saved.colors;
  if (colors) {
    if (colors.primary) next.primaryColor = colors.primary;
    if (colors.secondary) next.secondaryColor = colors.secondary;
    if (colors.accent) next.accentColor = colors.accent;
    if (colors.background) next.backgroundColor = colors.background;
    if (colors.surface) next.surfaceColor = colors.surface;
    if (colors.text) next.textColor = colors.text;
    if (colors.muted) next.mutedTextColor = colors.muted;
  }

  const typography = saved.typography;
  if (typography) {
    if (typography.headingFont) next.headingFont = typography.headingFont;
    if (typography.bodyFont) next.bodyFont = typography.bodyFont;
    if (Number.isFinite(typography.baseSize)) next.baseSize = typography.baseSize;
    if (Number.isFinite(typography.headingWeight)) next.headingWeight = String(typography.headingWeight);
    if (Number.isFinite(typography.bodyWeight)) next.bodyWeight = String(typography.bodyWeight);
  }

  const spacing = saved.spacing;
  if (spacing) {
    const sectionSpacing = parseCssNumber(spacing.sectionPadding);
    if (sectionSpacing !== null) next.sectionSpacing = sectionSpacing;
    const maxWidth = parseCssNumber(spacing.containerMaxWidth);
    if (maxWidth !== null) next.maxContentWidth = maxWidth;
  }

  if (typeof saved.customCss === "string") {
    next.customCss = saved.customCss;
  }

  return next;
};

// ---------------------------------------------------------------------------
// Reusable utilities
// ---------------------------------------------------------------------------

function sanitizeRichText(value: string | null | undefined): string {
  if (!value) return "";
  if (typeof value !== "string") return "";
  const temp = document.createElement("div");
  temp.innerHTML = value;
  return temp.innerHTML;
}

function RichTextToolbarButton({
  title,
  onClick,
  active,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`size-8 rounded-md ${active ? "bg-blue-600 text-white hover:bg-blue-500" : "text-gray-300 hover:text-white"}`}
    >
      {children}
    </Button>
  );
}

function MiniRichTextEditor({
  label,
  value,
  onChange,
  minHeight = 90,
  showFormatSelect = false,
  enableLists = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
  showFormatSelect?: boolean;
  enableLists?: boolean;
}): React.JSX.Element {
  const lastValueRef = useRef<string>(value);
  const [formatValue, setFormatValue] = useState<string>("paragraph");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: showFormatSelect ? { levels: [1, 2, 3] } : false,
        ...(enableLists ? {} : { bulletList: false, orderedList: false, listItem: false }),
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-400 underline hover:text-blue-300",
        },
      }),
    ],
    content: sanitizeRichText(value),
    editorProps: {
      attributes: {
        class: "min-h-full outline-none text-sm text-gray-200",
      },
    },
    onUpdate: ({ editor }: { editor: Editor }): void => {
      const html = editor.getHTML();
      if (html !== lastValueRef.current) {
        lastValueRef.current = html;
        onChange(html);
      }
    },
  });

  useEffect((): void => {
    if (!editor) return;
    if (value === lastValueRef.current) return;
    const sanitized = sanitizeRichText(value);
    if (sanitized !== editor.getHTML()) {
      lastValueRef.current = sanitized;
      editor.commands.setContent(sanitized, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect((): void | (() => void) => {
    if (!editor || !showFormatSelect) return;
    const updateFormat = (): void => {
      if (editor.isActive("heading", { level: 1 })) return setFormatValue("heading-1");
      if (editor.isActive("heading", { level: 2 })) return setFormatValue("heading-2");
      if (editor.isActive("heading", { level: 3 })) return setFormatValue("heading-3");
      setFormatValue("paragraph");
    };
    updateFormat();
    editor.on("selectionUpdate", updateFormat);
    editor.on("transaction", updateFormat);
    return (): void => {
      editor.off("selectionUpdate", updateFormat);
      editor.off("transaction", updateFormat);
    };
  }, [editor, showFormatSelect]);

  const applyFormat = (format: string): void => {
    if (!editor) return;
    if (format === "paragraph") {
      editor.chain().focus().setParagraph().run();
      return;
    }
    const level = format === "heading-1" ? 1 : format === "heading-2" ? 2 : 3;
    editor.chain().focus().setHeading({ level }).run();
  };

  const addLink = (): void => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL:", previousUrl ?? "");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  if (!editor) {
    return (
      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wider text-gray-500">{label}</Label>
        <div className="rounded border border-border/50 bg-gray-800/40 p-3 text-xs text-gray-500">
          Loading editor...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-[10px] uppercase tracking-wider text-gray-500">{label}</Label>
      <div className="flex flex-wrap items-center gap-1 rounded border border-border/50 bg-gray-900/60 px-2 py-1">
        {showFormatSelect && (
          <div className="mr-2">
            <Select value={formatValue} onValueChange={applyFormat}>
              <SelectTrigger className="h-7 w-32 bg-gray-800/60 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paragraph">Paragraph</SelectItem>
                <SelectItem value="heading-1">Heading 1</SelectItem>
                <SelectItem value="heading-2">Heading 2</SelectItem>
                <SelectItem value="heading-3">Heading 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <RichTextToolbarButton
          title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          <Bold className="size-4" />
        </RichTextToolbarButton>
        <RichTextToolbarButton
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          <Italic className="size-4" />
        </RichTextToolbarButton>
        {enableLists && (
          <>
            <RichTextToolbarButton
              title="Bullet list"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive("bulletList")}
            >
              <List className="size-4" />
            </RichTextToolbarButton>
            <RichTextToolbarButton
              title="Numbered list"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive("orderedList")}
            >
              <ListOrdered className="size-4" />
            </RichTextToolbarButton>
          </>
        )}
        <RichTextToolbarButton
          title="Insert link"
          onClick={addLink}
          active={editor.isActive("link")}
        >
          <Link2 className="size-4" />
        </RichTextToolbarButton>
      </div>
      <div className="rounded border border-border/50 bg-gray-800/40">
        <EditorContent
          editor={editor}
          className="px-3 py-2 [&_.ProseMirror]:min-h-[80px] [&_.ProseMirror]:outline-none [&_.ProseMirror_h1]:text-xl [&_.ProseMirror_h1]:font-semibold [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_p]:my-1 [&_.ProseMirror_ul]:ml-5 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ol]:ml-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_a]:text-blue-400 [&_.ProseMirror_a]:underline"
          style={{ minHeight }}
        />
      </div>
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

export function ThemeSettingsPanel({ showHeader = true }: { showHeader?: boolean } = {}): React.JSX.Element {
  const { theme, setTheme, update } = useThemeSettings();
  const [schemeView, setSchemeView] = useState<"list" | "edit">("list");
  const [editingSchemeId, setEditingSchemeId] = useState<string | null>(null);
  const [newSchemeName, setNewSchemeName] = useState("");
  const [newSchemeColors, setNewSchemeColors] = useState<ColorSchemeColors>(DEFAULT_SCHEME_COLORS);
  const [isGlobalPaletteOpen, setIsGlobalPaletteOpen] = useState(false);
  const themesQuery = useCmsThemes();
  const savedThemes = useMemo((): CmsTheme[] => themesQuery.data ?? [], [themesQuery.data]);

  // Logo-specific state (file picker)
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoWidth, setLogoWidth] = useState<number>(180);
  const previewUrlRef = useRef<string | null>(null);

  // Accordion open-state persistence
  const hasHydratedRef = useRef(false);
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

  const initialOpenSections = useMemo((): Set<string> => {
    if (!preferencesQuery.isFetched) return new Set<string>();
    const saved = preferencesQuery.data?.cmsThemeOpenSections ?? [];
    const filtered = saved.filter((item: string): item is string => typeof item === "string");
    return new Set(filtered);
  }, [preferencesQuery.data, preferencesQuery.isFetched]);

  const [userOpenSections, setUserOpenSections] = useState<Set<string> | null>(null);
  const openSections = userOpenSections ?? initialOpenSections;

  const lastSavedRef = useRef<string>(JSON.stringify(Array.from(initialOpenSections)));

  const updatePreferencesMutation = useMutation({
    mutationFn: async (payload: { cmsThemeOpenSections: string[] }): Promise<void> => {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update user preferences");
    },
    onSuccess: (): void => { void queryClient.invalidateQueries({ queryKey: userPreferencesQueryKey }); },
    onError: (error: Error): void => { console.warn("[CMS] Failed to persist theme settings state.", error); },
  });

  useEffect((): void => {
    if (preferencesQuery.isFetched) {
      hasHydratedRef.current = true;
    }
  }, [preferencesQuery.isFetched]);

  const openSectionsArray = useMemo((): string[] => Array.from(openSections), [openSections]);

  useEffect((): void | (() => void) => {
    if (!hasHydratedRef.current || !userOpenSections) return;
    const nextSerialized = JSON.stringify(openSectionsArray);
    if (nextSerialized === lastSavedRef.current) return;
    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      lastSavedRef.current = nextSerialized;
      updatePreferencesMutation.mutate({ cmsThemeOpenSections: openSectionsArray });
    }, 400);
  }, [openSectionsArray, userOpenSections, updatePreferencesMutation]);

  useEffect((): (() => void) => {
    return (): void => { if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current); };
  }, []);

  useEffect((): void => {
    if (!theme.colorSchemes.length) return;
    if (theme.colorSchemes.some((scheme: { id: string }) => scheme.id === theme.activeColorSchemeId)) return;
    setTheme((prev: typeof theme) => ({
      ...prev,
      activeColorSchemeId: prev.colorSchemes[0]?.id ?? "",
    }));
  }, [theme.colorSchemes, theme.activeColorSchemeId, setTheme]);

  useEffect((): (() => void) => {
    return (): void => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const toggleSection = useCallback((section: string): void => {
    setUserOpenSections((prev: Set<string> | null) => {
      const current = prev ?? initialOpenSections;
      const next = new Set(current);
      if (next.has(section)) { next.delete(section); } else { next.add(section); }
      return next;
    });
  }, [initialOpenSections]);

  const activeScheme = useMemo((): { id: string; name: string; colors: ColorSchemeColors } | null => {
    if (!theme.colorSchemes.length) return null;
    return theme.colorSchemes.find((scheme: { id: string }) => scheme.id === theme.activeColorSchemeId) ?? theme.colorSchemes[0]!;
  }, [theme.colorSchemes, theme.activeColorSchemeId]);

  const startAddScheme = useCallback((): void => {
    setNewSchemeName("");
    setNewSchemeColors(activeScheme?.colors ?? DEFAULT_SCHEME_COLORS);
    setEditingSchemeId(null);
    setSchemeView("edit");
  }, [activeScheme]);

  const startEditScheme = useCallback((schemeId: string): void => {
    const scheme = theme.colorSchemes.find((item: { id: string }) => item.id === schemeId);
    if (!scheme) return;
    setEditingSchemeId(schemeId);
    setNewSchemeName(scheme.name);
    setNewSchemeColors({ ...scheme.colors });
    setSchemeView("edit");
  }, [theme.colorSchemes]);

  const handleSaveScheme = useCallback((): void => {
    const trimmed = newSchemeName.trim();
    const currentName = editingSchemeId
      ? theme.colorSchemes.find((scheme: { id: string }) => scheme.id === editingSchemeId)?.name
      : undefined;
    const schemeName = trimmed || currentName || `Scheme ${theme.colorSchemes.length + 1}`;

    if (editingSchemeId) {
      setTheme((prev: typeof theme) => ({
        ...prev,
        colorSchemes: prev.colorSchemes.map((scheme: { id: string; name: string; colors: ColorSchemeColors }) =>
          scheme.id === editingSchemeId
            ? { ...scheme, name: schemeName, colors: { ...newSchemeColors } }
            : scheme
        ),
        activeColorSchemeId: editingSchemeId,
      }));
    } else {
      const id = `custom-${Date.now().toString(36)}`;
      setTheme((prev: typeof theme) => ({
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

  const handleLogoSelect = useCallback((files: File[]): void => {
    const file = files[0] ?? null;
    setLogoFile(file);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (file) {
      const nextUrl = URL.createObjectURL(file);
      previewUrlRef.current = nextUrl;
      setLogoPreviewUrl(nextUrl);
    } else {
      setLogoPreviewUrl(null);
    }
  }, []);

  const themePresetOptions = useMemo(() => {
    const presets = [
      { label: "Default", value: "default" },
      { label: "Minimal", value: "minimal" },
      { label: "Bold", value: "bold" },
      { label: "Elegant", value: "elegant" },
      { label: "Playful", value: "playful" },
    ];
    const saved = savedThemes.map((savedTheme: CmsTheme) => ({
      label: `Saved: ${savedTheme.name}`,
      value: `${SAVED_THEME_PREFIX}${savedTheme.id}`,
    }));
    return [...presets, ...saved];
  }, [savedThemes]);

  const handleThemePresetChange = useCallback((value: string): void => {
    if (value.startsWith(SAVED_THEME_PREFIX)) {
      const themeId = value.slice(SAVED_THEME_PREFIX.length);
      const selected = savedThemes.find((item: CmsTheme) => item.id === themeId);
      if (selected) {
        setTheme((prev: ThemeSettings) => applySavedThemePreset(prev, selected, value));
        return;
      }
    }
    setTheme((prev: ThemeSettings) => ({ ...prev, themePreset: value }));
  }, [savedThemes, setTheme]);

  const updateSetting = useCallback(
    <K extends keyof ThemeSettings>(key: K): ((value: ThemeSettings[K]) => void) => {
      return (value: ThemeSettings[K]): void => {
        update(key, value);
      };
    },
    [update]
  );

  const updateSchemeColor = useCallback(
    (key: keyof ColorSchemeColors): ((value: string) => void) => {
      return (value: string): void => {
        setNewSchemeColors((prev: ColorSchemeColors): ColorSchemeColors => ({
          ...prev,
          [key]: value,
        }));
      };
    },
    []
  );

  const toggleGlobalPalette = useCallback((): void => {
    setIsGlobalPaletteOpen((prev: boolean): boolean => !prev);
  }, []);

  // ---------------------------------------------------------------------------
  // Section bodies
  // ---------------------------------------------------------------------------

  const renderSectionBody = useCallback<(section: string) => React.ReactNode>(
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
                    <Image
                      src={logoPreviewUrl}
                      alt="Logo preview"
                      width={Math.max(1, logoWidth)}
                      height={Math.max(1, Math.round((logoWidth / 4) * 3))}
                      style={{ width: `${logoWidth}px`, height: "auto" }}
                      className="h-auto max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-xs text-gray-500">No logo selected</div>
                  )}
                </div>
              </div>
              <RangeField label="Desktop logo width" value={logoWidth} onChange={setLogoWidth} min={50} max={300} suffix="px" />
              <div className="space-y-2">
                <FileUploadTrigger
                  accept="image/*"
                  onFilesSelected={(files: File[]) => handleLogoSelect(files)}
                  asChild
                >
                  <button type="button" className="flex w-full items-center justify-center rounded border border-dashed border-border/50 bg-gray-800/30 px-3 py-3 text-xs font-medium text-gray-300 hover:bg-muted/40">
                    Image upload box
                  </button>
                </FileUploadTrigger>
                <div className="flex items-center gap-2">
                  <FileUploadButton size="sm" variant="outline" accept="image/*" onFilesSelected={(files: File[]) => handleLogoSelect(files)}>
                    Choose file
                  </FileUploadButton>
                  <span className="flex-1 truncate text-[11px] text-gray-500">{logoFile?.name ?? "No file selected"}</span>
                </div>
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
                      {theme.colorSchemes.map((scheme: ColorScheme) => {
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
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={(): void => update("activeColorSchemeId", scheme.id)}
                              onKeyDown={(event: React.KeyboardEvent): void => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  update("activeColorSchemeId", scheme.id);
                                }
                              }}
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
                                    onClick={(event: React.MouseEvent): void => {
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
                            </div>
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
                        onChange={updateSchemeColor("background")}
                      />
                      <ColorField
                        label="Surface"
                        value={newSchemeColors.surface}
                        onChange={updateSchemeColor("surface")}
                      />
                      <ColorField
                        label="Text"
                        value={newSchemeColors.text}
                        onChange={updateSchemeColor("text")}
                      />
                      <ColorField
                        label="Accent"
                        value={newSchemeColors.accent}
                        onChange={updateSchemeColor("accent")}
                      />
                      <ColorField
                        label="Border"
                        value={newSchemeColors.border}
                        onChange={updateSchemeColor("border")}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded border border-border/40 bg-gray-900/40 p-3">
                <button
                  type="button"
                  onClick={toggleGlobalPalette}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <span className="text-[10px] uppercase tracking-wider text-gray-500">Global palette</span>
                  <ChevronDown className={`size-3 text-gray-500 transition ${isGlobalPaletteOpen ? "rotate-180" : ""}`} />
                </button>
                {isGlobalPaletteOpen && (
                  <div className="mt-3 space-y-3">
                    <ColorField label="Primary" value={theme.primaryColor} onChange={updateSetting("primaryColor")} />
                    <ColorField label="Secondary" value={theme.secondaryColor} onChange={updateSetting("secondaryColor")} />
                    <ColorField label="Accent" value={theme.accentColor} onChange={updateSetting("accentColor")} />
                    <ColorField label="Background" value={theme.backgroundColor} onChange={updateSetting("backgroundColor")} />
                    <ColorField label="Surface" value={theme.surfaceColor} onChange={updateSetting("surfaceColor")} />
                    <ColorField label="Text" value={theme.textColor} onChange={updateSetting("textColor")} />
                    <ColorField label="Muted text" value={theme.mutedTextColor} onChange={updateSetting("mutedTextColor")} />
                    <ColorField label="Border" value={theme.borderColor} onChange={updateSetting("borderColor")} />
                    <ColorField label="Error" value={theme.errorColor} onChange={updateSetting("errorColor")} />
                    <ColorField label="Success" value={theme.successColor} onChange={updateSetting("successColor")} />
                  </div>
                )}
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Typography":
          return (
            <div className="space-y-3">
              <NumberField label="Base size" value={theme.baseSize} onChange={updateSetting("baseSize")} suffix="px" min={12} max={24} />
              <SelectField label="Heading font" value={theme.headingFont} onChange={updateSetting("headingFont")} options={FONT_OPTIONS} />
              <RangeField label="Heading size scale" value={theme.headingSizeScale} onChange={updateSetting("headingSizeScale")} min={0.5} max={2} step={0.05} suffix="x" />
              <SelectField label="Heading weight" value={theme.headingWeight} onChange={updateSetting("headingWeight")} options={WEIGHT_OPTIONS} />
              <RangeField label="Heading line height" value={theme.headingLineHeight} onChange={updateSetting("headingLineHeight")} min={1} max={2} step={0.1} />
              <SelectField label="Body font" value={theme.bodyFont} onChange={updateSetting("bodyFont")} options={FONT_OPTIONS} />
              <RangeField label="Body size scale" value={theme.bodySizeScale} onChange={updateSetting("bodySizeScale")} min={0.5} max={2} step={0.05} suffix="x" />
              <SelectField label="Body weight" value={theme.bodyWeight} onChange={updateSetting("bodyWeight")} options={WEIGHT_OPTIONS} />
              <RangeField label="Body line height" value={theme.lineHeight} onChange={updateSetting("lineHeight")} min={1} max={2.5} step={0.1} />
            </div>
          );

        // ---------------------------------------------------------------
        case "Layout":
          return (
            <div className="space-y-3">
              <CheckboxField label="Full width page" checked={theme.fullWidth} onChange={updateSetting("fullWidth")} />
              <RangeField label="Max content width" value={theme.maxContentWidth} onChange={updateSetting("maxContentWidth")} min={800} max={1600} suffix="px" />
              <RangeField label="Grid gutter" value={theme.gridGutter} onChange={updateSetting("gridGutter")} min={8} max={48} suffix="px" />
              <RangeField label="Section spacing" value={theme.sectionSpacing} onChange={updateSetting("sectionSpacing")} min={16} max={128} suffix="px" />
              <RangeField label="Container padding" value={theme.containerPadding} onChange={updateSetting("containerPadding")} min={8} max={64} suffix="px" />
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500">Page padding (px)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="Top" value={theme.pagePaddingTop} onChange={updateSetting("pagePaddingTop")} suffix="px" min={0} max={200} />
                  <NumberField label="Right" value={theme.pagePaddingRight} onChange={updateSetting("pagePaddingRight")} suffix="px" min={0} max={200} />
                  <NumberField label="Bottom" value={theme.pagePaddingBottom} onChange={updateSetting("pagePaddingBottom")} suffix="px" min={0} max={200} />
                  <NumberField label="Left" value={theme.pagePaddingLeft} onChange={updateSetting("pagePaddingLeft")} suffix="px" min={0} max={200} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500">Page margin (px)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="Top" value={theme.pageMarginTop} onChange={updateSetting("pageMarginTop")} suffix="px" min={0} max={200} />
                  <NumberField label="Right" value={theme.pageMarginRight} onChange={updateSetting("pageMarginRight")} suffix="px" min={0} max={200} />
                  <NumberField label="Bottom" value={theme.pageMarginBottom} onChange={updateSetting("pageMarginBottom")} suffix="px" min={0} max={200} />
                  <NumberField label="Left" value={theme.pageMarginLeft} onChange={updateSetting("pageMarginLeft")} suffix="px" min={0} max={200} />
                </div>
              </div>
              <RangeField label="Page corner radius" value={theme.borderRadius} onChange={updateSetting("borderRadius")} min={0} max={40} suffix="px" />
            </div>
          );

        // ---------------------------------------------------------------
        case "Animations":
          return (
            <div className="space-y-3">
              <CheckboxField label="Enable animations" checked={theme.enableAnimations} onChange={updateSetting("enableAnimations")} />
              {theme.enableAnimations && (
                <>
                  <RangeField label="Duration" value={theme.animationDuration} onChange={updateSetting("animationDuration")} min={100} max={1000} suffix="ms" />
                  <SelectField label="Easing" value={theme.animationEasing} onChange={updateSetting("animationEasing")} options={[
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
                    onChange={updateSetting("hoverEffect")}
                    options={[
                      { label: "Vertical lift", value: "vertical-lift" },
                      { label: "3D lift", value: "lift-3d" },
                    ]}
                  />
                  <RangeField label="Hover scale" value={theme.hoverScale} onChange={updateSetting("hoverScale")} min={1} max={1.2} step={0.01} suffix="x" />
                </>
              )}
            </div>
          );

        // ---------------------------------------------------------------
        case "Buttons":
          return (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Padding X" value={theme.btnPaddingX} onChange={updateSetting("btnPaddingX")} suffix="px" min={4} max={48} />
                <NumberField label="Padding Y" value={theme.btnPaddingY} onChange={updateSetting("btnPaddingY")} suffix="px" min={4} max={24} />
              </div>
              <NumberField label="Font size" value={theme.btnFontSize} onChange={updateSetting("btnFontSize")} suffix="px" min={10} max={24} />
              <SelectField label="Font weight" value={theme.btnFontWeight} onChange={updateSetting("btnFontWeight")} options={WEIGHT_OPTIONS} />
              <NumberField label="Radius" value={theme.btnRadius} onChange={updateSetting("btnRadius")} suffix="px" min={0} max={24} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Primary</Label>
                <div className="space-y-2">
                  <ColorField label="Background" value={theme.btnPrimaryBg} onChange={updateSetting("btnPrimaryBg")} />
                  <ColorField label="Text" value={theme.btnPrimaryText} onChange={updateSetting("btnPrimaryText")} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Secondary</Label>
                <div className="space-y-2">
                  <ColorField label="Background" value={theme.btnSecondaryBg} onChange={updateSetting("btnSecondaryBg")} />
                  <ColorField label="Text" value={theme.btnSecondaryText} onChange={updateSetting("btnSecondaryText")} />
                </div>
              </div>
              <ColorField label="Outline border" value={theme.btnOutlineBorder} onChange={updateSetting("btnOutlineBorder")} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <NumberField label="Thickness" value={theme.btnBorderWidth} onChange={updateSetting("btnBorderWidth")} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.btnBorderOpacity} onChange={updateSetting("btnBorderOpacity")} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.btnBorderRadius} onChange={updateSetting("btnBorderRadius")} suffix="px" min={0} max={48} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.btnShadowOpacity} onChange={updateSetting("btnShadowOpacity")} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.btnShadowX} onChange={updateSetting("btnShadowX")} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.btnShadowY} onChange={updateSetting("btnShadowY")} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.btnShadowBlur} onChange={updateSetting("btnShadowBlur")} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Variant Pills":
          return (
            <div className="space-y-3">
              <NumberField label="Corner radius" value={theme.pillRadius} onChange={updateSetting("pillRadius")} suffix="px" min={0} max={999} />
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Padding X" value={theme.pillPaddingX} onChange={updateSetting("pillPaddingX")} suffix="px" min={4} max={32} />
                <NumberField label="Padding Y" value={theme.pillPaddingY} onChange={updateSetting("pillPaddingY")} suffix="px" min={2} max={16} />
              </div>
              <NumberField label="Font size" value={theme.pillFontSize} onChange={updateSetting("pillFontSize")} suffix="px" min={10} max={18} />
              <ColorField label="Background" value={theme.pillBg} onChange={updateSetting("pillBg")} />
              <ColorField label="Text" value={theme.pillText} onChange={updateSetting("pillText")} />
              <ColorField label="Active background" value={theme.pillActiveBg} onChange={updateSetting("pillActiveBg")} />
              <ColorField label="Active text" value={theme.pillActiveText} onChange={updateSetting("pillActiveText")} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <ColorField label="Border" value={theme.pillBorderColor} onChange={updateSetting("pillBorderColor")} />
                  <NumberField label="Thickness" value={theme.pillBorderWidth} onChange={updateSetting("pillBorderWidth")} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.pillBorderOpacity} onChange={updateSetting("pillBorderOpacity")} min={0} max={100} suffix="%" />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.pillShadowOpacity} onChange={updateSetting("pillShadowOpacity")} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.pillShadowX} onChange={updateSetting("pillShadowX")} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.pillShadowY} onChange={updateSetting("pillShadowY")} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.pillShadowBlur} onChange={updateSetting("pillShadowBlur")} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Inputs":
          return (
            <div className="space-y-3">
              <NumberField label="Height" value={theme.inputHeight} onChange={updateSetting("inputHeight")} suffix="px" min={28} max={56} />
              <NumberField label="Font size" value={theme.inputFontSize} onChange={updateSetting("inputFontSize")} suffix="px" min={10} max={20} />
              <ColorField label="Background" value={theme.inputBg} onChange={updateSetting("inputBg")} />
              <ColorField label="Text" value={theme.inputText} onChange={updateSetting("inputText")} />
              <ColorField label="Focus border" value={theme.inputFocusBorder} onChange={updateSetting("inputFocusBorder")} />
              <ColorField label="Placeholder" value={theme.inputPlaceholder} onChange={updateSetting("inputPlaceholder")} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <ColorField label="Border" value={theme.inputBorderColor} onChange={updateSetting("inputBorderColor")} />
                  <NumberField label="Thickness" value={theme.inputBorderWidth} onChange={updateSetting("inputBorderWidth")} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.inputBorderOpacity} onChange={updateSetting("inputBorderOpacity")} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.inputRadius} onChange={updateSetting("inputRadius")} suffix="px" min={0} max={24} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.inputShadowOpacity} onChange={updateSetting("inputShadowOpacity")} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.inputShadowX} onChange={updateSetting("inputShadowX")} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.inputShadowY} onChange={updateSetting("inputShadowY")} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.inputShadowBlur} onChange={updateSetting("inputShadowBlur")} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Product Cards":
          return (
            <div className="space-y-3">
              <SelectField label="Style" value={theme.cardStyle} onChange={updateSetting("cardStyle")} options={[
                { label: "Standard", value: "standard" },
                { label: "Card", value: "card" },
              ]} />
              <SelectField label="Image ratio" value={theme.cardImageRatio} onChange={updateSetting("cardImageRatio")} options={[
                { label: "1:1 Square", value: "1:1" },
                { label: "3:4 Portrait", value: "3:4" },
                { label: "4:3 Landscape", value: "4:3" },
                { label: "16:9 Wide", value: "16:9" },
              ]} />
              <RangeField label="Image padding" value={theme.cardImagePadding} onChange={updateSetting("cardImagePadding")} min={0} max={20} suffix="px" />
              <SelectField label="Text alignment" value={theme.cardTextAlignment} onChange={updateSetting("cardTextAlignment")} options={[
                { label: "Left", value: "left" },
                { label: "Center", value: "center" },
                { label: "Right", value: "right" },
              ]} />
              <SelectField label="Color scheme" value={theme.cardColorScheme} onChange={(v: string): void => update("cardColorScheme", v)} options={
                theme.colorSchemes.map((scheme: ColorScheme) => ({ label: scheme.name, value: scheme.id }))
              } />
              <NumberField label="Radius" value={theme.cardRadius} onChange={updateSetting("cardRadius")} suffix="px" min={0} max={24} />
              <ColorField label="Background" value={theme.cardBg} onChange={updateSetting("cardBg")} />
              <SelectField label="Shadow" value={theme.cardShadow} onChange={updateSetting("cardShadow")} options={[
                { label: "None", value: "none" }, { label: "Small", value: "small" }, { label: "Medium", value: "medium" }, { label: "Large", value: "large" },
              ]} />
              <SelectField label="Hover shadow" value={theme.cardHoverShadow} onChange={updateSetting("cardHoverShadow")} options={[
                { label: "None", value: "none" }, { label: "Small", value: "small" }, { label: "Medium", value: "medium" }, { label: "Large", value: "large" },
              ]} />
              <CheckboxField label="Show badge" checked={theme.showBadge} onChange={updateSetting("showBadge")} />
              <CheckboxField label="Show quick-add button" checked={theme.showQuickAdd} onChange={updateSetting("showQuickAdd")} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <NumberField label="Thickness" value={theme.cardBorderWidth} onChange={updateSetting("cardBorderWidth")} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.cardBorderOpacity} onChange={updateSetting("cardBorderOpacity")} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.cardBorderRadius} onChange={updateSetting("cardBorderRadius")} suffix="px" min={0} max={48} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.cardShadowOpacity} onChange={updateSetting("cardShadowOpacity")} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.cardShadowX} onChange={updateSetting("cardShadowX")} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.cardShadowY} onChange={updateSetting("cardShadowY")} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.cardShadowBlur} onChange={updateSetting("cardShadowBlur")} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Collection Cards":
          return (
            <div className="space-y-3">
              <SelectField label="Style" value={theme.collectionStyle} onChange={updateSetting("collectionStyle")} options={[
                { label: "Standard", value: "standard" },
                { label: "Card", value: "card" },
              ]} />
              <SelectField label="Image ratio" value={theme.collectionRatio} onChange={updateSetting("collectionRatio")} options={[
                { label: "1:1 Square", value: "1:1" }, { label: "3:4 Portrait", value: "3:4" }, { label: "4:3 Landscape", value: "4:3" }, { label: "16:9 Wide", value: "16:9" },
              ]} />
              <RangeField label="Image padding" value={theme.collectionImagePadding} onChange={updateSetting("collectionImagePadding")} min={0} max={20} suffix="px" />
              <SelectField label="Text alignment" value={theme.collectionTextAlign} onChange={updateSetting("collectionTextAlign")} options={[
                { label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" },
              ]} />
              <SelectField label="Color scheme" value={theme.collectionColorScheme} onChange={(v: string): void => update("collectionColorScheme", v)} options={
                theme.colorSchemes.map((scheme: ColorScheme) => ({ label: scheme.name, value: scheme.id }))
              } />
              <CheckboxField label="Show overlay" checked={theme.collectionOverlay} onChange={updateSetting("collectionOverlay")} />
              {theme.collectionOverlay && (
                <ColorField label="Overlay color" value={theme.collectionOverlayColor} onChange={updateSetting("collectionOverlayColor")} />
              )}
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <NumberField label="Thickness" value={theme.collectionBorderWidth} onChange={updateSetting("collectionBorderWidth")} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.collectionBorderOpacity} onChange={updateSetting("collectionBorderOpacity")} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.collectionRadius} onChange={updateSetting("collectionRadius")} suffix="px" min={0} max={24} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.collectionShadowOpacity} onChange={updateSetting("collectionShadowOpacity")} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.collectionShadowX} onChange={updateSetting("collectionShadowX")} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.collectionShadowY} onChange={updateSetting("collectionShadowY")} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.collectionShadowBlur} onChange={updateSetting("collectionShadowBlur")} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Blog Cards":
          return (
            <div className="space-y-3">
              <SelectField label="Style" value={theme.blogStyle} onChange={updateSetting("blogStyle")} options={[
                { label: "Standard", value: "standard" },
                { label: "Card", value: "card" },
              ]} />
              <SelectField label="Image ratio" value={theme.blogRatio} onChange={updateSetting("blogRatio")} options={[
                { label: "1:1 Square", value: "1:1" }, { label: "3:4 Portrait", value: "3:4" }, { label: "4:3 Landscape", value: "4:3" }, { label: "16:9 Wide", value: "16:9" },
              ]} />
              <RangeField label="Image padding" value={theme.blogImagePadding} onChange={updateSetting("blogImagePadding")} min={0} max={20} suffix="px" />
              <SelectField label="Text alignment" value={theme.blogTextAlignment} onChange={updateSetting("blogTextAlignment")} options={[
                { label: "Left", value: "left" },
                { label: "Center", value: "center" },
                { label: "Right", value: "right" },
              ]} />
              <SelectField label="Color scheme" value={theme.blogColorScheme} onChange={(v: string): void => update("blogColorScheme", v)} options={
                theme.colorSchemes.map((scheme: ColorScheme) => ({ label: scheme.name, value: scheme.id }))
              } />
              <NumberField label="Radius" value={theme.blogRadius} onChange={updateSetting("blogRadius")} suffix="px" min={0} max={24} />
              <CheckboxField label="Show date" checked={theme.blogShowDate} onChange={updateSetting("blogShowDate")} />
              <CheckboxField label="Show excerpt" checked={theme.blogShowExcerpt} onChange={updateSetting("blogShowExcerpt")} />
              {theme.blogShowExcerpt && (
                <NumberField label="Excerpt lines" value={theme.blogExcerptLines} onChange={updateSetting("blogExcerptLines")} min={1} max={5} />
              )}
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <NumberField label="Thickness" value={theme.blogBorderWidth} onChange={updateSetting("blogBorderWidth")} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.blogBorderOpacity} onChange={updateSetting("blogBorderOpacity")} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.blogBorderRadius} onChange={updateSetting("blogBorderRadius")} suffix="px" min={0} max={48} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.blogShadowOpacity} onChange={updateSetting("blogShadowOpacity")} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.blogShadowX} onChange={updateSetting("blogShadowX")} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.blogShadowY} onChange={updateSetting("blogShadowY")} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.blogShadowBlur} onChange={updateSetting("blogShadowBlur")} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Content Containers":
          return (
            <div className="space-y-3">
              <ColorField label="Background" value={theme.containerBg} onChange={updateSetting("containerBg")} />
              <ColorField label="Border color" value={theme.containerBorderColor} onChange={updateSetting("containerBorderColor")} />
              <NumberField label="Radius" value={theme.containerRadius} onChange={updateSetting("containerRadius")} suffix="px" min={0} max={24} />
              <NumberField label="Inner padding" value={theme.containerPaddingInner} onChange={updateSetting("containerPaddingInner")} suffix="px" min={8} max={64} />
              <SelectField label="Shadow" value={theme.containerShadow} onChange={updateSetting("containerShadow")} options={[
                { label: "None", value: "none" }, { label: "Small", value: "small" }, { label: "Medium", value: "medium" }, { label: "Large", value: "large" },
              ]} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <NumberField label="Thickness" value={theme.containerBorderWidth} onChange={updateSetting("containerBorderWidth")} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.containerBorderOpacity} onChange={updateSetting("containerBorderOpacity")} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.containerBorderRadius} onChange={updateSetting("containerBorderRadius")} suffix="px" min={0} max={48} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.containerShadowOpacity} onChange={updateSetting("containerShadowOpacity")} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.containerShadowX} onChange={updateSetting("containerShadowX")} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.containerShadowY} onChange={updateSetting("containerShadowY")} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.containerShadowBlur} onChange={updateSetting("containerShadowBlur")} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Media":
          return (
            <div className="space-y-3">
              <ColorField label="Placeholder bg" value={theme.imagePlaceholderBg} onChange={updateSetting("imagePlaceholderBg")} />
              <SelectField label="Video ratio" value={theme.videoRatio} onChange={updateSetting("videoRatio")} options={[
                { label: "16:9", value: "16:9" }, { label: "4:3", value: "4:3" }, { label: "1:1", value: "1:1" }, { label: "9:16 Vertical", value: "9:16" },
              ]} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <ColorField label="Border color" value={theme.imageBorderColor} onChange={updateSetting("imageBorderColor")} />
                  <NumberField label="Thickness" value={theme.imageBorderWidth} onChange={updateSetting("imageBorderWidth")} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.imageBorderOpacity} onChange={updateSetting("imageBorderOpacity")} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.imageRadius} onChange={updateSetting("imageRadius")} suffix="px" min={0} max={48} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.imageShadowOpacity} onChange={updateSetting("imageShadowOpacity")} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.imageShadowX} onChange={updateSetting("imageShadowX")} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.imageShadowY} onChange={updateSetting("imageShadowY")} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.imageShadowBlur} onChange={updateSetting("imageShadowBlur")} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Dropdowns and pop-ups":
          return (
            <div className="space-y-3">
              <ColorField label="Dropdown bg" value={theme.dropdownBg} onChange={updateSetting("dropdownBg")} />
              <ColorField label="Popup overlay" value={theme.popupOverlayColor} onChange={updateSetting("popupOverlayColor")} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <ColorField label="Border color" value={theme.dropdownBorder} onChange={updateSetting("dropdownBorder")} />
                  <NumberField label="Thickness" value={theme.dropdownBorderWidth} onChange={updateSetting("dropdownBorderWidth")} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.dropdownBorderOpacity} onChange={updateSetting("dropdownBorderOpacity")} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label="Dropdown radius" value={theme.dropdownRadius} onChange={updateSetting("dropdownRadius")} suffix="px" min={0} max={24} />
                    <NumberField label="Popup radius" value={theme.popupRadius} onChange={updateSetting("popupRadius")} suffix="px" min={0} max={32} />
                  </div>
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <SelectField label="Preset" value={theme.dropdownShadow} onChange={updateSetting("dropdownShadow")} options={[
                    { label: "None", value: "none" }, { label: "Small", value: "small" }, { label: "Medium", value: "medium" }, { label: "Large", value: "large" },
                  ]} />
                  <RangeField label="Opacity" value={theme.dropdownShadowOpacity} onChange={updateSetting("dropdownShadowOpacity")} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.dropdownShadowX} onChange={updateSetting("dropdownShadowX")} suffix="px" min={-30} max={30} />
                    <NumberField label="Vertical" value={theme.dropdownShadowY} onChange={updateSetting("dropdownShadowY")} suffix="px" min={-30} max={30} />
                    <NumberField label="Blur" value={theme.dropdownShadowBlur} onChange={updateSetting("dropdownShadowBlur")} suffix="px" min={0} max={60} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Drawers":
          return (
            <div className="space-y-3">
              <RangeField label="Width" value={theme.drawerWidth} onChange={updateSetting("drawerWidth")} min={280} max={600} suffix="px" />
              <ColorField label="Background" value={theme.drawerBg} onChange={updateSetting("drawerBg")} />
              <ColorField label="Overlay" value={theme.drawerOverlayColor} onChange={updateSetting("drawerOverlayColor")} />
              <SelectField label="Position" value={theme.drawerPosition} onChange={updateSetting("drawerPosition")} options={[
                { label: "Right", value: "right" }, { label: "Left", value: "left" },
              ]} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <ColorField label="Border color" value={theme.drawerBorderColor} onChange={updateSetting("drawerBorderColor")} />
                  <NumberField label="Thickness" value={theme.drawerBorderWidth} onChange={updateSetting("drawerBorderWidth")} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.drawerBorderOpacity} onChange={updateSetting("drawerBorderOpacity")} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.drawerRadius} onChange={updateSetting("drawerRadius")} suffix="px" min={0} max={32} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.drawerShadowOpacity} onChange={updateSetting("drawerShadowOpacity")} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.drawerShadowX} onChange={updateSetting("drawerShadowX")} suffix="px" min={-30} max={30} />
                    <NumberField label="Vertical" value={theme.drawerShadowY} onChange={updateSetting("drawerShadowY")} suffix="px" min={-30} max={30} />
                    <NumberField label="Blur" value={theme.drawerShadowBlur} onChange={updateSetting("drawerShadowBlur")} suffix="px" min={0} max={60} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Badges":
          return (
            <div className="space-y-3">
              <SelectField
                label="Position on cards"
                value={theme.badgePosition}
                onChange={updateSetting("badgePosition")}
                options={[
                  { label: "Top left", value: "top-left" },
                  { label: "Top right", value: "top-right" },
                  { label: "Bottom left", value: "bottom-left" },
                  { label: "Bottom right", value: "bottom-right" },
                ]}
              />
              <RangeField label="Corner radius" value={theme.badgeRadius} onChange={updateSetting("badgeRadius")} min={0} max={40} suffix="px" />
              <NumberField label="Font size" value={theme.badgeFontSize} onChange={updateSetting("badgeFontSize")} suffix="px" min={8} max={16} />
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Padding X" value={theme.badgePaddingX} onChange={updateSetting("badgePaddingX")} suffix="px" min={2} max={16} />
                <NumberField label="Padding Y" value={theme.badgePaddingY} onChange={updateSetting("badgePaddingY")} suffix="px" min={0} max={8} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SelectField
                  label="Sale color scheme"
                  value={theme.badgeSaleColorScheme}
                  onChange={(v: string): void => update("badgeSaleColorScheme", v)}
                  options={theme.colorSchemes.map((scheme: ColorScheme) => ({ label: scheme.name, value: scheme.id }))}
                />
                <SelectField
                  label="Sold out color scheme"
                  value={theme.badgeSoldOutColorScheme}
                  onChange={(v: string): void => update("badgeSoldOutColorScheme", v)}
                  options={theme.colorSchemes.map((scheme: ColorScheme) => ({ label: scheme.name, value: scheme.id }))}
                />
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Default</Label>
                <div className="space-y-2">
                  <ColorField label="Background" value={theme.badgeDefaultBg} onChange={updateSetting("badgeDefaultBg")} />
                  <ColorField label="Text" value={theme.badgeDefaultText} onChange={updateSetting("badgeDefaultText")} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Sale</Label>
                <div className="space-y-2">
                  <ColorField label="Background" value={theme.badgeSaleBg} onChange={updateSetting("badgeSaleBg")} />
                  <ColorField label="Text" value={theme.badgeSaleText} onChange={updateSetting("badgeSaleText")} />
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Brand Information":
          return (
            <div className="space-y-4">
              <TextField label="Brand name" value={theme.brandName} onChange={updateSetting("brandName")} placeholder="Your brand" />
              <TextField label="Tagline" value={theme.brandTagline} onChange={updateSetting("brandTagline")} placeholder="Your tagline" />
              <TextField label="Email" value={theme.brandEmail} onChange={updateSetting("brandEmail")} placeholder="hello@example.com" />
              <TextField label="Phone" value={theme.brandPhone} onChange={updateSetting("brandPhone")} placeholder="+1 234 567 890" />
              <TextField label="Address" value={theme.brandAddress} onChange={updateSetting("brandAddress")} placeholder="123 Main St" />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Footer description</Label>
                <div className="space-y-3">
                  <MiniRichTextEditor
                    label="Headline"
                    value={theme.brandFooterHeadline}
                    onChange={updateSetting("brandFooterHeadline")}
                    minHeight={70}
                  />
                  <MiniRichTextEditor
                    label="Description"
                    value={theme.brandFooterDescription}
                    onChange={updateSetting("brandFooterDescription")}
                    minHeight={140}
                    showFormatSelect
                    enableLists
                  />
                  <ImagePickerField
                    label="Image"
                    value={theme.brandFooterImage}
                    onChange={updateSetting("brandFooterImage")}
                  />
                  <RangeField
                    label="Image width"
                    value={theme.brandFooterImageWidth}
                    onChange={updateSetting("brandFooterImageWidth")}
                    min={50}
                    max={550}
                    suffix="px"
                  />
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case "Social Media":
          return (
            <div className="space-y-3">
              <TextField label="Facebook" value={theme.socialFacebook} onChange={updateSetting("socialFacebook")} placeholder="https://facebook.com/..." />
              <TextField label="Instagram" value={theme.socialInstagram} onChange={updateSetting("socialInstagram")} placeholder="https://instagram.com/..." />
              <TextField label="YouTube" value={theme.socialYoutube} onChange={updateSetting("socialYoutube")} placeholder="https://youtube.com/..." />
              <TextField label="TikTok" value={theme.socialTiktok} onChange={updateSetting("socialTiktok")} placeholder="https://tiktok.com/..." />
              <TextField label="X / Twitter" value={theme.socialTwitter} onChange={updateSetting("socialTwitter")} placeholder="https://x.com/..." />
              <TextField label="Snapchat" value={theme.socialSnapchat} onChange={updateSetting("socialSnapchat")} placeholder="https://snapchat.com/add/..." />
              <TextField label="Pinterest" value={theme.socialPinterest} onChange={updateSetting("socialPinterest")} placeholder="https://pinterest.com/..." />
              <TextField label="Tumblr" value={theme.socialTumblr} onChange={updateSetting("socialTumblr")} placeholder="https://tumblr.com/..." />
              <TextField label="Vimeo" value={theme.socialVimeo} onChange={updateSetting("socialVimeo")} placeholder="https://vimeo.com/..." />
              <TextField label="LinkedIn" value={theme.socialLinkedin} onChange={updateSetting("socialLinkedin")} placeholder="https://linkedin.com/..." />
            </div>
          );

        // ---------------------------------------------------------------
        case "Search Behaviour":
          return (
            <div className="space-y-3">
              <TextField label="Placeholder text" value={theme.searchPlaceholder} onChange={updateSetting("searchPlaceholder")} />
              <NumberField label="Min characters" value={theme.searchMinChars} onChange={updateSetting("searchMinChars")} min={1} max={5} />
              <CheckboxField label="Enable search suggestions" checked={theme.searchShowSuggestions} onChange={updateSetting("searchShowSuggestions")} />
              {theme.searchShowSuggestions && (
                <>
                  <CheckboxField label="Show product vendor" checked={theme.searchShowVendor} onChange={updateSetting("searchShowVendor")} />
                  <CheckboxField label="Show product price" checked={theme.searchShowPrice} onChange={updateSetting("searchShowPrice")} />
                </>
              )}
              <NumberField label="Max results" value={theme.searchMaxResults} onChange={updateSetting("searchMaxResults")} min={3} max={20} />
            </div>
          );

        // ---------------------------------------------------------------
        case "Currency Format":
          return (
            <div className="space-y-3">
              <SelectField label="Currency" value={theme.currencyCode} onChange={updateSetting("currencyCode")} options={[
                { label: "USD ($)", value: "USD" }, { label: "EUR (\u20ac)", value: "EUR" }, { label: "GBP (\u00a3)", value: "GBP" },
                { label: "CAD (C$)", value: "CAD" }, { label: "AUD (A$)", value: "AUD" }, { label: "JPY (\u00a5)", value: "JPY" },
              ]} />
              <TextField label="Symbol" value={theme.currencySymbol} onChange={updateSetting("currencySymbol")} />
              <SelectField label="Symbol position" value={theme.currencyPosition} onChange={updateSetting("currencyPosition")} options={[
                { label: "Before ($10)", value: "before" }, { label: "After (10$)", value: "after" },
              ]} />
              <CheckboxField label="Show currency codes" checked={theme.currencyShowCode} onChange={updateSetting("currencyShowCode")} />
              <TextField label="Thousands separator" value={theme.thousandsSeparator} onChange={updateSetting("thousandsSeparator")} />
              <TextField label="Decimal separator" value={theme.decimalSeparator} onChange={updateSetting("decimalSeparator")} />
              <NumberField label="Decimal places" value={theme.decimalPlaces} onChange={updateSetting("decimalPlaces")} min={0} max={4} />
            </div>
          );

        // ---------------------------------------------------------------
        case "Cart": {
          const drawerCollectionValue = theme.cartDrawerCollectionId || "coming-soon";
          const drawerCollectionOptions = theme.cartDrawerCollectionId
            ? [{ label: theme.cartDrawerCollectionId, value: theme.cartDrawerCollectionId }]
            : [{ label: "Coming soon", value: "coming-soon" }];

          return (
            <div className="space-y-3">
              <SelectField label="Cart type" value={theme.cartStyle} onChange={updateSetting("cartStyle")} options={[
                { label: "Drawer", value: "drawer" }, { label: "Page", value: "page" }, { label: "Popup notification", value: "dropdown" },
              ]} />
              <SelectField label="Icon style" value={theme.cartIconStyle} onChange={updateSetting("cartIconStyle")} options={[
                { label: "Bag", value: "bag" }, { label: "Cart", value: "cart" }, { label: "Basket", value: "basket" },
              ]} />
              <CheckboxField label="Show item count" checked={theme.showCartCount} onChange={updateSetting("showCartCount")} />
              <CheckboxField label="Show vendor" checked={theme.cartShowVendor} onChange={updateSetting("cartShowVendor")} />
              <CheckboxField label="Enable cart note" checked={theme.cartEnableNote} onChange={updateSetting("cartEnableNote")} />
              <TextField label="Empty cart text" value={theme.cartEmptyText} onChange={updateSetting("cartEmptyText")} />
              {theme.cartStyle === "drawer" && (
                <div className="border-t border-border/30 pt-2">
                  <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Cart drawer</Label>
                  <div className="space-y-2">
                    <SelectField
                      label="Collection"
                      value={drawerCollectionValue}
                      onChange={updateSetting("cartDrawerCollectionId")}
                      options={drawerCollectionOptions}
                      disabled
                      placeholder="Coming soon"
                    />
                    <CheckboxField
                      label="Visible when cart drawer is empty"
                      checked={theme.cartDrawerShowWhenEmpty}
                      onChange={updateSetting("cartDrawerShowWhenEmpty")}
                    />
                    <SelectField
                      label="Color scheme"
                      value={theme.cartDrawerColorScheme}
                      onChange={updateSetting("cartDrawerColorScheme")}
                      options={theme.colorSchemes.map((scheme: ColorScheme) => ({ label: scheme.name, value: scheme.id }))}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        }

        // ---------------------------------------------------------------
        case "Custom CSS":
          return (
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-gray-500">Custom CSS</Label>
              <TextField
                label="CSS selectors"
                value={theme.customCssSelectors}
                onChange={updateSetting("customCssSelectors")}
                placeholder=".product-card, #cart, .footer"
              />
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
              <SelectField label="Preset" value={theme.themePreset} onChange={handleThemePresetChange} options={themePresetOptions} />
              <CheckboxField label="Dark mode" checked={theme.darkMode} onChange={updateSetting("darkMode")} />
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
      handleLogoSelect,
      editingSchemeId,
      logoFile?.name,
      logoPreviewUrl,
      logoWidth,
      newSchemeColors,
      newSchemeName,
      startAddScheme,
      startEditScheme,
      schemeView,
      isGlobalPaletteOpen,
      themePresetOptions,
      handleThemePresetChange,
      toggleGlobalPalette,
      updateSchemeColor,
      updateSetting,
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
          {THEME_SECTIONS.map((section: string): React.JSX.Element => {
            const isOpen = openSections.has(section);
            return (
              <div key={section} className="rounded border border-border/40 bg-gray-900/60">
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
  );
}
