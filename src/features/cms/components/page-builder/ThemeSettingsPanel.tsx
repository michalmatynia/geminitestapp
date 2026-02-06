'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from '@tiptap/extension-link';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, ChevronDown, Italic, Link2, List, ListOrdered } from 'lucide-react';
import Image from 'next/image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTeachingAgents } from '@/features/ai/agentcreator/teaching/hooks/useAgentTeaching';
import { AI_BRAIN_SETTINGS_KEY, parseBrainSettings, resolveBrainAssignment } from '@/features/ai/brain';
import { useChatbotModels } from '@/features/ai/chatbot/hooks/useChatbotQueries';
import { useCmsThemes } from '@/features/cms/hooks/useCmsQueries';
import type { CmsTheme } from '@/features/cms/types';
import type { ColorScheme, ColorSchemeColors, ThemeSettings } from '@/features/cms/types/theme-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { AgentTeachingAgentRecord } from '@/shared/types/agent-teaching';
import type { ChatMessage } from '@/shared/types/chatbot';
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
  PanelHeader,
  useToast,
} from '@/shared/ui';

import {
  ColorField,
  NumberField,
  RangeField,
  SelectField,
  CheckboxField,
  TextField,
  ImagePickerField,
} from './shared-fields';
import {
  THEME_SECTIONS,
  toSectionId,
  DEFAULT_SCHEME_COLORS,
  SAVED_THEME_PREFIX,
} from './theme/theme-constants';
import {
  extractJsonBlock,
  normalizeAiString,
  parseColorSchemePayload,
  applySavedThemePreset,
  sanitizeRichText,
} from './theme/theme-utils';
import { ThemeButtonsSection } from './theme/ThemeButtonsSection';
import {
  ThemeProductCardsSection,
  ThemeCollectionCardsSection,
  ThemeBlogCardsSection,
} from './theme/ThemeCardsSection';
import { ThemeColorsSection } from './theme/ThemeColorsSection';
import { ThemeLayoutSection } from './theme/ThemeLayoutSection';
import { ThemeTypographySection } from './theme/ThemeTypographySection';
import { useThemeSettings } from './ThemeSettingsContext';

// ---------------------------------------------------------------------------
// Reusable utilities
// ---------------------------------------------------------------------------

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
      className={`size-8 rounded-md ${active ? 'bg-blue-600 text-white hover:bg-blue-500' : 'text-gray-300 hover:text-white'}`}
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
  const [formatValue, setFormatValue] = useState<string>('paragraph');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: showFormatSelect ? { levels: [1, 2, 3] } : false,
        ...(enableLists ? {} : { bulletList: false, orderedList: false, listItem: false }),
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-400 underline hover:text-blue-300',
        },
      }),
    ],
    content: sanitizeRichText(value),
    editorProps: {
      attributes: {
        class: 'min-h-full outline-none text-sm text-gray-200',
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
      if (editor.isActive('heading', { level: 1 })) return setFormatValue('heading-1');
      if (editor.isActive('heading', { level: 2 })) return setFormatValue('heading-2');
      if (editor.isActive('heading', { level: 3 })) return setFormatValue('heading-3');
      setFormatValue('paragraph');
    };
    updateFormat();
    editor.on('selectionUpdate', updateFormat);
    editor.on('transaction', updateFormat);
    return (): void => {
      editor.off('selectionUpdate', updateFormat);
      editor.off('transaction', updateFormat);
    };
  }, [editor, showFormatSelect]);

  const applyFormat = (format: string): void => {
    if (!editor) return;
    if (format === 'paragraph') {
      editor.chain().focus().setParagraph().run();
      return;
    }
    const level = format === 'heading-1' ? 1 : format === 'heading-2' ? 2 : 3;
    editor.chain().focus().setHeading({ level }).run();
  };

  const addLink = (): void => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter URL:', previousUrl ?? '');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
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
          active={editor.isActive('bold')}
        >
          <Bold className="size-4" />
        </RichTextToolbarButton>
        <RichTextToolbarButton
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        >
          <Italic className="size-4" />
        </RichTextToolbarButton>
        {enableLists && (
          <>
            <RichTextToolbarButton
              title="Bullet list"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
            >
              <List className="size-4" />
            </RichTextToolbarButton>
            <RichTextToolbarButton
              title="Numbered list"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
            >
              <ListOrdered className="size-4" />
            </RichTextToolbarButton>
          </>
        )}
        <RichTextToolbarButton
          title="Insert link"
          onClick={addLink}
          active={editor.isActive('link')}
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

