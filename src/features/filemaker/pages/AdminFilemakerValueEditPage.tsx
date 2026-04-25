'use client';

import { useParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import React, { startTransition, useMemo } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import { FilemakerPartyEditPageLayout } from '../components/shared/FilemakerPartyEditPageLayout';
import { FILEMAKER_DATABASE_KEY, parseFilemakerDatabase } from '../settings';
import type { FilemakerValue } from '../types';
import { ValueEditFields } from './AdminFilemakerValueEditPage.fields';
import { getValueItemName, buildParentOptions } from './AdminFilemakerValueEditPage.helpers';
import { ValueParametersSection } from './AdminFilemakerValueEditPage.parameters';
import {
  useFilemakerValueDraft,
  usePersistFilemakerValue,
  useValueParameterDraftState,
} from './AdminFilemakerValueEditPage.state';
import { decodeRouteParam } from './filemaker-page-utils';

export function AdminFilemakerValueEditPage(): React.JSX.Element {
  const params = useParams();
  const valueId = useMemo(() => decodeRouteParam(params['valueId']), [params]);
  const isCreateMode = valueId === 'new';
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const value = useMemo(
    () => database.values.find((entry: FilemakerValue): boolean => entry.id === valueId) ?? null,
    [database.values, valueId]
  );
  const { draft, setDraft } = useFilemakerValueDraft({ isCreateMode, value });
  const parameterState = useValueParameterDraftState({ database, isCreateMode, value });
  const parentOptions = useMemo(
    () => buildParentOptions(database.values, valueId),
    [database.values, valueId]
  );
  const { handleSave, isSaving } = usePersistFilemakerValue({
    database,
    draft,
    isCreateMode,
    linkedParameterIds: parameterState.linkedParameterIds,
    value,
    valueParameters: parameterState.workingParameters,
  });

  return (
    <FilemakerPartyEditPageLayout
      itemName={getValueItemName(isCreateMode, value)}
      notFoundMessage='Value not found.'
      parent={{ label: 'Values', href: '/admin/filemaker/values' }}
      onSave={() => {
        void handleSave();
      }}
      onCancel={() => {
        startTransition(() => {
          router.push('/admin/filemaker/values');
        });
      }}
      isSaving={isSaving}
    >
      <ValueEditFields draft={draft} parentOptions={parentOptions} setDraft={setDraft} />
      <ValueParametersSection
        linkedParameterIds={parameterState.linkedParameterIds}
        parameters={parameterState.workingParameters}
        setLinkedParameterIds={parameterState.setLinkedParameterIds}
        setParameters={parameterState.setWorkingParameters}
      />
    </FilemakerPartyEditPageLayout>
  );
}
