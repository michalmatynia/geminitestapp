'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { useToast } from '@/shared/ui';
import { ApiError } from '@/shared/lib/api-client';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { getSectionDefinition } from '../../section-registry';
import type { PageZone, SectionInstance } from '@/shared/contracts/cms';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import {
  usePageBuilderState,
  usePageBuilderDispatch,
} from '../../../../hooks/usePageBuilderContext';

export function usePageAiAssistant() {
  const state = usePageBuilderState();
  const dispatch = usePageBuilderDispatch();
  const page = state.currentPage;
  const { toast } = useToast();
  const brainAi = useBrainAssignment({
    capability: 'cms.css_stream',
  });

  const [pageAiPrompt, setPageAiPrompt] = useState<string>('');
  const [pageAiTask, setPageAiTask] = useState<'layout' | 'seo'>('layout');
  const [pageAiOutput, setPageAiOutput] = useState<string>('');
  const [pageAiError, setPageAiError] = useState<string | null>(null);
  const pageAiAbortRef = useRef<AbortController | null>(null);
  const pageAiProvider = brainAi.assignment.provider;
  const pageAiModelId = brainAi.assignment.modelId.trim();
  const pageAiAgentId = brainAi.assignment.agentId.trim();

  const pageContext = useMemo((): string => {
    if (!page) return '';
    const sectionsData = state.sections;
    const contextSections = (sectionsData || []).map((section: SectionInstance) => {
      return {
        id: String(section.id || ''),
        type: String(section.type || ''),
        zone: String(section.zone || ''),
        blockCount: Array.isArray(section.blocks) ? section.blocks.length : 0,
      };
    });
    const firstSlug = Array.isArray(page.slugs) ? page.slugs[0] : null;
    const slugValue =
      typeof firstSlug === 'string'
        ? firstSlug
        : firstSlug && typeof firstSlug === 'object' && 'slug' in firstSlug
          ? (firstSlug as { slug: string }).slug
          : '';

    return JSON.stringify({
      pageId: page.id,
      title: page.name,
      slug: slugValue,
      sections: contextSections,
    });
  }, [page, state.sections]);

  const extractPageAiJson = useCallback((text: string): unknown => {
    try {
      const match = /```json\n([\s\S]*?)\n```/.exec(text);
      const jsonText = match?.[1] ? match[1] : text;
      return JSON.parse(jsonText);
    } catch {
      return null;
    }
  }, []);

  const buildPageAiMessages = useCallback((): ChatMessage[] => {
    const sessionId = `page-ai-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const systemContent =
      pageAiTask === 'seo'
        ? 'You are a CMS SEO assistant. Return only valid JSON with concise SEO recommendations for this page. Do not use markdown or code fences.'
        : 'You are a CMS layout assistant. Return only valid JSON. The response must be an object with a "sections" array. Each section should use { "type": string, "zone": string, "settings"?: object }. Do not use markdown or code fences.';
    const userContent = [
      `Task: ${pageAiTask}`,
      pageAiPrompt.trim() ? `Prompt:\n${pageAiPrompt.trim()}` : 'Prompt:\nGenerate a useful result.',
      `Context:\n${pageContext}`,
    ].join('\n\n');

    return [
      {
        id: `sys-${Date.now()}`,
        sessionId,
        timestamp,
        role: 'system',
        content: systemContent,
      },
      {
        id: `user-${Date.now()}`,
        sessionId,
        timestamp,
        role: 'user',
        content: userContent,
      },
    ];
  }, [pageAiPrompt, pageAiTask, pageContext]);

  const generatePageAiMutation = createMutationV2<
    { accumulated: string; provider: 'model' | 'agent' },
    {
      messages: ChatMessage[];
    }
  >({
    mutationFn: async (variables) => {
      const { messages } = variables;
      const controller = new AbortController();
      pageAiAbortRef.current = controller;

      const response = await fetch('/api/cms/css-ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: pageAiProvider,
          modelId: pageAiModelId || undefined,
          agentId: pageAiAgentId || undefined,
          messages,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as Record<string, unknown> | null;
        throw new ApiError(
          String(error?.['message'] || error?.['error'] || 'Failed to generate AI output'),
          response.status
        );
      }

      if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        if (!reader) throw new ApiError('Failed to read stream', 500);

        let accumulated = '';
        const decoder = new TextDecoder();
        let buffer = '';
        let doneSignal = false;

        const processEvent = (raw: string): void => {
          const lines = raw.split('\n').map((line: string) => line.trim());
          const dataLine = lines.find((line: string) => line.startsWith('data:'));
          if (!dataLine) return;
          const payload = JSON.parse(dataLine.replace(/^data:\s*/, '')) as {
            delta?: string;
            done?: boolean;
            error?: string;
            brainApplied?: unknown;
          };
          if (payload.error) {
            throw new ApiError(payload.error, 400);
          }
          if (payload.delta) {
            accumulated += payload.delta;
            setPageAiOutput(accumulated);
          }
          if (payload.done) {
            doneSignal = true;
          }
        };

        while (!doneSignal) {
          const { done, value } = await reader.read();
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
        return { accumulated, provider: pageAiProvider };
      }

      const data = (await response.json()) as { output: string };
      setPageAiOutput(data.output);
      return { accumulated: data.output, provider: pageAiProvider };
    },
    mutationKey: QUERY_KEYS.cms.pages.all,
    meta: {
      source: 'cms.page-builder.ai-assistant',
      operation: 'action',
      resource: 'cms.pages.ai',
      domain: 'cms' as const,
      tags: ['cms', 'pages', 'ai'],
    },
  });

  const handleGeneratePageAi = useCallback(async (): Promise<void> => {
    if (!page) return;
    setPageAiError(null);
    setPageAiOutput('');
    if (pageAiProvider === 'model' && !pageAiModelId) {
      const message = 'Configure CMS CSS Stream in AI Brain first.';
      setPageAiError(message);
      toast(message, { variant: 'error' });
      return;
    }
    if (pageAiProvider === 'agent' && !pageAiAgentId) {
      const message = 'Configure a CMS CSS Stream agent in AI Brain first.';
      setPageAiError(message);
      toast(message, { variant: 'error' });
      return;
    }

    try {
      const { accumulated, provider } = await generatePageAiMutation.mutateAsync({
        messages: buildPageAiMessages(),
      });

      const parsed = extractPageAiJson(accumulated) as Record<string, unknown> | null;
      if (!parsed) throw new ApiError('AI response did not include JSON.', 400);
      setPageAiOutput(JSON.stringify(parsed, null, 2));
      toast(`AI output ready (${provider}).`, { variant: 'success' });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      logClientError(error, { context: { source: 'usePageAiAssistant', action: 'generate' } });
      const message = error instanceof Error ? error.message : 'Failed to generate AI output.';
      setPageAiError(message);
      toast(message, { variant: 'error' });
    } finally {
      pageAiAbortRef.current = null;
    }
  }, [
    page,
    pageAiProvider,
    pageAiModelId,
    pageAiAgentId,
    pageAiTask,
    pageAiPrompt,
    buildPageAiMessages,
    generatePageAiMutation,
    extractPageAiJson,
    pageAiProvider,
    pageAiModelId,
    pageAiAgentId,
    toast,
  ]);

  const handleApplyPageAi = useCallback((): void => {
    const rawParsed = extractPageAiJson(pageAiOutput);
    if (!rawParsed || typeof rawParsed !== 'object') {
      setPageAiError('Invalid AI output format. Expected an object.');
      return;
    }
    const parsed = rawParsed as { sections?: unknown[] };
    if (!Array.isArray(parsed.sections)) {
      setPageAiError('Invalid AI output format. Expected sections array.');
      return;
    }

    let inserted = 0;
    const sections = parsed.sections as Array<Record<string, unknown>>;
    sections.forEach((section) => {
      const type = typeof section['type'] === 'string' ? section['type'] : '';
      const definition = getSectionDefinition(type);
      if (definition) {
        dispatch({
          type: 'ADD_SECTION',
          sectionType: type,
          zone: (section['zone'] || 'template') as PageZone,
          initialSettings: section['settings'] as Record<string, unknown>,
        });
        inserted += 1;
      }
    });

    if (inserted === 0) {
      setPageAiError('No valid templates or section types matched.');
      return;
    }
    toast(`Inserted ${inserted} section${inserted === 1 ? '' : 's'}.`, { variant: 'success' });
  }, [pageAiOutput, extractPageAiJson, dispatch, toast]);

  const handleCancelPageAi = useCallback((): void => {
    pageAiAbortRef.current?.abort();
    pageAiAbortRef.current = null;
  }, []);

  return {
    pageAiProvider,
    pageAiModelId,
    pageAiAgentId,
    pageAiPrompt,
    setPageAiPrompt,
    pageAiTask,
    setPageAiTask,
    pageAiOutput,
    pageAiError,
    generatePageAiMutation,
    handleGeneratePageAi,
    handleApplyPageAi,
    handleCancelPageAi,
  };
}
