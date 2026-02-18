'use client';

import { ArrowLeft, RefreshCcw, Settings2 } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';

import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { Badge, Button, FormSection, Input, Label, SectionHeader, SelectSimple, Textarea, useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import { resolveCaseResolverOcrProviderLabel } from '../ocr-provider';
import {
  CASE_RESOLVER_CONFIRM_DELETE_OPTIONS,
  CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY,
  CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_OPTIONS,
  CASE_RESOLVER_SETTINGS_KEY,
  parseCaseResolverDefaultDocumentFormat,
  parseCaseResolverSettings,
  type CaseResolverSettings,
} from '../settings';

type ChatbotModelListResponse = {
  models?: string[];
  warning?: {
    code?: string;
    message?: string;
  };
};

export function AdminCaseResolverSettingsPage(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const updateSettingsBulk = useUpdateSettingsBulk();
  const modelsQuery = createListQueryV2<ChatbotModelListResponse, ChatbotModelListResponse>({
    queryKey: QUERY_KEYS.ai.chatbot.models(),
    queryFn: ({ signal }) => api.get<ChatbotModelListResponse>('/api/chatbot', { signal }),
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'case-resolver.settings.models-query',
      operation: 'list',
      resource: 'ai.chatbot.models',
      domain: 'global',
      tags: ['case-resolver', 'settings', 'chatbot-models'],
    },
  });

  const [draft, setDraft] = useState<CaseResolverSettings | null>(null);
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);

  const rawSettings = settingsQuery.data?.get(CASE_RESOLVER_SETTINGS_KEY) ?? null;
  const rawDefaultDocumentFormat =
    settingsQuery.data?.get(CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY) ?? null;
  const openaiModelFallback = (settingsQuery.data?.get('openai_model') ?? '').trim();
  const parsedSettings = useMemo(() => {
    const parsedBase = parseCaseResolverSettings(rawSettings);
    const defaultDocumentFormat = parseCaseResolverDefaultDocumentFormat(
      rawDefaultDocumentFormat,
      parsedBase.defaultDocumentFormat
    );
    const parsed =
      defaultDocumentFormat === parsedBase.defaultDocumentFormat
        ? parsedBase
        : {
          ...parsedBase,
          defaultDocumentFormat,
        };
    if (!parsed.ocrModel && openaiModelFallback) {
      return {
        ...parsed,
        ocrModel: openaiModelFallback,
      };
    }
    return parsed;
  }, [openaiModelFallback, rawDefaultDocumentFormat, rawSettings]);
  const hydrationSignature = `${rawSettings ?? ''}|${rawDefaultDocumentFormat ?? ''}|${openaiModelFallback}`;

  useEffect(() => {
    if (loadedFrom === hydrationSignature && draft) return;
    setDraft(parsedSettings);
    setLoadedFrom(hydrationSignature);
  }, [hydrationSignature, loadedFrom, parsedSettings]);

  const modelOptions = useMemo(() => {
    const options: Array<{ value: string; label: string; description: string }> = [];
    const seen = new Set<string>();
    const append = (values: string[], source: string): void => {
      values.forEach((value: string) => {
        const trimmed = value.trim();
        if (!trimmed || seen.has(trimmed)) return;
        seen.add(trimmed);
        options.push({
          value: trimmed,
          label: trimmed,
          description: source,
        });
      });
    };

    append(modelsQuery.data?.models ?? [], 'live discovery (Ollama + API providers)');
    append([openaiModelFallback], 'system openai_model');
    append([draft?.ocrModel ?? ''], 'current OCR model');

    return options;
  }, [draft?.ocrModel, modelsQuery.data?.models, openaiModelFallback]);
  const detectedOcrProviderLabel = useMemo((): string => {
    const model = draft?.ocrModel.trim() ?? '';
    if (!model) return 'Not set';
    return resolveCaseResolverOcrProviderLabel(model);
  }, [draft?.ocrModel]);

  const saveDisabled =
    !draft ||
    settingsQuery.isLoading ||
    updateSettingsBulk.isPending;

  const modelSummary = `${modelsQuery.data?.models?.length ?? 0} discovered model(s) available`;
  const headerBreadcrumb = (
    <nav
      aria-label='Breadcrumb'
      className='mt-1 flex flex-wrap items-center gap-1 text-xs text-gray-400'
    >
      <Link href='/admin' className='transition-colors hover:text-gray-200'>
        Admin
      </Link>
      <span>/</span>
      <Link href='/admin/case-resolver' className='transition-colors hover:text-gray-200'>
        Case Resolver
      </Link>
      <span>/</span>
      <span className='text-gray-300'>Settings</span>
    </nav>
  );

  const handleSave = async (): Promise<void> => {
    if (!draft) return;
    const nextSettings: CaseResolverSettings = {
      ocrModel: draft.ocrModel.trim(),
      ocrPrompt: draft.ocrPrompt.trim(),
      defaultDocumentFormat: draft.defaultDocumentFormat === 'wysiwyg' ? 'wysiwyg' : 'markdown',
      confirmDeleteDocument: draft.confirmDeleteDocument !== false,
    };

    try {
      await updateSettingsBulk.mutateAsync([
        {
          key: CASE_RESOLVER_SETTINGS_KEY,
          value: serializeSetting(nextSettings),
        },
        {
          key: CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY,
          value: nextSettings.defaultDocumentFormat,
        },
      ]);
      setDraft(nextSettings);
      setLoadedFrom(
        `${serializeSetting(nextSettings)}|${nextSettings.defaultDocumentFormat}|${openaiModelFallback}`
      );
      toast('Case Resolver settings saved.', { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Failed to save Case Resolver settings.',
        { variant: 'error' }
      );
    }
  };

  if (!draft) {
    return (
      <div className='container mx-auto py-6'>
        <SectionHeader
          eyebrow='AI · Case Resolver'
          title='Case Resolver Settings'
          subtitle={headerBreadcrumb}
        />
      </div>
    );
  }

  return (
    <div className='container mx-auto space-y-4 py-6'>
      <SectionHeader
        eyebrow='AI · Case Resolver'
        title='Case Resolver Settings'
        subtitle={headerBreadcrumb}
        actions={(
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='xs'
              onClick={(): void => {
                void settingsQuery.refetch();
                void modelsQuery.refetch();
              }}
              disabled={settingsQuery.isLoading || modelsQuery.isFetching}
            >
              <RefreshCcw className='mr-2 size-4' />
              Refresh
            </Button>
            <Button type='button' variant='outline' size='xs' asChild>
              <Link href='/admin/case-resolver'>
                <ArrowLeft className='mr-2 size-4' />
                Back to Case Resolver
              </Link>
            </Button>
          </div>
        )}
      />

      <FormSection
        title='OCR Runtime'
        description='Pick the model used for OCR extraction. The list includes discovered Ollama and configured API provider models.'
        variant='subtle'
        className='p-4'
        actions={(
          <div className='flex items-center gap-2 text-xs text-gray-400'>
            <Settings2 className='size-3.5' />
            <span>{modelSummary}</span>
          </div>
        )}
      >
        <div className='grid gap-3 md:grid-cols-2'>
          <div className='space-y-1'>
            <div className='flex items-center justify-between gap-2'>
              <Label className='text-[11px] text-gray-400'>OCR Model</Label>
              <Badge variant='outline' className='px-1.5 py-0 text-[9px] uppercase tracking-wide'>
                {detectedOcrProviderLabel}
              </Badge>
            </div>
            <SelectSimple
              value={draft.ocrModel}
              onValueChange={(value: string): void => {
                setDraft((previous: CaseResolverSettings | null) =>
                  previous
                    ? {
                      ...previous,
                      ocrModel: value,
                    }
                    : previous
                );
              }}
              options={modelOptions}
              placeholder='Select OCR model'
            />
            {modelsQuery.data?.warning?.message ? (
              <div className='text-[11px] text-amber-300'>
                {modelsQuery.data.warning.message}
              </div>
            ) : null}
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Custom OCR Model ID</Label>
            <Input
              value={draft.ocrModel}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                const value = event.target.value;
                setDraft((previous: CaseResolverSettings | null) =>
                  previous
                    ? {
                      ...previous,
                      ocrModel: value,
                    }
                    : previous
                );
              }}
              placeholder='e.g. gpt-4o-mini or llama3.2-vision'
              className='h-9'
            />
            <div className='text-[11px] text-gray-500'>
              Use this field if your model is not shown in the discovered list.
            </div>
          </div>
          <div className='space-y-1 md:col-span-2'>
            <Label className='text-[11px] text-gray-400'>OCR Prompt Template</Label>
            <Textarea
              value={draft.ocrPrompt}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                const value = event.target.value;
                setDraft((previous: CaseResolverSettings | null) =>
                  previous
                    ? {
                      ...previous,
                      ocrPrompt: value,
                    }
                    : previous
                );
              }}
              className='min-h-[88px] text-xs'
              placeholder='Instructions used for OCR extraction.'
            />
            <div className='text-[11px] text-gray-500'>
              Edit the default OCR instruction sent with uploaded scan images.
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection
        title='Document Defaults'
        description='Choose which editor format is assigned to newly created documents. Existing documents keep their stored format.'
        variant='subtle'
        className='p-4'
      >
        <div className='grid gap-3 md:grid-cols-2'>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Default Document Format</Label>
            <SelectSimple
              value={draft.defaultDocumentFormat}
              onValueChange={(value: string): void => {
                if (value !== 'markdown' && value !== 'wysiwyg') return;
                setDraft((previous: CaseResolverSettings | null) =>
                  previous
                    ? {
                      ...previous,
                      defaultDocumentFormat: value,
                    }
                    : previous
                );
              }}
              options={CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_OPTIONS}
              placeholder='Select default document format'
            />
            <div className='text-[11px] text-gray-500'>
              Legacy documents continue to open using their stored format (for example WYSIWYG documents stay WYSIWYG).
            </div>
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Confirm Document Delete</Label>
            <SelectSimple
              value={draft.confirmDeleteDocument ? 'on' : 'off'}
              onValueChange={(value: string): void => {
                setDraft((previous: CaseResolverSettings | null) =>
                  previous
                    ? {
                      ...previous,
                      confirmDeleteDocument: value !== 'off',
                    }
                    : previous
                );
              }}
              options={CASE_RESOLVER_CONFIRM_DELETE_OPTIONS}
              placeholder='Choose confirmation behavior'
            />
            <div className='text-[11px] text-gray-500'>
              Applies when deleting documents from Case Resolver tree and Cases list.
            </div>
          </div>
        </div>
      </FormSection>

      <div className='flex justify-end'>
        <Button
          type='button'
          onClick={(): void => {
            void handleSave();
          }}
          disabled={saveDisabled}
          className='min-w-[120px]'
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
}
