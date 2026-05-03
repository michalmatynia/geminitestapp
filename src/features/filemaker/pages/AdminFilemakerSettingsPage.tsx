'use client';

/* eslint-disable max-lines, max-lines-per-function */

import { UserRound } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { AdminSettingsPageLayout } from '@/shared/ui/admin.public';
import {
  FormActions,
  FormField,
  FormSection,
  SelectSimple,
  type SelectSimpleOption,
} from '@/shared/ui/forms-and-actions.public';
import {
  LoadingState,
  MetadataItem,
  UI_GRID_ROOMY_CLASSNAME,
} from '@/shared/ui/navigation-and-layout.public';
import { Badge, Input, useToast } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  FILEMAKER_JOB_APPLICATION_SETTINGS_KEY,
  createDefaultFilemakerJobApplicationSettings,
  parseFilemakerJobApplicationSettings,
  type FilemakerJobApplicationSettings,
} from '../filemaker-job-application-settings';

type FilemakerPersonOptionRecord = {
  city?: unknown;
  country?: unknown;
  cvCoreStrengths?: unknown;
  cvHeadline?: unknown;
  cvProfessionalSummary?: unknown;
  firstName?: unknown;
  fullName?: unknown;
  id?: unknown;
  lastName?: unknown;
  profileEducation?: unknown;
  profileJobExperience?: unknown;
};

type FilemakerPersonsResponse = {
  persons?: FilemakerPersonOptionRecord[];
};

type PersonOptionsState = {
  error: string | null;
  isLoading: boolean;
  options: SelectSimpleOption[];
};

const NO_DEFAULT_PERSON_VALUE = '__no_default_person__';
const PERSONS_PAGE_SIZE = 48;

const NO_DEFAULT_PERSON_OPTION: SelectSimpleOption = {
  value: NO_DEFAULT_PERSON_VALUE,
  label: 'No default person',
};

const readString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const hasArrayEntries = (value: unknown): boolean => Array.isArray(value) && value.length > 0;

const hasCvProfile = (person: FilemakerPersonOptionRecord): boolean =>
  readString(person.cvHeadline).length > 0 ||
  readString(person.cvProfessionalSummary).length > 0 ||
  hasArrayEntries(person.cvCoreStrengths) ||
  hasArrayEntries(person.profileEducation) ||
  hasArrayEntries(person.profileJobExperience);

const resolvePersonName = (person: FilemakerPersonOptionRecord): string => {
  const fullName = readString(person.fullName);
  if (fullName.length > 0) return fullName;
  const fallbackName = [readString(person.firstName), readString(person.lastName)]
    .filter((part: string): boolean => part.length > 0)
    .join(' ');
  return fallbackName.length > 0 ? fallbackName : readString(person.id);
};

const resolvePersonDescription = (person: FilemakerPersonOptionRecord): string => {
  const location = [readString(person.city), readString(person.country)]
    .filter((part: string): boolean => part.length > 0)
    .join(' · ');
  if (location.length > 0) return location;
  return hasCvProfile(person) ? 'CV profile available' : 'Filemaker person';
};

const toPersonOption = (person: FilemakerPersonOptionRecord): SelectSimpleOption | null => {
  const id = readString(person.id);
  if (id.length === 0) return null;
  return {
    value: id,
    label: resolvePersonName(person),
    description: resolvePersonDescription(person),
  };
};

const toPersonOptions = (payload: unknown): SelectSimpleOption[] => {
  const persons = (payload as FilemakerPersonsResponse | null)?.persons;
  if (!Array.isArray(persons)) return [];
  return persons
    .map(toPersonOption)
    .filter((option): option is SelectSimpleOption => option !== null)
    .sort((left, right) => left.label.localeCompare(right.label));
};

const cloneSettings = (
  settings: FilemakerJobApplicationSettings
): FilemakerJobApplicationSettings => ({
  defaultPersonId: settings.defaultPersonId,
  defaultPersonName: settings.defaultPersonName,
});

