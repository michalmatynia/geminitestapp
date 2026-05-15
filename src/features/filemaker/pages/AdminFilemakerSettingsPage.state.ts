import type React from 'react';
import { useEffect, useMemo, useState } from 'react';

import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import type { SelectSimpleOption } from '@/shared/ui/forms-and-actions.public';
import { useToast, type Toast } from '@/shared/ui/primitives.public';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  FILEMAKER_JOB_APPLICATION_SETTINGS_KEY,
  createDefaultFilemakerJobApplicationSettings,
  parseFilemakerJobApplicationSettings,
  type FilemakerJobApplicationSettings,
} from '../filemaker-job-application-settings';
import {
  NO_DEFAULT_PERSON_VALUE,
  PERSONS_PAGE_SIZE,
  addSelectedDefaultOption,
  areSettingsEqual,
  cloneSettings,
  toPersonOptions,
  type PersonOptionsState,
} from './AdminFilemakerSettingsPage.options';

export type AdminFilemakerSettingsPageState = {
  handlePersonChange: (value: string) => void;
  handleReset: () => void;
  handleSave: () => void;
  hasLoaded: boolean;
  isDirty: boolean;
  isSaving: boolean;
  personOptions: SelectSimpleOption[];
  personOptionsState: PersonOptionsState;
  personQuery: string;
  setPersonQuery: React.Dispatch<React.SetStateAction<string>>;
  settings: FilemakerJobApplicationSettings;
};

const FILEMAKER_PERSON_OPTIONS_QUERY_KEY = ['filemaker', 'settings', 'person-options'] as const;

const showSaveError = (error: Error, toast: Toast): void => {
  logClientError(error, {
    context: { source: 'AdminFilemakerSettingsPage', action: 'save' },
  });
  toast(error.message !== '' ? error.message : 'Failed to save Filemaker settings.', {
    variant: 'error',
  });
};

const createPersonChangeHandler =
  (
    personOptions: SelectSimpleOption[],
    setSettings: React.Dispatch<React.SetStateAction<FilemakerJobApplicationSettings>>
  ): ((value: string) => void) =>
  (value: string): void => {
    if (value === NO_DEFAULT_PERSON_VALUE) {
      setSettings(createDefaultFilemakerJobApplicationSettings());
      return;
    }
    const selectedOption = personOptions.find((option) => option.value === value) ?? null;
    setSettings({ defaultPersonId: value, defaultPersonName: selectedOption?.label ?? value });
  };

const buildPersonOptionsParams = (normalizedQuery: string): URLSearchParams => {
  const params = new URLSearchParams({ pageSize: String(PERSONS_PAGE_SIZE) });
  if (normalizedQuery.length > 0) params.set('query', normalizedQuery);
  return params;
};

const fetchPersonOptions = async (
  normalizedQuery: string,
  signal: AbortSignal
): Promise<SelectSimpleOption[]> => {
  const params = buildPersonOptionsParams(normalizedQuery);
  const response = await fetch(`/api/filemaker/persons?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`Failed to load persons (${response.status}).`);
  return toPersonOptions(await response.json());
};

const buildPersonOptionsQueryKey = (normalizedQuery: string) =>
  [
    ...FILEMAKER_PERSON_OPTIONS_QUERY_KEY,
    { pageSize: PERSONS_PAGE_SIZE, query: normalizedQuery },
  ] as const;

const usePersonOptionsState = (personQuery: string): PersonOptionsState => {
  const normalizedQuery = personQuery.trim();
  const queryKey = buildPersonOptionsQueryKey(normalizedQuery);
  const optionsQuery = createListQueryV2<SelectSimpleOption, SelectSimpleOption[]>({
    queryKey,
    queryFn: async ({ signal }) => fetchPersonOptions(normalizedQuery, signal),
    placeholderData: (previousData) => previousData ?? [],
    meta: {
      source: 'features.filemaker.pages.AdminFilemakerSettingsPage.usePersonOptionsState',
      operation: 'list',
      resource: 'filemaker.person-options',
      domain: 'files',
      description: 'Load Filemaker person options for settings default person selection.',
      errorPresentation: 'inline',
    },
    telemetryContext: {
      pageSize: PERSONS_PAGE_SIZE,
      queryLength: normalizedQuery.length,
    },
  });

  return {
    error: optionsQuery.error === null ? null : optionsQuery.error.message,
    isLoading: optionsQuery.isFetching,
    options: optionsQuery.data ?? [],
  };
};

export const useAdminFilemakerSettingsPageState = (): AdminFilemakerSettingsPageState => {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const [hasMounted, setHasMounted] = useState(false);
  const [personQuery, setPersonQuery] = useState('');
  const personOptionsState = usePersonOptionsState(personQuery);
  const storedSettings = useMemo(
    () =>
      parseFilemakerJobApplicationSettings(
        settingsQuery.data?.get(FILEMAKER_JOB_APPLICATION_SETTINGS_KEY)
      ),
    [settingsQuery.data]
  );
  const [settings, setSettings] = useState<FilemakerJobApplicationSettings>(
    cloneSettings(storedSettings)
  );
  useEffect(() => setHasMounted(true), []);
  useEffect(() => setSettings(cloneSettings(storedSettings)), [storedSettings]);

  const personOptions = useMemo(
    () => addSelectedDefaultOption(personOptionsState.options, settings),
    [personOptionsState.options, settings]
  );
  const isDirty = !areSettingsEqual(settings, storedSettings);
  const handleReset = (): void => setSettings(cloneSettings(storedSettings));
  const handlePersonChange = createPersonChangeHandler(personOptions, setSettings);
  const handleSave = (): void => {
    updateSetting.mutate(
      { key: FILEMAKER_JOB_APPLICATION_SETTINGS_KEY, value: serializeSetting(settings) },
      {
        onSuccess: (): void => {
          void settingsQuery.refetch();
          settingsStore.refetch();
          toast('Filemaker settings saved.', { variant: 'success' });
        },
        onError: (error: Error): void => showSaveError(error, toast),
      }
    );
  };

  return {
    handlePersonChange,
    handleReset,
    handleSave,
    hasLoaded: hasMounted && !settingsQuery.isLoading && Boolean(settingsQuery.data),
    isDirty,
    isSaving: updateSetting.isPending,
    personOptions,
    personOptionsState,
    personQuery,
    setPersonQuery,
    settings,
  };
};
