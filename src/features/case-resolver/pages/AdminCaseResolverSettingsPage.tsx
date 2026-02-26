'use client';

import { ArrowLeft, RefreshCcw, Settings2 } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';

import { useSettingsMap, useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { Badge, Button, FormField, FormSection, Input, SectionHeader, SelectSimple, Textarea, useToast, Breadcrumbs } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import { isLikelyCaseResolverOcrCapableModelId } from '../ocr-models';
import { detectCaseResolverOcrProvider, resolveCaseResolverOcrProviderLabel } from '../ocr-provider';
import {
  CASE_RESOLVER_CONFIRM_DELETE_OPTIONS,
  CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY,
  CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_OPTIONS,
  CASE_RESOLVER_PARTY_SEARCH_KIND_OPTIONS,
  CASE_RESOLVER_SETTINGS_KEY,
  parseCaseResolverDefaultDocumentFormat,
  parseCaseResolverSettings,
} from '../settings';
import type { CaseResolverSettings } from '@/shared/contracts/case-resolver';

type CaseResolverOcrModelsResponse = {
  models?: string[];
  ollamaModels?: string[];
  otherModels?: string[];
  keySource?:
    | 'image_studio_openai_api_key'
    | 'openai_api_key'
    | 'env_openai_api_key'
    | 'none';
  warning?: {
    code?: string;
    message?: string;
  };
};

export function AdminCaseResolverSettingsPage(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const updateSettingsBulk = useUpdateSettingsBulk();
  const modelsQuery = createListQueryV2<CaseResolverOcrModelsResponse, CaseResolverOcrModelsResponse>({
    queryKey: QUERY_KEYS.ai.chatbot.caseResolverOcrModels(),
    queryFn: ({ signal }) => api.get<CaseResolverOcrModelsResponse>('/api/case-resolver/ocr/models', { signal }),
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'case-resolver.settings.models-query',
      operation: 'list',
      resource: 'case-resolver.ocr.models',
      domain: 'global',
      tags: ['case-resolver', 'settings', 'ocr-models'],
    },
  });

  const [draft, setDraft] = useState<CaseResolverSettings | null>(null);
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);

  const rawSettings = settingsQuery.data?.get(CASE_RESOLVER_SETTINGS_KEY) ?? null;
  const rawDefaultDocumentFormat =
    settingsQuery.data?.get(CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY) ?? null;
  const openaiModelFallback = (settingsQuery.data?.get('openai_model') ?? '').trim();
  const parsedSettings = useMemo((): CaseResolverSettings => {
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
    const options: Array<{ value: string; label: string; description: string; group: string }> = [];
    const seen = new Set<string>();
    const resolveModelGroup = (modelId: string): string => (
      detectCaseResolverOcrProvider(modelId) === 'ollama' ? 'Ollama models' : 'Other models'
    );
    const append = (values: string[], source: string, group?: string): void => {
      values.forEach((value: string) => {
        const trimmed = value.trim();
        if (!trimmed || seen.has(trimmed)) return;
        if (!isLikelyCaseResolverOcrCapableModelId(trimmed)) return;
        seen.add(trimmed);
        options.push({
          value: trimmed,
          label: trimmed,
          description: source,
          group: group ?? resolveModelGroup(trimmed),
        });
      });
    };

    append(modelsQuery.data?.ollamaModels ?? [], 'local Ollama OCR models', 'Ollama models');
    append(modelsQuery.data?.otherModels ?? [], 'OCR models from API providers', 'Other models');
    append([openaiModelFallback], 'system openai_model');
    if (draft?.ocrModel) {
      append([draft.ocrModel], 'current OCR model');
    }

    return options;
  }, [draft?.ocrModel, modelsQuery.data?.ollamaModels, modelsQuery.data?.otherModels, openaiModelFallback]);

  const ocrKeySourceLabel = useMemo((): string => {
    switch (modelsQuery.data?.keySource) {
      case 'image_studio_openai_api_key':
        return 'Image Studio API key (image_studio_openai_api_key)';
      case 'openai_api_key':
        return 'openai_api_key setting';
      case 'env_openai_api_key':
        return 'OPENAI_API_KEY environment variable';
      case 'none':
      default:
        return 'No OpenAI key detected';
    }
  }, [modelsQuery.data?.keySource]);
  const detectedOcrProviderLabel = useMemo((): string => {
    const model = draft?.ocrModel.trim() ?? '';
    if (!model) return 'Not set';
    return resolveCaseResolverOcrProviderLabel(model);
  }, [draft]);

  const saveDisabled =
    !draft ||
    settingsQuery.isLoading ||
    updateSettingsBulk.isPending;

  const modelSummary = `${modelOptions.length} OCR-capable model(s) available`;
  const headerBreadcrumb = (
    <Breadcrumbs
      items={[
        { label: 'Admin', href: '/admin' },
        { label: 'Case Resolver', href: '/admin/case-resolver' },
        { label: 'Settings' },
      ]}
      className='mt-1'
    />
  );

  const handleSave = async (): Promise<void> => {
    if (!draft) return;
    const settings = draft;
    const nextSettings: CaseResolverSettings = {
      ocrModel: settings.ocrModel.trim(),
      ocrPrompt: settings.ocrPrompt.trim(),
      defaultDocumentFormat: 'wysiwyg',
      confirmDeleteDocument: settings.confirmDeleteDocument !== false,
      defaultAddresserPartyKind: settings.defaultAddresserPartyKind,
      defaultAddresseePartyKind: settings.defaultAddresseePartyKind,
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
        description='Pick the model used for OCR extraction. The dropdown is divided into Ollama models and Other models.'
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
          <FormField
            label='OCR Model'
            actions={(
              <Badge variant='outline' className='px-1.5 py-0 text-[9px] uppercase tracking-wide'>
                {detectedOcrProviderLabel}
              </Badge>
            )}
            description={`OpenAI OCR calls use the Image Studio API key first. Key source: ${ocrKeySourceLabel}`}
          >
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
            />            {modelsQuery.data?.warning?.message ? (
              <div className='mt-1 text-[11px] text-amber-300'>
                {modelsQuery.data.warning.message}
              </div>
            ) : null}
          </FormField>

          <FormField
            label='Custom Model ID'
            description='Use this field if your model is not shown in the discovered list.'
          >
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
          </FormField>

          <FormField
            label='OCR Prompt Template'
            description='Edit the default OCR instruction sent with uploaded scan images.'
            className='md:col-span-2'
          >
            <Textarea
              value={draft.ocrPrompt}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {                const value = event.target.value;
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
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title='Document Defaults'
        description='Case Resolver documents always use WYSIWYG format. Markdown mode is disabled.'
        variant='subtle'
        className='p-4'
      >
        <div className='grid gap-3 md:grid-cols-2'>
          <FormField
            label='Default Document Format'
            description='Legacy markdown content is migrated to WYSIWYG HTML automatically.'
          >
            <SelectSimple
              value={draft.defaultDocumentFormat}
              onValueChange={(value: string): void => {                if (value !== 'wysiwyg') return;
                setDraft((previous: CaseResolverSettings | null) =>
                  previous
                    ? {
                      ...previous,
                      defaultDocumentFormat: 'wysiwyg',
                    }
                    : previous
                );
              }}
              options={CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_OPTIONS}
              placeholder='Select default document format'
              disabled
            />
          </FormField>
          <FormField
            label='Confirm Document Delete'
            description='Applies when deleting documents from Case Resolver tree and Cases list.'
          >
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
          </FormField>
          <FormField
            label='Default Addresser Lookup'
            description='Choose whether addresser dropdown starts in Persons or Organizations mode.'
          >
            <SelectSimple
              value={draft.defaultAddresserPartyKind}
              onValueChange={(value: string): void => {                if (value !== 'person' && value !== 'organization') return;
                setDraft((previous: CaseResolverSettings | null) =>
                  previous
                    ? {
                      ...previous,
                      defaultAddresserPartyKind: value,
                    }
                    : previous
                );
              }}
              options={CASE_RESOLVER_PARTY_SEARCH_KIND_OPTIONS}
              placeholder='Choose default addresser lookup'
            />
          </FormField>
          <FormField
            label='Default Addressee Lookup'
            description='Choose whether addressee dropdown starts in Persons or Organizations mode.'
          >
            <SelectSimple
              value={draft.defaultAddresseePartyKind}
              onValueChange={(value: string): void => {                if (value !== 'person' && value !== 'organization') return;
                setDraft((previous: CaseResolverSettings | null) =>
                  previous
                    ? {
                      ...previous,
                      defaultAddresseePartyKind: value,
                    }
                    : previous
                );
              }}
              options={CASE_RESOLVER_PARTY_SEARCH_KIND_OPTIONS}
              placeholder='Choose default addressee lookup'
            />
          </FormField>
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
