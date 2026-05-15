'use client';

import React from 'react';

import { Input } from '@/shared/ui/primitives.public';
import {
  FormField,
  SelectSimple,
  type SelectSimpleOption,
} from '@/shared/ui/forms-and-actions.public';
import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';

const NO_PERSON_VALUE = '__no_person__';

type FilemakerPersonOptionRecord = {
  cvCoreStrengths?: unknown;
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

type PersonOptionsQueryKey = readonly [
  'integrations',
  'connection-person-profile-field',
  'persons',
  string,
];

type ConnectionPersonProfileFieldProps = {
  idPrefix: string;
  value: string;
  selectedLabel: string;
  onChange: (personId: string, personName: string) => void;
};

const readString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const hasArrayEntries = (value: unknown): boolean => Array.isArray(value) && value.length > 0;

const hasCvProfile = (person: FilemakerPersonOptionRecord): boolean =>
  readString(person.cvProfessionalSummary).length > 0 ||
  hasArrayEntries(person.cvCoreStrengths) ||
  hasArrayEntries(person.profileEducation) ||
  hasArrayEntries(person.profileJobExperience);

const resolvePersonName = (person: FilemakerPersonOptionRecord): string => {
  const fullName = readString(person.fullName);
  if (fullName.length > 0) return fullName;
  const fallbackName = [readString(person.firstName), readString(person.lastName)]
    .filter((part) => part.length > 0)
    .join(' ');
  return fallbackName.length > 0 ? fallbackName : readString(person.id);
};

const toPersonOption = (person: FilemakerPersonOptionRecord): SelectSimpleOption | null => {
  const id = readString(person.id);
  if (id.length === 0) return null;
  return {
    value: id,
    label: resolvePersonName(person),
    description: hasCvProfile(person) ? 'CV profile available' : 'No CV profile fields yet',
  };
};

const toPersonOptions = (payload: unknown): SelectSimpleOption[] => {
  const persons = (payload as FilemakerPersonsResponse | null)?.persons;
  if (!Array.isArray(persons)) return [];
  return persons
    .map(toPersonOption)
    .filter((option): option is SelectSimpleOption => option !== null);
};

const fetchPersonOptions = async (
  normalizedQuery: string,
  signal: AbortSignal
): Promise<SelectSimpleOption[]> => {
  const params = new URLSearchParams({ pageSize: '48' });
  if (normalizedQuery.length > 0) params.set('query', normalizedQuery);

  const response = await fetch(`/api/filemaker/persons?${params.toString()}`, { signal });
  if (!response.ok) throw new Error('Failed to load persons.');
  return toPersonOptions(await response.json());
};

const mergeOptions = (
  selectedId: string,
  selectedLabel: string,
  fetchedOptions: SelectSimpleOption[]
): SelectSimpleOption[] => {
  const optionsById = new Map<string, SelectSimpleOption>();
  fetchedOptions.forEach((option) => optionsById.set(option.value, option));
  const normalizedSelectedId = selectedId.trim();
  if (normalizedSelectedId.length > 0 && !optionsById.has(normalizedSelectedId)) {
    const normalizedSelectedLabel = selectedLabel.trim();
    optionsById.set(normalizedSelectedId, {
      value: normalizedSelectedId,
      label: normalizedSelectedLabel.length > 0 ? normalizedSelectedLabel : normalizedSelectedId,
      description: 'Selected profile',
    });
  }
  return [
    { value: NO_PERSON_VALUE, label: 'No person selected' },
    ...Array.from(optionsById.values()),
  ];
};

const resolvePersonOptionsStatus = ({
  isError,
  isLoading,
}: {
  isError: boolean;
  isLoading: boolean;
}): 'idle' | 'loading' | 'error' => {
  if (isLoading) return 'loading';
  if (isError) return 'error';
  return 'idle';
};

const usePersonOptions = (query: string): {
  options: SelectSimpleOption[];
  status: 'idle' | 'loading' | 'error';
} => {
  const normalizedQuery = query.trim();
  const personsQuery = createSingleQueryV2<SelectSimpleOption[], SelectSimpleOption[], PersonOptionsQueryKey>({
    queryKey: [
      'integrations',
      'connection-person-profile-field',
      'persons',
      normalizedQuery,
    ],
    queryFn: async ({ signal }): Promise<SelectSimpleOption[]> =>
      fetchPersonOptions(normalizedQuery, signal),
    staleTime: 30_000,
    retry: false,
    meta: {
      source: 'features.integrations.ConnectionPersonProfileField.usePersonOptions',
      operation: 'list',
      resource: 'filemaker.persons',
      domain: 'integrations',
      description: 'Loads Filemaker person options for integration job application profile selection.',
      errorPresentation: 'inline',
    },
  });

  return {
    options: personsQuery.data ?? [],
    status: resolvePersonOptionsStatus({
      isError: personsQuery.isError,
      isLoading: personsQuery.isLoading,
    }),
  };
};

export function ConnectionPersonProfileField({
  idPrefix,
  value,
  selectedLabel,
  onChange,
}: ConnectionPersonProfileFieldProps): React.JSX.Element {
  const [query, setQuery] = React.useState('');
  const { options, status } = usePersonOptions(query);

  const selectOptions = React.useMemo(
    () => mergeOptions(value, selectedLabel, options),
    [options, selectedLabel, value]
  );

  const handlePersonChange = (nextValue: string): void => {
    if (nextValue === NO_PERSON_VALUE) {
      onChange('', '');
      return;
    }
    const selected = selectOptions.find((option) => option.value === nextValue);
    onChange(nextValue, selected?.label ?? nextValue);
  };

  return (
    <FormField
      label='Person profile for job applications'
      description='Select a Persons record so application runs can use the profile details and CV.'
    >
      <div className='space-y-2'>
        <Input
          variant='subtle'
          size='sm'
          placeholder='Search Persons'
          value={query}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            setQuery(event.target.value)
          }
          aria-label='Search Persons'
          title='Search Persons'
        />
        <SelectSimple
          id={`${idPrefix}-jobApplicationPersonId`}
          value={value.trim().length > 0 ? value.trim() : NO_PERSON_VALUE}
          onValueChange={handlePersonChange}
          options={selectOptions}
          ariaLabel='Person profile for job applications'
          placeholder='Select person profile'
          variant='subtle'
          size='sm'
        />
        {status === 'loading' && (
          <p className='text-[10px] text-gray-500'>Loading Persons...</p>
        )}
        {status === 'error' && (
          <p className='text-[10px] text-red-300'>Persons could not be loaded.</p>
        )}
      </div>
    </FormField>
  );
}
