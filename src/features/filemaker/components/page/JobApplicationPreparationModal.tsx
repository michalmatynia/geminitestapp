'use client';

/* eslint-disable complexity, consistent-return, max-lines, max-lines-per-function, @typescript-eslint/strict-boolean-expressions */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import type { IntegrationConnectionBasic, IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import type { FilemakerJobApplicationSettings } from '../../filemaker-job-application-settings';
import { JOB_APPLICATION_PREPARE_TRIGGER_LOCATION } from '@/shared/lib/ai-paths/job-application-prepare';
import { TriggerButtonBar } from '@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar';
import {
  FormField,
  SelectSimple,
  type SelectSimpleOption,
} from '@/shared/ui/forms-and-actions.public';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { DetailModal } from '@/shared/ui/templates.public';

import type {
  FilemakerDatabase,
  FilemakerJobListing,
  FilemakerJobListingLexiconLink,
  FilemakerLexiconTerm,
  FilemakerLexiconValidationPattern,
  FilemakerOrganization,
} from '../../types';

type JobApplicationPreparationModalProps = {
  initialJobListingId: string | null;
  filemakerDatabase: FilemakerDatabase;
  isOpen: boolean;
  isJobApplicationSettingsLoading?: boolean;
  jobListings: FilemakerJobListing[];
  jobApplicationSettings: FilemakerJobApplicationSettings;
  onClose: () => void;
  onCreated?: () => void;
  onRunEntryChange?: (entry: JobApplicationRunEntry) => void;
  organization: FilemakerOrganization;
  runEntries?: JobApplicationRunEntry[];
};

type FilemakerPersonOptionRecord = {
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

type PersonDetailResponse = Record<string, unknown> & {
  person?: FilemakerPersonOptionRecord | null;
};

type CvListResponse = {
  cvs?: unknown[];
};

type OrganizationDetailResponse = Record<string, unknown> & {
  organization?: FilemakerOrganization | null;
};

type JobApplicationConnection = {
  connection: IntegrationConnectionBasic;
  integration: IntegrationWithConnections;
};

const NO_PERSON_VALUE = '__no_person__';
const LAST_SELECTED_PERSON_STORAGE_KEY = 'filemaker.jobApplication.prepare.lastSelectedPersonId';

const readLastSelectedPersonId = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(LAST_SELECTED_PERSON_STORAGE_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
};

const writeLastSelectedPersonId = (personId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const normalizedPersonId = personId.trim();
    if (normalizedPersonId.length > 0) {
      window.localStorage.setItem(LAST_SELECTED_PERSON_STORAGE_KEY, normalizedPersonId);
      return;
    }
    window.localStorage.removeItem(LAST_SELECTED_PERSON_STORAGE_KEY);
  } catch {
    // Storage is best-effort; explicit dropdown selection still works for the current modal session.
  }
};

const resolveInitialSelectedPersonId = (
  jobApplicationSettings: FilemakerJobApplicationSettings
): string => {
  const filemakerDefaultPersonId = jobApplicationSettings.defaultPersonId.trim();
  if (filemakerDefaultPersonId.length > 0) return filemakerDefaultPersonId;
  return readLastSelectedPersonId();
};

export type JobApplicationArtifactKind = 'tailored_cv' | 'application_email' | 'cover_letter';
export type JobApplicationRunStatus = 'starting' | 'running' | 'queued' | 'completed' | 'error';
export type JobApplicationRunContext = {
  jobListingId: string;
  jobTitle: string;
  organizationId: string;
  personId: string;
};
export type JobApplicationRunEntry = {
  artifactKind: JobApplicationArtifactKind;
  artifactLabel?: string | null;
  context: JobApplicationRunContext;
  error: string | null;
  id: string;
  runId: string | null;
  status: JobApplicationRunStatus;
  updatedAt: string;
};

type JobApplicationContextPayload = {
  generationRequest?: Record<string, unknown>;
  jobContext: Record<string, unknown>;
  organizationContext: Record<string, unknown>;
  outputContract?: Record<string, unknown>;
  personContext: Record<string, unknown>;
  platformContext: Record<string, unknown>;
  version: number;
};

const JOB_APPLICATION_RUN_STATUS_LABELS: Record<JobApplicationRunStatus, string> = {
  completed: 'Completed',
  error: 'Failed',
  queued: 'Queued',
  running: 'Running',
  starting: 'Starting',
};

export const createJobApplicationRunEntryId = (input: {
  artifactKind: JobApplicationArtifactKind;
  jobListingId: string;
  organizationId: string;
  personId: string;
}): string =>
  [
    input.organizationId.trim(),
    input.jobListingId.trim(),
    input.personId.trim(),
    input.artifactKind,
  ].join('::');

const formatJobApplicationArtifactKind = (artifactKind: JobApplicationArtifactKind): string =>
  artifactKind
    .split('_')
    .map((part: string): string => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');

const resolveJobApplicationArtifactLabel = (entry: {
  artifactKind: JobApplicationArtifactKind;
  artifactLabel?: string | null;
}): string => {
  const artifactLabel = entry.artifactLabel?.trim() ?? '';
  return artifactLabel.length > 0
    ? artifactLabel
    : formatJobApplicationArtifactKind(entry.artifactKind);
};

const isJobApplicationArtifactKind = (value: unknown): value is JobApplicationArtifactKind =>
  value === 'tailored_cv' || value === 'application_email' || value === 'cover_letter';

const readPlainRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const APPLICATION_CONTEXT_MAX_ARRAY_ITEMS = 12;
const APPLICATION_CONTEXT_MAX_JSON_LENGTH = 700_000;
const APPLICATION_CONTEXT_MAX_STRING_LENGTH = 4_000;
const APPLICATION_CONTEXT_MAX_DEPTH = 8;
const APPLICATION_CONTEXT_HEAVY_KEYS = new Set([
  'cvs',
  'harvestprofiles',
  'importeddemands',
  'importedprofiles',
  'joblistings',
  'linkedrecords',
  'linkedanyparams',
  'linkedanytexts',
  'linkedbankaccounts',
  'linkeddocuments',
  'linkedevents',
  'selectedlinks',
  'selectedterms',
  'sourceapplicationcontext',
  'valuecatalog',
]);

const isHeavyApplicationContextKey = (key: string): boolean => {
  const normalized = key.trim().toLowerCase();
  return (
    APPLICATION_CONTEXT_HEAVY_KEYS.has(normalized) ||
    /(?:^|[_-])base64(?:$|[_-])/i.test(key) ||
    /(?:^|[_-])binary(?:$|[_-])/i.test(key) ||
    /(?:^|[_-])blob(?:$|[_-])/i.test(key) ||
    /(?:^|[_-])buffer(?:$|[_-])/i.test(key) ||
    normalized === 'bodyhtml' ||
    normalized === 'rawhtml'
  );
};

const compactContextString = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength).trim()}... [truncated]` : trimmed;
};

const summarizeCollectionCounts = (value: unknown): Record<string, number> | null => {
  if (Array.isArray(value)) return { count: value.length };
  const record = readPlainRecord(value);
  if (record === null) return null;
  const counts: Record<string, number> = {};
  Object.entries(record).forEach(([key, entryValue]) => {
    if (Array.isArray(entryValue)) counts[key] = entryValue.length;
  });
  return Object.keys(counts).length > 0 ? counts : null;
};

const summarizeLinkedRecords = (value: unknown): Record<string, unknown> | null => {
  const record = readPlainRecord(value);
  if (record === null) return summarizeCollectionCounts(value);
  const summary: Record<string, unknown> = {};
  Object.entries(record).forEach(([key, entryValue]) => {
    if (!Array.isArray(entryValue)) return;
    summary[`${key}Count`] = entryValue.length;
  });
  const pickItems = (key: string, fields: string[]): void => {
    const items = record[key];
    if (!Array.isArray(items)) return;
    summary[key] = items.slice(0, 4).map((item: unknown): Record<string, unknown> => {
      const itemRecord = readPlainRecord(item) ?? {};
      return fields.reduce<Record<string, unknown>>((picked, field) => {
        const compacted = compactApplicationContextValue(itemRecord[field], 0);
        if (compacted !== undefined && compacted !== null && compacted !== '') {
          picked[field] = compacted;
        }
        return picked;
      }, {});
    });
  };
  pickItems('linkedEmails', ['email', 'value', 'label', 'type']);
  pickItems('linkedWebsites', ['url', 'website', 'value', 'label', 'type']);
  pickItems('linkedAddresses', ['city', 'country', 'street', 'postalCode', 'value', 'label']);
  pickItems('linkedOccupations', ['title', 'role', 'company', 'organizationName', 'value', 'label']);
  return Object.keys(summary).length > 0 ? summary : null;
};

const summarizeCvRecords = (value: unknown): Record<string, unknown> | null => {
  if (!Array.isArray(value) || value.length === 0) {
    return {
      count: 0,
      preferredSourceCvRecordId: 'profile-fields-only',
      preferredSourceCvTitle: 'Profile fields only',
      items: [],
    };
  }
  const preferredRecord =
    value
      .map((entry: unknown): Record<string, unknown> => readPlainRecord(entry) ?? {})
      .find((record: Record<string, unknown>): boolean => {
        const tailoringScope = readPlainRecord(record['tailoringScope']);
        const sourceCvRecordId = compactContextString(record['sourceCvRecordId'], 160);
        return tailoringScope === null && sourceCvRecordId === null;
      }) ??
    readPlainRecord(value[0]) ??
    {};
  const preferredSourceCvRecordId =
    compactContextString(preferredRecord['id'], 160) ?? 'profile-fields-only';
  const preferredSourceCvTitle =
    compactContextString(preferredRecord['title'], 240) ?? 'Profile fields only';
  return {
    count: value.length,
    preferredSourceCvRecordId,
    preferredSourceCvTitle,
    items: value.slice(0, 3).map((entry: unknown, index: number): Record<string, unknown> => {
      const record = readPlainRecord(entry) ?? {};
      const id = compactContextString(record['id'], 160);
      const title = compactContextString(record['title'], 240);
      return {
        id,
        title,
        sourceCvRecordId: id,
        sourceCvTitle: title,
        preferredTailoringBase: id === preferredSourceCvRecordId,
        scopedTailoredCv: readPlainRecord(record['tailoringScope']) !== null,
        status: compactContextString(record['status'], 80),
        professionalSummary: compactContextString(record['professionalSummary'], 1400),
        bodyText: compactContextString(record['bodyText'], 2400),
        bodyMarkdown: compactContextString(record['bodyMarkdown'], 2400),
        bodyBlocks: compactApplicationContextValue(record['bodyBlocks'], 0),
        skills: Array.isArray(record['skills']) ? record['skills'].slice(0, 24) : [],
        experienceHighlights: Array.isArray(record['experienceHighlights'])
          ? record['experienceHighlights'].slice(0, 16)
          : [],
        educationHighlights: Array.isArray(record['educationHighlights'])
          ? record['educationHighlights'].slice(0, 12)
          : [],
      };
    }),
  };
};

const compactApplicationContextValue = (value: unknown, depth = 0): unknown => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > APPLICATION_CONTEXT_MAX_STRING_LENGTH
      ? `${trimmed.slice(0, APPLICATION_CONTEXT_MAX_STRING_LENGTH).trim()}... [truncated]`
      : trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value
      .slice(0, APPLICATION_CONTEXT_MAX_ARRAY_ITEMS)
      .map((item: unknown): unknown => compactApplicationContextValue(item, depth + 1))
      .filter((item: unknown): boolean => item !== undefined);
  }
  if (typeof value !== 'object') return undefined;
  if (depth >= APPLICATION_CONTEXT_MAX_DEPTH) return {};

  const next: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, entryValue]) => {
    if (isHeavyApplicationContextKey(key)) {
      const normalized = key.trim().toLowerCase();
      const summary = normalized === 'cvs'
        ? summarizeCvRecords(entryValue)
        : normalized === 'linkedrecords'
          ? summarizeLinkedRecords(entryValue)
        : summarizeCollectionCounts(entryValue);
      if (summary !== null) next[`${key}Summary`] = summary;
      return;
    }
    const compacted = compactApplicationContextValue(entryValue, depth + 1);
    if (compacted !== undefined) next[key] = compacted;
  });
  return next;
};

const estimateJsonLength = (value: unknown): number => {
  try {
    return JSON.stringify(value).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
};

const pickCompactRecordFields = (
  source: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> => {
  const picked: Record<string, unknown> = {};
  keys.forEach((key: string): void => {
    if (!Object.prototype.hasOwnProperty.call(source, key)) return;
    const compacted = compactApplicationContextValue(source[key], 0);
    if (compacted !== undefined) picked[key] = compacted;
  });
  return picked;
};

const buildMinimalJobApplicationContextPayload = (
  payload: JobApplicationContextPayload
): JobApplicationContextPayload => {
  const personContext = readPlainRecord(payload.personContext) ?? {};
  const person = readPlainRecord(personContext['person']) ?? {};
  const jobContext = readPlainRecord(payload.jobContext) ?? {};
  const listing = readPlainRecord(jobContext['listing']) ?? {};
  const lexicon = readPlainRecord(jobContext['lexicon']) ?? {};
  const organizationContext = readPlainRecord(payload.organizationContext) ?? {};
  const organization = readPlainRecord(organizationContext['organization']) ?? {};

  return {
    version: payload.version,
    platformContext: compactApplicationContextValue(payload.platformContext, 0) as Record<string, unknown>,
    personContext: {
      selectedPersonId: personContext['selectedPersonId'] ?? null,
      person: pickCompactRecordFields(person, [
        'id',
        'fullName',
        'firstName',
        'lastName',
        'email',
        'phone',
        'city',
        'country',
        'linkedinUrl',
        'githubUrl',
        'cvHeadline',
        'cvProfessionalSummary',
        'cvCoreStrengths',
        'profileEducation',
        'profileJobExperience',
        'profileLanguageSkills',
        'profileTechnicalEnvironment',
      ]),
      cvsSummary: personContext['cvsSummary'] ?? null,
    },
    jobContext: {
      selectedJobListingId: jobContext['selectedJobListingId'] ?? null,
      listing: pickCompactRecordFields(listing, [
        'id',
        'title',
        'description',
        'responsibilities',
        'requirements',
        'salaryText',
        'salaryMin',
        'salaryMax',
        'salaryCurrency',
        'salaryPeriod',
        'location',
        'sourceSite',
        'sourceUrl',
        'workMode',
        'employmentType',
        'contractType',
        'experienceLevel',
      ]),
      lexicon: pickCompactRecordFields(lexicon, [
        'selectedTermIds',
        'selectedTechnologyTerms',
        'technologyMentionHighlighting',
        'technologyValidationPatterns',
      ]),
    },
    organizationContext: {
      selectedOrganizationId: organizationContext['selectedOrganizationId'] ?? null,
      organization: pickCompactRecordFields(organization, [
        'id',
        'name',
        'displayName',
        'description',
        'city',
        'country',
        'website',
        'sourceSite',
        'sourceUrl',
        'scrapeOrigin',
      ]),
    },
  };
};

const compactJobApplicationContextPayload = (
  payload: JobApplicationContextPayload
): JobApplicationContextPayload => {
  const compacted = compactApplicationContextValue(payload) as JobApplicationContextPayload;
  if (estimateJsonLength(compacted) <= APPLICATION_CONTEXT_MAX_JSON_LENGTH) return compacted;
  return compactApplicationContextValue(
    buildMinimalJobApplicationContextPayload(compacted),
    0
  ) as JobApplicationContextPayload;
};

const readTriggerButtonContextTemplate = (
  button: AiTriggerButtonRecord | undefined
): Record<string, unknown> | null => readPlainRecord(button?.contextTemplate);

const resolveButtonApplicationArtifactKind = (
  button: AiTriggerButtonRecord | undefined
): JobApplicationArtifactKind | null => {
  const artifactKind = readTriggerButtonContextTemplate(button)?.['jobApplicationArtifactKind'];
  if (isJobApplicationArtifactKind(artifactKind)) return artifactKind;
  return null;
};

const buildTriggeredApplicationContext = (
  baseContext: JobApplicationContextPayload,
  button: AiTriggerButtonRecord | undefined
): JobApplicationContextPayload => {
  const contextTemplate = readTriggerButtonContextTemplate(button);
  const applicationContextPatch = readPlainRecord(contextTemplate?.['applicationContext']);
  return {
    ...baseContext,
    ...(applicationContextPatch ?? {}),
  };
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

const normalizePersonForApplicationContext = (
  person: FilemakerPersonOptionRecord | null | undefined,
  fallbackPersonId: string
): FilemakerPersonOptionRecord => {
  const source = person ?? {};
  const resolvedId = readString(source.id) || fallbackPersonId;
  const resolvedFullName = resolvePersonName({ ...source, id: resolvedId });
  return {
    ...source,
    id: resolvedId,
    fullName: resolvedFullName || resolvedId,
  };
};

const normalizeOrganizationForApplicationContext = (
  organization: FilemakerOrganization,
  fallbackOrganizationId: string
): FilemakerOrganization => {
  const resolvedId = readString(organization.id) || fallbackOrganizationId;
  const resolvedName = readString(organization.name) || resolvedId;
  return {
    ...organization,
    id: resolvedId,
    name: resolvedName,
  };
};

const normalizeListingForApplicationContext = (
  listing: FilemakerJobListing,
  fallbackListingId: string
): FilemakerJobListing => {
  const resolvedId = readString(listing.id) || fallbackListingId;
  const resolvedTitle = readString(listing.title) || resolvedId;
  return {
    ...listing,
    id: resolvedId,
    title: resolvedTitle,
  };
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

const mergePersonOptions = (
  fetchedOptions: SelectSimpleOption[],
  defaultConnection: JobApplicationConnection | null,
  jobApplicationSettings: FilemakerJobApplicationSettings,
  lastSelectedPersonId = ''
): SelectSimpleOption[] => {
  const optionsById = new Map<string, SelectSimpleOption>();
  fetchedOptions.forEach((option: SelectSimpleOption): void => {
    optionsById.set(option.value, option);
  });

  const filemakerDefaultPersonId = jobApplicationSettings.defaultPersonId.trim();
  if (filemakerDefaultPersonId.length > 0 && !optionsById.has(filemakerDefaultPersonId)) {
    const label = jobApplicationSettings.defaultPersonName.trim();
    optionsById.set(filemakerDefaultPersonId, {
      value: filemakerDefaultPersonId,
      label: label.length > 0 ? label : filemakerDefaultPersonId,
      description: 'Filemaker default profile',
    });
  }

  const defaultPersonId = defaultConnection?.connection.jobApplicationPersonId?.trim() ?? '';
  if (defaultPersonId.length > 0 && !optionsById.has(defaultPersonId)) {
    const label = defaultConnection?.connection.jobApplicationPersonName?.trim() ?? '';
    optionsById.set(defaultPersonId, {
      value: defaultPersonId,
      label: label.length > 0 ? label : defaultPersonId,
      description: `${defaultConnection?.integration.name ?? 'Integration'} default profile`,
    });
  }

  const modalSelectedPersonId = lastSelectedPersonId.trim();
  if (modalSelectedPersonId.length > 0 && !optionsById.has(modalSelectedPersonId)) {
    optionsById.set(modalSelectedPersonId, {
      value: modalSelectedPersonId,
      label: modalSelectedPersonId,
      description: 'Last selected in Prepare Application',
    });
  }

  return [
    { value: NO_PERSON_VALUE, label: 'No person selected' },
    ...Array.from(optionsById.values()).sort((left, right) => left.label.localeCompare(right.label)),
  ];
};

const resolveDefaultJobApplicationConnection = (
  integrations: IntegrationWithConnections[]
): JobApplicationConnection | null => {
  const pracujIntegration =
    integrations.find((integration: IntegrationWithConnections): boolean => integration.slug === 'pracuj-pl') ??
    null;
  const defaultPracujConnection =
    pracujIntegration?.connections.find(
      (connection: IntegrationConnectionBasic): boolean =>
        (connection.jobApplicationPersonId?.trim() ?? '').length > 0
    ) ??
    pracujIntegration?.connections[0] ??
    null;
  if (pracujIntegration && defaultPracujConnection) {
    return { integration: pracujIntegration, connection: defaultPracujConnection };
  }

  for (const integration of integrations) {
    const connection = integration.connections.find(
      (candidate: IntegrationConnectionBasic): boolean =>
        (candidate.jobApplicationPersonId?.trim() ?? '').length > 0
    );
    if (connection) return { integration, connection };
  }

  return null;
};

const resolvePreferredPersonId = (
  jobApplicationSettings: FilemakerJobApplicationSettings,
  defaultConnection: JobApplicationConnection | null,
  lastSelectedPersonId: string
): string => {
  const filemakerDefaultPersonId = jobApplicationSettings.defaultPersonId.trim();
  if (filemakerDefaultPersonId.length > 0) return filemakerDefaultPersonId;

  const modalSelectedPersonId = lastSelectedPersonId.trim();
  if (modalSelectedPersonId.length > 0) return modalSelectedPersonId;

  return defaultConnection?.connection.jobApplicationPersonId?.trim() ?? '';
};

const shouldReplaceCurrentPersonWithFilemakerDefault = (input: {
  currentPersonId: string;
  filemakerDefaultPersonId: string;
  integrationDefaultPersonId: string;
  lastSelectedPersonId: string;
}): boolean => {
  const currentPersonId = input.currentPersonId.trim();
  const filemakerDefaultPersonId = input.filemakerDefaultPersonId.trim();
  if (filemakerDefaultPersonId.length === 0 || currentPersonId === filemakerDefaultPersonId) {
    return false;
  }

  return (
    currentPersonId.length === 0 ||
    currentPersonId === input.integrationDefaultPersonId.trim() ||
    currentPersonId === input.lastSelectedPersonId.trim()
  );
};

const toJobOption = (listing: FilemakerJobListing, index: number): SelectSimpleOption => ({
  value: listing.id,
  label: listing.title.trim().length > 0 ? listing.title : `Job listing ${index + 1}`,
  description: [listing.location, listing.sourceSite, listing.status]
    .map((value: string | null | undefined): string => value?.trim() ?? '')
    .filter((value: string): boolean => value.length > 0)
    .join(' · '),
});

const fetchJson = async <T,>(url: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(url, signal ? { signal } : undefined);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
};

const slugifyPlatformValue = (value: string | null | undefined): string => {
  const slug = value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug && slug.length > 0 ? slug : 'filemaker';
};

const buildPlatformContext = (
  connection: JobApplicationConnection | null,
  jobApplicationSettings: FilemakerJobApplicationSettings,
  listing: FilemakerJobListing | null
): Record<string, unknown> => {
  const sourceName = listing?.sourceSite?.trim() || 'Filemaker';
  const sourceSlug = slugifyPlatformValue(connection?.integration.slug ?? sourceName);
  const connectionSlug = slugifyPlatformValue(connection?.connection.id ?? sourceName);
  return {
    integrationId: connection?.integration.id ?? sourceSlug,
    integrationName: connection?.integration.name ?? sourceName,
    integrationSlug: connection?.integration.slug ?? sourceSlug,
    connectionId: connection?.connection.id ?? `${connectionSlug}-job-application`,
    connectionName: connection?.connection.name ?? `${sourceName} job application`,
    defaultPersonId: connection?.connection.jobApplicationPersonId ?? null,
    defaultPersonName: connection?.connection.jobApplicationPersonName ?? null,
    filemakerDefaultPersonId: jobApplicationSettings.defaultPersonId || null,
    filemakerDefaultPersonName: jobApplicationSettings.defaultPersonName || null,
  };
};

const buildTechnologyMentionAliases = (term: FilemakerLexiconTerm): string[] => {
  const values = [term.label, term.normalizedLabel];
  if (/\.js$/i.test(term.label)) values.push(term.label.replace(/\.js$/i, ''));
  if (/\bapi$/i.test(term.label)) values.push(`${term.label}s`);
  if (/\bapis$/i.test(term.label)) values.push(term.label.replace(/apis$/i, 'API'));
  return Array.from(
    new Set(
      values
        .map((value: string): string => value.replace(/\s+/g, ' ').trim())
        .filter((value: string): boolean => value.length > 0)
    )
  );
};

const buildTechnologyValidationPatternContext = (
  database: FilemakerDatabase
): Array<Pick<FilemakerLexiconValidationPattern, 'id' | 'label' | 'matchMode' | 'pattern' | 'sourceScope'>> =>
  database.lexiconValidationPatterns
    .filter(
      (pattern: FilemakerLexiconValidationPattern): boolean =>
        pattern.enabled && pattern.targetTypeKey === 'technology'
    )
    .map((pattern: FilemakerLexiconValidationPattern) => ({
      id: pattern.id,
      label: pattern.label,
      matchMode: pattern.matchMode,
      pattern: pattern.pattern,
      sourceScope: pattern.sourceScope,
    }));

const buildJobLexiconContext = (
  listing: FilemakerJobListing,
  database: FilemakerDatabase
): Record<string, unknown> => {
  const selectedIds = new Set(listing.lexiconTermIds);
  const selectedTerms = database.lexiconTerms.filter((term: FilemakerLexiconTerm): boolean =>
    selectedIds.has(term.id)
  );
  const selectedLinks = database.jobListingLexiconLinks.filter(
    (link: FilemakerJobListingLexiconLink): boolean =>
      link.jobListingId === listing.id && selectedIds.has(link.lexiconTermId)
  );
  const selectedTechnologyTerms = selectedTerms.filter(
    (term: FilemakerLexiconTerm): boolean => term.typeKey === 'technology'
  );
  return {
    selectedTermIds: Array.from(selectedIds),
    selectedTerms,
    selectedTechnologyTerms,
    technologyMentionHighlighting: {
      instruction:
        'For tailored CV generation, do not copy all selected lexicon technologies. Add a techStack item only when a generated CV mention or job-listing technology mention matches a selected technology term. Use technologyValidationPatterns to validate clean technology mentions before linking the lexiconTermId and iconUrl. When those linked technologies are mentioned in CV text, the PDF renderer highlights them.',
      terms: selectedTechnologyTerms.map((term: FilemakerLexiconTerm) => ({
        lexiconTermId: term.id,
        label: term.label,
        normalizedLabel: term.normalizedLabel,
        iconUrl: term.iconUrl ?? '',
        aliases: buildTechnologyMentionAliases(term),
      })),
    },
    technologyValidationPatterns: buildTechnologyValidationPatternContext(database),
    selectedLinks,
  };
};

export function JobApplicationPreparationModal({
  filemakerDatabase,
  initialJobListingId,
  isOpen,
  isJobApplicationSettingsLoading = false,
  jobListings,
  jobApplicationSettings,
  onClose,
  onCreated,
  onRunEntryChange,
  organization,
  runEntries,
}: JobApplicationPreparationModalProps): React.JSX.Element {
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [selectedJobListingId, setSelectedJobListingId] = useState('');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(organization.id);
  const [personOptions, setPersonOptions] = useState<SelectSimpleOption[]>([
    { value: NO_PERSON_VALUE, label: 'No person selected' },
  ]);
  const [defaultConnection, setDefaultConnection] = useState<JobApplicationConnection | null>(null);
  const [contextStatus, setContextStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [applicationContext, setApplicationContext] =
    useState<JobApplicationContextPayload | null>(null);
  const [applicationContextEntityId, setApplicationContextEntityId] = useState<string | null>(null);
  const [isApplicationContextLoading, setIsApplicationContextLoading] = useState(false);
  const [runIdsByArtifact, setRunIdsByArtifact] = useState<
    Partial<Record<JobApplicationArtifactKind, string>>
  >({});
  const [runStatusesByArtifact, setRunStatusesByArtifact] = useState<
    Partial<Record<JobApplicationArtifactKind, JobApplicationRunStatus>>
  >({});
  const [runContextsByArtifact, setRunContextsByArtifact] = useState<
    Partial<Record<JobApplicationArtifactKind, JobApplicationRunContext>>
  >({});
  const [runLabelsByArtifact, setRunLabelsByArtifact] = useState<
    Partial<Record<JobApplicationArtifactKind, string>>
  >({});
  const [error, setError] = useState<string | null>(null);

  const jobOptions = useMemo<SelectSimpleOption[]>(
    () => jobListings.map(toJobOption),
    [jobListings]
  );

  const organizationOptions = useMemo<SelectSimpleOption[]>(
    () => [
      {
        value: organization.id,
        label: organization.name.trim().length > 0 ? organization.name : organization.id,
        description: [organization.city, organization.country]
          .map((value: string | undefined): string => value?.trim() ?? '')
          .filter((value: string): boolean => value.length > 0)
          .join(' · '),
      },
    ],
    [organization]
  );

  const selectedListing = useMemo<FilemakerJobListing | null>(
    () =>
      jobListings.find((listing: FilemakerJobListing): boolean => listing.id === selectedJobListingId) ??
      null,
    [jobListings, selectedJobListingId]
  );

  useEffect(() => {
    if (!isOpen) return;
    const fallbackListingId = initialJobListingId ?? jobListings[0]?.id ?? '';
    setSelectedJobListingId(fallbackListingId);
    setSelectedOrganizationId(organization.id);
    setSelectedPersonId(resolveInitialSelectedPersonId(jobApplicationSettings));
    setError(null);
  }, [initialJobListingId, isOpen, jobApplicationSettings, jobListings, organization.id]);

  useEffect(() => {
    if (!isOpen) return;
    const filemakerDefaultPersonId = jobApplicationSettings.defaultPersonId.trim();
    if (filemakerDefaultPersonId.length === 0) return;
    setSelectedPersonId(filemakerDefaultPersonId);
  }, [jobApplicationSettings.defaultPersonId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setContextStatus('loading');
    setError(null);

    Promise.allSettled([
      fetchJson<IntegrationWithConnections[]>('/api/v2/integrations/with-connections', controller.signal),
      fetchJson<FilemakerPersonsResponse>('/api/filemaker/persons?pageSize=48', controller.signal),
    ])
      .then((results): void => {
        if (controller.signal.aborted) return;
        const integrations =
          results[0].status === 'fulfilled' && Array.isArray(results[0].value)
            ? results[0].value
            : [];
        const connection = resolveDefaultJobApplicationConnection(integrations);
        const fetchedPersonOptions =
          results[1].status === 'fulfilled' ? toPersonOptions(results[1].value) : [];
        const lastSelectedPersonId = readLastSelectedPersonId();
        setDefaultConnection(connection);
        setPersonOptions(
          mergePersonOptions(
            fetchedPersonOptions,
            connection,
            jobApplicationSettings,
            lastSelectedPersonId
          )
        );

        const filemakerDefaultPersonId = jobApplicationSettings.defaultPersonId.trim();
        const integrationDefaultPersonId =
          connection?.connection.jobApplicationPersonId?.trim() ?? '';
        const defaultPersonId = resolvePreferredPersonId(
          jobApplicationSettings,
          connection,
          lastSelectedPersonId
        );
        setSelectedPersonId((current: string): string => {
          if (
            shouldReplaceCurrentPersonWithFilemakerDefault({
              currentPersonId: current,
              filemakerDefaultPersonId,
              integrationDefaultPersonId,
              lastSelectedPersonId,
            })
          ) {
            return filemakerDefaultPersonId;
          }

          return current.trim().length > 0 ? current : defaultPersonId;
        });
        setContextStatus(results.some((result) => result.status === 'fulfilled') ? 'idle' : 'error');
      })
      .catch((loadError: unknown): void => {
        if ((loadError as { name?: string }).name === 'AbortError') return;
        setContextStatus('error');
      });

    return () => controller.abort();
  }, [isOpen, jobApplicationSettings]);

  useEffect(() => {
    if (!selectedJobListingId && jobListings[0]) {
      setSelectedJobListingId(jobListings[0].id);
      return;
    }
    if (
      selectedJobListingId &&
      !jobListings.some((listing: FilemakerJobListing): boolean => listing.id === selectedJobListingId)
    ) {
      setSelectedJobListingId(jobListings[0]?.id ?? '');
    }
  }, [jobListings, selectedJobListingId]);

  const canCreate =
    selectedPersonId.trim().length > 0 &&
    selectedJobListingId.trim().length > 0 &&
    selectedOrganizationId.trim().length > 0 &&
    selectedListing !== null;

  useEffect(() => {
    if (!isOpen || !canCreate || selectedListing === null) {
      setApplicationContext(null);
      setApplicationContextEntityId(null);
      setIsApplicationContextLoading(false);
      return;
    }

    const controller = new AbortController();
    const personId = selectedPersonId.trim();
    setIsApplicationContextLoading(true);
    setError(null);

    Promise.all([
      fetchJson<PersonDetailResponse>(`/api/filemaker/persons/${encodeURIComponent(personId)}`, controller.signal),
      fetchJson<CvListResponse>(`/api/filemaker/cvs?personId=${encodeURIComponent(personId)}`, controller.signal),
      fetchJson<OrganizationDetailResponse>(
        `/api/filemaker/organizations/${encodeURIComponent(selectedOrganizationId)}`,
        controller.signal
      ),
    ])
      .then(([personDetail, cvPayload, organizationDetail]): void => {
        if (controller.signal.aborted) return;
        const selectedOrganization = normalizeOrganizationForApplicationContext(
          organizationDetail.organization ?? organization,
          selectedOrganizationId
        );
        const selectedPerson = normalizePersonForApplicationContext(personDetail.person, personId);
        const selectedListingForContext = normalizeListingForApplicationContext(
          selectedListing,
          selectedListing.id
        );
        setApplicationContext(compactJobApplicationContextPayload({
          version: 2,
          platformContext: buildPlatformContext(
            defaultConnection,
            jobApplicationSettings,
            selectedListingForContext
          ),
          personContext: {
            selectedPersonId: personId,
            person: selectedPerson,
            linkedRecords: {
              linkedAddresses: personDetail['linkedAddresses'] ?? [],
              linkedAnyParams: personDetail['linkedAnyParams'] ?? [],
              linkedAnyTexts: personDetail['linkedAnyTexts'] ?? [],
              linkedBankAccounts: personDetail['linkedBankAccounts'] ?? [],
              linkedContracts: personDetail['linkedContracts'] ?? [],
              linkedDocuments: personDetail['linkedDocuments'] ?? [],
              linkedEmails: personDetail['linkedEmails'] ?? [],
              linkedOccupations: personDetail['linkedOccupations'] ?? [],
              linkedWebsites: personDetail['linkedWebsites'] ?? [],
            },
            cvs: Array.isArray(cvPayload.cvs) ? cvPayload.cvs : [],
          },
          jobContext: {
            selectedJobListingId: selectedListingForContext.id,
            listing: selectedListingForContext,
            lexicon: buildJobLexiconContext(selectedListingForContext, filemakerDatabase),
          },
          organizationContext: {
            selectedOrganizationId,
            organization: selectedOrganization,
            linkedRecords: {
              harvestProfiles: organizationDetail['harvestProfiles'] ?? [],
              importedDemands: organizationDetail['importedDemands'] ?? [],
              importedProfiles: organizationDetail['importedProfiles'] ?? [],
              linkedAddresses: organizationDetail['linkedAddresses'] ?? [],
              linkedAnyParams: organizationDetail['linkedAnyParams'] ?? [],
              linkedAnyTexts: organizationDetail['linkedAnyTexts'] ?? [],
              linkedBankAccounts: organizationDetail['linkedBankAccounts'] ?? [],
              linkedDocuments: organizationDetail['linkedDocuments'] ?? [],
              linkedEmails: organizationDetail['linkedEmails'] ?? [],
              linkedEvents: organizationDetail['linkedEvents'] ?? [],
              linkedPersons: organizationDetail['linkedPersons'] ?? [],
              linkedWebsites: organizationDetail['linkedWebsites'] ?? [],
              relationshipSummary: organizationDetail['relationshipSummary'] ?? null,
              valueCatalog: organizationDetail['valueCatalog'] ?? [],
            },
          },
        }));
        setApplicationContextEntityId(
          `${selectedOrganizationId}:${selectedListingForContext.id}:${personId}:application_package`
        );
      })
      .catch((loadError: unknown): void => {
        if ((loadError as { name?: string }).name === 'AbortError') return;
        setApplicationContext(null);
        setApplicationContextEntityId(null);
        setError(loadError instanceof Error ? loadError.message : 'Failed to load application context.');
      })
      .finally((): void => {
        if (!controller.signal.aborted) setIsApplicationContextLoading(false);
      });

    return () => controller.abort();
  }, [
    canCreate,
    defaultConnection,
    filemakerDatabase,
    isOpen,
    jobApplicationSettings,
    organization,
    selectedListing,
    selectedOrganizationId,
    selectedPersonId,
  ]);

  const getTriggerEntityJson = useCallback((button?: AiTriggerButtonRecord): Record<string, unknown> | null => {
    if (applicationContext === null || applicationContextEntityId === null) return null;
    const nextApplicationContext = buildTriggeredApplicationContext(applicationContext, button);
    return {
      id: applicationContextEntityId,
      applicationContext: nextApplicationContext,
    };
  }, [applicationContext, applicationContextEntityId]);

  const getTriggerExtras = useCallback((button?: AiTriggerButtonRecord): Record<string, unknown> | null => {
    if (applicationContext === null) return null;
    const nextApplicationContext = buildTriggeredApplicationContext(applicationContext, button);
    const generationRequest = readPlainRecord(nextApplicationContext.generationRequest);
    const outputContract = readPlainRecord(nextApplicationContext.outputContract);
    return {
      ...(generationRequest !== null ? { generationRequest } : {}),
      ...(outputContract !== null ? { outputContract } : {}),
    };
  }, [applicationContext]);

  const handleRunQueued = useCallback(
    (args: { button: AiTriggerButtonRecord; runId: string }): void => {
      if (selectedListing === null || applicationContextEntityId === null) return;
      const personId = selectedPersonId.trim();
      const artifactKind = resolveButtonApplicationArtifactKind(args.button);
      if (artifactKind === null) return;
      const artifactLabel = args.button.name.trim() || formatJobApplicationArtifactKind(artifactKind);
      const runContext: JobApplicationRunContext = {
        jobListingId: selectedListing.id,
        jobTitle: selectedListing.title,
        organizationId: selectedOrganizationId,
        personId,
      };
      setRunIdsByArtifact((current) => ({
        ...current,
        [artifactKind]: args.runId,
      }));
      setRunStatusesByArtifact((current) => ({
        ...current,
        [artifactKind]: 'queued',
      }));
      setRunContextsByArtifact((current) => ({
        ...current,
        [artifactKind]: runContext,
      }));
      setRunLabelsByArtifact((current) => ({
        ...current,
        [artifactKind]: artifactLabel,
      }));
      onRunEntryChange?.({
        artifactKind,
        artifactLabel,
        context: runContext,
        error: null,
        id: createJobApplicationRunEntryId({
          artifactKind,
          jobListingId: runContext.jobListingId,
          organizationId: runContext.organizationId,
          personId: runContext.personId,
        }),
        runId: args.runId,
        status: 'queued',
        updatedAt: new Date().toISOString(),
      });
      onCreated?.();
    },
    [
      applicationContextEntityId,
      onCreated,
      onRunEntryChange,
      selectedListing,
      selectedOrganizationId,
      selectedPersonId,
    ]
  );

  const runStateEntries = useMemo(
    () => {
      const selectedPersonFilter = selectedPersonId.trim();
      if (runEntries !== undefined) {
        return runEntries
          .filter(
            (entry: JobApplicationRunEntry): boolean =>
              entry.context.organizationId === selectedOrganizationId &&
              entry.context.jobListingId === selectedJobListingId &&
              (selectedPersonFilter.length === 0 || entry.context.personId === selectedPersonFilter)
          )
          .map((entry: JobApplicationRunEntry) => ({
            ...entry,
            label: resolveJobApplicationArtifactLabel(entry),
          }));
      }

      return (Object.entries(runStatusesByArtifact) as Array<
        [JobApplicationArtifactKind, JobApplicationRunStatus]
      >)
        .map(([artifactKind, status]) => ({
          artifactKind,
          label: resolveJobApplicationArtifactLabel({
            artifactKind,
            artifactLabel: runLabelsByArtifact[artifactKind] ?? null,
          }),
          context: runContextsByArtifact[artifactKind] ?? null,
          error: null,
          id: artifactKind,
          runId: runIdsByArtifact[artifactKind] ?? null,
          status,
          artifactLabel: runLabelsByArtifact[artifactKind] ?? null,
          updatedAt: '',
        }))
        .filter(
          (
            entry
          ): entry is JobApplicationRunEntry & { label: string } =>
            entry.status !== null &&
            entry.context !== null &&
            entry.context.organizationId === selectedOrganizationId &&
            entry.context.jobListingId === selectedJobListingId &&
            (selectedPersonFilter.length === 0 || entry.context.personId === selectedPersonFilter)
        );
    },
    [
      runContextsByArtifact,
      runEntries,
      runIdsByArtifact,
      runLabelsByArtifact,
      runStatusesByArtifact,
      selectedJobListingId,
      selectedOrganizationId,
      selectedPersonId,
    ]
  );

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title='Prepare application'
      subtitle='Candidate, job, and organisation context'
      size='lg'
      footer={
        <>
          <Button type='button' variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <TriggerButtonBar
            location={JOB_APPLICATION_PREPARE_TRIGGER_LOCATION}
            entityType='custom'
            entityId={applicationContextEntityId}
            getEntityJson={getTriggerEntityJson}
            getTriggerExtras={getTriggerExtras}
            disabled={!canCreate || isApplicationContextLoading || applicationContext === null}
            showRunFeedback
            onRunQueued={handleRunQueued}
            className='justify-end'
          />
        </>
      }
    >
      <div className='space-y-4'>
        {selectedPersonId.trim().length === 0 && !isJobApplicationSettingsLoading ? (
          <div className='rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200'>
            No Person is selected. Pick a default Person in{' '}
            <a
              href='/admin/settings/filemaker'
              className='underline hover:text-amber-100'
            >
              Filemaker Settings
            </a>{' '}
            (or choose one below) to enable application generation.
          </div>
        ) : null}
        <div className='grid gap-3 md:grid-cols-3'>
          <FormField
            label='Person context'
            actions={
              selectedPersonId.trim().length > 0 ? (
                <a
                  href={`/admin/filemaker/persons/${encodeURIComponent(selectedPersonId.trim())}`}
                  className='inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sky-200 transition hover:border-sky-300/50 hover:bg-sky-400/10 hover:text-sky-100'
                  aria-label='Open selected person profile'
                  title='Open selected person profile'
                >
                  <svg
                    viewBox='0 0 20 20'
                    aria-hidden='true'
                    className='h-3.5 w-3.5'
                    fill='none'
                  >
                    <path
                      d='M7.5 5.25H5.75A1.75 1.75 0 0 0 4 7v7.25C4 15.22 4.78 16 5.75 16H13a1.75 1.75 0 0 0 1.75-1.75V12.5'
                      stroke='currentColor'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='1.5'
                    />
                    <path
                      d='M10 4h6v6M9.25 10.75 16 4'
                      stroke='currentColor'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='1.5'
                    />
                  </svg>
                </a>
              ) : null
            }
          >
            <SelectSimple
              value={selectedPersonId.trim().length > 0 ? selectedPersonId : NO_PERSON_VALUE}
              onValueChange={(value: string): void => {
                const nextPersonId = value === NO_PERSON_VALUE ? '' : value;
                setSelectedPersonId(nextPersonId);
                writeLastSelectedPersonId(nextPersonId);
              }}
              options={personOptions}
              placeholder='Select person'
              ariaLabel='Person context'
              title='Person context'
            />
          </FormField>
          <FormField label='Job listing context'>
            <SelectSimple
              value={selectedJobListingId}
              onValueChange={setSelectedJobListingId}
              options={jobOptions}
              placeholder='Select job listing'
              ariaLabel='Job listing context'
              title='Job listing context'
            />
          </FormField>
          <FormField label='Organisation context'>
            <SelectSimple
              value={selectedOrganizationId}
              onValueChange={setSelectedOrganizationId}
              options={organizationOptions}
              placeholder='Select organisation'
              ariaLabel='Organisation context'
              title='Organisation context'
            />
          </FormField>
        </div>

        <div className='flex flex-wrap items-center gap-2 text-xs text-gray-400'>
          {jobApplicationSettings.defaultPersonId.trim().length > 0 ? (
            <Badge variant='outline'>
              Filemaker default ·{' '}
              {jobApplicationSettings.defaultPersonName.trim() ||
                jobApplicationSettings.defaultPersonId}
            </Badge>
          ) : null}
          {defaultConnection ? (
            <Badge variant='outline'>
              {defaultConnection.integration.name} · {defaultConnection.connection.name}
            </Badge>
          ) : null}
          {contextStatus === 'loading' ? <span>Loading context...</span> : null}
          {contextStatus === 'error' ? <span className='text-red-300'>Context could not load.</span> : null}
          {isApplicationContextLoading ? <span>Preparing application context...</span> : null}
          {!isApplicationContextLoading && canCreate && applicationContext !== null ? (
            <span className='text-emerald-300'>Application context ready.</span>
          ) : null}
          {runStateEntries.map((entry) => (
            <span key={entry.artifactKind} className='text-emerald-300'>
              {entry.label}: {JOB_APPLICATION_RUN_STATUS_LABELS[entry.status]}
              {entry.context.jobTitle.trim().length > 0 ? ` · ${entry.context.jobTitle}` : ''}
              {entry.runId ? ` · ${entry.runId}` : ''}
            </span>
          ))}
          {error ? <span className='text-red-300'>{error}</span> : null}
        </div>
      </div>
    </DetailModal>
  );
}
