'use client';

/* eslint-disable complexity, max-lines, max-lines-per-function */

import { BriefcaseBusiness, FileText, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { MultiSelectOption } from '@/shared/ui/forms-and-actions.public';
import {
  FormField,
  FormSection,
  MultiSelect,
  SelectSimple,
} from '@/shared/ui/forms-and-actions.public';
import { Badge, Button, Input, Textarea } from '@/shared/ui/primitives.public';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  useAdminFilemakerOrganizationEditPageActionsContext,
  useAdminFilemakerOrganizationEditPageStateContext,
} from '../../context/AdminFilemakerOrganizationEditPageContext';
import { JobApplicationPreparationModal } from './JobApplicationPreparationModal';
import { createClientFilemakerId, formatTimestamp } from '../../pages/filemaker-page-utils';
import { formatFilemakerLexiconCategory } from '../../pages/AdminFilemakerLexiconPage.helpers';
import {
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  createFilemakerJobListing,
  parseFilemakerDatabase,
  parseFilemakerEmailCampaignRegistry,
} from '../../settings';
import type {
  FilemakerEmailCampaign,
  FilemakerJobApplication,
  FilemakerJobListing,
  FilemakerJobListingSalaryPeriod,
  FilemakerJobListingStatus,
  FilemakerLexiconTerm,
} from '../../types';

const JOB_STATUS_OPTIONS: Array<{ value: FilemakerJobListingStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
];

const SALARY_PERIOD_OPTIONS: Array<{ value: FilemakerJobListingSalaryPeriod; label: string }> = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'fixed', label: 'Fixed' },
];

const toCampaignOption = (campaign: FilemakerEmailCampaign): MultiSelectOption => ({
  value: campaign.id,
  label: campaign.name.trim().length > 0 ? campaign.name : campaign.id,
});

const toLexiconOption = (term: FilemakerLexiconTerm): MultiSelectOption => ({
  value: term.id,
  label: `${term.label} (${formatFilemakerLexiconCategory(term.category)})`,
});

const lexiconTermHref = (term: FilemakerLexiconTerm): string => {
  const params = new URLSearchParams({
    category: term.category,
    query: term.label,
  });
  return `/admin/filemaker/lexicon?${params.toString()}`;
};

const addMissingCampaignOptions = (
  options: MultiSelectOption[],
  selectedCampaignIds: string[]
): MultiSelectOption[] => {
  const knownIds = new Set(options.map((option: MultiSelectOption): string => option.value));
  const missingOptions = selectedCampaignIds
    .filter((campaignId: string): boolean => campaignId.length > 0 && !knownIds.has(campaignId))
    .map((campaignId: string): MultiSelectOption => ({
      value: campaignId,
      label: `Missing campaign (${campaignId})`,
    }));
  return [...options, ...missingOptions];
};

const addMissingLexiconOptions = (
  options: MultiSelectOption[],
  selectedTermIds: string[]
): MultiSelectOption[] => {
  const knownIds = new Set(options.map((option: MultiSelectOption): string => option.value));
  const missingOptions = selectedTermIds
    .filter((termId: string): boolean => termId.length > 0 && !knownIds.has(termId))
    .map((termId: string): MultiSelectOption => ({
      value: termId,
      label: `Missing lexicon term (${termId})`,
    }));
  return [...options, ...missingOptions];
};

const buildLexiconOptions = (rawDatabase: unknown): MultiSelectOption[] =>
  parseFilemakerDatabase(rawDatabase)
    .lexiconTerms.slice()
    .sort((left: FilemakerLexiconTerm, right: FilemakerLexiconTerm): number => {
      const categoryCompare = left.category.localeCompare(right.category);
      if (categoryCompare !== 0) return categoryCompare;
      return left.label.localeCompare(right.label);
    })
    .map(toLexiconOption);

const formatSalary = (listing: FilemakerJobListing): string => {
  const currency = listing.salaryCurrency ?? '';
  const min = listing.salaryMin ?? null;
  const max = listing.salaryMax ?? null;
  if (min === null && max === null) return 'Salary not set';
  if (min !== null && max !== null) return `${min}-${max} ${currency}`.trim();
  if (min !== null) return `From ${min} ${currency}`.trim();
  return `Up to ${max ?? ''} ${currency}`.trim();
};