const areSettingsEqual = (
  left: FilemakerJobApplicationSettings,
  right: FilemakerJobApplicationSettings
): boolean => JSON.stringify(left) === JSON.stringify(right);

const addSelectedDefaultOption = (
  options: SelectSimpleOption[],
  settings: FilemakerJobApplicationSettings
): SelectSimpleOption[] => {
  const defaultPersonId = settings.defaultPersonId.trim();
  if (defaultPersonId.length === 0 || options.some((option) => option.value === defaultPersonId)) {
    return [NO_DEFAULT_PERSON_OPTION, ...options];
  }
  const defaultPersonName = settings.defaultPersonName.trim();

  return [
    NO_DEFAULT_PERSON_OPTION,
    {
      value: defaultPersonId,
      label: defaultPersonName.length > 0 ? defaultPersonName : defaultPersonId,
      description: 'Saved default person',
    },
    ...options,
  ];
};

function FilemakerSettingsShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <AdminSettingsPageLayout
      title='Filemaker Settings'
      current='Filemaker Settings'
      description='Configure Filemaker workflow defaults.'
    >
      {children}
    </AdminSettingsPageLayout>
  );
}

function FilemakerJobApplicationSettingsPreview(props: {
  personOptions: SelectSimpleOption[];
  settings: FilemakerJobApplicationSettings;
}): React.JSX.Element {
  const { personOptions, settings } = props;
  const selectedOption =
    personOptions.find((option) => option.value === settings.defaultPersonId.trim()) ?? null;
  const storedPersonName = settings.defaultPersonName.trim();
  const selectedPersonLabel =
    selectedOption?.label ??
    (storedPersonName.length > 0 ? storedPersonName : settings.defaultPersonId.trim());

  return (
    <FormSection title='Current Default' className='sticky top-6 space-y-4 p-6'>
      <div className='flex items-start gap-3 rounded border border-border bg-muted/20 p-4'>
        <div className='flex size-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-card/70'>
          <UserRound className='size-4 text-blue-300' aria-hidden='true' />
        </div>
        <div className='min-w-0 space-y-1'>
          <div className='text-sm font-semibold text-white'>
            {settings.defaultPersonId.trim().length > 0 ? selectedPersonLabel : 'No default person'}
          </div>
          <div className='text-xs text-gray-500'>
            {settings.defaultPersonId.trim().length > 0
              ? settings.defaultPersonId
              : 'Prepare modal will fall back to integration defaults.'}
          </div>
        </div>
      </div>
      <div className='space-y-2 text-xs text-gray-400'>
        <MetadataItem
          label='Setting Key'
          value={FILEMAKER_JOB_APPLICATION_SETTINGS_KEY}
          mono
          variant='minimal'
        />
        <MetadataItem label='Loaded Persons' value={personOptions.length - 1} variant='minimal' />
      </div>
    </FormSection>
  );
}

const getSelectedPersonValue = (settings: FilemakerJobApplicationSettings): string =>
  settings.defaultPersonId.trim().length > 0 ? settings.defaultPersonId : NO_DEFAULT_PERSON_VALUE;

const renderPersonOptionsStatus = (state: PersonOptionsState): React.ReactNode => {
  if (state.isLoading) return <span>Loading persons...</span>;
  if (state.error !== null) return <span className='text-red-300'>{state.error}</span>;
  return <Badge variant='outline'>{state.options.length} persons loaded</Badge>;
};

