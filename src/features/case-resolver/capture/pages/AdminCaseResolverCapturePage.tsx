'use client';

import { ArrowLeft, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { AdminAiEyebrow } from '@/shared/ui/admin.public';
import { Button, useToast } from '@/shared/ui/primitives.public';
import { FormSection, SelectSimple, FormField } from '@/shared/ui/forms-and-actions.public';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  CASE_RESOLVER_CAPTURE_SETTINGS_KEY,
  parseCaseResolverCaptureSettings,
  type CaseResolverCaptureSettings,
} from '../settings';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'Enabled' },
  { value: 'false', label: 'Disabled' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const toBooleanOptionValue = (value: boolean): string => (value ? 'true' : 'false');
const fromBooleanOptionValue = (value: string): boolean => value === 'true';

function RuntimeSettingsSection({
  draft,
  setDraft,
}: {
  draft: CaseResolverCaptureSettings;
  setDraft: React.Dispatch<React.SetStateAction<CaseResolverCaptureSettings | null>>;
}): JSX.Element {
  return (
    <FormSection
      title='Runtime'
      description='Control whether Case Resolver Capture runs when content is injected back into Case Resolver.'
      variant='subtle'
      className='p-4'
    >
      <div className='grid gap-3 md:grid-cols-2'>
        <FormField label='Capture Pipeline' id='capture-pipeline'>
          <SelectSimple
            value={toBooleanOptionValue(draft.enabled)}
            onValueChange={(value: string): void => {
              setDraft((current: CaseResolverCaptureSettings | null) =>
                current ? { ...current, enabled: fromBooleanOptionValue(value) } : current
              );
            }}
            options={BOOLEAN_OPTIONS}
            ariaLabel='Capture Pipeline'
            title='Capture Pipeline'
          />
        </FormField>
      </div>
    </FormSection>
  );
}

function PageActions({
  settingsQuery,
  handleSave,
  isPending,
}: {
  settingsQuery: UseQueryResult<Map<string, string>, Error>;
  handleSave: () => Promise<void>;
  isPending: boolean;
}): JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Button
        type='button'
        variant='outline'
        size='xs'
        onClick={() => {
          void settingsQuery.refetch().catch(logClientError);
        }}
        disabled={settingsQuery.isLoading}
      >
        <RefreshCcw className='mr-2 size-4' />
        Refresh
      </Button>
      <Button type='button' variant='outline' size='xs' asChild>
        <Link href='/admin/case-resolver'>
          <ArrowLeft className='mr-2 size-4' />
          Back
        </Link>
      </Button>
      <Button
        type='button'
        size='xs'
        onClick={() => {
          void handleSave().catch(logClientError);
        }}
        disabled={isPending}
      >
        Save Settings
      </Button>
    </div>
  );
}

export function AdminCaseResolverCapturePage(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap({ scope: 'heavy' });
  const updateSetting = useUpdateSetting();

  const [draft, setDraft] = useState<CaseResolverCaptureSettings | null>(null);
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);

  const rawSettings = settingsQuery.data?.get(CASE_RESOLVER_CAPTURE_SETTINGS_KEY) ?? null;
  const parsedSettings = useMemo(() => parseCaseResolverCaptureSettings(rawSettings), [rawSettings]);
  const hydrationSignature = rawSettings ?? '__missing__';

  useEffect(() => {
    if (loadedFrom === hydrationSignature && draft) return;
    setDraft(parsedSettings);
    setLoadedFrom(hydrationSignature);
  }, [draft, hydrationSignature, loadedFrom, parsedSettings]);

  const handleSave = async (): Promise<void> => {
    if (!draft) return;
    try {
      await updateSetting.mutateAsync({
        key: CASE_RESOLVER_CAPTURE_SETTINGS_KEY,
        value: serializeSetting(draft),
      });
      setLoadedFrom(hydrationSignature);
      toast('Case Resolver Capture settings saved.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save Case Resolver Capture settings.', {
        variant: 'error',
      });
    }
  };

  if (!draft) {
    return (
      <div className='page-section-tight'>
        <SectionHeader eyebrow={<AdminAiEyebrow section='Case Resolver Capture' />} title='Case Resolver Capture' />
      </div>
    );
  }

  return (
    <div className='page-section-tight space-y-4'>
      <SectionHeader
        eyebrow={<AdminAiEyebrow section='Case Resolver Capture' />}
        title='Case Resolver Capture'
        actions={<PageActions settingsQuery={settingsQuery} handleSave={handleSave} isPending={updateSetting.isPending} />}
      />
      <RuntimeSettingsSection draft={draft} setDraft={setDraft} />
    </div>
  );
}
