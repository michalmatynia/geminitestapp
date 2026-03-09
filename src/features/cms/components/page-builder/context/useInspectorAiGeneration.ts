import { useCallback, useEffect, useRef, useState } from 'react';

import { useOptionalContextRegistryPageEnvelope } from '@/features/ai/ai-context-registry/context/page-context';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { ChatMessage } from '@/shared/contracts/chatbot';
import type { CustomCssAiConfig } from '@/shared/contracts/cms';
import { ApiError } from '@/shared/lib/api-client';

import {
  extractCssFromResponse,
  extractJsonFromResponse,
} from '@/features/cms/components/page-builder/utils/ai-helpers';

interface InspectorAiToastOptions {
  variant: 'success' | 'error' | 'info';
}

type InspectorAiToast = (message: string, options: InspectorAiToastOptions) => void;

interface UseInspectorAiGenerationArgs {
  brainAiProvider: 'model' | 'agent';
  brainAiModelId: string;
  brainAiAgentId: string;
  buildPageContext: (limit?: number | null) => string;
  buildElementContext: (limit?: number | null) => string;
  contentAiAllowedKeys: string[];
  customCssAiConfig: CustomCssAiConfig;
  customCssValue: string;
  onUpdateCss: (css: string) => void;
  onUpdateSettings: (settings: Record<string, unknown>) => void;
  toast: InspectorAiToast;
}

interface UseInspectorAiGenerationResult {
  cssAiAppend: boolean;
  setCssAiAppend: (value: boolean) => void;
  cssAiAutoApply: boolean;
  setCssAiAutoApply: (value: boolean) => void;
  cssAiLoading: boolean;
  cssAiError: string | null;
  cssAiOutput: string;
  contentAiPrompt: string;
  setContentAiPrompt: (value: string) => void;
  contentAiLoading: boolean;
  contentAiError: string | null;
  contentAiOutput: string;
  contentAiPlaceholder: string;
  generateCss: () => Promise<void>;
  cancelCss: () => void;
  generateContent: () => Promise<void>;
  cancelContent: () => void;
  applyContent: () => void;
  applyCss: (mode: 'append' | 'replace') => void;
}

interface StreamInspectorAiResponseArgs {
  provider: 'model' | 'agent';
  modelId: string;
  agentId: string;
  prompt: string;
  sessionPrefix: string;
  systemPrompt: string;
  signal: AbortSignal;
  onDelta: (value: string) => void;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}

const CMS_STREAM_ENDPOINT = '/api/cms/css-ai/stream';
const CONTENT_AI_PLACEHOLDER = '{{page_context}}\n{{element_context}}\n{{allowed_keys}}';

function getConfiguredTarget(
  provider: 'model' | 'agent',
  modelId: string,
  agentId: string
): { provider: 'model' | 'agent'; modelId: string; agentId: string } {
  if (provider === 'model' && !modelId) {
    throw new ApiError('Configure CMS CSS Stream in AI Brain first.', 400);
  }
  if (provider === 'agent' && !agentId) {
    throw new ApiError('Configure a CMS CSS Stream agent in AI Brain first.', 400);
  }
  return {
    provider,
    modelId: provider === 'model' ? modelId : '',
    agentId: provider === 'agent' ? agentId : '',
  };
}

async function streamInspectorAiResponse({
  provider,
  modelId,
  agentId,
  prompt,
  sessionPrefix,
  systemPrompt,
  signal,
  onDelta,
  contextRegistry,
}: StreamInspectorAiResponseArgs): Promise<string> {
  const timestamp = new Date().toISOString();
  const sessionId = `${sessionPrefix}-${Date.now()}`;
  const messages: ChatMessage[] = [
    {
      id: `sys-${Date.now()}`,
      sessionId,
      timestamp,
      role: 'system',
      content: systemPrompt,
    },
    {
      id: `user-${Date.now()}`,
      sessionId,
      timestamp,
      role: 'user',
      content: prompt,
    },
  ];

  const response = await fetch(CMS_STREAM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ provider, modelId, agentId, messages, contextRegistry }),
  });

  if (!response.ok || !response.body) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(data?.error || 'Streaming request failed.', response.status);
  }

  const reader = response.body.getReader();
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
      onDelta(accumulated);
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

  return accumulated;
}