const userPreferencesQueryKey = ['user-preferences'] as const;

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function ThemeSettingsPanel({ showHeader = true }: { showHeader?: boolean } = {}): React.JSX.Element {
  const { theme, setTheme, update } = useThemeSettings();
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const brainSettingsRaw = settingsStore.get(AI_BRAIN_SETTINGS_KEY);
  const brainSettings = useMemo(
    () => parseBrainSettings(brainSettingsRaw),
    [brainSettingsRaw]
  );
  const settingsReady = !settingsStore.isLoading && !settingsStore.error;
  const brainAssignment = useMemo(
    () => resolveBrainAssignment(brainSettings, 'cms_builder'),
    [brainSettings]
  );
  const brainAppliedRef = useRef<boolean>(false);
  const [schemeView, setSchemeView] = useState<'list' | 'edit'>('list');
  const [editingSchemeId, setEditingSchemeId] = useState<string | null>(null);
  const [newSchemeName, setNewSchemeName] = useState('');
  const [newSchemeColors, setNewSchemeColors] = useState<ColorSchemeColors>(DEFAULT_SCHEME_COLORS);
  const [schemeAiProvider, setSchemeAiProvider] = useState<'model' | 'agent'>('model');
  const [schemeAiModelId, setSchemeAiModelId] = useState<string>('');
  const [schemeAiAgentId, setSchemeAiAgentId] = useState<string>('');
  const [schemeAiPrompt, setSchemeAiPrompt] = useState<string>('');
  const [schemeAiOutput, setSchemeAiOutput] = useState<string>('');
  const [schemeAiError, setSchemeAiError] = useState<string | null>(null);
  const [schemeAiLoading, setSchemeAiLoading] = useState<boolean>(false);
  const schemeAiAbortRef = useRef<AbortController | null>(null);
  const [isGlobalPaletteOpen, setIsGlobalPaletteOpen] = useState(false);
  const themesQuery = useCmsThemes();
  const savedThemes = useMemo((): CmsTheme[] => themesQuery.data ?? [], [themesQuery.data]);
  const modelsQuery = useChatbotModels({ enabled: schemeView === 'edit' });
  const teachingAgentsQuery = useTeachingAgents();
  const modelOptions = useMemo((): string[] => {
    const fromApi = (modelsQuery.data ?? []).filter((value: string) => value.trim().length > 0);
    return Array.from(new Set(fromApi));
  }, [modelsQuery.data]);
  const agentOptions = useMemo(
    (): Array<{ label: string; value: string }> => (teachingAgentsQuery.data ?? []).map((agent: AgentTeachingAgentRecord) => ({ label: agent.name, value: agent.id })),
    [teachingAgentsQuery.data]
  );
  const schemeProviderOptions = useMemo(
    () => [
      { label: 'AI model', value: 'model' },
      { label: 'Deepthinking agent', value: 'agent' },
    ],
    []
  );

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
      const res = await fetch('/api/user/preferences');
      if (!res.ok) throw new Error('Failed to load user preferences');
      return (await res.json()) as { cmsThemeOpenSections?: string[] | null };
    },
    staleTime: 1000 * 60 * 5,
  });

  const initialOpenSections = useMemo((): Set<string> => {
    if (!preferencesQuery.isFetched) return new Set<string>();
    const saved = preferencesQuery.data?.cmsThemeOpenSections ?? [];
    const filtered = saved.filter((item: string): item is string => typeof item === 'string');
    return new Set(filtered);
  }, [preferencesQuery.data, preferencesQuery.isFetched]);

  const [userOpenSections, setUserOpenSections] = useState<Set<string> | null>(null);
  const openSections = userOpenSections ?? initialOpenSections;

  const lastSavedRef = useRef<string>(JSON.stringify(Array.from(initialOpenSections)));

  const updatePreferencesMutation = useMutation({
    mutationFn: async (payload: { cmsThemeOpenSections: string[] }): Promise<void> => {
      const res = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update user preferences');
    },
    onSuccess: (): void => { void queryClient.invalidateQueries({ queryKey: userPreferencesQueryKey }); },
    onError: (error: Error): void => { console.warn('[CMS] Failed to persist theme settings state.', error); },
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
      activeColorSchemeId: prev.colorSchemes[0]?.id ?? '',
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

  useEffect((): (() => void) => {
    return (): void => {
      if (schemeAiAbortRef.current) {
        schemeAiAbortRef.current.abort();
        schemeAiAbortRef.current = null;
      }
    };
  }, []);

  useEffect((): void => {
    if (schemeView !== 'list') return;
    if (schemeAiAbortRef.current) {
      schemeAiAbortRef.current.abort();
      schemeAiAbortRef.current = null;
    }
    setSchemeAiLoading(false);
    setSchemeAiError(null);
    setSchemeAiOutput('');
  }, [schemeView]);

  useEffect((): void => {
    if (schemeAiProvider !== 'model') return;
    if (schemeAiModelId.trim().length) return;
    if (!modelOptions.length) return;
    setSchemeAiModelId(modelOptions[0]!);
  }, [schemeAiProvider, schemeAiModelId, modelOptions]);

  const activeScheme = useMemo((): { id: string; name: string; colors: ColorSchemeColors } | null => {
    if (!theme.colorSchemes.length) return null;
    return theme.colorSchemes.find((scheme: { id: string }) => scheme.id === theme.activeColorSchemeId) ?? theme.colorSchemes[0]!;
  }, [theme.colorSchemes, theme.activeColorSchemeId]);

  const resetSchemeAiState = useCallback((): void => {
    if (schemeAiAbortRef.current) {
      schemeAiAbortRef.current.abort();
      schemeAiAbortRef.current = null;
    }
    setSchemeAiLoading(false);
    setSchemeAiError(null);
    setSchemeAiOutput('');
  }, []);

  const startAddScheme = useCallback((): void => {
    setNewSchemeName('');
    setNewSchemeColors(activeScheme?.colors ?? DEFAULT_SCHEME_COLORS);
    setEditingSchemeId(null);
    setSchemeView('edit');
    resetSchemeAiState();
  }, [activeScheme, resetSchemeAiState]);

  useEffect((): (() => void) | void => {
    if (typeof window === 'undefined') return undefined;
    const handler = (event: Event): void => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail ?? {};
      const section = typeof detail.section === 'string' ? detail.section : 'Colors';
      setUserOpenSections((prev: Set<string> | null) => {
        const current = prev ?? initialOpenSections;
        const next = new Set(current);
        next.add(section);
        return next;
      });
      if (section === 'Colors' && detail.action === 'createScheme') {
        startAddScheme();
      }
      window.requestAnimationFrame((): void => {
        const target = document.getElementById(toSectionId(section));
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };
    window.addEventListener('cms-theme-open', handler as EventListener);
    return (): void => {
      window.removeEventListener('cms-theme-open', handler as EventListener);
    };
  }, [initialOpenSections, startAddScheme]);

  const startEditScheme = useCallback((schemeId: string): void => {
    const scheme = theme.colorSchemes.find((item: { id: string }) => item.id === schemeId);
    if (!scheme) return;
    setEditingSchemeId(schemeId);
    setNewSchemeName(scheme.name);
    setNewSchemeColors({ ...scheme.colors });
    setSchemeView('edit');
    resetSchemeAiState();
  }, [theme.colorSchemes, resetSchemeAiState]);

  const handleSaveScheme = useCallback((): void => {
    const trimmed = newSchemeName.trim();
    const currentName = editingSchemeId
      ? theme.colorSchemes.find((scheme: { id: string }) => scheme.id === editingSchemeId)?.name
      : undefined;
    const schemeName = (trimmed || currentName || `Scheme ${theme.colorSchemes.length + 1}`) ?? '';

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

    setSchemeView('list');
    setEditingSchemeId(null);
    setNewSchemeName('');
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
      { label: 'Default', value: 'default' },
      { label: 'Minimal', value: 'minimal' },
      { label: 'Bold', value: 'bold' },
      { label: 'Elegant', value: 'elegant' },
      { label: 'Playful', value: 'playful' },
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

  const schemeContext = useMemo((): string => {
    const context = {
      activeScheme: activeScheme ? { name: activeScheme.name, colors: activeScheme.colors } : null,
      globalPalette: {
        primary: theme.primaryColor,
        secondary: theme.secondaryColor,
        accent: theme.accentColor,
        background: theme.backgroundColor,
        surface: theme.surfaceColor,
        text: theme.textColor,
        muted: theme.mutedTextColor,
        border: theme.borderColor,
      },
    };
    return JSON.stringify(context, null, 2);
  }, [activeScheme, theme]);

  const buildSchemeAiPrompt = useCallback((): string => {
    const basePrompt = schemeAiPrompt.trim();
    const defaultPrompt =
      'Create a cohesive UI color scheme. Keep strong contrast between background and text, and provide a clear accent.';
    const promptBody = basePrompt.length ? basePrompt : defaultPrompt;
    const hasPlaceholder = /{{\s*theme_context\s*}}/i.test(promptBody);
    const resolved = promptBody.replace(/{{\s*theme_context\s*}}/gi, schemeContext);
    if (hasPlaceholder) return resolved;
    return `${resolved}\n\nTheme context:\n${schemeContext}`;
  }, [schemeAiPrompt, schemeContext]);

  const parseSchemeFromText = useCallback<
    (text: string) => { name?: string | undefined; colors: Partial<ColorSchemeColors> } | null
      >((text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return null;
        const jsonBlock = extractJsonBlock(trimmed);
        if (jsonBlock) {
          try {
            const payload = JSON.parse(jsonBlock) as unknown;
            const parsed = parseColorSchemePayload(payload);
            if (parsed) return parsed;
          } catch {
            // fall through to regex parsing
          }
        }

        const pickFromText = (labels: string[]): string | undefined => {
          for (const label of labels) {
            const regex = new RegExp(`${label}\\s*[:=]\\s*["']?([^"'\n]+)`, 'i');
            const match = trimmed.match(regex);
            if (match?.[1]) {
              const normalized = normalizeAiString(match[1]);
              if (normalized) return normalized;
            }
          }
          return undefined;
        };

        const colors: Partial<ColorSchemeColors> = {};
        const background = pickFromText(['background', 'bg']);
        if (background !== undefined) colors.background = background;
        const surface = pickFromText(['surface', 'card', 'layer']);
        if (surface !== undefined) colors.surface = surface;
        const parsedText = pickFromText(['text', 'foreground']);
        if (parsedText !== undefined) colors.text = parsedText;
        const accent = pickFromText(['accent', 'primary']);
        if (accent !== undefined) colors.accent = accent;
        const border = pickFromText(['border', 'outline']);
        if (border !== undefined) colors.border = border;
        const name = pickFromText(['name', 'scheme', 'title']);

        if (!Object.values(colors).some(Boolean) && name === undefined) return null;
        return { ...(name !== undefined ? { name } : {}), colors };
      }, []);
  const schemeAiPreview = useMemo(
    () => (schemeAiOutput ? parseSchemeFromText(schemeAiOutput) : null),
    [schemeAiOutput, parseSchemeFromText]
  );

  const applySchemeFromAi = useCallback((parsed: { name?: string | undefined; colors: Partial<ColorSchemeColors> }): void => {
    setNewSchemeColors((prev: ColorSchemeColors): ColorSchemeColors => {
      const next = { ...prev };
      (Object.keys(DEFAULT_SCHEME_COLORS) as Array<keyof ColorSchemeColors>).forEach((key: keyof ColorSchemeColors) => {
        const value = parsed.colors[key];
        if (typeof value === 'string' && value.trim().length) {
          next[key] = value.trim();
        }
      });
      return next;
    });
    if (parsed.name) {
      setNewSchemeName((prev: string): string => (prev.trim().length ? prev : parsed.name ?? prev));
    }
  }, []);

  const handleGenerateScheme = useCallback(async (): Promise<void> => {
    if (schemeAiLoading) return;
    setSchemeAiError(null);
    setSchemeAiOutput('');
    setSchemeAiLoading(true);
    try {
      const prompt = buildSchemeAiPrompt();
      if (!prompt.trim()) {
        throw new Error('Prompt is empty.');
      }

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content:
            'You are a UI color assistant. Return only a JSON object: {"name":"...","colors":{"background":"#...","surface":"#...","text":"#...","accent":"#...","border":"#..."}}. No markdown or explanations.',
        },
        { role: 'user', content: prompt },
      ];

      const controller = new AbortController();
      schemeAiAbortRef.current = controller;

      const provider = schemeAiProvider;
      const modelId = schemeAiProvider === 'model' ? (schemeAiModelId.trim() || modelOptions[0] || '') : '';
      const agentId = schemeAiProvider === 'agent' ? schemeAiAgentId.trim() : '';
      if (provider === 'model' && !modelId) {
        throw new Error('Select an AI model first.');
      }
      if (provider === 'agent' && !agentId) {
        throw new Error('Select a Deepthinking agent first.');
      }

      const res = await fetch('/api/cms/css-ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ provider, modelId, agentId, messages }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || 'Streaming request failed.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let doneSignal = false;

      const processEvent = (raw: string): void => {
        const lines = raw.split('\n').map((line: string) => line.trim());
        const dataLine = lines.find((line: string) => line.startsWith('data:'));
        if (!dataLine) return;
        const payload = JSON.parse(dataLine.replace(/^data:\s*/, '')) as {
          delta?: string;
          done?: boolean;
          error?: string;
        };
        if (payload.error) {
          throw new Error(payload.error);
        }
        if (payload.delta) {
          accumulated += payload.delta;
          setSchemeAiOutput(accumulated);
        }
        if (payload.done) {
          doneSignal = true;
        }
      };

      while (!doneSignal) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';
        for (const chunk of chunks) {
          processEvent(chunk);
          if (doneSignal) break;
        }
      }
      if (buffer.trim() && !doneSignal) {
        processEvent(buffer);
      }
      if (doneSignal) {
        try {
          await reader.cancel();
        } catch {
          // ignore
        }
      }

      const parsed = parseSchemeFromText(accumulated);
      if (!parsed || !Object.values(parsed.colors).some(Boolean)) {
        throw new Error('AI response did not include a color scheme.');
      }
      applySchemeFromAi(parsed);
      toast(`Scheme generated from ${provider}.`, { variant: 'success' });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setSchemeAiError('Generation cancelled.');
        toast('Generation cancelled.', { variant: 'info' });
      } else {
        const message = error instanceof Error ? error.message : 'Failed to generate scheme.';
        setSchemeAiError(message);
        toast(message, { variant: 'error' });
      }
    } finally {
      setSchemeAiLoading(false);
      schemeAiAbortRef.current = null;
    }
  }, [
    schemeAiLoading,
    buildSchemeAiPrompt,
    schemeAiProvider,
    schemeAiModelId,
    schemeAiAgentId,
    modelOptions,
    parseSchemeFromText,
    applySchemeFromAi,
    toast,
  ]);

  const handleCancelSchemeAi = useCallback((): void => {
    if (schemeAiAbortRef.current) {
      schemeAiAbortRef.current.abort();
      schemeAiAbortRef.current = null;
    }
  }, []);

  const toggleSection = useCallback((section: string): void => {
    setUserOpenSections((prev: Set<string> | null) => {
      const current = prev ?? initialOpenSections;
      const next = new Set(current);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, [initialOpenSections]);

  // ---------------------------------------------------------------------------
  // Section bodies
  // ---------------------------------------------------------------------------

  const renderSectionBody = useCallback<(section: string) => React.ReactNode>(
    (section: string): React.ReactNode => {
      switch (section) {

        // ---------------------------------------------------------------
        case 'Logo':
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
                      style={{ width: `${logoWidth}px`, height: 'auto' }}
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
                  <span className="flex-1 truncate text-[11px] text-gray-500">{logoFile?.name ?? 'No file selected'}</span>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case 'Colors':
          return (
            <ThemeColorsSection
              theme={theme}
              update={update}
              updateSetting={updateSetting}
              schemeView={schemeView}
              setSchemeView={setSchemeView}
              editingSchemeId={editingSchemeId}
              setEditingSchemeId={setEditingSchemeId}
              activeScheme={activeScheme}
              startAddScheme={startAddScheme}
              startEditScheme={startEditScheme}
              handleSaveScheme={handleSaveScheme}
              newSchemeName={newSchemeName}
              setNewSchemeName={setNewSchemeName}
              newSchemeColors={newSchemeColors}
              updateSchemeColor={updateSchemeColor}
              isGlobalPaletteOpen={isGlobalPaletteOpen}
              toggleGlobalPalette={toggleGlobalPalette}
              schemeAiProvider={schemeAiProvider}
              setSchemeAiProvider={setSchemeAiProvider}
              schemeProviderOptions={schemeProviderOptions}
              schemeAiModelId={schemeAiModelId}
              setSchemeAiModelId={setSchemeAiModelId}
              modelOptions={modelOptions}
              schemeAiAgentId={schemeAiAgentId}
              setSchemeAiAgentId={setSchemeAiAgentId}
              agentOptions={agentOptions}
              schemeAiPrompt={schemeAiPrompt}
              setSchemeAiPrompt={setSchemeAiPrompt}
              schemeAiLoading={schemeAiLoading}
              schemeAiError={schemeAiError}
              schemeAiOutput={schemeAiOutput}
              schemeAiPreview={schemeAiPreview}
              handleGenerateScheme={handleGenerateScheme}
              handleCancelSchemeAi={handleCancelSchemeAi}
            />
          );

        // ---------------------------------------------------------------
        case 'Typography':
          return (
            <ThemeTypographySection
              theme={theme}
              updateSetting={updateSetting}
            />
          );

        // ---------------------------------------------------------------
        case 'Layout':
          return (
            <ThemeLayoutSection
              theme={theme}
              updateSetting={updateSetting}
            />
          );

        // ---------------------------------------------------------------
        case 'Animations':
          return (
            <div className="space-y-3">
              <CheckboxField label="Enable animations" checked={theme.enableAnimations} onChange={updateSetting('enableAnimations')} />
              {theme.enableAnimations && (
                <>
                  <RangeField label="Duration" value={theme.animationDuration} onChange={updateSetting('animationDuration')} min={100} max={1000} suffix="ms" />
                  <SelectField label="Easing" value={theme.animationEasing} onChange={updateSetting('animationEasing')} options={[
                    { label: 'Ease out', value: 'ease-out' },
                    { label: 'Ease in-out', value: 'ease-in-out' },
                    { label: 'Ease in', value: 'ease-in' },
                    { label: 'Linear', value: 'linear' },
                    { label: 'Spring', value: 'cubic-bezier(.68,-0.55,.27,1.55)' },
                  ]} />
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-gray-500">Reveal sections on scroll</Label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={theme.scrollReveal ? 'secondary' : 'outline'}
                        onClick={() => update('scrollReveal', true)}
                        className="h-7 flex-1 text-[11px]"
                      >
                        On
                      </Button>
                      <Button
                        size="sm"
                        variant={!theme.scrollReveal ? 'secondary' : 'outline'}
                        onClick={() => update('scrollReveal', false)}
                        className="h-7 flex-1 text-[11px]"
                      >
                        Off
                      </Button>
                    </div>
                  </div>
                  <SelectField
                    label="Hover effect"
                    value={theme.hoverEffect}
                    onChange={updateSetting('hoverEffect')}
                    options={[
                      { label: 'Vertical lift', value: 'vertical-lift' },
                      { label: '3D lift', value: 'lift-3d' },
                    ]}
                  />
                  <RangeField label="Hover scale" value={theme.hoverScale} onChange={updateSetting('hoverScale')} min={1} max={1.2} step={0.01} suffix="x" />
                </>
              )}
            </div>
          );

        // ---------------------------------------------------------------
        case 'Buttons':
          return (
            <ThemeButtonsSection
              theme={theme}
              updateSetting={updateSetting}
            />
          );

        // ---------------------------------------------------------------
        case 'Variant Pills':
          return (
            <div className="space-y-3">
              <NumberField label="Corner radius" value={theme.pillRadius} onChange={updateSetting('pillRadius')} suffix="px" min={0} max={999} />
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Padding X" value={theme.pillPaddingX} onChange={updateSetting('pillPaddingX')} suffix="px" min={4} max={32} />
                <NumberField label="Padding Y" value={theme.pillPaddingY} onChange={updateSetting('pillPaddingY')} suffix="px" min={2} max={16} />
              </div>
              <NumberField label="Font size" value={theme.pillFontSize} onChange={updateSetting('pillFontSize')} suffix="px" min={10} max={18} />
              <ColorField label="Background" value={theme.pillBg} onChange={updateSetting('pillBg')} />
              <ColorField label="Text" value={theme.pillText} onChange={updateSetting('pillText')} />
              <ColorField label="Active background" value={theme.pillActiveBg} onChange={updateSetting('pillActiveBg')} />
              <ColorField label="Active text" value={theme.pillActiveText} onChange={updateSetting('pillActiveText')} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <ColorField label="Border" value={theme.pillBorderColor} onChange={updateSetting('pillBorderColor')} />
                  <NumberField label="Thickness" value={theme.pillBorderWidth} onChange={updateSetting('pillBorderWidth')} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.pillBorderOpacity} onChange={updateSetting('pillBorderOpacity')} min={0} max={100} suffix="%" />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.pillShadowOpacity} onChange={updateSetting('pillShadowOpacity')} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.pillShadowX} onChange={updateSetting('pillShadowX')} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.pillShadowY} onChange={updateSetting('pillShadowY')} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.pillShadowBlur} onChange={updateSetting('pillShadowBlur')} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case 'Inputs':
          return (
            <div className="space-y-3">
              <NumberField label="Height" value={theme.inputHeight} onChange={updateSetting('inputHeight')} suffix="px" min={28} max={56} />
              <NumberField label="Font size" value={theme.inputFontSize} onChange={updateSetting('inputFontSize')} suffix="px" min={10} max={20} />
              <ColorField label="Background" value={theme.inputBg} onChange={updateSetting('inputBg')} />
              <ColorField label="Text" value={theme.inputText} onChange={updateSetting('inputText')} />
              <ColorField label="Focus border" value={theme.inputFocusBorder} onChange={updateSetting('inputFocusBorder')} />
              <ColorField label="Placeholder" value={theme.inputPlaceholder} onChange={updateSetting('inputPlaceholder')} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <ColorField label="Border" value={theme.inputBorderColor} onChange={updateSetting('inputBorderColor')} />
                  <NumberField label="Thickness" value={theme.inputBorderWidth} onChange={updateSetting('inputBorderWidth')} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.inputBorderOpacity} onChange={updateSetting('inputBorderOpacity')} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.inputRadius} onChange={updateSetting('inputRadius')} suffix="px" min={0} max={24} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.inputShadowOpacity} onChange={updateSetting('inputShadowOpacity')} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.inputShadowX} onChange={updateSetting('inputShadowX')} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.inputShadowY} onChange={updateSetting('inputShadowY')} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.inputShadowBlur} onChange={updateSetting('inputShadowBlur')} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case 'Product Cards':
          return (
            <ThemeProductCardsSection
              theme={theme}
              update={update}
              updateSetting={updateSetting}
            />
          );

        // ---------------------------------------------------------------
        case 'Collection Cards':
          return (
            <ThemeCollectionCardsSection
              theme={theme}
              update={update}
              updateSetting={updateSetting}
            />
          );

        // ---------------------------------------------------------------
        case 'Blog Cards':
          return (
            <ThemeBlogCardsSection
              theme={theme}
              update={update}
              updateSetting={updateSetting}
            />
          );

        // ---------------------------------------------------------------
        case 'Content Containers':
          return (
            <div className="space-y-3">
              <ColorField label="Background" value={theme.containerBg} onChange={updateSetting('containerBg')} />
              <ColorField label="Border color" value={theme.containerBorderColor} onChange={updateSetting('containerBorderColor')} />
              <NumberField label="Radius" value={theme.containerRadius} onChange={updateSetting('containerRadius')} suffix="px" min={0} max={24} />
              <NumberField label="Inner padding" value={theme.containerPaddingInner} onChange={updateSetting('containerPaddingInner')} suffix="px" min={8} max={64} />
              <SelectField label="Shadow" value={theme.containerShadow} onChange={updateSetting('containerShadow')} options={[
                { label: 'None', value: 'none' }, { label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' },
              ]} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <NumberField label="Thickness" value={theme.containerBorderWidth} onChange={updateSetting('containerBorderWidth')} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.containerBorderOpacity} onChange={updateSetting('containerBorderOpacity')} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.containerBorderRadius} onChange={updateSetting('containerBorderRadius')} suffix="px" min={0} max={48} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.containerShadowOpacity} onChange={updateSetting('containerShadowOpacity')} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.containerShadowX} onChange={updateSetting('containerShadowX')} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.containerShadowY} onChange={updateSetting('containerShadowY')} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.containerShadowBlur} onChange={updateSetting('containerShadowBlur')} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case 'Media':
          return (
            <div className="space-y-3">
              <ColorField label="Placeholder bg" value={theme.imagePlaceholderBg} onChange={updateSetting('imagePlaceholderBg')} />
              <SelectField label="Video ratio" value={theme.videoRatio} onChange={updateSetting('videoRatio')} options={[
                { label: '16:9', value: '16:9' }, { label: '4:3', value: '4:3' }, { label: '1:1', value: '1:1' }, { label: '9:16 Vertical', value: '9:16' },
              ]} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <ColorField label="Border color" value={theme.imageBorderColor} onChange={updateSetting('imageBorderColor')} />
                  <NumberField label="Thickness" value={theme.imageBorderWidth} onChange={updateSetting('imageBorderWidth')} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.imageBorderOpacity} onChange={updateSetting('imageBorderOpacity')} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.imageRadius} onChange={updateSetting('imageRadius')} suffix="px" min={0} max={48} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.imageShadowOpacity} onChange={updateSetting('imageShadowOpacity')} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.imageShadowX} onChange={updateSetting('imageShadowX')} suffix="px" min={-20} max={20} />
                    <NumberField label="Vertical" value={theme.imageShadowY} onChange={updateSetting('imageShadowY')} suffix="px" min={-20} max={20} />
                    <NumberField label="Blur" value={theme.imageShadowBlur} onChange={updateSetting('imageShadowBlur')} suffix="px" min={0} max={40} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case 'Dropdowns and pop-ups':
          return (
            <div className="space-y-3">
              <ColorField label="Dropdown bg" value={theme.dropdownBg} onChange={updateSetting('dropdownBg')} />
              <ColorField label="Popup overlay" value={theme.popupOverlayColor} onChange={updateSetting('popupOverlayColor')} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <ColorField label="Border color" value={theme.dropdownBorder} onChange={updateSetting('dropdownBorder')} />
                  <NumberField label="Thickness" value={theme.dropdownBorderWidth} onChange={updateSetting('dropdownBorderWidth')} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.dropdownBorderOpacity} onChange={updateSetting('dropdownBorderOpacity')} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label="Dropdown radius" value={theme.dropdownRadius} onChange={updateSetting('dropdownRadius')} suffix="px" min={0} max={24} />
                    <NumberField label="Popup radius" value={theme.popupRadius} onChange={updateSetting('popupRadius')} suffix="px" min={0} max={32} />
                  </div>
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <SelectField label="Preset" value={theme.dropdownShadow} onChange={updateSetting('dropdownShadow')} options={[
                    { label: 'None', value: 'none' }, { label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' },
                  ]} />
                  <RangeField label="Opacity" value={theme.dropdownShadowOpacity} onChange={updateSetting('dropdownShadowOpacity')} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.dropdownShadowX} onChange={updateSetting('dropdownShadowX')} suffix="px" min={-30} max={30} />
                    <NumberField label="Vertical" value={theme.dropdownShadowY} onChange={updateSetting('dropdownShadowY')} suffix="px" min={-30} max={30} />
                    <NumberField label="Blur" value={theme.dropdownShadowBlur} onChange={updateSetting('dropdownShadowBlur')} suffix="px" min={0} max={60} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case 'Drawers':
          return (
            <div className="space-y-3">
              <RangeField label="Width" value={theme.drawerWidth} onChange={updateSetting('drawerWidth')} min={280} max={600} suffix="px" />
              <ColorField label="Background" value={theme.drawerBg} onChange={updateSetting('drawerBg')} />
              <ColorField label="Overlay" value={theme.drawerOverlayColor} onChange={updateSetting('drawerOverlayColor')} />
              <SelectField label="Position" value={theme.drawerPosition} onChange={updateSetting('drawerPosition')} options={[
                { label: 'Right', value: 'right' }, { label: 'Left', value: 'left' },
              ]} />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Border</Label>
                <div className="space-y-2">
                  <ColorField label="Border color" value={theme.drawerBorderColor} onChange={updateSetting('drawerBorderColor')} />
                  <NumberField label="Thickness" value={theme.drawerBorderWidth} onChange={updateSetting('drawerBorderWidth')} suffix="px" min={0} max={8} />
                  <RangeField label="Opacity" value={theme.drawerBorderOpacity} onChange={updateSetting('drawerBorderOpacity')} min={0} max={100} suffix="%" />
                  <NumberField label="Corner radius" value={theme.drawerRadius} onChange={updateSetting('drawerRadius')} suffix="px" min={0} max={32} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Shadow</Label>
                <div className="space-y-2">
                  <RangeField label="Opacity" value={theme.drawerShadowOpacity} onChange={updateSetting('drawerShadowOpacity')} min={0} max={100} suffix="%" />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField label="Horizontal" value={theme.drawerShadowX} onChange={updateSetting('drawerShadowX')} suffix="px" min={-30} max={30} />
                    <NumberField label="Vertical" value={theme.drawerShadowY} onChange={updateSetting('drawerShadowY')} suffix="px" min={-30} max={30} />
                    <NumberField label="Blur" value={theme.drawerShadowBlur} onChange={updateSetting('drawerShadowBlur')} suffix="px" min={0} max={60} />
                  </div>
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case 'Badges':
          return (
            <div className="space-y-3">
              <SelectField
                label="Position on cards"
                value={theme.badgePosition}
                onChange={updateSetting('badgePosition')}
                options={[
                  { label: 'Top left', value: 'top-left' },
                  { label: 'Top right', value: 'top-right' },
                  { label: 'Bottom left', value: 'bottom-left' },
                  { label: 'Bottom right', value: 'bottom-right' },
                ]}
              />
              <RangeField label="Corner radius" value={theme.badgeRadius} onChange={updateSetting('badgeRadius')} min={0} max={40} suffix="px" />
              <NumberField label="Font size" value={theme.badgeFontSize} onChange={updateSetting('badgeFontSize')} suffix="px" min={8} max={16} />
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Padding X" value={theme.badgePaddingX} onChange={updateSetting('badgePaddingX')} suffix="px" min={2} max={16} />
                <NumberField label="Padding Y" value={theme.badgePaddingY} onChange={updateSetting('badgePaddingY')} suffix="px" min={0} max={8} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SelectField
                  label="Sale color scheme"
                  value={theme.badgeSaleColorScheme}
                  onChange={(v: string): void => update('badgeSaleColorScheme', v)}
                  options={theme.colorSchemes.map((scheme: ColorScheme) => ({ label: scheme.name, value: scheme.id }))}
                />
                <SelectField
                  label="Sold out color scheme"
                  value={theme.badgeSoldOutColorScheme}
                  onChange={(v: string): void => update('badgeSoldOutColorScheme', v)}
                  options={theme.colorSchemes.map((scheme: ColorScheme) => ({ label: scheme.name, value: scheme.id }))}
                />
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Default</Label>
                <div className="space-y-2">
                  <ColorField label="Background" value={theme.badgeDefaultBg} onChange={updateSetting('badgeDefaultBg')} />
                  <ColorField label="Text" value={theme.badgeDefaultText} onChange={updateSetting('badgeDefaultText')} />
                </div>
              </div>
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Sale</Label>
                <div className="space-y-2">
                  <ColorField label="Background" value={theme.badgeSaleBg} onChange={updateSetting('badgeSaleBg')} />
                  <ColorField label="Text" value={theme.badgeSaleText} onChange={updateSetting('badgeSaleText')} />
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case 'Brand Information':
          return (
            <div className="space-y-4">
              <TextField label="Brand name" value={theme.brandName} onChange={updateSetting('brandName')} placeholder="Your brand" />
              <TextField label="Tagline" value={theme.brandTagline} onChange={updateSetting('brandTagline')} placeholder="Your tagline" />
              <TextField label="Email" value={theme.brandEmail} onChange={updateSetting('brandEmail')} placeholder="hello@example.com" />
              <TextField label="Phone" value={theme.brandPhone} onChange={updateSetting('brandPhone')} placeholder="+1 234 567 890" />
              <TextField label="Address" value={theme.brandAddress} onChange={updateSetting('brandAddress')} placeholder="123 Main St" />
              <div className="border-t border-border/30 pt-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Footer description</Label>
                <div className="space-y-3">
                  <MiniRichTextEditor
                    label="Headline"
                    value={theme.brandFooterHeadline}
                    onChange={updateSetting('brandFooterHeadline')}
                    minHeight={70}
                  />
                  <MiniRichTextEditor
                    label="Description"
                    value={theme.brandFooterDescription}
                    onChange={updateSetting('brandFooterDescription')}
                    minHeight={140}
                    showFormatSelect
                    enableLists
                  />
                  <ImagePickerField
                    label="Image"
                    value={theme.brandFooterImage}
                    onChange={updateSetting('brandFooterImage')}
                  />
                  <RangeField
                    label="Image width"
                    value={theme.brandFooterImageWidth}
                    onChange={updateSetting('brandFooterImageWidth')}
                    min={50}
                    max={550}
                    suffix="px"
                  />
                </div>
              </div>
            </div>
          );

        // ---------------------------------------------------------------
        case 'Social Media':
          return (
            <div className="space-y-3">
              <TextField label="Facebook" value={theme.socialFacebook} onChange={updateSetting('socialFacebook')} placeholder="https://facebook.com/..." />
              <TextField label="Instagram" value={theme.socialInstagram} onChange={updateSetting('socialInstagram')} placeholder="https://instagram.com/..." />
              <TextField label="YouTube" value={theme.socialYoutube} onChange={updateSetting('socialYoutube')} placeholder="https://youtube.com/..." />
              <TextField label="TikTok" value={theme.socialTiktok} onChange={updateSetting('socialTiktok')} placeholder="https://tiktok.com/..." />
              <TextField label="X / Twitter" value={theme.socialTwitter} onChange={updateSetting('socialTwitter')} placeholder="https://x.com/..." />
              <TextField label="Snapchat" value={theme.socialSnapchat} onChange={updateSetting('socialSnapchat')} placeholder="https://snapchat.com/add/..." />
              <TextField label="Pinterest" value={theme.socialPinterest} onChange={updateSetting('socialPinterest')} placeholder="https://pinterest.com/..." />
              <TextField label="Tumblr" value={theme.socialTumblr} onChange={updateSetting('socialTumblr')} placeholder="https://tumblr.com/..." />
              <TextField label="Vimeo" value={theme.socialVimeo} onChange={updateSetting('socialVimeo')} placeholder="https://vimeo.com/..." />
              <TextField label="LinkedIn" value={theme.socialLinkedin} onChange={updateSetting('socialLinkedin')} placeholder="https://linkedin.com/..." />
            </div>
          );

        // ---------------------------------------------------------------
        case 'Search Behaviour':
          return (
            <div className="space-y-3">
              <TextField label="Placeholder text" value={theme.searchPlaceholder} onChange={updateSetting('searchPlaceholder')} />
              <NumberField label="Min characters" value={theme.searchMinChars} onChange={updateSetting('searchMinChars')} min={1} max={5} />
              <CheckboxField label="Enable search suggestions" checked={theme.searchShowSuggestions} onChange={updateSetting('searchShowSuggestions')} />
              {theme.searchShowSuggestions && (
                <>
                  <CheckboxField label="Show product vendor" checked={theme.searchShowVendor} onChange={updateSetting('searchShowVendor')} />
                  <CheckboxField label="Show product price" checked={theme.searchShowPrice} onChange={updateSetting('searchShowPrice')} />
                </>
              )}
              <NumberField label="Max results" value={theme.searchMaxResults} onChange={updateSetting('searchMaxResults')} min={3} max={20} />
            </div>
          );

        // ---------------------------------------------------------------
        case 'Currency Format':
          return (
            <div className="space-y-3">
              <SelectField label="Currency" value={theme.currencyCode} onChange={updateSetting('currencyCode')} options={[
                { label: 'USD ($)', value: 'USD' }, { label: 'EUR (\u20ac)', value: 'EUR' }, { label: 'GBP (\u00a3)', value: 'GBP' },
                { label: 'CAD (C$)', value: 'CAD' }, { label: 'AUD (A$)', value: 'AUD' }, { label: 'JPY (\u00a5)', value: 'JPY' },
              ]} />
              <TextField label="Symbol" value={theme.currencySymbol} onChange={updateSetting('currencySymbol')} />
              <SelectField label="Symbol position" value={theme.currencyPosition} onChange={updateSetting('currencyPosition')} options={[
                { label: 'Before ($10)', value: 'before' }, { label: 'After (10$)', value: 'after' },
              ]} />
              <CheckboxField label="Show currency codes" checked={theme.currencyShowCode} onChange={updateSetting('currencyShowCode')} />
              <TextField label="Thousands separator" value={theme.thousandsSeparator} onChange={updateSetting('thousandsSeparator')} />
              <TextField label="Decimal separator" value={theme.decimalSeparator} onChange={updateSetting('decimalSeparator')} />
              <NumberField label="Decimal places" value={theme.decimalPlaces} onChange={updateSetting('decimalPlaces')} min={0} max={4} />
            </div>
          );

        // ---------------------------------------------------------------
        case 'Cart': {
          const drawerCollectionValue = theme.cartDrawerCollectionId || 'coming-soon';
          const drawerCollectionOptions = theme.cartDrawerCollectionId
            ? [{ label: theme.cartDrawerCollectionId, value: theme.cartDrawerCollectionId }]
            : [{ label: 'Coming soon', value: 'coming-soon' }];

          return (
            <div className="space-y-3">
              <SelectField label="Cart type" value={theme.cartStyle} onChange={updateSetting('cartStyle')} options={[
                { label: 'Drawer', value: 'drawer' }, { label: 'Page', value: 'page' }, { label: 'Popup notification', value: 'dropdown' },
              ]} />
              <SelectField label="Icon style" value={theme.cartIconStyle} onChange={updateSetting('cartIconStyle')} options={[
                { label: 'Bag', value: 'bag' }, { label: 'Cart', value: 'cart' }, { label: 'Basket', value: 'basket' },
              ]} />
              <CheckboxField label="Show item count" checked={theme.showCartCount} onChange={updateSetting('showCartCount')} />
              <CheckboxField label="Show vendor" checked={theme.cartShowVendor} onChange={updateSetting('cartShowVendor')} />
              <CheckboxField label="Enable cart note" checked={theme.cartEnableNote} onChange={updateSetting('cartEnableNote')} />
              <TextField label="Empty cart text" value={theme.cartEmptyText} onChange={updateSetting('cartEmptyText')} />
              {theme.cartStyle === 'drawer' && (
                <div className="border-t border-border/30 pt-2">
                  <Label className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 block">Cart drawer</Label>
                  <div className="space-y-2">
                    <SelectField
                      label="Collection"
                      value={drawerCollectionValue}
                      onChange={updateSetting('cartDrawerCollectionId')}
                      options={drawerCollectionOptions}
                      disabled
                      placeholder="Coming soon"
                    />
                    <CheckboxField
                      label="Visible when cart drawer is empty"
                      checked={theme.cartDrawerShowWhenEmpty}
                      onChange={updateSetting('cartDrawerShowWhenEmpty')}
                    />
                    <SelectField
                      label="Color scheme"
                      value={theme.cartDrawerColorScheme}
                      onChange={updateSetting('cartDrawerColorScheme')}
                      options={theme.colorSchemes.map((scheme: ColorScheme) => ({ label: scheme.name, value: scheme.id }))}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        }

        // ---------------------------------------------------------------
        case 'Custom CSS':
          return (
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-gray-500">Custom CSS</Label>
              <TextField
                label="CSS selectors"
                value={theme.customCssSelectors}
                onChange={updateSetting('customCssSelectors')}
                placeholder=".product-card, #cart, .footer"
              />
              <textarea
                value={theme.customCss}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => update('customCss', e.target.value)}
                placeholder={'.my-class {\n  color: red;\n}'}
                className="w-full rounded border border-border/50 bg-gray-800/40 p-2 font-mono text-xs text-gray-300 placeholder:text-gray-600 focus:border-blue-500 focus:outline-none min-h-[120px] resize-y"
                spellCheck={false}
              />
            </div>
          );

        // ---------------------------------------------------------------
        case 'Theme Style':
          return (
            <div className="space-y-3">
              <SelectField label="Preset" value={theme.themePreset} onChange={handleThemePresetChange} options={themePresetOptions} />
              <CheckboxField label="Dark mode" checked={theme.darkMode} onChange={updateSetting('darkMode')} />
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
    agentOptions,
    handleCancelSchemeAi,
    handleGenerateScheme,
    modelOptions,
    schemeAiAgentId,
    schemeAiError,
    schemeAiLoading,
    schemeAiModelId,
    schemeAiOutput,
    schemeAiPreview,
    schemeAiPrompt,
    schemeAiProvider,
    schemeProviderOptions,
  ]
  );

  useEffect(() => {
    if (!settingsReady) return;
    if (brainAppliedRef.current) return;
    brainAppliedRef.current = true;
    if (!brainAssignment.enabled) return;
    setSchemeAiProvider(brainAssignment.provider);
    if (brainAssignment.provider === 'model' && brainAssignment.modelId) {
      setSchemeAiModelId(brainAssignment.modelId);
    }
    if (brainAssignment.provider === 'agent' && brainAssignment.agentId) {
      setSchemeAiAgentId(brainAssignment.agentId);
    }
  }, [brainAssignment, settingsReady]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showHeader && (
        <PanelHeader
          title="Theme settings"
          subtitle="Configure global styles and storefront components."
        />
      )}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {THEME_SECTIONS.map((section: string): React.JSX.Element => {
            const isOpen = openSections.has(section);
            return (
              <div
                key={section}
                id={toSectionId(section)}
                className="rounded border border-border/40 bg-gray-900/60"
              >
                <button
                  type="button"
                  onClick={(): void => toggleSection(section)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-gray-200 hover:bg-muted/40"
                  aria-expanded={isOpen}
                >
                  <span>{section}</span>
                  <ChevronDown className={`size-4 text-gray-500 transition ${isOpen ? 'rotate-180' : ''}`} />
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
