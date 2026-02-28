'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';

import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import type { ChatMessage } from '@/shared/contracts/chatbot';
import type { ColorSchemeColors, ColorScheme, ThemeSettings } from '@/shared/contracts/cms-theme';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { useToast } from '@/shared/ui';

import { DEFAULT_SCHEME_COLORS } from './theme-constants';
import { extractJsonBlock, parseColorSchemePayload, normalizeAiString } from './theme-utils';
import { useThemeSettings } from '../ThemeSettingsContext';

interface ThemeColorsContextValue {
  schemeView: 'list' | 'edit';
  setSchemeView: (view: 'list' | 'edit') => void;
  editingSchemeId: string | null;
  setEditingSchemeId: (id: string | null) => void;
  activeScheme: { id: string; name: string; colors: ColorSchemeColors } | null;
  startAddScheme: () => void;
  startEditScheme: (schemeId: string) => void;
  handleSaveScheme: () => void;
  newSchemeName: string;
  setNewSchemeName: (value: string) => void;
  newSchemeColors: ColorSchemeColors;
  updateSchemeColor: (key: keyof ColorSchemeColors) => (value: string) => void;
  isGlobalPaletteOpen: boolean;
  toggleGlobalPalette: () => void;
  schemeAiPrompt: string;
  setSchemeAiPrompt: (value: string) => void;
  schemeAiLoading: boolean;
  schemeAiError: string | null;
  schemeAiOutput: string;
  schemeAiPreview: { name?: string | undefined; colors: Partial<ColorSchemeColors> } | null;
  brainAiProvider: 'model' | 'agent';
  brainAiModelId: string;
  brainAiAgentId: string;
  handleGenerateScheme: () => Promise<void>;
  handleCancelSchemeAi: () => void;
}

const ThemeColorsContext = createContext<ThemeColorsContextValue | undefined>(undefined);

