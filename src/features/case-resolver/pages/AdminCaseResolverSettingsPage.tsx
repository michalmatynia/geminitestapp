'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, RefreshCcw, Settings2 } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';

import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { Button, FormSection, Input, Label, SectionHeader, SelectSimple, useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  CASE_RESOLVER_SETTINGS_KEY,
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
  const settingsQuery = useSettingsMap({ scope: 'heavy' });
  const updateSetting = useUpdateSetting();
  const modelsQuery = useQuery({
    queryKey: QUERY_KEYS.ai.chatbot.models(),
    queryFn: () => api.get<ChatbotModelListResponse>('/api/chatbot'),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const [draft, setDraft] = useState<CaseResolverSettings | null>(null);
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);

  const rawSettings = settingsQuery.data?.get(CASE_RESOLVER_SETTINGS_KEY) ?? null;
  const openaiModelFallback = (settingsQuery.data?.get('openai_model') ?? '').trim();
  const parsedSettings = useMemo(() => {
    const parsed = parseCaseResolverSettings(rawSettings);
    if (!parsed.ocrModel && openaiModelFallback) {
      return {
        ...parsed,
        ocrModel: openaiModelFallback,
      };
    }
    return parsed;
  }, [openaiModelFallback, rawSettings]);
  const hydrationSignature = `${rawSettings ?? ''}|${openaiModelFallback}`;

  useEffect(() => {
    if (loadedFrom === hydrationSignature && draft) return;
    setDraft(parsedSettings);
    setLoadedFrom(hydrationSignature);
  }, [draft, hydrationSignature, loadedFrom, parsedSettings]);

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

  const saveDisabled =
    !draft ||
    settingsQuery.isLoading ||
    updateSetting.isPending ||
    draft.ocrModel.trim().length === 0;

  const modelSummary = `${modelsQuery.data?.models?.length ?? 0} discovered model(s) available`;

  const handleSave = async (): Promise<void> => {
    if (!draft) return;
    const nextSettings: CaseResolverSettings = {
      ocrModel: draft.ocrModel.trim(),
    };

    if (!nextSettings.ocrModel) {
      toast('Choose an OCR model.', { variant: 'error' });
      return;
    }

    try {
      await updateSetting.mutateAsync({
        key: CASE_RESOLVER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      setDraft(nextSettings);
      setLoadedFrom(`${serializeSetting(nextSettings)}|${openaiModelFallback}`);
      toast('Case Resolver OCR settings saved.', { variant: 'success' });
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
          description='Loading OCR model settings...'
        />
      </div>
    );
  }

  return (
    <div className='container mx-auto space-y-4 py-6'>
      <SectionHeader
        eyebrow='AI · Case Resolver'
        title='Case Resolver Settings'
        description='Configure OCR model defaults used by Case Resolver scan files.'
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
            <Label className='text-[11px] text-gray-400'>OCR Model</Label>
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
