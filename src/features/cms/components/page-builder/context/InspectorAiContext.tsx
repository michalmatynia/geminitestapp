'use client';

import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react';

import { useTeachingAgents } from '@/features/ai/agentcreator/teaching/hooks/useAgentTeachingQueries';
import { useChatbotModels } from '@/features/ai/chatbot/hooks/useChatbotQueries';
import { logClientError } from '@/features/observability';
import { internalError } from '@/shared/errors/app-error';
import { ApiError } from '@/shared/lib/api-client';
import type { AgentTeachingAgentRecord } from '@/shared/contracts/agent-teaching';
import type { ChatMessage } from '@/shared/contracts/chatbot';
import { useToast } from '@/shared/ui';

import { usePageBuilder } from '../../hooks/usePageBuilderContext';
import { extractCssFromResponse, extractJsonFromResponse } from '../utils/ai-helpers';

import type { CustomCssAiConfig } from '../../../types/custom-css-ai';
import type { BlockInstance, SectionInstance } from '../../../types/page-builder';

// ---------------------------------------------------------------------------
// Context & Types
// ---------------------------------------------------------------------------

export interface InspectorAiContextValue {
  // CSS AI State
  cssAiLoading: boolean;
  cssAiError: string | null;
  cssAiOutput: string;
  cssAiAppend: boolean;
  setCssAiAppend: (val: boolean) => void;
  cssAiAutoApply: boolean;
  setCssAiAutoApply: (val: boolean) => void;
  
  // CSS AI Actions
  generateCss: () => Promise<void>;
  cancelCss: () => void;
  
  // Content AI State
  contentAiProvider: 'model' | 'agent';
  setContentAiProvider: (val: 'model' | 'agent') => void;
  contentAiModelId: string;
  setContentAiModelId: (val: string) => void;
  contentAiAgentId: string;
  setContentAiAgentId: (val: string) => void;
  contentAiPrompt: string;
  setContentAiPrompt: (val: string) => void;
  contentAiLoading: boolean;
  contentAiError: string | null;
  contentAiOutput: string;
  
  // Content AI Actions
  generateContent: () => Promise<void>;
  cancelContent: () => void;
  applyContent: () => void;
  
  // Context Preview
  contextPreviewOpen: boolean;
  setContextPreviewOpen: (val: boolean) => void;
  contextPreviewTab: 'page' | 'element';
  setContextPreviewTab: (val: 'page' | 'element') => void;
  contextPreviewFull: boolean;
  setContextPreviewFull: (val: boolean) => void;
  contextPreviewNonce: number;
  setContextPreviewNonce: React.Dispatch<React.SetStateAction<number>>;
  pageContextPreview: string;
  elementContextPreview: string;
  copyContext: (text: string) => Promise<void>;
  
  // Options
  modelOptions: string[];
  agentOptions: Array<{ label: string; value: string }>;
  providerOptions: Array<{ label: string; value: string }>;
  
  // Configuration & Data
  customCssValue: string;
  customCssAiConfig: CustomCssAiConfig;
  updateCustomCssAiConfig: (patch: Partial<CustomCssAiConfig>) => void;
  applyCss: (mode: 'append' | 'replace') => void;
  
  // Metadata
  contentAiAllowedKeys: string[];
  contentAiPlaceholder: string;
}

const InspectorAiContext = createContext<InspectorAiContextValue | null>(null);