export function ThemeColorsProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { theme, setTheme } = useThemeSettings();
  const { toast } = useToast();

  const [schemeView, setSchemeView] = useState<'list' | 'edit'>('list');
  const [editingSchemeId, setEditingSchemeId] = useState<string | null>(null);
  const [newSchemeName, setNewSchemeName] = useState('');
  const [newSchemeColors, setNewSchemeColors] = useState<ColorSchemeColors>(DEFAULT_SCHEME_COLORS);

  const [schemeAiPrompt, setSchemeAiPrompt] = useState<string>('');
  const [schemeAiOutput, setSchemeAiOutput] = useState<string>('');
  const [schemeAiError, setSchemeAiError] = useState<string | null>(null);
  const schemeAiAbortRef = useRef<AbortController | null>(null);

  const [isGlobalPaletteOpen, setIsGlobalPaletteOpen] = useState(false);

  const { assignment: brainAssignment } = useBrainAssignment({
    capability: 'cms.css_stream',
  });
  const brainAiProvider = brainAssignment.provider;
  const brainAiModelId = brainAssignment.modelId.trim();
  const brainAiAgentId = brainAssignment.agentId.trim();

  const activeScheme = useMemo((): {
    id: string;
    name: string;
    colors: ColorSchemeColors;
  } | null => {
    if (!theme.colorSchemes.length) return null;
    return (
      theme.colorSchemes.find(
        (scheme: { id: string }) => scheme.id === theme.activeColorSchemeId
      ) ?? theme.colorSchemes[0]!
    );
  }, [theme.colorSchemes, theme.activeColorSchemeId]);

  const resetSchemeAiState = useCallback((): void => {
    if (schemeAiAbortRef.current) {
      schemeAiAbortRef.current.abort();
      schemeAiAbortRef.current = null;
    }
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

  const startEditScheme = useCallback(
    (schemeId: string): void => {
      const scheme = theme.colorSchemes.find((item: { id: string }) => item.id === schemeId);
      if (!scheme) return;
      setEditingSchemeId(schemeId);
      setNewSchemeName(scheme.name);
      setNewSchemeColors({ ...scheme.colors });
      setSchemeView('edit');
      resetSchemeAiState();
    },
    [theme.colorSchemes, resetSchemeAiState]
  );

  const handleSaveScheme = useCallback((): void => {
    const trimmed = newSchemeName.trim();
    const currentName = editingSchemeId
      ? theme.colorSchemes.find((scheme: { id: string }) => scheme.id === editingSchemeId)?.name
      : undefined;
    const schemeName = (trimmed || currentName || `Scheme ${theme.colorSchemes.length + 1}`) ?? '';

    if (editingSchemeId) {
      setTheme((prev: ThemeSettings) => ({
        ...prev,
        colorSchemes: prev.colorSchemes.map((scheme: ColorScheme) =>
          scheme.id === editingSchemeId
            ? { ...scheme, name: schemeName, colors: { ...newSchemeColors } }
            : scheme
        ),
        activeColorSchemeId: editingSchemeId,
      }));
    } else {
      const id = `custom-${Date.now().toString(36)}`;
      setTheme((prev: ThemeSettings) => ({
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

  const updateSchemeColor = useCallback(
    (key: keyof ColorSchemeColors): ((value: string) => void) => {
      return (value: string): void => {
        setNewSchemeColors(
          (prev: ColorSchemeColors): ColorSchemeColors => ({
            ...prev,
            [key]: value,
          })
        );
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
    return `${resolved}

Theme context:
${schemeContext}`;
  }, [schemeAiPrompt, schemeContext]);

  const parseSchemeFromText = useCallback(
    (text: string): { name?: string | undefined; colors: Partial<ColorSchemeColors> } | null => {
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
          const regex = new RegExp(
            `${label}\\s*[:=]\\s*["']?([^"'
]+)`,
            'i'
          );
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
    },
    []
  );

  const schemeAiPreview = useMemo(
    () => (schemeAiOutput ? parseSchemeFromText(schemeAiOutput) : null),
    [schemeAiOutput, parseSchemeFromText]
  );

  const applySchemeFromAi = useCallback(
    (parsed: { name?: string | undefined; colors: Partial<ColorSchemeColors> }): void => {
      setNewSchemeColors((prev: ColorSchemeColors): ColorSchemeColors => {
        const next = { ...prev };
        (Object.keys(DEFAULT_SCHEME_COLORS) as Array<keyof ColorSchemeColors>).forEach(
          (key: keyof ColorSchemeColors) => {
            const value = parsed.colors[key];
            if (typeof value === 'string' && value.trim().length) {
              next[key] = value.trim();
            }
          }
        );
        return next;
      });
      if (parsed.name) {
        setNewSchemeName((prev: string): string =>
          prev.trim().length ? prev : (parsed.name ?? prev)
        );
      }
    },
    []
  );

  const generateSchemeMutation = createMutationV2({
    mutationKey: QUERY_KEYS.cms.mutation('page-builder.generate-scheme-ai'),
    mutationFn: async (payload: {
      provider: 'model' | 'agent';
      modelId: string;
      agentId: string;
      messages: ChatMessage[];
    }): Promise<string> => {
      const controller = new AbortController();
      schemeAiAbortRef.current = controller;

      const res = await fetch('/api/cms/css-ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(payload),
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
        const responsePayload = JSON.parse(dataLine.replace(/^data:\s*/, '')) as {
          delta?: string;
          done?: boolean;
          error?: string;
        };
        if (responsePayload.error) {
          throw new Error(responsePayload.error);
        }
        if (responsePayload.delta) {
          accumulated += responsePayload.delta;
          setSchemeAiOutput(accumulated);
        }
        if (responsePayload.done) {
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

      schemeAiAbortRef.current = null;
      return accumulated;
    },
    meta: {
      source: 'cms.page-builder.theme-colors.generate-scheme-ai',
      operation: 'action',
      resource: 'cms.page-builder.ai.theme-colors',
      domain: 'global',
      tags: ['cms', 'page-builder', 'theme', 'ai'],
    },
  });
  const schemeAiLoading = generateSchemeMutation.isPending;

  const handleGenerateScheme = useCallback(async (): Promise<void> => {
    if (generateSchemeMutation.isPending) return;
    setSchemeAiError(null);
    setSchemeAiOutput('');
    try {
      const prompt = buildSchemeAiPrompt();
      if (!prompt.trim()) {
        throw new Error('Prompt is empty.');
      }

      const sessionId = `color-ai-${Date.now()}`;
      const now = new Date().toISOString();

      const messages: ChatMessage[] = [
        {
          id: `sys-${Date.now()}`,
          sessionId,
          timestamp: now,
          role: 'system',
          content:
            'You are a UI color assistant. Return only a JSON object: {"name":"...","colors":{"background":"#...","surface":"#...","text":"#...","accent":"#...","border":"#..."}}. No markdown or explanations.',
        },
        {
          id: `user-${Date.now()}`,
          sessionId,
          timestamp: now,
          role: 'user',
          content: prompt,
        },
      ];
      const provider = brainAiProvider;
      const modelId = provider === 'model' ? brainAiModelId : '';
      const agentId = provider === 'agent' ? brainAiAgentId : '';
      if (provider === 'model' && !modelId) {
        throw new Error('Configure CMS CSS Stream in AI Brain first.');
      }
      if (provider === 'agent' && !agentId) {
        throw new Error('Configure a CMS CSS Stream agent in AI Brain first.');
      }

      const accumulated = await generateSchemeMutation.mutateAsync({
        provider,
        modelId,
        agentId,
        messages,
      });

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
      schemeAiAbortRef.current = null;
    }
  }, [
    generateSchemeMutation,
    buildSchemeAiPrompt,
    brainAiProvider,
    brainAiModelId,
    brainAiAgentId,
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

  const value = useMemo(
    (): ThemeColorsContextValue => ({
      schemeView,
      setSchemeView,
      editingSchemeId,
      setEditingSchemeId,
      activeScheme,
      startAddScheme,
      startEditScheme,
      handleSaveScheme,
      newSchemeName,
      setNewSchemeName,
      newSchemeColors,
      updateSchemeColor,
      isGlobalPaletteOpen,
      toggleGlobalPalette,
      schemeAiPrompt,
      setSchemeAiPrompt,
      schemeAiLoading,
      schemeAiError,
      schemeAiOutput,
      schemeAiPreview,
      brainAiProvider,
      brainAiModelId,
      brainAiAgentId,
      handleGenerateScheme,
      handleCancelSchemeAi,
    }),
    [
      schemeView,
      editingSchemeId,
      activeScheme,
      startAddScheme,
      startEditScheme,
      handleSaveScheme,
      newSchemeName,
      newSchemeColors,
      updateSchemeColor,
      isGlobalPaletteOpen,
      toggleGlobalPalette,
      schemeAiPrompt,
      schemeAiLoading,
      schemeAiError,
      schemeAiOutput,
      schemeAiPreview,
      brainAiProvider,
      brainAiModelId,
      brainAiAgentId,
      handleGenerateScheme,
      handleCancelSchemeAi,
    ]
  );

  return <ThemeColorsContext.Provider value={value}>{children}</ThemeColorsContext.Provider>;
}

export function useThemeColors(): ThemeColorsContextValue {
  const context = useContext(ThemeColorsContext);
  if (context === undefined) {
    throw new Error('useThemeColors must be used within a ThemeColorsProvider');
  }
  return context;
}
