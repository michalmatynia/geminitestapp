'use client';

/* eslint-disable complexity, consistent-return, max-lines, max-lines-per-function, @typescript-eslint/strict-boolean-expressions */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { IntegrationConnectionBasic, IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import type { FilemakerJobApplicationSettings } from '../../filemaker-job-application-settings';
import {
  JOB_APPLICATION_PREPARE_PATH_ID,
  JOB_APPLICATION_PREPARE_TRIGGER_BUTTON_ID,
  JOB_APPLICATION_PREPARE_TRIGGER_LOCATION,
  JOB_APPLICATION_PREPARE_TRIGGER_NAME,
} from '@/shared/lib/ai-paths/job-application-prepare';
import { useAiPathTriggerEvent } from '@/shared/lib/ai-paths/hooks/useAiPathTriggerEvent';
import {
  FormField,
  SelectSimple,
  type SelectSimpleOption,
} from '@/shared/ui/forms-and-actions.public';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { DetailModal } from '@/shared/ui/templates.public';

import type { FilemakerJobListing, FilemakerOrganization } from '../../types';

type JobApplicationPreparationModalProps = {
  initialJobListingId: string | null;
  isOpen: boolean;
  jobListings: FilemakerJobListing[];
  jobApplicationSettings: FilemakerJobApplicationSettings;
  onClose: () => void;
  onCreated?: () => void;
  organization: FilemakerOrganization;
};

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

type PersonDetailResponse = Record<string, unknown> & {
  person?: FilemakerPersonOptionRecord | null;
};

type CvListResponse = {
  cvs?: unknown[];
};

type JobApplicationConnection = {
  connection: IntegrationConnectionBasic;
  integration: IntegrationWithConnections;
};

const NO_PERSON_VALUE = '__no_person__';

const APPLICATION_OUTPUT_CONTRACT = {
  tailoredCv: {
    title: 'string',
    professionalSummary: 'string',
    bodyText: 'string',
    bodyMarkdown: 'string',
    experienceHighlights: 'string[]',
    educationHighlights: 'string[]',
    skills: 'string[]',
    preferencesMatch: 'string[]',
  },
  coverLetter: {
    subject: 'string',
    bodyMarkdown: 'string',
  },
  applicationNotes: 'string[]',
  missingInformation: 'string[]',
  confidence: 'number',
} as const;

const readString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

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
    .filter((part: string): boolean => part.length > 0)
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

const mergePersonOptions = (
  fetchedOptions: SelectSimpleOption[],
  defaultConnection: JobApplicationConnection | null,
  jobApplicationSettings: FilemakerJobApplicationSettings
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

const buildPlatformContext = (
  connection: JobApplicationConnection | null,
  jobApplicationSettings: FilemakerJobApplicationSettings
): Record<string, unknown> => ({
  integrationId: connection?.integration.id ?? null,
  integrationName: connection?.integration.name ?? null,
  integrationSlug: connection?.integration.slug ?? null,
  connectionId: connection?.connection.id ?? null,
  connectionName: connection?.connection.name ?? null,
  defaultPersonId: connection?.connection.jobApplicationPersonId ?? null,
  defaultPersonName: connection?.connection.jobApplicationPersonName ?? null,
  filemakerDefaultPersonId: jobApplicationSettings.defaultPersonId || null,
  filemakerDefaultPersonName: jobApplicationSettings.defaultPersonName || null,
});

export function JobApplicationPreparationModal({
  initialJobListingId,
  isOpen,
  jobListings,
  jobApplicationSettings,
  onClose,
  onCreated,
  organization,
}: JobApplicationPreparationModalProps): React.JSX.Element {
  const { fireAiPathTriggerEvent } = useAiPathTriggerEvent();
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [selectedJobListingId, setSelectedJobListingId] = useState('');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(organization.id);
  const [personOptions, setPersonOptions] = useState<SelectSimpleOption[]>([
    { value: NO_PERSON_VALUE, label: 'No person selected' },
  ]);
  const [defaultConnection, setDefaultConnection] = useState<JobApplicationConnection | null>(null);
  const [contextStatus, setContextStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [isCreating, setIsCreating] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
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
    setSelectedPersonId('');
    setRunId(null);
    setError(null);
  }, [initialJobListingId, isOpen, jobListings, organization.id]);

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
        setDefaultConnection(connection);
        setPersonOptions(mergePersonOptions(fetchedPersonOptions, connection, jobApplicationSettings));

        const filemakerDefaultPersonId = jobApplicationSettings.defaultPersonId.trim();
        const integrationDefaultPersonId =
          connection?.connection.jobApplicationPersonId?.trim() ?? '';
        const defaultPersonId =
          filemakerDefaultPersonId.length > 0
            ? filemakerDefaultPersonId
            : integrationDefaultPersonId;
        setSelectedPersonId((current: string): string =>
          current.trim().length > 0 ? current : defaultPersonId
        );
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
    selectedListing !== null &&
    !isCreating;

  const handleCreate = useCallback(async (): Promise<void> => {
    const personId = selectedPersonId.trim();
    if (!personId || !selectedListing) return;

    setIsCreating(true);
    setError(null);
    setRunId(null);

    try {
      const [personDetail, cvPayload] = await Promise.all([
        fetchJson<PersonDetailResponse>(`/api/filemaker/persons/${encodeURIComponent(personId)}`),
        fetchJson<CvListResponse>(`/api/filemaker/cvs?personId=${encodeURIComponent(personId)}`),
      ]);
      const applicationContext = {
        version: 1,
        platformContext: buildPlatformContext(defaultConnection, jobApplicationSettings),
        personContext: {
          selectedPersonId: personId,
          person: personDetail.person ?? null,
          linkedRecords: {
            linkedAddresses: personDetail['linkedAddresses'] ?? [],
            linkedAnyParams: personDetail['linkedAnyParams'] ?? [],
            linkedAnyTexts: personDetail['linkedAnyTexts'] ?? [],
            linkedBankAccounts: personDetail['linkedBankAccounts'] ?? [],
            linkedContracts: personDetail['linkedContracts'] ?? [],
            linkedDocuments: personDetail['linkedDocuments'] ?? [],
            linkedOccupations: personDetail['linkedOccupations'] ?? [],
            linkedWebsites: personDetail['linkedWebsites'] ?? [],
          },
          cvs: Array.isArray(cvPayload.cvs) ? cvPayload.cvs : [],
        },
        jobContext: {
          selectedJobListingId: selectedListing.id,
          listing: selectedListing,
        },
        organizationContext: {
          selectedOrganizationId,
          organization,
        },
        generationRequest: {
          artifacts: ['tailored_cv', 'cover_letter'],
          language: 'match_job_listing',
          promptGoal:
            'Prepare a tailored CV and cover letter for this person, job listing, and organisation.',
        },
        outputContract: APPLICATION_OUTPUT_CONTRACT,
      };
      const entityId = `${organization.id}:${selectedListing.id}:${personId}`;

      await fireAiPathTriggerEvent({
        triggerEventId: JOB_APPLICATION_PREPARE_TRIGGER_BUTTON_ID,
        triggerLabel: JOB_APPLICATION_PREPARE_TRIGGER_NAME,
        preferredPathId: JOB_APPLICATION_PREPARE_PATH_ID,
        entityType: 'custom',
        entityId,
        getEntityJson: () => ({
          id: entityId,
          applicationContext,
        }),
        source: {
          tab: 'filemaker_organization',
          location: JOB_APPLICATION_PREPARE_TRIGGER_LOCATION,
          page: 'organization_jobs',
        },
        extras: {
          applicationContext,
          mode: 'click',
          outputContract: APPLICATION_OUTPUT_CONTRACT,
        },
        onSuccess: (nextRunId: string): void => {
          setRunId(nextRunId);
          onCreated?.();
        },
        onError: (message: string): void => {
          setError(message);
        },
        onFinished: (): void => {
          setIsCreating(false);
        },
      });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to prepare application.');
      setIsCreating(false);
    }
  }, [
    defaultConnection,
    fireAiPathTriggerEvent,
    jobApplicationSettings,
    onCreated,
    organization,
    selectedOrganizationId,
    selectedListing,
    selectedPersonId,
  ]);

  const handleCreateClick = (): void => {
    handleCreate().catch((createError: unknown): void => {
      setError(createError instanceof Error ? createError.message : 'Failed to prepare application.');
      setIsCreating(false);
    });
  };

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title='Prepare application'
      subtitle='Candidate, job, and organisation context'
      size='lg'
      footer={
        <>
          <Button type='button' variant='outline' onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button type='button' onClick={handleCreateClick} disabled={!canCreate}>
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </>
      }
    >
      <div className='space-y-4'>
        <div className='grid gap-3 md:grid-cols-3'>
          <FormField label='Person context'>
            <SelectSimple
              value={selectedPersonId.trim().length > 0 ? selectedPersonId : NO_PERSON_VALUE}
              onValueChange={(value: string): void =>
                setSelectedPersonId(value === NO_PERSON_VALUE ? '' : value)
              }
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
          {runId ? <span className='text-emerald-300'>Queued AI Path run: {runId}</span> : null}
          {error ? <span className='text-red-300'>{error}</span> : null}
        </div>
      </div>
    </DetailModal>
  );
}