export function useInspectorAi(): InspectorAiContextValue {
  const context = useContext(InspectorAiContext);
  if (!context) {
    throw internalError('useInspectorAi must be used within an InspectorAiProvider');
  }
  return context;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAGE_CONTEXT_LIMIT = 6000;
const ELEMENT_CONTEXT_LIMIT = 2500;

function stringifyContext(value: unknown, limit?: number | null): string {
  try {
    const json = JSON.stringify(value, null, 2);
    if (limit == null) return json;
    if (json.length <= limit) return json;
    return `${json.slice(0, limit)}\n...truncated...`;
  } catch {
    const fallback = (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') ? String(value) : '[complex value]';
    if (limit == null) return fallback;
    return fallback.length <= limit ? fallback : `${fallback.slice(0, limit)}...`;
  }
}

interface SerializedBlock {
  id: string;
  type: string;
  settings: Record<string, unknown>;
  blocks: SerializedBlock[];
}

function serializeBlock(block: BlockInstance): SerializedBlock {
  return {
    id: block.id,
    type: block.type,
    settings: (block.settings ?? {}),
    blocks: (block.blocks ?? []).map((b: BlockInstance) => serializeBlock(b)),
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface InspectorAiProviderProps {
  children: React.ReactNode;
  customCssValue: string;
  customCssAiConfig: CustomCssAiConfig;
  onUpdateCss: (css: string) => void;
  onUpdateSettings: (settings: Record<string, unknown>) => void;
  onUpdateCustomCssAiConfig: (patch: Partial<CustomCssAiConfig>) => void;
  contentAiAllowedKeys?: string[];
  aiQueriesEnabled?: boolean;
}

export function InspectorAiProvider({
  children,
  customCssValue,
  customCssAiConfig,
  onUpdateCss,
  onUpdateSettings,
  onUpdateCustomCssAiConfig,
  contentAiAllowedKeys = [],
  aiQueriesEnabled = false,
}: InspectorAiProviderProps): React.JSX.Element {
  const {
    state,
    selectedSection,
    selectedBlock,
    selectedColumn,
    selectedColumnParentSection,
    selectedParentSection,
    selectedParentColumn,
    selectedParentBlock,
  } = usePageBuilder();
  const { toast } = useToast();

  // --- State: CSS AI ---
  const [cssAiAppend, setCssAiAppend] = useState<boolean>(true);
  const [cssAiAutoApply, setCssAiAutoApply] = useState<boolean>(false);
  const [cssAiLoading, setCssAiLoading] = useState<boolean>(false);
  const [cssAiError, setCssAiError] = useState<string | null>(null);
  const [cssAiOutput, setCssAiOutput] = useState<string>('');
  const cssAiAbortRef = useRef<AbortController | null>(null);

  // --- State: Content AI ---
  const [contentAiProvider, setContentAiProvider] = useState<'model' | 'agent'>('model');
  const [contentAiModelId, setContentAiModelId] = useState<string>('');
  const [contentAiAgentId, setContentAiAgentId] = useState<string>('');
  const [contentAiPrompt, setContentAiPrompt] = useState<string>('');
  const [contentAiLoading, setContentAiLoading] = useState<boolean>(false);
  const [contentAiError, setContentAiError] = useState<string | null>(null);
  const [contentAiOutput, setContentAiOutput] = useState<string>('');
  const contentAiAbortRef = useRef<AbortController | null>(null);

  // --- State: Context Preview ---
  const [contextPreviewOpen, setContextPreviewOpen] = useState<boolean>(false);
  const [contextPreviewTab, setContextPreviewTab] = useState<'page' | 'element'>('page');
  const [contextPreviewFull, setContextPreviewFull] = useState<boolean>(false);
  const [contextPreviewNonce, setContextPreviewNonce] = useState<number>(0);

  // --- Data Loading ---
  const cssProvider = customCssAiConfig.provider ?? 'model';
  const modelsQuery = useChatbotModels({
    enabled: aiQueriesEnabled && (cssProvider === 'model' || contentAiProvider === 'model'),
  });
  const teachingAgentsQuery = useTeachingAgents({
    enabled: aiQueriesEnabled && (cssProvider === 'agent' || contentAiProvider === 'agent'),
  });

  const modelOptions = useMemo((): string[] => {
    // Defensive: query cache may contain malformed non-array payloads.
    const models = Array.isArray(modelsQuery.data) ? modelsQuery.data : [];
    const fromApi = models
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());
    return Array.from(new Set(fromApi));
  }, [modelsQuery.data]);

  const agentOptions = useMemo(
    (): Array<{ label: string; value: string }> => (teachingAgentsQuery.data ?? []).map((agent: AgentTeachingAgentRecord) => ({ label: agent.name, value: agent.id })),
    [teachingAgentsQuery.data]
  );

  const providerOptions = useMemo(
    (): Array<{ label: string; value: string }> => [
      { label: 'AI model', value: 'model' },
      { label: 'Deepthinking agent', value: 'agent' },
    ],
    []
  );

  // Initialize Content AI model default
  useEffect((): void => {
    if (contentAiProvider !== 'model') return;
    if (contentAiModelId.trim().length) return;
    if (!modelOptions.length) return;
    setContentAiModelId(modelOptions[0]!);
  }, [contentAiProvider, contentAiModelId, modelOptions]);

  // Cancel on unmount
  useEffect((): (() => void) => {
    return (): void => {
      cssAiAbortRef.current?.abort();
      contentAiAbortRef.current?.abort();
    };
  }, []);

  // --- Context Building ---

  const buildPageContext = useCallback((limit?: number | null): string => {
    const resolvedLimit = limit === undefined ? PAGE_CONTEXT_LIMIT : limit;
    if (!state?.currentPage) return 'No page loaded.';
    const pageContext = {
      page: {
        id: state.currentPage.id,
        name: state.currentPage.name,
        status: state.currentPage.status,
        themeId: state.currentPage.themeId,
        publishedAt: state.currentPage.publishedAt,
        slugs: state.currentPage.slugs ?? [],
      },
      sections: (state.sections ?? []).map((section: SectionInstance) => ({
        id: section.id,
        type: section.type,
        zone: section.zone,
        settings: section.settings ?? {},
        blocks: (section.blocks ?? []).map((b: BlockInstance) => serializeBlock(b)),
      })),
    };
    return stringifyContext(pageContext, resolvedLimit);
  }, [state]);

  const selectedGridRow = useMemo<BlockInstance | null>(() => {
    if (selectedParentSection?.type !== 'Grid' || !selectedParentColumn) return null;
    return (
      (selectedParentSection.blocks).find(
        (block: BlockInstance) =>
          block.type === 'Row' &&
          (block.blocks ?? []).some((column: BlockInstance) => (column).id === selectedParentColumn.id)
      ) ?? null
    );
  }, [selectedParentSection, selectedParentColumn]);

  const buildElementContext = useCallback((limit?: number | null): string => {
    const resolvedLimit = limit === undefined ? ELEMENT_CONTEXT_LIMIT : limit;
    if (selectedSection && !selectedBlock && !selectedColumn) {
      return stringifyContext(
        {
          kind: 'section',
          id: selectedSection.id,
          type: selectedSection.type,
          zone: selectedSection.zone,
          settings: selectedSection.settings ?? {},
          blocks: (selectedSection.blocks ?? []).map((b: BlockInstance) => serializeBlock(b)),
        },
        resolvedLimit
      );
    }
    if (selectedColumn) {
      return stringifyContext(
        {
          kind: 'column',
          id: selectedColumn.id,
          sectionId: selectedColumnParentSection?.id,
          rowId: selectedGridRow?.id,
          settings: selectedColumn.settings ?? {},
          blocks: (selectedColumn.blocks ?? []).map((b: BlockInstance) => serializeBlock(b)),
        },
        resolvedLimit
      );
    }
    if (selectedBlock) {
      return stringifyContext(
        {
          kind: selectedBlock.type === 'Row' ? 'row' : 'block',
          id: selectedBlock.id,
          type: selectedBlock.type,
          sectionId: selectedParentSection?.id,
          columnId: selectedParentColumn?.id,
          parentBlockId: selectedParentBlock?.id,
          settings: selectedBlock.settings ?? {},
          blocks: (selectedBlock.blocks ?? []).map((b: BlockInstance) => serializeBlock(b)),
        },
        resolvedLimit
      );
    }
    return 'No element selected.';
  }, [
    selectedSection,
    selectedBlock,
    selectedColumn,
    selectedParentSection,
    selectedParentColumn,
    selectedParentBlock,
    selectedColumnParentSection,
    selectedGridRow,
  ]);

  const pageContextPreview = useMemo((): string => {
    if (!contextPreviewOpen) return '';
     
    contextPreviewNonce; // subscription
    return buildPageContext(contextPreviewFull ? null : undefined);
  }, [contextPreviewOpen, contextPreviewFull, contextPreviewNonce, buildPageContext]);

  const elementContextPreview = useMemo((): string => {
    if (!contextPreviewOpen) return '';
     
    contextPreviewNonce; // subscription
    return buildElementContext(contextPreviewFull ? null : undefined);
  }, [contextPreviewOpen, contextPreviewFull, contextPreviewNonce, buildElementContext]);

  const copyContext = useCallback(
    async (value: string): Promise<void> => {
      try {
        await navigator.clipboard.writeText(value);
        toast('Context copied.', { variant: 'success' });
      } catch (error) {
        toast('Failed to copy context.', { variant: 'error' });
        logClientError(error as Error, { context: { source: 'InspectorAiContext', action: 'copyContext' } });
      }
    },
    [toast]
  );

  // --- CSS AI Generation ---

  const buildCssAiPrompt = useCallback((): string => {
    const basePrompt = (customCssAiConfig.prompt ?? '').trim();
    const pageContext = buildPageContext();
    const elementContext = buildElementContext();
    const defaultPrompt =
      'Generate a CSS snippet for the selected element. Return only CSS without explanations.';
    const promptBody = basePrompt.length > 0 ? basePrompt : defaultPrompt;
    const hasPagePlaceholder = /{{\s*page_context\s*}}/i.test(promptBody);
    const hasElementPlaceholder = /{{\s*element_context\s*}}/i.test(promptBody);
    const resolved = promptBody
      .replace(/{{\s*page_context\s*}}/gi, pageContext)
      .replace(/{{\s*element_context\s*}}/gi, elementContext);
    if (hasPagePlaceholder || hasElementPlaceholder) {
      return resolved;
    }
    return `${resolved}\n\nPage context:\n${pageContext}\n\nElement context:\n${elementContext}`;
  }, [customCssAiConfig.prompt, buildPageContext, buildElementContext]);

  const generateCss = useCallback(async (): Promise<void> => {
    if (cssAiLoading) return;
    setCssAiError(null);
    setCssAiLoading(true);
    setCssAiOutput('');
    try {
      const prompt = buildCssAiPrompt();
      if (!prompt.trim()) {
        throw new ApiError('Prompt is empty.', 400);
      }

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: 'You are a CSS assistant. Return only valid CSS without code fences or explanations.',
        },
        { role: 'user', content: prompt },
      ];

      const controller = new AbortController();
      cssAiAbortRef.current = controller;

      const provider = customCssAiConfig.provider ?? 'model';
      const modelId = (customCssAiConfig.modelId ?? '').trim() || modelOptions[0] || '';
      const agentId = (customCssAiConfig.agentId ?? '').trim();
      if (provider === 'model' && !modelId) {
        throw new ApiError('Select an AI model first.', 400);
      }
      if (provider === 'agent' && !agentId) {
        throw new ApiError('Select a Deepthinking agent first.', 400);
      }

      const res = await fetch('/api/cms/css-ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ provider, modelId, agentId, messages }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(data?.error || 'Streaming request failed.', res.status);
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
          throw new ApiError(payload.error, 400);
        }
        if (payload.delta) {
          accumulated += payload.delta;
          setCssAiOutput(accumulated);
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

      const finalCss = extractCssFromResponse(accumulated);
      if (!finalCss) throw new ApiError('No CSS returned.', 400);
      setCssAiOutput(finalCss);
      if (cssAiAutoApply) {
        const nextCss = cssAiAppend
          ? [customCssValue.trim(), finalCss].filter(Boolean).join('\n\n')
          : finalCss;
        onUpdateCss(nextCss);
        toast(`CSS generated and applied (${provider}).`, { variant: 'success' });
      } else {
        toast(`CSS generated from ${provider}.`, { variant: 'success' });
      }
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        setCssAiError('Generation cancelled.');
        toast('Generation cancelled.', { variant: 'info' });
      } else {
        const message = error instanceof Error ? error.message : 'Failed to generate CSS.';
        setCssAiError(message);
        toast(message, { variant: 'error' });
      }
    } finally {
      setCssAiLoading(false);
      cssAiAbortRef.current = null;
    }
  }, [
    cssAiLoading,
    buildCssAiPrompt,
    customCssAiConfig.provider,
    customCssAiConfig.agentId,
    customCssAiConfig.modelId,
    modelOptions,
    cssAiAutoApply,
    cssAiAppend,
    customCssValue,
    onUpdateCss,
    toast,
  ]);

  const cancelCss = useCallback((): void => {
    if (cssAiAbortRef.current) {
      cssAiAbortRef.current.abort();
      cssAiAbortRef.current = null;
    }
  }, []);

  // --- Content AI Generation ---

  const contentAiPlaceholder = '{{page_context}}\n{{element_context}}\n{{allowed_keys}}';

  const buildContentAiPrompt = useCallback((): string => {
    const basePrompt = contentAiPrompt.trim();
    const defaultPrompt = 'Generate JSON settings for the selected element. Return only JSON.';
    const promptBody = basePrompt.length ? basePrompt : defaultPrompt;
    const pageContext = buildPageContext();
    const elementContext = buildElementContext();
    const allowedKeys = contentAiAllowedKeys.length
      ? contentAiAllowedKeys.join(', ')
      : 'No schema keys available.';
    const withPlaceholders = promptBody
      .replace(/{{\s*page_context\s*}}/gi, pageContext)
      .replace(/{{\s*element_context\s*}}/gi, elementContext)
      .replace(/{{\s*allowed_keys\s*}}/gi, allowedKeys);
    const usesPlaceholders =
      /{{\s*page_context\s*}}/i.test(promptBody) ||
      /{{\s*element_context\s*}}/i.test(promptBody) ||
      /{{\s*allowed_keys\s*}}/i.test(promptBody);
    if (usesPlaceholders) return withPlaceholders;
    return `${withPlaceholders}\n\nAllowed keys:\n${allowedKeys}\n\nPage context:\n${pageContext}\n\nElement context:\n${elementContext}`;
  }, [contentAiPrompt, buildPageContext, buildElementContext, contentAiAllowedKeys]);

  const applyContentAiSettings = useCallback(
    (settingsPatch: Record<string, unknown>): void => {
      const allowed = new Set(contentAiAllowedKeys);
      const filtered =
        allowed.size > 0
          ? Object.entries(settingsPatch).reduce<Record<string, unknown>>((acc: Record<string, unknown>, [key, value]: [string, unknown]) => {
            if (allowed.has(key)) acc[key] = value;
            return acc;
          }, {})
          : settingsPatch;
      const entries = Object.entries(filtered);
      if (entries.length === 0) {
        setContentAiError('No valid settings keys found in AI output.');
        return;
      }
      onUpdateSettings(filtered);
      toast('AI settings applied.', { variant: 'success' });
    },
    [contentAiAllowedKeys, onUpdateSettings, toast]
  );

  const generateContent = useCallback(async (): Promise<void> => {
    if (contentAiLoading) return;
    setContentAiError(null);
    setContentAiOutput('');
    setContentAiLoading(true);
    try {
      const prompt = buildContentAiPrompt();
      if (!prompt.trim()) {
        throw new ApiError('Prompt is empty.', 400);
      }

      const provider = contentAiProvider;
      const modelId = provider === 'model' ? (contentAiModelId.trim() || modelOptions[0] || '') : '';
      const agentId = provider === 'agent' ? contentAiAgentId.trim() : '';
      if (provider === 'model' && !modelId) {
        throw new ApiError('Select an AI model first.', 400);
      }
      if (provider === 'agent' && !agentId) {
        throw new ApiError('Select a Deepthinking agent first.', 400);
      }

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content:
            'You are a CMS content assistant. Return only JSON. If updating settings, output an object of key/value pairs matching allowed keys.',
        },
        { role: 'user', content: prompt },
      ];

      const controller = new AbortController();
      contentAiAbortRef.current = controller;

      const res = await fetch('/api/cms/css-ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ provider, modelId, agentId, messages }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(data?.error || 'Streaming request failed.', res.status);
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
          throw new ApiError(payload.error, 400);
        }
        if (payload.delta) {
          accumulated += payload.delta;
          setContentAiOutput(accumulated);
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

      const parsed = extractJsonFromResponse(accumulated);
      if (!parsed) throw new ApiError('AI response did not include JSON.', 400);
      setContentAiOutput(JSON.stringify(parsed, null, 2));
      toast(`AI output ready (${provider}).`, { variant: 'success' });
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        setContentAiError('Generation cancelled.');
        toast('Generation cancelled.', { variant: 'info' });
      } else {
        const message = error instanceof Error ? error.message : 'Failed to generate AI output.';
        setContentAiError(message);
        toast(message, { variant: 'error' });
      }
    } finally {
      setContentAiLoading(false);
      contentAiAbortRef.current = null;
    }
  }, [
    contentAiLoading,
    buildContentAiPrompt,
    contentAiProvider,
    contentAiModelId,
    contentAiAgentId,
    modelOptions,
    toast,
  ]);

  const cancelContent = useCallback((): void => {
    if (contentAiAbortRef.current) {
      contentAiAbortRef.current.abort();
      contentAiAbortRef.current = null;
    }
  }, []);

  const applyContent = useCallback((): void => {
    if (!contentAiOutput.trim()) {
      setContentAiError('No AI output to apply.');
      return;
    }
    const parsed = extractJsonFromResponse(contentAiOutput);
    if (!parsed) {
      setContentAiError('AI output is not valid JSON.');
      return;
    }
    const settingsSource =
      typeof parsed['settings'] === 'object' && parsed['settings']
        ? (parsed['settings'] as Record<string, unknown>)
        : parsed;
    applyContentAiSettings(settingsSource);
  }, [contentAiOutput, applyContentAiSettings]);

  const applyCss = useCallback(
    (mode: 'append' | 'replace'): void => {
      if (!cssAiOutput) return;
      const nextCss =
        mode === 'append'
          ? [customCssValue.trim(), cssAiOutput].filter(Boolean).join('\n\n')
          : cssAiOutput;
      onUpdateCss(nextCss);
      toast(mode === 'append' ? 'CSS appended.' : 'CSS replaced.', { variant: 'success' });
    },
    [cssAiOutput, customCssValue, onUpdateCss, toast]
  );

  const value = {
    cssAiLoading,
    cssAiError,
    cssAiOutput,
    cssAiAppend,
    setCssAiAppend,
    cssAiAutoApply,
    setCssAiAutoApply,
    generateCss,
    cancelCss,
    
    contentAiProvider,
    setContentAiProvider,
    contentAiModelId,
    setContentAiModelId,
    contentAiAgentId,
    setContentAiAgentId,
    contentAiPrompt,
    setContentAiPrompt,
    contentAiLoading,
    contentAiError,
    contentAiOutput,
    generateContent,
    cancelContent,
    applyContent,
    
    contextPreviewOpen,
    setContextPreviewOpen,
    contextPreviewTab,
    setContextPreviewTab,
    contextPreviewFull,
    setContextPreviewFull,
    contextPreviewNonce,
    setContextPreviewNonce,
    pageContextPreview,
    elementContextPreview,
    copyContext,
    
    modelOptions,
    agentOptions,
    providerOptions,
    
    customCssValue,
    customCssAiConfig,
    updateCustomCssAiConfig: onUpdateCustomCssAiConfig,
    applyCss,
    
    contentAiAllowedKeys,
    contentAiPlaceholder,
  };

  return <InspectorAiContext.Provider value={value}>{children}</InspectorAiContext.Provider>;
}
