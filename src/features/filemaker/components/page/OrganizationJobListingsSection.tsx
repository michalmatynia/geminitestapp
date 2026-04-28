'use client';

/* eslint-disable complexity, max-lines, max-lines-per-function */

import { BriefcaseBusiness, Plus, Trash2 } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';

import type { MultiSelectOption } from '@/shared/ui/forms-and-actions.public';
import {
  FormField,
  FormSection,
  MultiSelect,
  SelectSimple,
} from '@/shared/ui/forms-and-actions.public';
import { Badge, Button, Input, Textarea } from '@/shared/ui/primitives.public';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import {
  useAdminFilemakerOrganizationEditPageActionsContext,
  useAdminFilemakerOrganizationEditPageStateContext,
} from '../../context/AdminFilemakerOrganizationEditPageContext';
import { createClientFilemakerId, formatTimestamp } from '../../pages/filemaker-page-utils';
import {
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  createFilemakerJobListing,
  parseFilemakerEmailCampaignRegistry,
} from '../../settings';
import type {
  FilemakerEmailCampaign,
  FilemakerJobListing,
  FilemakerJobListingSalaryPeriod,
  FilemakerJobListingStatus,
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

export function OrganizationJobListingsSection(): React.JSX.Element | null {
  const settingsStore = useSettingsStore();
  const { jobListings, organization } = useAdminFilemakerOrganizationEditPageStateContext();
  const { setJobListings } = useAdminFilemakerOrganizationEditPageActionsContext();
  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);

  const campaignOptions = useMemo<MultiSelectOption[]>(() => {
    const registry = parseFilemakerEmailCampaignRegistry(rawCampaigns);
    return registry.campaigns.map(toCampaignOption);
  }, [rawCampaigns]);

  const targetedCount = jobListings.filter(
    (listing: FilemakerJobListing): boolean => listing.targetedCampaignIds.length > 0
  ).length;

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
        </div>
        <Button type='button' size='sm' onClick={addListing} className='h-8 gap-1.5'>
          <Plus className='h-3.5 w-3.5' aria-hidden='true' />
          Add listing
        </Button>
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
                  </div>
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
              </div>
            );
          })}
        </div>
      )}
    </FormSection>
  );
}
