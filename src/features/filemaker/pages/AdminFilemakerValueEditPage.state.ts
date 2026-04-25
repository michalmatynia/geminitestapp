'use client';

import { useRouter } from 'nextjs-toploader/app';
import { startTransition, useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  FILEMAKER_DATABASE_KEY,
  normalizeFilemakerDatabase,
  toPersistedFilemakerDatabase,
} from '../settings';
import type {
  FilemakerDatabase,
  FilemakerValue,
  FilemakerValueParameter,
  FilemakerValueParameterLink,
} from '../types';
import {
  buildNextValue,
  buildNextValues,
  buildValueParameterLinks,
  EMPTY_VALUE_DRAFT,
  filterValidParameterIds,
  getLinkedValueParameterIds,
  getValueSaveSuccessMessage,
  getValueValidationMessage,
  hydrateDraftFromValue,
  normalizeDraft,
  resolveValueIdForSave,
  type ValueDraft,
} from './AdminFilemakerValueEditPage.helpers';

export function useFilemakerValueDraft(input: {
  isCreateMode: boolean;
  value: FilemakerValue | null;
}): {
  draft: ValueDraft;
  setDraft: Dispatch<SetStateAction<ValueDraft>>;
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

export function useValueParameterDraftState(input: {
  database: FilemakerDatabase;
  isCreateMode: boolean;
  value: FilemakerValue | null;
}): {
  linkedParameterIds: string[];
  setLinkedParameterIds: Dispatch<SetStateAction<string[]>>;
  setWorkingParameters: Dispatch<SetStateAction<FilemakerValueParameter[]>>;
  workingParameters: FilemakerValueParameter[];
} {
  const [workingParameters, setWorkingParameters] = useState<FilemakerValueParameter[]>([]);
  const [linkedParameterIds, setLinkedParameterIds] = useState<string[]>([]);
  const [hydratedValueId, setHydratedValueId] = useState<string | null>(null);

  useEffect(() => {
    const nextHydratedValueId = input.isCreateMode ? 'new' : (input.value?.id ?? null);
    if (nextHydratedValueId === null || hydratedValueId === nextHydratedValueId) return;
    setWorkingParameters(input.database.valueParameters);
    setLinkedParameterIds(
      input.isCreateMode ? [] : getLinkedValueParameterIds(input.database, nextHydratedValueId)
    );
    setHydratedValueId(nextHydratedValueId);
  }, [hydratedValueId, input.database, input.isCreateMode, input.value]);

  return {
    linkedParameterIds,
    setLinkedParameterIds,
    setWorkingParameters,
    workingParameters,
  };
}

const buildDatabaseWithValueParameters = (input: {
  database: FilemakerDatabase;
  linkedParameterIds: string[];
  nextValues: FilemakerValue[];
  valueId: string;
  valueParameters: FilemakerValueParameter[];
}): FilemakerDatabase => {
  const validParameterIds = filterValidParameterIds(input.linkedParameterIds, input.valueParameters);
  const valueParameterLinks = [
    ...input.database.valueParameterLinks.filter(
      (link: FilemakerValueParameterLink): boolean => link.valueId !== input.valueId
    ),
    ...buildValueParameterLinks(input.valueId, validParameterIds),
  ];
  return normalizeFilemakerDatabase({
    ...input.database,
    values: input.nextValues,
    valueParameters: input.valueParameters,
    valueParameterLinks,
  });
};

export function usePersistFilemakerValue(input: {
  database: FilemakerDatabase;
  draft: ValueDraft;
  isCreateMode: boolean;
  linkedParameterIds: string[];
  value: FilemakerValue | null;
  valueParameters: FilemakerValueParameter[];
}): {
  handleSave: () => Promise<void>;
  isSaving: boolean;
} {
  const router = useRouter();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const handleSave = useCallback(async (): Promise<void> => {
    const draft = normalizeDraft(input.draft);
    const validationMessage = getValueValidationMessage(draft);
    if (validationMessage !== null) {
      toast(validationMessage, { variant: 'warning' });
      return;
    }
    const valueId = resolveValueIdForSave(input.isCreateMode, input.value);
    if (valueId.length === 0) return;
    const nextValue = buildNextValue({ draft, existingValue: input.value ?? undefined, id: valueId });
    const nextValues = buildNextValues({
      database: input.database,
      id: valueId,
      isCreateMode: input.isCreateMode,
      nextValue,
    });
    const nextDatabase = buildDatabaseWithValueParameters({
      database: input.database,
      linkedParameterIds: input.linkedParameterIds,
      nextValues,
      valueId,
      valueParameters: input.valueParameters,
    });
    try {
      await updateSetting.mutateAsync({
        key: FILEMAKER_DATABASE_KEY,
        value: JSON.stringify(toPersistedFilemakerDatabase(nextDatabase)),
      });
      toast(getValueSaveSuccessMessage(input.isCreateMode), { variant: 'success' });
      startTransition(() => {
        router.push('/admin/filemaker/values');
      });
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save value.', { variant: 'error' });
    }
  }, [input, router, toast, updateSetting]);

  return { handleSave, isSaving: updateSetting.isPending };
}
