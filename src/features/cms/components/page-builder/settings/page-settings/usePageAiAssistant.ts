'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useToast } from '@/shared/ui';
import { ApiError } from '@/shared/lib/api-client';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientError } from '@/features/observability';
import { getSectionDefinition } from '../../section-registry';
import type { PageZone, SectionInstance } from '@/shared/contracts/cms';
import { usePageBuilderState, usePageBuilderDispatch } from '../../../../hooks/usePageBuilderContext';

export function usePageAiAssistant() {
  const state = usePageBuilderState();
  const dispatch = usePageBuilderDispatch();
  const page = state.currentPage;
  const { toast } = useToast();
  
  const [pageAiProvider, setPageAiProvider] = useState<'model' | 'agent'>('model');
  const [pageAiModelId, setPageAiModelId] = useState<string>('');
  const [pageAiAgentId, setPageAiAgentId] = useState<string>('');
  const [pageAiPrompt, setPageAiPrompt] = useState<string>('');
  const [pageAiTask, setPageAiTask] = useState<'layout' | 'seo'>('layout');
  const [pageAiOutput, setPageAiOutput] = useState<string>('');
  const [pageAiError, setPageAiError] = useState<string | null>(null);
  const pageAiAbortRef = useRef<AbortController | null>(null);

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
    const slugValue = typeof firstSlug === 'string' ? firstSlug : (firstSlug && typeof firstSlug === 'object' && 'slug' in firstSlug ? (firstSlug as { slug: string }).slug : '');

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

  const generatePageAiMutation = createMutationV2<
    { accumulated: string; provider: string },
    { provider: 'model' | 'agent'; modelId?: string; agentId?: string; task: string; prompt: string; context: string }
  >({
    mutationFn: async (variables) => {
      const { provider, modelId, agentId, task, prompt, context } = variables;
      const endpoint = provider === 'model' 
        ? `/api/cms/pages/${page?.id}/ai/generate-layout`
        : `/api/cms/pages/${page?.id}/ai/agent-layout`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, agentId, task, prompt, context }),
        signal: pageAiAbortRef.current?.signal,
      });

      if (!response.ok) {
        const error = (await response.json()) as Record<string, unknown>;
        throw new ApiError(String(error['message'] || 'Failed to generate AI output'), response.status);
      }

      if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        if (!reader) throw new ApiError('Failed to read stream', 500);
        
        let accumulated = '';
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          accumulated += chunk;
          setPageAiOutput(accumulated);
        }
        return { accumulated, provider: modelId || agentId || 'ai' };
      }

      const data = (await response.json()) as { output: string };
      setPageAiOutput(data.output);
      return { accumulated: data.output, provider: modelId || agentId || 'ai' };
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
    pageAiAbortRef.current = new AbortController();

    try {
      const { accumulated, provider } = await generatePageAiMutation.mutateAsync({
        provider: pageAiProvider,
        modelId: pageAiModelId,
        agentId: pageAiAgentId,
        task: pageAiTask,
        prompt: pageAiPrompt,
        context: pageContext,
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
    pageContext,
    generatePageAiMutation,
    extractPageAiJson,
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
    pageAiProvider, setPageAiProvider,
    pageAiModelId, setPageAiModelId,
    pageAiAgentId, setPageAiAgentId,
    pageAiPrompt, setPageAiPrompt,
    pageAiTask, setPageAiTask,
    pageAiOutput,
    pageAiError,
    generatePageAiMutation,
    handleGeneratePageAi,
    handleApplyPageAi,
    handleCancelPageAi,
  };
}
