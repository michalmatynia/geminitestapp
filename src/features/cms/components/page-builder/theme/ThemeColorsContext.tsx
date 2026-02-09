'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';

import { useTeachingAgents } from '@/features/ai/agentcreator/teaching/hooks/useAgentTeaching';
import { AI_BRAIN_SETTINGS_KEY, parseBrainSettings, resolveBrainAssignment } from '@/features/ai/brain';
import { useChatbotModels } from '@/features/ai/chatbot/hooks/useChatbotQueries';
import type { ColorSchemeColors, ColorScheme, ThemeSettings } from '@/features/cms/types/theme-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { AgentTeachingAgentRecord } from '@/shared/types/agent-teaching';
import type { ChatMessage } from '@/shared/types/chatbot';
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
  schemeAiProvider: 'model' | 'agent';
  setSchemeAiProvider: (value: 'model' | 'agent') => void;
  schemeProviderOptions: Array<{ label: string; value: string }>;
  schemeAiModelId: string;
  setSchemeAiModelId: (value: string) => void;
  modelOptions: string[];
  schemeAiAgentId: string;
  setSchemeAiAgentId: (value: string) => void;
  agentOptions: Array<{ label: string; value: string }>;
  schemeAiPrompt: string;
  setSchemeAiPrompt: (value: string) => void;
  schemeAiLoading: boolean;
  schemeAiError: string | null;
  schemeAiOutput: string;
  schemeAiPreview: { name?: string | undefined; colors: Partial<ColorSchemeColors> } | null;
  handleGenerateScheme: () => Promise<void>;
  handleCancelSchemeAi: () => void;
}

const ThemeColorsContext = createContext<ThemeColorsContextValue | undefined>(undefined);

export function ThemeColorsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { theme, setTheme } = useThemeSettings();
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const brainSettingsRaw = settingsStore.get(AI_BRAIN_SETTINGS_KEY);
  const brainSettings = useMemo(() => parseBrainSettings(brainSettingsRaw), [brainSettingsRaw]);
  const settingsReady = !settingsStore.isLoading && !settingsStore.error;
  const brainAssignment = useMemo(() => resolveBrainAssignment(brainSettings, 'cms_builder'), [brainSettings]);
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

  const modelsQuery = useChatbotModels({ enabled: schemeView === 'edit' && schemeAiProvider === 'model' });
  const teachingAgentsQuery = useTeachingAgents({ enabled: schemeView === 'edit' && schemeAiProvider === 'agent' });
  
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
    return `${resolved}

Theme context:
${schemeContext}`;
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
            const regex = new RegExp(`${label}\\s*[:=]\\s*["']?([^"'
]+)`, 'i');
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

  const value = useMemo((): ThemeColorsContextValue => ({
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
    schemeAiProvider,
    setSchemeAiProvider,
    schemeProviderOptions,
    schemeAiModelId,
    setSchemeAiModelId,
    modelOptions,
    schemeAiAgentId,
    setSchemeAiAgentId,
    agentOptions,
    schemeAiPrompt,
    setSchemeAiPrompt,
    schemeAiLoading,
    schemeAiError,
    schemeAiOutput,
    schemeAiPreview,
    handleGenerateScheme,
    handleCancelSchemeAi,
  }), [
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
    schemeAiProvider,
    schemeProviderOptions,
    schemeAiModelId,
    modelOptions,
    schemeAiAgentId,
    agentOptions,
    schemeAiPrompt,
    schemeAiLoading,
    schemeAiError,
    schemeAiOutput,
    schemeAiPreview,
    handleGenerateScheme,
    handleCancelSchemeAi,
  ]);

  return (
    <ThemeColorsContext.Provider value={value}>
      {children}
    </ThemeColorsContext.Provider>
  );
}

export function useThemeColors(): ThemeColorsContextValue {
  const context = useContext(ThemeColorsContext);
  if (context === undefined) {
    throw new Error('useThemeColors must be used within a ThemeColorsProvider');
  }
  return context;
}