const createBlankJobListing = (organizationId: string): FilemakerJobListing =>
  createFilemakerJobListing({
    id: createClientFilemakerId('filemaker-job-listing'),
    organizationId,
    title: '',
    description: '',
    salaryCurrency: 'PLN',
    salaryPeriod: 'monthly',
    status: 'draft',
    targetedCampaignIds: [],
  });

type JobApplicationsState = {
  applications: FilemakerJobApplication[];
  error: string | null;
  isLoading: boolean;
};

const formatApplicationTitle = (application: FilemakerJobApplication): string => {
  const subject = application.coverLetter?.subject?.trim() ?? '';
  if (subject.length > 0) return subject;
  const cvTitle = application.tailoredCv?.title?.trim() ?? '';
  if (cvTitle.length > 0) return cvTitle;
  const jobTitle = application.jobTitle?.trim() ?? '';
  return jobTitle.length > 0 ? jobTitle : 'Draft application';
};

const formatApplicationPerson = (application: FilemakerJobApplication): string => {
  const personName = application.personName?.trim() ?? '';
  return personName.length > 0 ? personName : application.personId;
};

const formatApplicationPreview = (application: FilemakerJobApplication): string => {
  const body = application.coverLetter?.bodyMarkdown?.trim() ?? '';
  if (body.length === 0) return 'Cover letter draft created.';
  return body.length > 180 ? `${body.slice(0, 180).trim()}...` : body;
};

const cvApplicationHref = (application: FilemakerJobApplication): string | null => {
  if (application.tailoredCvId === null || application.personId.trim().length === 0) {
    return null;
  }
  return `/admin/filemaker/persons/${encodeURIComponent(
    application.personId
  )}/cvs/${encodeURIComponent(application.tailoredCvId)}`;
};

const groupApplicationsByJobListing = (
  applications: FilemakerJobApplication[]
): Map<string, FilemakerJobApplication[]> => {
  const groups = new Map<string, FilemakerJobApplication[]>();
  applications.forEach((application: FilemakerJobApplication): void => {
    const jobListingId = application.jobListingId.trim();
    if (jobListingId.length === 0) return;
    const group = groups.get(jobListingId) ?? [];
    group.push(application);
    groups.set(jobListingId, group);
  });
  return groups;
};

