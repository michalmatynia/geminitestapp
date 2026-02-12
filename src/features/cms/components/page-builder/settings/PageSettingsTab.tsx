'use client';

import { useMutation } from '@tanstack/react-query';
import { Globe, FileText, Pencil, Check, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';


import { useTeachingAgents } from '@/features/ai/agentcreator/teaching/hooks/useAgentTeaching';
import { useChatbotModels } from '@/features/ai/chatbot/hooks/useChatbotQueries';
import { logClientError } from '@/features/observability';
import { ApiError } from '@/shared/lib/api-client';
import type { AgentTeachingAgentRecord } from '@/shared/types/domain/agent-teaching';
import type { ChatMessage } from '@/shared/types/domain/chatbot';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent, Input, Label, Checkbox, Switch, Textarea, UnifiedSelect, useToast } from '@/shared/ui';

import { useCmsDomainSelection } from '../../../hooks/useCmsDomainSelection';
import { useCmsAllSlugs, useCmsSlugs, useUpdateSlug } from '../../../hooks/useCmsQueries';
import { usePageBuilder } from '../../../hooks/usePageBuilderContext';
import { CmsDomainSelector } from '../../CmsDomainSelector';
import { getSectionDefinition } from '../section-registry';
import { SECTION_TEMPLATES } from '../section-templates';


import type { PageStatus, Slug, PageSlugLink } from '../../../types';
import type { SectionInstance, PageZone } from '../../../types/page-builder';

const STATUS_OPTIONS: { label: string; value: PageStatus }[] = [
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
];