export function useInspectorAiGeneration({
  brainAiProvider,
  brainAiModelId,
  brainAiAgentId,
  buildPageContext,
  buildElementContext,
  contentAiAllowedKeys,
  customCssAiConfig,
  customCssValue,
  onUpdateCss,
  onUpdateSettings,
  toast,
}: UseInspectorAiGenerationArgs): UseInspectorAiGenerationResult {
  const contextRegistry = useOptionalContextRegistryPageEnvelope();
  const [cssAiAppend, setCssAiAppend] = useState(true);
  const [cssAiAutoApply, setCssAiAutoApply] = useState(false);
  const [cssAiLoading, setCssAiLoading] = useState(false);
  const [cssAiError, setCssAiError] = useState<string | null>(null);
  const [cssAiOutput, setCssAiOutput] = useState('');
  const cssAiAbortRef = useRef<AbortController | null>(null);

  const [contentAiPrompt, setContentAiPrompt] = useState('');
  const [contentAiLoading, setContentAiLoading] = useState(false);
  const [contentAiError, setContentAiError] = useState<string | null>(null);
  const [contentAiOutput, setContentAiOutput] = useState('');
  const contentAiAbortRef = useRef<AbortController | null>(null);

  useEffect((): (() => void) => {
    return (): void => {
      cssAiAbortRef.current?.abort();
      contentAiAbortRef.current?.abort();
    };
  }, []);

  const buildCssAiPrompt = useCallback((): string => {
    const pageContext = buildPageContext();
    const elementContext = buildElementContext();
    const defaultPrompt =
      'Generate a CSS snippet for the selected element. Return only CSS without explanations.';
    const promptBody = (customCssAiConfig.prompt ?? '').trim() || defaultPrompt;
    const hasPagePlaceholder = /{{\s*page_context\s*}}/i.test(promptBody);
    const hasElementPlaceholder = /{{\s*element_context\s*}}/i.test(promptBody);
    const resolved = promptBody
      .replace(/{{\s*page_context\s*}}/gi, pageContext)
      .replace(/{{\s*element_context\s*}}/gi, elementContext);
    if (hasPagePlaceholder || hasElementPlaceholder) {
      return resolved;
    }
    return `${resolved}\n\nPage context:\n${pageContext}\n\nElement context:\n${elementContext}`;
  }, [buildElementContext, buildPageContext, customCssAiConfig.prompt]);

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

      const controller = new AbortController();
      cssAiAbortRef.current = controller;
      const target = getConfiguredTarget(brainAiProvider, brainAiModelId, brainAiAgentId);
      const response = await streamInspectorAiResponse({
        ...target,
        prompt,
        sessionPrefix: 'css-ai',
        signal: controller.signal,
        systemPrompt:
          'You are a CSS assistant. Return only valid CSS without code fences or explanations.',
        onDelta: setCssAiOutput,
        contextRegistry,
      });
      const finalCss = extractCssFromResponse(response);
      if (!finalCss) {
        throw new ApiError('No CSS returned.', 400);
      }
      setCssAiOutput(finalCss);
      if (cssAiAutoApply) {
        const nextCss = cssAiAppend
          ? [customCssValue.trim(), finalCss].filter(Boolean).join('\n\n')
          : finalCss;
        onUpdateCss(nextCss);
        toast(`CSS generated and applied (${target.provider}).`, { variant: 'success' });
      } else {
        toast(`CSS generated from ${target.provider}.`, { variant: 'success' });
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
    brainAiAgentId,
    brainAiModelId,
    brainAiProvider,
    buildCssAiPrompt,
    cssAiAppend,
    cssAiAutoApply,
    cssAiLoading,
    customCssValue,
    contextRegistry,
    onUpdateCss,
    toast,
  ]);

  const cancelCss = useCallback((): void => {
    cssAiAbortRef.current?.abort();
    cssAiAbortRef.current = null;
  }, []);

  const buildContentAiPrompt = useCallback((): string => {
    const promptBody =
      contentAiPrompt.trim() ||
      'Generate JSON settings for the selected element. Return only JSON.';
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
    if (usesPlaceholders) {
      return withPlaceholders;
    }
    return `${withPlaceholders}\n\nAllowed keys:\n${allowedKeys}\n\nPage context:\n${pageContext}\n\nElement context:\n${elementContext}`;
  }, [buildElementContext, buildPageContext, contentAiAllowedKeys, contentAiPrompt]);

  const applyContentAiSettings = useCallback(
    (settingsPatch: Record<string, unknown>): void => {
      const allowed = new Set(contentAiAllowedKeys);
      const filtered =
        allowed.size > 0
          ? Object.entries(settingsPatch).reduce<Record<string, unknown>>(
            (accumulator: Record<string, unknown>, [key, value]: [string, unknown]) => {
              if (allowed.has(key)) {
                accumulator[key] = value;
              }
              return accumulator;
            },
            {}
          )
          : settingsPatch;
      if (Object.keys(filtered).length === 0) {
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

      const controller = new AbortController();
      contentAiAbortRef.current = controller;
      const target = getConfiguredTarget(brainAiProvider, brainAiModelId, brainAiAgentId);
      const response = await streamInspectorAiResponse({
        ...target,
        prompt,
        sessionPrefix: 'content-ai',
        signal: controller.signal,
        systemPrompt:
          'You are a CMS content assistant. Return only JSON. If updating settings, output an object of key/value pairs matching allowed keys.',
        onDelta: setContentAiOutput,
        contextRegistry,
      });
      const parsed = extractJsonFromResponse(response);
      if (!parsed) {
        throw new ApiError('AI response did not include JSON.', 400);
      }
      setContentAiOutput(JSON.stringify(parsed, null, 2));
      toast(`AI output ready (${target.provider}).`, { variant: 'success' });
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
    brainAiAgentId,
    brainAiModelId,
    brainAiProvider,
    buildContentAiPrompt,
    contentAiLoading,
    contextRegistry,
    toast,
  ]);

  const cancelContent = useCallback((): void => {
    contentAiAbortRef.current?.abort();
    contentAiAbortRef.current = null;
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
  }, [applyContentAiSettings, contentAiOutput]);

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

  return {
    cssAiAppend,
    setCssAiAppend,
    cssAiAutoApply,
    setCssAiAutoApply,
    cssAiLoading,
    cssAiError,
    cssAiOutput,
    contentAiPrompt,
    setContentAiPrompt,
    contentAiLoading,
    contentAiError,
    contentAiOutput,
    contentAiPlaceholder: CONTENT_AI_PLACEHOLDER,
    generateCss,
    cancelCss,
    generateContent,
    cancelContent,
    applyContent,
    applyCss,
  };
}