export function AdminFilemakerSettingsPage(): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();
  const [hasMounted, setHasMounted] = useState(false);
  const [personOptionsState, setPersonOptionsState] = useState<PersonOptionsState>({
    error: null,
    isLoading: false,
    options: [],
  });
  const [personQuery, setPersonQuery] = useState('');

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

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    setSettings(cloneSettings(storedSettings));
  }, [storedSettings]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ pageSize: String(PERSONS_PAGE_SIZE) });
    const normalizedQuery = personQuery.trim();
    if (normalizedQuery.length > 0) params.set('query', normalizedQuery);
    setPersonOptionsState((current: PersonOptionsState): PersonOptionsState => ({
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
        setPersonOptionsState({
          error: null,
          isLoading: false,
          options: toPersonOptions(payload),
        });
      })
      .catch((error: unknown): void => {
        if ((error as { name?: string }).name === 'AbortError') return;
        logClientError(error, {
          context: { source: 'AdminFilemakerSettingsPage', action: 'load-persons' },
        });
        setPersonOptionsState({
          error: error instanceof Error ? error.message : 'Failed to load persons.',
          isLoading: false,
          options: [],
        });
      });

    return () => controller.abort();
  }, [personQuery]);

  const personOptions = useMemo(
    () => addSelectedDefaultOption(personOptionsState.options, settings),
    [personOptionsState.options, settings]
  );

  const isDirty = !areSettingsEqual(settings, storedSettings);

  const handlePersonChange = (value: string): void => {
    if (value === NO_DEFAULT_PERSON_VALUE) {
      setSettings(createDefaultFilemakerJobApplicationSettings());
      return;
    }
    const selectedOption = personOptions.find((option) => option.value === value) ?? null;
    setSettings({
      defaultPersonId: value,
      defaultPersonName: selectedOption?.label ?? value,
    });
  };

  const handleSave = (): void => {
    updateSetting.mutate(
      {
        key: FILEMAKER_JOB_APPLICATION_SETTINGS_KEY,
        value: serializeSetting(settings),
      },
      {
        onSuccess: (): void => toast('Filemaker settings saved.', { variant: 'success' }),
        onError: (error: Error): void => {
          logClientError(error, {
            context: { source: 'AdminFilemakerSettingsPage', action: 'save' },
          });
          toast(error.message !== '' ? error.message : 'Failed to save Filemaker settings.', {
            variant: 'error',
          });
        },
      }
    );
  };

  if (!hasMounted || settingsQuery.isLoading || !settingsQuery.data) {
    return (
      <FilemakerSettingsShell>
        <LoadingState message='Loading Filemaker settings...' />
      </FilemakerSettingsShell>
    );
  }

  return (
    <FilemakerSettingsShell>
      <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-3`}>
        <div className='space-y-6 lg:col-span-2'>
          <FormSection title='Job Application Defaults' className='space-y-4 p-6'>
            <FormField
              label='Default person'
              description='Preselected in the job listing Prepare modal.'
            >
              <div className='space-y-2'>
                <Input
                  variant='subtle'
                  size='sm'
                  placeholder='Search Persons'
                  value={personQuery}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setPersonQuery(event.target.value)
                  }
                  aria-label='Search default job application person'
                  title='Search default job application person'
                />
                <SelectSimple
                  size='sm'
                  value={getSelectedPersonValue(settings)}
                  onValueChange={handlePersonChange}
                  options={personOptions}
                  placeholder='Select default person'
                  ariaLabel='Default job application person'
                  title='Default job application person'
                  disabled={personOptionsState.isLoading}
                />
              </div>
            </FormField>
            <div className='flex flex-wrap items-center gap-2 text-xs text-gray-500'>
              {renderPersonOptionsStatus(personOptionsState)}
            </div>
          </FormSection>

          <FormActions
            onSave={handleSave}
            onCancel={(): void => setSettings(cloneSettings(storedSettings))}
            saveText='Save Settings'
            cancelText='Reset'
            isDisabled={!isDirty || updateSetting.isPending}
            isSaving={updateSetting.isPending}
            className='justify-start'
          />
        </div>

        <FilemakerJobApplicationSettingsPreview
          personOptions={personOptions}
          settings={settings}
        />
      </div>
    </FilemakerSettingsShell>
  );
}