function PageSettingsTab(): React.ReactNode {
  const { state, dispatch } = usePageBuilder();
  const page = state.currentPage;
  const { activeDomainId } = useCmsDomainSelection();
  const slugsQuery = useCmsSlugs(activeDomainId);
  const allSlugsQuery = useCmsAllSlugs(Boolean(page));
  const updateSlug = useUpdateSlug();
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const [pageAiProvider, setPageAiProvider] = useState<'model' | 'agent'>('model');
  const [pageAiModelId, setPageAiModelId] = useState<string>('');
  const [pageAiAgentId, setPageAiAgentId] = useState<string>('');
  const [pageAiPrompt, setPageAiPrompt] = useState<string>('');
  const [pageAiTask, setPageAiTask] = useState<'layout' | 'seo'>('layout');
  const [activeTab, setActiveTab] = useState<'page' | 'seo' | 'ai'>('page');
  const [pageAiOutput, setPageAiOutput] = useState<string>('');
  const [pageAiError, setPageAiError] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const pageAiAbortRef = useRef<AbortController | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const modelsQuery = useChatbotModels({
    enabled: activeTab === 'ai' && pageAiProvider === 'model',
  });
  const teachingAgentsQuery = useTeachingAgents({
    enabled: activeTab === 'ai' && pageAiProvider === 'agent',
  });

  const allSlugs = useMemo((): Slug[] => allSlugsQuery.data ?? [], [allSlugsQuery.data]);
  const domainSlugs = useMemo((): Slug[] => slugsQuery.data ?? [], [slugsQuery.data]);
  const modelOptions = useMemo((): string[] => {
    const fromApi = (modelsQuery.data ?? []).filter((value: string) => value.trim().length > 0);
    return Array.from(new Set(fromApi));
  }, [modelsQuery.data]);
  const agentOptions = useMemo(
    () => (teachingAgentsQuery.data ?? []).map((agent: AgentTeachingAgentRecord) => ({ label: agent.name, value: agent.id })),
    [teachingAgentsQuery.data]
  );
  const pageAiTaskOptions = useMemo(
    () => [
      { label: 'Layout plan', value: 'layout' },
      { label: 'SEO metadata', value: 'seo' },
    ],
    []
  );
  const pageAiProviderOptions = useMemo(
    () => [
      { label: 'AI model', value: 'model' },
      { label: 'Deepthinking agent', value: 'agent' },
    ],
    []
  );

  useEffect((): void => {
    if (pageAiProvider !== 'model') return;
    if (pageAiModelId.trim().length) return;
    if (!modelOptions.length) return;
    setPageAiModelId(modelOptions[0]!);
  }, [pageAiProvider, pageAiModelId, modelOptions]);

  useEffect((): void => {
    setPageAiOutput('');
    setPageAiError(null);
  }, [pageAiTask]);

  useEffect((): void => {
    if (!isEditingName) return;
    if (nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select?.();
    }
  }, [isEditingName]);
  const allSlugByValue = useMemo((): Map<string, Slug> => {
    const map = new Map<string, Slug>();
    allSlugs.forEach((slug: Slug) => map.set(slug.slug, slug));
    return map;
  }, [allSlugs]);

  const selectedSlugIds = useMemo((): string[] => {
    if (!page) return [];
    const pageSlugValues = (page.slugs ?? []).map((s: PageSlugLink) => s.slug.slug);
    return pageSlugValues
      .map((value: string) => allSlugByValue.get(value)?.id)
      .filter((value: string | undefined): value is string => Boolean(value));
  }, [page, allSlugByValue]);

  const domainSlugIds = useMemo((): Set<string> => new Set(domainSlugs.map((slug: Slug) => slug.id)), [domainSlugs]);
  const selectedSlugs = useMemo((): Slug[] => {
    const byId = new Map(allSlugs.map((slug: Slug) => [slug.id, slug]));
    return selectedSlugIds
      .map((idValue: string) => byId.get(idValue))
      .filter((value: Slug | undefined): value is Slug => Boolean(value));
  }, [allSlugs, selectedSlugIds]);

  const crossZoneSlugs = useMemo(
    (): Slug[] => selectedSlugs.filter((slug: Slug) => !domainSlugIds.has(slug.id)),
    [selectedSlugs, domainSlugIds]
  );
  const eligibleHomeSlugs = useMemo(
    (): Slug[] => selectedSlugs.filter((slug: Slug) => domainSlugIds.has(slug.id)),
    [selectedSlugs, domainSlugIds]
  );
  const currentHomeSlug = useMemo(
    (): Slug | null => domainSlugs.find((slug: Slug) => slug.isDefault) ?? null,
    [domainSlugs]
  );
  const pageHomeSlug = useMemo(
    (): Slug | null => (currentHomeSlug ? eligibleHomeSlugs.find((slug: Slug) => slug.id === currentHomeSlug.id) ?? null : null),
    [currentHomeSlug, eligibleHomeSlugs]
  );

  const filteredDomainSlugs = useMemo((): Slug[] => {
    const term = search.trim().toLowerCase();
    if (!term) return domainSlugs;
    return domainSlugs.filter((slug: Slug) => slug.slug.toLowerCase().includes(term));
  }, [domainSlugs, search]);

  const handleStatusChange = (status: PageStatus): void => {
    dispatch({ type: 'SET_PAGE_STATUS', status });
  };

  const handleNameChange = (value: string): void => {
    dispatch({ type: 'SET_PAGE_NAME', name: value });
  };

  const handleSeoChange = (key: string, value: string): void => {
    dispatch({ type: 'UPDATE_SEO', seo: { [key]: value || undefined } });
  };

  const handleMenuVisibilityChange = (checked: boolean): void => {
    dispatch({ type: 'SET_PAGE_MENU_VISIBILITY', showMenu: checked });
  };

  const showMenuValue = page ? page.showMenu !== false : false;

  const applySelectedSlugIds = (ids: string[]): void => {
    const selectedSlugsList = ids
      .map((idValue: string) => allSlugs.find((slug: Slug) => slug.id === idValue))
      .filter((value: Slug | undefined): value is Slug => Boolean(value));
    dispatch({
      type: 'UPDATE_PAGE_SLUGS',
      slugIds: ids,
      slugValues: selectedSlugsList.map((slug: Slug) => slug.slug),
    });
  };

  const handleToggleSlug = (slug: Slug): void => {
    const nextIds = selectedSlugIds.includes(slug.id)
      ? selectedSlugIds.filter((idValue: string) => idValue !== slug.id)
      : [...selectedSlugIds, slug.id];
    applySelectedSlugIds(nextIds);
  };

  const handleRemoveSlug = (slug: Slug): void => {
    applySelectedSlugIds(selectedSlugIds.filter((idValue: string) => idValue !== slug.id));
  };

  const handleSetHome = async (slug: Slug): Promise<void> => {
    await updateSlug.mutateAsync({
      id: slug.id,
      input: { slug: slug.slug, isDefault: true },
      domainId: activeDomainId,
    });
  };

  useEffect((): (() => void) => {
    return (): void => {
      if (pageAiAbortRef.current) {
        pageAiAbortRef.current.abort();
        pageAiAbortRef.current = null;
      }
    };
  }, []);

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

  const pageAiPlaceholder = '{{page_context}}\n{{available_templates}}';
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

  const generatePageAiMutation = useMutation({
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
  });

  const handleGeneratePageAi = useCallback(async (): Promise<void> => {
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

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content:
            'You are a CMS page assistant. Return only JSON with the requested fields. No markdown or explanations.',
        },
        { role: 'user', content: prompt },
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
    modelOptions,
    extractPageAiJson,
    toast,
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

  if (!page) return null;

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value: string): void => setActiveTab(value as 'page' | 'seo' | 'ai')}
      className='flex flex-1 flex-col overflow-hidden'
    >
      <div className='space-y-4 px-4 pt-4'>
        <div className='rounded border border-border/40 bg-gray-800/30 px-3 py-2'>
          <div className='flex items-center gap-2'>
            <FileText className='size-3 text-gray-500' />
            {isEditingName ? (
              <Input
                id='page-name'
                ref={nameInputRef}
                value={page.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => handleNameChange(e.target.value)}
                onBlur={(): void => setIsEditingName(false)}
                onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>): void => {
                  if (event.key === 'Enter' || event.key === 'Escape') {
                    event.currentTarget.blur();
                  }
                }}
                placeholder='Page name'
                className='h-7 flex-1 bg-transparent px-2 text-xs'
              />
            ) : (
              <span className='flex-1 truncate text-xs text-gray-200'>
                {page.name || 'Untitled page'}
              </span>
            )}
            {isEditingName ? (
              <div className='flex items-center gap-1'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  onClick={() => setIsEditingName(false)}
                  className='h-6 w-6 text-emerald-300 hover:text-emerald-100'
                  aria-label='Save page name'
                >
                  <Check className='size-3.5' />
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  onClick={() => setIsEditingName(false)}
                  className='h-6 w-6 text-rose-300 hover:text-rose-100'
                  aria-label='Cancel editing page name'
                >
                  <X className='size-3.5' />
                </Button>
              </div>
            ) : (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => setIsEditingName(true)}
                className='h-6 w-6 text-gray-400 hover:text-white'
                aria-label='Edit page name'
              >
                <Pencil className='size-3.5' />
              </Button>
            )}
          </div>
        </div>

        <div className='rounded border border-border/40 bg-gray-800/20 px-3 py-2'>
          <CmsDomainSelector label='Zone' triggerClassName='h-8 w-full' />
        </div>
      </div>

      <TabsList className='mx-4 mt-3 w-[calc(100%-2rem)]'>
        <TabsTrigger value='page' className='flex-1 text-xs'>Page</TabsTrigger>
        <TabsTrigger value='seo' className='flex-1 text-xs'>SEO</TabsTrigger>
        <TabsTrigger value='ai' className='flex-1 text-xs'>AI</TabsTrigger>
      </TabsList>

      {/* ---- Page tab ---- */}
      <TabsContent value='page' className='flex-1 overflow-y-auto p-4 mt-0'>
        <div className='space-y-4'>
          {/* Status */}
          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>Status</Label>
            <div className='flex gap-2'>
              {STATUS_OPTIONS.map((opt: { label: string; value: PageStatus }) => (
                <button
                  key={opt.value}
                  type='button'
                  onClick={(): void => handleStatusChange(opt.value)}
                  className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                    page.status === opt.value
                      ? opt.value === 'published'
                        ? 'border-green-500 bg-green-500/10 text-green-400'
                        : 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-border/40 bg-gray-800/30 text-gray-400 hover:border-border/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {page.publishedAt && page.status === 'published' && (
              <p className='text-[10px] text-gray-500'>
                Published: {new Date(page.publishedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>Menu</Label>
            <div className='flex items-center justify-between rounded border border-border/40 bg-gray-900/40 px-3 py-2'>
              <span className='text-xs text-gray-300'>Show global menu on this page</span>
              <Switch checked={showMenuValue} onCheckedChange={handleMenuVisibilityChange} />
            </div>
          </div>

          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>Slugs for this zone</Label>
            <Input
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSearch(e.target.value)}
              placeholder='Search slugs...'
              className='h-8 text-xs'
            />
            <div className='max-h-48 space-y-2 overflow-y-auto rounded border border-border/40 bg-gray-900/40 p-2'>
              {filteredDomainSlugs.length === 0 ? (
                <p className='py-4 text-center text-xs text-gray-500'>
                  No slugs available for this zone.
                </p>
              ) : (
                filteredDomainSlugs.map((slug: Slug) => {
                  const checked = selectedSlugIds.includes(slug.id);
                  return (
                    <label key={slug.id} className='flex items-center gap-2 text-xs text-gray-200'>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(): void => handleToggleSlug(slug)}
                      />
                      /{slug.slug}
                    </label>
                  );
                })
              )}
            </div>
            <p className='text-[10px] text-gray-500'>{selectedSlugIds.length} selected</p>
          </div>

          {crossZoneSlugs.length > 0 ? (
            <div className='rounded border border-amber-500/40 bg-amber-500/10 p-3'>
              <p className='text-[10px] font-semibold uppercase tracking-wide text-amber-200'>
                Cross-zone slugs
              </p>
              <p className='mt-1 text-[10px] text-amber-200/80'>
                These slugs are not part of the current zone. Remove them or switch zones.
              </p>
              <div className='mt-2 flex flex-wrap gap-1.5'>
                {crossZoneSlugs.map((slug: Slug) => (
                  <button
                    key={slug.id}
                    type='button'
                    onClick={(): void => handleRemoveSlug(slug)}
                    className='rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200'
                  >
                    /{slug.slug} ×
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>Home page</Label>
            {eligibleHomeSlugs.length === 0 ? (
              <p className='text-xs text-gray-500'>
                Assign at least one slug in this zone to set this page as the home page.
              </p>
            ) : (
              <div className='space-y-2'>
                {eligibleHomeSlugs.map((slug: Slug) => {
                  const isHome = currentHomeSlug?.id === slug.id;
                  return (
                    <div
                      key={slug.id}
                      className='flex items-center justify-between rounded border border-border/40 bg-gray-900/40 px-2.5 py-2 text-xs'
                    >
                      <span className='text-gray-200'>/{slug.slug}</span>
                      {isHome ? (
                        <span className='rounded-full border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-[10px] text-green-300'>
                          Home
                        </span>
                      ) : (
                        <Button
                          size='sm'
                          variant='outline'
                          disabled={updateSlug.isPending}
                          onClick={(): void => { void handleSetHome(slug); }}
                          className='h-6 px-2 text-[10px]'
                        >
                          Set as home
                        </Button>
                      )}
                    </div>
                  );
                })}
                {currentHomeSlug && !pageHomeSlug ? (
                  <p className='text-[10px] text-gray-500'>
                    Current home page: /{currentHomeSlug.slug}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <p className='text-xs text-gray-500'>
            Select a section or block from the tree to edit its settings.
          </p>
        </div>
      </TabsContent>

      {/* ---- SEO tab ---- */}
      <TabsContent value='seo' className='flex-1 overflow-y-auto p-4 mt-0'>
        <div className='space-y-4'>
          <div className='rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400'>
            <Globe className='mr-1.5 inline size-3' />
            Search Engine Optimization
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='seo-title' className='text-xs text-gray-400'>Page title</Label>
            <Input
              id='seo-title'
              value={page.seoTitle ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => handleSeoChange('seoTitle', e.target.value)}
              placeholder={page.name}
              className='h-8 text-xs'
            />
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='seo-desc' className='text-xs text-gray-400'>Meta description</Label>
            <Input
              id='seo-desc'
              value={page.seoDescription ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => handleSeoChange('seoDescription', e.target.value)}
              placeholder='Page description for search engines'
              className='h-8 text-xs'
            />
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='seo-canonical' className='text-xs text-gray-400'>Canonical URL</Label>
            <Input
              id='seo-canonical'
              value={page.seoCanonical ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => handleSeoChange('seoCanonical', e.target.value)}
              placeholder='https://example.com/page'
              className='h-8 text-xs'
            />
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='seo-og' className='text-xs text-gray-400'>OG Image URL</Label>
            <Input
              id='seo-og'
              value={page.seoOgImage ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => handleSeoChange('seoOgImage', e.target.value)}
              placeholder='https://example.com/image.png'
              className='h-8 text-xs'
            />
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='seo-robots' className='text-xs text-gray-400'>Robots meta</Label>
            <Input
              id='seo-robots'
              value={page.robotsMeta ?? 'index,follow'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => handleSeoChange('robotsMeta', e.target.value)}
              placeholder='index,follow'
              className='h-8 text-xs'
            />
          </div>

          {/* SEO Preview */}
          <div className='space-y-1.5 rounded border border-border/30 bg-gray-800/20 p-3'>
            <p className='text-[10px] font-medium uppercase tracking-wide text-gray-500'>Search preview</p>
            <p className='text-sm font-medium text-blue-400 truncate'>
              {page.seoTitle || page.name}
            </p>
            <p className='text-xs text-gray-400 line-clamp-2'>
              {page.seoDescription || 'No description set'}
            </p>
          </div>
        </div>
      </TabsContent>

      {/* ---- AI tab ---- */}
      <TabsContent value='ai' className='flex-1 overflow-y-auto p-4 mt-0'>
        <div className='space-y-4'>
          <div className='rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400'>
            AI page assistant
          </div>
          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>Task</Label>
            <UnifiedSelect
              value={pageAiTask}
              onValueChange={(value: string): void => setPageAiTask(value as 'layout' | 'seo')}
              options={pageAiTaskOptions}
              placeholder='Select task'
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>Provider</Label>
            <UnifiedSelect
              value={pageAiProvider}
              onValueChange={(value: string): void => setPageAiProvider(value as 'model' | 'agent')}
              options={pageAiProviderOptions}
              placeholder='Select provider'
            />
          </div>
          {pageAiProvider !== 'agent' ? (
            <div className='space-y-2'>
              <Label className='text-xs text-gray-400'>Model</Label>
              <UnifiedSelect
                value={pageAiModelId}
                onValueChange={(value: string): void => setPageAiModelId(value)}
                options={modelOptions.map((model: string) => ({ value: model, label: model }))}
                placeholder={modelOptions.length ? 'Select model' : 'No models available'}
              />
            </div>
          ) : (
            <div className='space-y-2'>
              <Label className='text-xs text-gray-400'>Deepthinking agent</Label>
              <UnifiedSelect
                value={pageAiAgentId}
                onValueChange={(value: string): void => setPageAiAgentId(value)}
                options={agentOptions.length ? agentOptions : [{ label: 'No agents configured', value: '' }]}
                placeholder={agentOptions.length ? 'Select agent' : 'No agents configured'}
              />
            </div>
          )}
          <div className='space-y-2'>
            <Label className='text-xs text-gray-400'>Prompt</Label>
            <Textarea
              value={pageAiPrompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setPageAiPrompt(e.target.value)}
              placeholder={`Describe what you need.\n\nContext:\n${pageAiPlaceholder}`}
              className='min-h-[120px] text-xs'
              spellCheck={false}
            />
          </div>
          <div className='flex items-center justify-between'>
            <div className='text-[11px] text-gray-500'>Context placeholders</div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={(): void => {
                const current = pageAiPrompt.trim();
                const nextPrompt = current.length ? `${current}\n\n${pageAiPlaceholder}` : pageAiPlaceholder;
                setPageAiPrompt(nextPrompt);
              }}
            >
              Insert placeholders
            </Button>
          </div>
          <Textarea
            value={pageAiPlaceholder}
            readOnly
            className='min-h-[64px] text-xs font-mono text-gray-300'
          />
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <Button
              type='button'
              size='sm'
              onClick={(): void => void handleGeneratePageAi()}
              disabled={generatePageAiMutation.isPending}
            >
              {generatePageAiMutation.isPending ? 'Generating...' : 'Generate'}
            </Button>
            {generatePageAiMutation.isPending && (
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={handleCancelPageAi}
              >
                Cancel
              </Button>
            )}
          </div>
          {pageAiError && (
            <div className='text-xs text-red-400'>{pageAiError}</div>
          )}
          {pageAiOutput && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs text-gray-400'>AI output</Label>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={handleApplyPageAi}
                >
                  Apply
                </Button>
              </div>
              <Textarea
                value={pageAiOutput}
                readOnly
                className='min-h-[140px] text-xs font-mono text-gray-300'
              />
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

export { STATUS_OPTIONS, PageSettingsTab };
