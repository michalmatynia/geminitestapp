import type React from 'react';
import { useEffect, useMemo, useState } from 'react';

import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
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

const createInitialPersonOptionsState = (): PersonOptionsState => ({
  error: null,
  isLoading: false,
  options: [],
});

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

const usePersonOptionsState = (personQuery: string): PersonOptionsState => {
  const [state, setState] = useState<PersonOptionsState>(createInitialPersonOptionsState);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ pageSize: String(PERSONS_PAGE_SIZE) });
    const normalizedQuery = personQuery.trim();
    if (normalizedQuery.length > 0) params.set('query', normalizedQuery);
    setState((current: PersonOptionsState): PersonOptionsState => ({
      ...current,
      error: null,
      isLoading: true,
    }));
    fetch(`/api/filemaker/persons?${params.toString()}`, { signal: controller.signal })
      .then(async (response: Response): Promise<unknown> => {
        if (!response.ok) throw new Error(`Failed to load persons (${response.status}).`);
        return await response.json();
      })
      .then((payload: unknown): void => {
        if (controller.signal.aborted) return;
        setState({ error: null, isLoading: false, options: toPersonOptions(payload) });
      })
      .catch((error: unknown): void => {
        if ((error as { name?: string }).name === 'AbortError') return;
        logClientError(error, {
          context: { source: 'AdminFilemakerSettingsPage', action: 'load-persons' },
        });
        setState({
          error: error instanceof Error ? error.message : 'Failed to load persons.',
          isLoading: false,
          options: [],
        });
      });

    return () => controller.abort();
  }, [personQuery]);

  return state;
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