function JobApplicationsInline({
  applications,
}: {
  applications: FilemakerJobApplication[];
}): React.JSX.Element | null {
  if (applications.length === 0) return null;
  return (
    <div className='rounded-md border border-border/40 bg-background/20 p-3'>
      <div className='mb-2 flex items-center gap-2 text-xs font-semibold text-gray-200'>
        <FileText className='h-3.5 w-3.5 text-emerald-300' aria-hidden='true' />
        Prepared applications
      </div>
      <div className='space-y-2'>
        {applications.slice(0, 3).map((application: FilemakerJobApplication) => {
          const cvHref = cvApplicationHref(application);
          return (
            <div
              key={application.id}
              className='border-t border-border/40 pt-2 first:border-t-0 first:pt-0'
            >
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='min-w-0'>
                  <div className='truncate text-sm font-medium text-gray-100'>
                    {formatApplicationTitle(application)}
                  </div>
                  <div className='text-[11px] text-gray-500'>
                    {formatApplicationPerson(application)} · {formatTimestamp(application.createdAt)}
                  </div>
                </div>
                {cvHref !== null ? (
                  <a className='text-xs text-emerald-300 hover:underline' href={cvHref}>
                    Open CV
                  </a>
                ) : null}
              </div>
              <p className='mt-1 line-clamp-2 text-xs text-gray-400'>
                {formatApplicationPreview(application)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OrganizationJobListingsSection(): React.JSX.Element | null {
  const settingsStore = useSettingsStore();
  const { jobListings, organization } = useAdminFilemakerOrganizationEditPageStateContext();
  const { setJobListings } = useAdminFilemakerOrganizationEditPageActionsContext();
  const [applicationListingId, setApplicationListingId] = useState<string | null>(null);
  const [applicationsState, setApplicationsState] = useState<JobApplicationsState>({
    applications: [],
    error: null,
    isLoading: false,
  });
  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const organizationId = organization?.id ?? '';

  const campaignOptions = useMemo<MultiSelectOption[]>(() => {
    const registry = parseFilemakerEmailCampaignRegistry(rawCampaigns);
    return registry.campaigns.map(toCampaignOption);
  }, [rawCampaigns]);
  const lexiconOptions = useMemo<MultiSelectOption[]>(
    () => buildLexiconOptions(rawDatabase),
    [rawDatabase]
  );
  const lexiconTermsById = useMemo(() => {
    const database = parseFilemakerDatabase(rawDatabase);
    return new Map(
      database.lexiconTerms.map((term: FilemakerLexiconTerm): [string, FilemakerLexiconTerm] => [
        term.id,
        term,
      ])
    );
  }, [rawDatabase]);

  const targetedCount = jobListings.filter(
    (listing: FilemakerJobListing): boolean => listing.targetedCampaignIds.length > 0
  ).length;
  const applicationsByJobListingId = useMemo(
    () => groupApplicationsByJobListing(applicationsState.applications),
    [applicationsState.applications]
  );

  const loadApplications = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (organizationId.trim().length === 0) {
        setApplicationsState({ applications: [], error: null, isLoading: false });
        return;
      }
      setApplicationsState((current: JobApplicationsState): JobApplicationsState => ({
        ...current,
        error: null,
        isLoading: true,
      }));
      try {
        const response = await fetch(
          `/api/filemaker/job-applications?organizationId=${encodeURIComponent(
            organizationId
          )}&limit=100`,
          signal ? { signal } : undefined
        );
        if (!response.ok) throw new Error(`Failed to load applications (${response.status}).`);
        const payload = (await response.json()) as { applications?: FilemakerJobApplication[] };
        setApplicationsState({
          applications: Array.isArray(payload.applications) ? payload.applications : [],
          error: null,
          isLoading: false,
        });
      } catch (error: unknown) {
        if (signal?.aborted === true) return;
        logClientError(error);
        setApplicationsState({
          applications: [],
          error: error instanceof Error ? error.message : 'Failed to load applications.',
          isLoading: false,
        });
      }
    },
    [organizationId]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadApplications(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadApplications]);

  const addListing = useCallback((): void => {
    if (!organization) return;
    setJobListings((current: FilemakerJobListing[]) => [
      ...current,
      createBlankJobListing(organization.id),
    ]);
  }, [organization, setJobListings]);

  const updateListing = useCallback(
    (listingId: string, patch: Record<string, unknown>): void => {
      setJobListings((current: FilemakerJobListing[]) =>
        current.map((listing: FilemakerJobListing): FilemakerJobListing => {
          if (listing.id !== listingId) return listing;
          return createFilemakerJobListing({
            ...listing,
            ...patch,
            updatedAt: new Date().toISOString(),
          });
        })
      );
    },
    [setJobListings]
  );

  const removeListing = useCallback(
    (listingId: string): void => {
      setJobListings((current: FilemakerJobListing[]) =>
        current.filter((listing: FilemakerJobListing): boolean => listing.id !== listingId)
      );
    },
    [setJobListings]
  );

  if (!organization) return null;

  return (
    <FormSection
      id='organization-job-listings'
      title={
        <span className='flex items-center gap-2'>
          <BriefcaseBusiness className='h-3.5 w-3.5 text-gray-400' aria-hidden='true' />
          Job listings
        </span>
      }
      className='space-y-4 p-4'
    >
      <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400'>
        <div>
          {jobListings.length} listing{jobListings.length === 1 ? '' : 's'} · {targetedCount}{' '}
          targeted
          {applicationsState.applications.length > 0
            ? ` · ${applicationsState.applications.length} applications`
            : ''}
          {applicationsState.isLoading ? ' · loading applications' : ''}
          {applicationsState.error !== null ? ` · ${applicationsState.error}` : ''}
        </div>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={(): void => {
              void loadApplications();
            }}
            disabled={applicationsState.isLoading}
            className='h-8 gap-1.5'
          >
            {applicationsState.isLoading ? (
              <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden='true' />
            ) : (
              <RefreshCw className='h-3.5 w-3.5' aria-hidden='true' />
            )}
            Applications
          </Button>
          <Button type='button' size='sm' onClick={addListing} className='h-8 gap-1.5'>
            <Plus className='h-3.5 w-3.5' aria-hidden='true' />
            Add listing
          </Button>
        </div>
      </div>

      {jobListings.length === 0 ? (
        <div className='rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-gray-500'>
          No job listings are attached to this organization.
        </div>
      ) : (
        <div className='space-y-3'>
          {jobListings.map((listing: FilemakerJobListing, index: number) => {
            const campaignSelectOptions = addMissingCampaignOptions(
              campaignOptions,
              listing.targetedCampaignIds
            );
            const lexiconSelectOptions = addMissingLexiconOptions(
              lexiconOptions,
              listing.lexiconTermIds
            );
            const selectedLexiconTerms = listing.lexiconTermIds
              .map((termId: string): FilemakerLexiconTerm | undefined => lexiconTermsById.get(termId))
              .filter((term): term is FilemakerLexiconTerm => term !== undefined);
            const applications = applicationsByJobListingId.get(listing.id) ?? [];
            const targeted = listing.targetedCampaignIds.length > 0;
            return (
              <div
                key={listing.id}
                id={`job-listing-${encodeURIComponent(listing.id)}`}
                className='space-y-4 rounded-md border border-border/60 bg-card/20 p-4'
              >
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div className='flex min-w-0 flex-wrap items-center gap-2'>
                    <Badge variant={targeted ? 'success' : 'warning'}>
                      {targeted ? 'Targeted' : 'Not targeted'}
                    </Badge>
                    <span className='min-w-0 text-sm font-medium text-gray-100'>
                      {listing.title.trim().length > 0
                        ? listing.title
                        : `Job listing ${index + 1}`}
                    </span>
                    <span className='text-xs text-gray-500'>{formatSalary(listing)}</span>
                    {(listing.postedAt ?? '').trim().length > 0 ? (
                      <Badge variant='outline'>Posted {listing.postedAt}</Badge>
                    ) : null}
                    {(listing.expiresAt ?? '').trim().length > 0 ? (
                      <Badge variant='outline'>Expires {listing.expiresAt}</Badge>
                    ) : null}
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-8 gap-1.5'
                      onClick={(): void => setApplicationListingId(listing.id)}
                      aria-label={`Prepare application for ${
                        listing.title.trim().length > 0
                          ? listing.title
                          : `Job listing ${index + 1}`
                      }`}
                      title='Prepare application'
                    >
                      <FileText className='h-3.5 w-3.5' aria-hidden='true' />
                      Prepare
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-8 gap-1.5'
                      onClick={(): void => removeListing(listing.id)}
                    >
                      <Trash2 className='h-3.5 w-3.5' aria-hidden='true' />
                      Remove
                    </Button>
                  </div>
                </div>

                <div className='grid gap-3 md:grid-cols-2'>
                  <FormField label='Job title'>
                    <Input
                      value={listing.title}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { title: event.target.value })
                      }
                      placeholder='e.g. Senior FileMaker Developer'
                      aria-label={`Job listing ${index + 1} title`}
                    />
                  </FormField>
                  <FormField label='Status'>
                    <SelectSimple
                      value={listing.status}
                      onValueChange={(value: string): void =>
                        updateListing(listing.id, {
                          status: value as FilemakerJobListingStatus,
                        })
                      }
                      options={JOB_STATUS_OPTIONS}
                      placeholder='Select status'
                      ariaLabel={`Job listing ${index + 1} status`}
                      title={`Job listing ${index + 1} status`}
                    />
                  </FormField>
                  <FormField label='Location'>
                    <Input
                      value={listing.location ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { location: event.target.value })
                      }
                      placeholder='e.g. Warsaw / Remote'
                      aria-label={`Job listing ${index + 1} location`}
                    />
                  </FormField>
                  <FormField label='Salary period'>
                    <SelectSimple
                      value={listing.salaryPeriod}
                      onValueChange={(value: string): void =>
                        updateListing(listing.id, {
                          salaryPeriod: value as FilemakerJobListingSalaryPeriod,
                        })
                      }
                      options={SALARY_PERIOD_OPTIONS}
                      placeholder='Select salary period'
                      ariaLabel={`Job listing ${index + 1} salary period`}
                      title={`Job listing ${index + 1} salary period`}
                    />
                  </FormField>
                  <FormField label='Posted at'>
                    <Input
                      value={listing.postedAt ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { postedAt: event.target.value })
                      }
                      placeholder='2026-04-28T10:00:00.000Z'
                      aria-label={`Job listing ${index + 1} posted date`}
                    />
                  </FormField>
                  <FormField label='Expires at'>
                    <Input
                      value={listing.expiresAt ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { expiresAt: event.target.value })
                      }
                      placeholder='2026-05-28T23:59:59.000Z'
                      aria-label={`Job listing ${index + 1} expiry date`}
                    />
                  </FormField>
                  <FormField label='Salary min'>
                    <Input
                      type='number'
                      min='0'
                      step='1'
                      value={listing.salaryMin ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { salaryMin: event.target.value })
                      }
                      aria-label={`Job listing ${index + 1} salary min`}
                    />
                  </FormField>
                  <FormField label='Salary max'>
                    <Input
                      type='number'
                      min='0'
                      step='1'
                      value={listing.salaryMax ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { salaryMax: event.target.value })
                      }
                      aria-label={`Job listing ${index + 1} salary max`}
                    />
                  </FormField>
                  <FormField label='Currency'>
                    <Input
                      value={listing.salaryCurrency ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateListing(listing.id, { salaryCurrency: event.target.value })
                      }
                      placeholder='PLN'
                      aria-label={`Job listing ${index + 1} salary currency`}
                    />
                  </FormField>
                  <FormField label='Lexicon tags'>
                    <MultiSelect
                      selected={listing.lexiconTermIds}
                      options={lexiconSelectOptions}
                      onChange={(termIds: string[]): void =>
                        updateListing(listing.id, { lexiconTermIds: termIds })
                      }
                      placeholder='Select tags'
                      searchPlaceholder='Search tags'
                      emptyMessage='No lexicon terms found.'
                      disabled={lexiconSelectOptions.length === 0}
                      ariaLabel={`Job listing ${index + 1} lexicon tags`}
                    />
                    {selectedLexiconTerms.length > 0 ? (
                      <div className='mt-2 flex flex-wrap gap-1'>
                        {selectedLexiconTerms.map((term: FilemakerLexiconTerm) => (
                          <Badge key={term.id} variant='outline'>
                            <a
                              href={lexiconTermHref(term)}
                              className='hover:underline'
                              title={`Open lexicon term: ${term.label}`}
                            >
                              {term.label}
                            </a>
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </FormField>
                  <FormField
                    label='Targeted campaigns'
                    description={
                      targeted
                        ? `Last marked targeted: ${formatTimestamp(listing.lastTargetedAt)}`
                        : 'No campaign targeting recorded.'
                    }
                  >
                    <MultiSelect
                      selected={listing.targetedCampaignIds}
                      options={campaignSelectOptions}
                      onChange={(campaignIds: string[]): void =>
                        updateListing(listing.id, {
                          targetedCampaignIds: campaignIds,
                          lastTargetedAt:
                            campaignIds.length > 0
                              ? listing.lastTargetedAt ?? new Date().toISOString()
                              : undefined,
                        })
                      }
                      placeholder='Select campaigns'
                      searchPlaceholder='Search campaigns'
                      emptyMessage='No campaigns found.'
                      disabled={campaignSelectOptions.length === 0}
                      ariaLabel={`Job listing ${index + 1} targeted campaigns`}
                    />
                  </FormField>
                  <FormField label='Description' className='md:col-span-2'>
                    <Textarea
                      value={listing.description}
                      rows={5}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
                        updateListing(listing.id, { description: event.target.value })
                      }
                      placeholder='Role responsibilities, requirements, benefits, and hiring notes.'
                      aria-label={`Job listing ${index + 1} description`}
                    />
                  </FormField>
                </div>
                <JobApplicationsInline applications={applications} />
              </div>
            );
          })}
        </div>
      )}
      <JobApplicationPreparationModal
        initialJobListingId={applicationListingId}
        isOpen={applicationListingId !== null}
        jobListings={jobListings}
        onClose={(): void => setApplicationListingId(null)}
        onCreated={(): void => {
          void loadApplications();
        }}
        organization={organization}
      />
    </FormSection>
  );
}
