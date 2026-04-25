'use client';

import { useParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import React, { startTransition, useCallback, useEffect, useMemo, useState } from 'react';

import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { FilemakerPartyEditPageLayout } from '../components/shared/FilemakerPartyEditPageLayout';
import {
  createFilemakerValue,
  FILEMAKER_DATABASE_KEY,
  normalizeFilemakerDatabase,
  parseFilemakerDatabase,
  toPersistedFilemakerDatabase,
} from '../settings';
import type { FilemakerDatabase, FilemakerValue } from '../types';
import { createClientFilemakerId, decodeRouteParam } from './filemaker-page-utils';
import { ValueEditFields } from './AdminFilemakerValueEditPage.fields';

export type ValueDraft = {
  description: string;
  label: string;
  parentId: string;
  sortOrder: string;
  value: string;
};

const ROOT_PARENT_VALUE = '__root__';

const EMPTY_VALUE_DRAFT: ValueDraft = {
  description: '',
  label: '',
  parentId: ROOT_PARENT_VALUE,
  sortOrder: '0',
  value: '',
};

const getValueItemName = (
  isCreateMode: boolean,
  value: FilemakerValue | null
): string | null => {
  if (isCreateMode) return 'Create Value';
  return value?.label ?? null;
};

const parseSortOrder = (value: string): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const collectDescendantIds = (values: FilemakerValue[], valueId: string): Set<string> => {
  const descendants = new Set<string>();
  let changed = true;

  while (changed) {
    changed = false;
    values.forEach((entry: FilemakerValue): void => {
      const parentId = entry.parentId ?? '';
      if (parentId !== valueId && !descendants.has(parentId)) return;
      if (descendants.has(entry.id)) return;
      descendants.add(entry.id);
      changed = true;
    });
  }

  return descendants;
};

const buildParentOptions = (
  values: FilemakerValue[],
  currentValueId: string
): Array<LabeledOptionWithDescriptionDto<string>> => {
  const excludedIds = currentValueId === 'new' ? new Set<string>() : collectDescendantIds(values, currentValueId);
  if (currentValueId !== 'new') excludedIds.add(currentValueId);

  return [
    { value: ROOT_PARENT_VALUE, label: 'Root', description: 'Top-level value.' },
    ...values
      .filter((entry: FilemakerValue): boolean => !excludedIds.has(entry.id))
      .sort((left: FilemakerValue, right: FilemakerValue) => {
        if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
        return left.label.localeCompare(right.label);
      })
      .map((entry: FilemakerValue) => ({
        value: entry.id,
        label: entry.label,
        description: entry.value,
      })),
  ];
};

const hydrateDraftFromValue = (value: FilemakerValue): ValueDraft => ({
  description: value.description ?? '',
  label: value.label,
  parentId: value.parentId ?? ROOT_PARENT_VALUE,
  sortOrder: String(value.sortOrder),
  value: value.value,
});

function useFilemakerValueDraft(input: {
  isCreateMode: boolean;
  value: FilemakerValue | null;
}): {
  draft: ValueDraft;
  setDraft: React.Dispatch<React.SetStateAction<ValueDraft>>;
} {
  const [draft, setDraft] = useState<ValueDraft>(EMPTY_VALUE_DRAFT);
  const [hydratedValueId, setHydratedValueId] = useState<string | null>(null);

  useEffect(() => {
    if (input.isCreateMode) {
      setDraft(EMPTY_VALUE_DRAFT);
      setHydratedValueId('new');
      return;
    }
    if (input.value === null || hydratedValueId === input.value.id) return;
    setDraft(hydrateDraftFromValue(input.value));
    setHydratedValueId(input.value.id);
  }, [hydratedValueId, input.isCreateMode, input.value]);

  return { draft, setDraft };
}

const normalizeDraft = (draft: ValueDraft): ValueDraft => ({
  description: draft.description.trim(),
  label: draft.label.trim(),
  parentId: draft.parentId === ROOT_PARENT_VALUE ? '' : draft.parentId.trim(),
  sortOrder: String(parseSortOrder(draft.sortOrder)),
  value: draft.value.trim(),
});

const buildNextValue = (input: {
  draft: ValueDraft;
  existingValue?: FilemakerValue;
  id: string;
}): FilemakerValue =>
  createFilemakerValue({
    id: input.id,
    label: input.draft.label,
    value: input.draft.value,
    parentId: input.draft.parentId.length > 0 ? input.draft.parentId : null,
    description: input.draft.description.length > 0 ? input.draft.description : undefined,
    sortOrder: parseSortOrder(input.draft.sortOrder),
    createdAt: input.existingValue?.createdAt,
    updatedAt: new Date().toISOString(),
  });

const getValueValidationMessage = (draft: ValueDraft): string | null => {
  if (draft.label.length === 0) return 'Value label and stored value are required.';
  if (draft.value.length === 0) return 'Value label and stored value are required.';
  return null;
};

const resolveValueIdForSave = (
  isCreateMode: boolean,
  value: FilemakerValue | null
): string => {
  if (isCreateMode) return createClientFilemakerId('value');
  return value?.id ?? '';
};

const buildNextValues = (input: {
  database: FilemakerDatabase;
  id: string;
  isCreateMode: boolean;
  nextValue: FilemakerValue;
}): FilemakerValue[] => {
  if (input.isCreateMode) return [...input.database.values, input.nextValue];
  return input.database.values.map((entry: FilemakerValue) =>
    entry.id === input.id ? input.nextValue : entry
  );
};

const getValueSaveSuccessMessage = (isCreateMode: boolean): string =>
  isCreateMode ? 'Value created.' : 'Value updated.';

function usePersistFilemakerValue(input: {
  database: FilemakerDatabase;
  draft: ValueDraft;
  isCreateMode: boolean;
  value: FilemakerValue | null;
}): {
  handleSave: () => Promise<void>;
  isSaving: boolean;
} {
  const router = useRouter();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const { database, draft: rawDraft, isCreateMode, value } = input;

  const handleSave = useCallback(async (): Promise<void> => {
    const draft = normalizeDraft(rawDraft);
    const validationMessage = getValueValidationMessage(draft);
    if (validationMessage !== null) {
      toast(validationMessage, { variant: 'warning' });
      return;
    }

    const id = resolveValueIdForSave(isCreateMode, value);
    if (id.length === 0) return;
    const nextValue = buildNextValue({ draft, existingValue: value ?? undefined, id });
    const nextValues = buildNextValues({ database, id, isCreateMode, nextValue });
    const nextDatabase = normalizeFilemakerDatabase({ ...database, values: nextValues });

    try {
      await updateSetting.mutateAsync({
        key: FILEMAKER_DATABASE_KEY,
        value: JSON.stringify(toPersistedFilemakerDatabase(nextDatabase)),
      });
      toast(getValueSaveSuccessMessage(isCreateMode), { variant: 'success' });
      startTransition(() => {
        router.push('/admin/filemaker/values');
      });
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save value.', {
        variant: 'error',
      });
    }
  }, [database, isCreateMode, rawDraft, router, toast, updateSetting, value]);

  return { handleSave, isSaving: updateSetting.isPending };
}

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
  const parentOptions = useMemo(
    () => buildParentOptions(database.values, valueId),
    [database.values, valueId]
  );
  const { handleSave, isSaving } = usePersistFilemakerValue({
    database,
    draft,
    isCreateMode,
    value,
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
    </FilemakerPartyEditPageLayout>
  );
}
