import type { SelectSimpleOption } from '@/shared/ui/forms-and-actions.public';

import type { FilemakerJobApplicationSettings } from '../filemaker-job-application-settings';

export type FilemakerPersonOptionRecord = {
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

export type PersonOptionsState = {
  error: string | null;
  isLoading: boolean;
  options: SelectSimpleOption[];
};

export const NO_DEFAULT_PERSON_VALUE = '__no_default_person__';
export const PERSONS_PAGE_SIZE = 48;

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

export const toPersonOptions = (payload: unknown): SelectSimpleOption[] => {
  const persons = (payload as FilemakerPersonsResponse | null)?.persons;
  if (!Array.isArray(persons)) return [];
  return persons
    .map(toPersonOption)
    .filter((option): option is SelectSimpleOption => option !== null)
    .sort((left, right) => left.label.localeCompare(right.label));
};

export const cloneSettings = (
  settings: FilemakerJobApplicationSettings
): FilemakerJobApplicationSettings => ({
  defaultPersonId: settings.defaultPersonId,
  defaultPersonName: settings.defaultPersonName,
});

export const areSettingsEqual = (
  left: FilemakerJobApplicationSettings,
  right: FilemakerJobApplicationSettings
): boolean => JSON.stringify(left) === JSON.stringify(right);

export const getSelectedPersonValue = (settings: FilemakerJobApplicationSettings): string =>
  settings.defaultPersonId.trim().length > 0 ? settings.defaultPersonId : NO_DEFAULT_PERSON_VALUE;

export const addSelectedDefaultOption = (
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
