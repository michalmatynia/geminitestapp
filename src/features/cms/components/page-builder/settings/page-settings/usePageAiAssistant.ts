/* eslint-disable */
// @ts-nocheck
'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/ui';
import { ApiError } from '@/shared/lib/api-client';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { ChatMessage } from '@/shared/contracts/chatbot';
import { logClientError } from '@/features/observability';
import { SECTION_TEMPLATES } from '../../section-templates';
import { getSectionDefinition } from '../../section-registry';
import type { SectionInstance, PageZone } from '../../../types/page-builder';
import { usePageBuilder } from '../../../../hooks/usePageBuilderContext';

export function usePageAiAssistant() {
  const { state, dispatch } = usePageBuilder();
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
    if (!page) return 'No page loaded.';
    return JSON.stringify(
      {
        page: {
          id: page.id,
          name: page.name,
          status: page.status,
          slugs: page.slugs ?? [],
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          seoCanonical: page.seoCanonical,
          seoOgImage: page.seoOgImage,
          robotsMeta: page.robotsMeta,
        },
        sections: state.sections.map((section: SectionInstance) => ({
          id: section.id,
          type: section.type,
          zone: section.zone,
        })),
      },
      null,
      2
    );
  }, [page, state.sections]);

  const templateCatalog = useMemo(
    () =>
      SECTION_TEMPLATES.map(
        (template: (typeof SECTION_TEMPLATES)[number]) =>
          `- ${template.name} (${template.category}): ${template.description}`
      ).join('\n'),
    []
  );

  const extractPageAiJson = useCallback((raw: string): Record<string, unknown> | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenceMatch?.[1]?.trim() ?? trimmed;
    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    const jsonText = first >= 0 && last > first ? candidate.slice(first, last + 1) : candidate;
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }, []);

  const buildPageAiPrompt = useCallback((): string => {
    const basePrompt = pageAiPrompt.trim();
    const defaultPrompt =
      pageAiTask === 'seo'
        ? 'Generate SEO metadata for this page. Return JSON with seoTitle, seoDescription, seoCanonical, seoOgImage, robotsMeta.'
        : 'Create a layout plan using available templates. Return JSON with a sections array using template names.';
    const promptBody = basePrompt.length ? basePrompt : defaultPrompt;
    const resolved = promptBody
      .replace(/{{\s*page_context\s*}}/gi, pageContext)
      .replace(/{{\s*available_templates\s*}}/gi, templateCatalog);
    const usesPlaceholders =
      /{{\s*page_context\s*}}/i.test(promptBody) ||
      /{{\s*available_templates\s*}}/i.test(promptBody);
    if (usesPlaceholders) return resolved;
    return `${resolved}\n\nPage context:\n${pageContext}\n\nAvailable templates:\n${templateCatalog}`;
  }, [pageAiPrompt, pageAiTask, pageContext, templateCatalog]);

  const generatePageAiMutation = createMutationV2({
    mutationKey: QUERY_KEYS.cms.mutation('page-builder.generate-page-ai'),
    mutationFn: async (payload: {
      provider: 'model' | 'agent';
      modelId: string;
      agentId: string;
      messages: ChatMessage[];
    }): Promise<string> => {
      const controller = new AbortController();
      pageAiAbortRef.current = controller;

      const res = await fetch('/api/cms/css-ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(payload),
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
        const responsePayload = JSON.parse(dataLine.replace(/^data:\s*/, '')) as {
          delta?: string;
          done?: boolean;
          error?: string;
        };
        if (responsePayload.error) {
          throw new ApiError(responsePayload.error, 400);
        }
        if (responsePayload.delta) {
          accumulated += responsePayload.delta;
          setPageAiOutput(accumulated);
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

      pageAiAbortRef.current = null;
      return accumulated;
    },
    meta: {
      source: 'cms.page-builder.page-settings.generate-page-ai',
      operation: 'action',
      resource: 'cms.page-builder.ai.page',
      domain: 'global',
      tags: ['cms', 'page-builder', 'ai'],
    },
  });

  const handleGeneratePageAi = useCallback(async (modelOptions: string[]): Promise<void> => {
    if (generatePageAiMutation.isPending) return;
    setPageAiError(null);
    setPageAiOutput('');
    try {
      const prompt = buildPageAiPrompt();
      if (!prompt.trim()) throw new ApiError('Prompt is empty.', 400);

      const provider = pageAiProvider;
      const modelId = provider === 'model' ? (pageAiModelId.trim() || modelOptions[0] || '') : '';
      const agentId = provider === 'agent' ? pageAiAgentId.trim() : '';
      if (provider === 'model' && !modelId) throw new ApiError('Select an AI model first.', 400);
      if (provider === 'agent' && !agentId) throw new ApiError('Select a Deepthinking agent first.', 400);

      const sessionId = `page-ai-${Date.now()}`;
      const now = new Date().toISOString();
      
      const messages: ChatMessage[] = [
        {
          id: `sys-${Date.now()}`,
          sessionId,
          timestamp: now,
          role: 'system',
          content:
                    'You are a CMS page assistant. Return only JSON with the requested fields. No markdown or explanations.',
        },
        {
          id: `user-${Date.now()}`,
          sessionId,
          timestamp: now,
          role: 'user',
          content: prompt,
        },
      ];
      const accumulated = await generatePageAiMutation.mutateAsync({
        provider,
        modelId,
        agentId,
        messages,
      });

      const parsed = extractPageAiJson(accumulated);
      if (!parsed) throw new ApiError('AI response did not include JSON.', 400);
      setPageAiOutput(JSON.stringify(parsed, null, 2));
      toast(`AI output ready (${provider}).`, { variant: 'success' });
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        setPageAiError('Generation cancelled.');
        toast('Generation cancelled.', { variant: 'info' });
      } else {
        logClientError(error, { context: { source: 'PageSettingsTab', action: 'generatePageAi', task: pageAiTask, provider: pageAiProvider } });
        const message = error instanceof Error ? error.message : 'Failed to generate AI output.';
        setPageAiError(message);
        toast(message, { variant: 'error' });
      }
    } finally {
      pageAiAbortRef.current = null;
    }
  }, [
    generatePageAiMutation,
    buildPageAiPrompt,
    pageAiProvider,
    pageAiModelId,
    pageAiAgentId,
    extractPageAiJson,
    toast,
    pageAiTask,
  ]);

  const handleApplyPageAi = useCallback((): void => {
    if (!pageAiOutput.trim()) {
      setPageAiError('No AI output to apply.');
      return;
    }
    const parsed = extractPageAiJson(pageAiOutput);
    if (!parsed) {
      setPageAiError('AI output is not valid JSON.');
      return;
    }

    if (pageAiTask === 'seo') {
      const source =
        typeof parsed['seo'] === 'object' && parsed['seo']
          ? (parsed['seo'] as Record<string, unknown>)
          : parsed;
      const seoPatch: Record<string, string> = {};
      if (typeof source['seoTitle'] === 'string') seoPatch['seoTitle'] = (source['seoTitle']);
      if (typeof source['seoDescription'] === 'string') seoPatch['seoDescription'] = (source['seoDescription']);
      if (typeof source['seoCanonical'] === 'string') seoPatch['seoCanonical'] = (source['seoCanonical']);
      if (typeof source['seoOgImage'] === 'string') seoPatch['seoOgImage'] = (source['seoOgImage']);
      if (typeof source['robotsMeta'] === 'string') seoPatch['robotsMeta'] = (source['robotsMeta']);
      if (Object.keys(seoPatch).length === 0) {
        setPageAiError('No SEO fields found in AI output.');
        return;
      }
      dispatch({ type: 'UPDATE_SEO', seo: seoPatch });
      toast('SEO metadata applied.', { variant: 'success' });
      return;
    }

    const sectionsRaw =
      Array.isArray(parsed)
        ? parsed
        : (parsed['sections'] ?? parsed['layout'] ?? parsed['plan']);
    const sections = Array.isArray(sectionsRaw) ? sectionsRaw : [];
    if (!sections.length) {
      setPageAiError('No sections found in AI output.');
      return;
    }

    const validZones = new Set<PageZone>(['header', 'template', 'footer']);
    let inserted = 0;
    sections.forEach((item: unknown) => {
      const entry = typeof item === 'string' ? { template: item } : (item as Record<string, unknown>);
      const templateName = typeof entry['template'] === 'string' ? entry['template'] : typeof entry['name'] === 'string' ? entry['name'] : '';
      const typeName = typeof entry['type'] === 'string' ? entry['type'] : '';
      const zoneCandidate = typeof entry['zone'] === 'string' ? entry['zone'] : 'template';
      const zone = validZones.has(zoneCandidate as PageZone) ? (zoneCandidate as PageZone) : 'template';

      if (templateName) {
        const template = SECTION_TEMPLATES.find(
          (tpl: (typeof SECTION_TEMPLATES)[number]) => tpl.name.toLowerCase() === templateName.toLowerCase()
        );
        if (!template) return;
        const section = template.create();
        section.zone = zone;
        dispatch({ type: 'INSERT_TEMPLATE_SECTION', section });
        inserted += 1;
        return;
      }

      if (typeName) {
        const def = getSectionDefinition(typeName);
        if (!def) return;
        dispatch({ type: 'ADD_SECTION', sectionType: typeName, zone });
        inserted += 1;
      }
    });

    if (inserted === 0) {
      setPageAiError('No valid templates or section types matched.');
      return;
    }
    toast(`Inserted ${inserted} section${inserted === 1 ? '' : 's'}.`, { variant: 'success' });
  }, [pageAiOutput, pageAiTask, extractPageAiJson, dispatch, toast]);

  const handleCancelPageAi = useCallback((): void => {
    if (pageAiAbortRef.current) {
      pageAiAbortRef.current.abort();
      pageAiAbortRef.current = null;
    }
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
