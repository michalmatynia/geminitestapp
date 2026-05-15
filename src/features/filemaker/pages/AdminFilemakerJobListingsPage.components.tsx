'use client';

import React, { type ReactNode } from 'react';

import { formatTimestamp } from './filemaker-page-utils';
import type {
  FilemakerJobApplication,
  FilemakerJobApplicationLogEntry,
  FilemakerJobListing,
  FilemakerJobListingStatus,
} from '../types';

type EnrichedJobListing = FilemakerJobListing & {
  organizationName: string | null;
  isApplied: boolean;
  applicationId: string | null;
  applicationLog: FilemakerJobApplicationLogEntry[];
};

type ManualUnmarkTarget = {
  applicationId: string;
  removeLogEntryId?: string;
};

const normalizeSearchInput = (value: string | null | undefined): string => (value ?? '').trim();

const hasTrimmedText = (value: string | null | undefined): value is string =>
  normalizeSearchInput(value).length > 0;

const getLogEntryTimestamp = (entry: FilemakerJobApplicationLogEntry): number => {
  const value = Date.parse(entry.appliedAt);
  return Number.isFinite(value) ? value : 0;
};

const getApplicationTimestamp = (application: FilemakerJobApplication): number => {
  const updatedAt = Date.parse(application.updatedAt);
  if (Number.isFinite(updatedAt)) return updatedAt;
  const createdAt = Date.parse(application.createdAt);
  return Number.isFinite(createdAt) ? createdAt : 0;
};

const STATUS_VARIANT_MAP: Record<
  FilemakerJobListingStatus,
  'success' | 'warning' | 'outline' | 'destructive'
> = {
  open: 'success',
  draft: 'outline',
  paused: 'warning',
  closed: 'destructive',
};

const getSalaryText = (listing: FilemakerJobListing): string | null => {
  const customSalary = normalizeSearchInput(listing.salaryText);
  if (customSalary.length > 0) return customSalary;

  if (listing.salaryMin === null || listing.salaryMin === undefined) return null;

  const minText = listing.salaryMin.toLocaleString();
  const maxText =
    listing.salaryMax !== null && listing.salaryMax !== undefined
      ? `–${listing.salaryMax.toLocaleString()}`
      : '';
  const currency = hasTrimmedText(listing.salaryCurrency)
    ? normalizeSearchInput(listing.salaryCurrency)
    : 'PLN';

  return `${minText}${maxText} ${currency}`;
};

const getPersonDisplayName = (entry: FilemakerJobApplicationLogEntry): string => {
  if (hasTrimmedText(entry.personName)) return entry.personName;
  if (hasTrimmedText(entry.personId)) return entry.personId;
  return 'Unknown';
};

const getTrimmedId = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const isManualUnmarkLogEntry = (
  entry: FilemakerJobApplicationLogEntry,
  normalizedPersonId: string
): entry is FilemakerJobApplicationLogEntry =>
  entry.method === 'manual' &&
  (entry.toStatus === undefined || entry.toStatus === null || entry.toStatus === 'applied') &&
  ((entry.personId ?? '').trim().length === 0 || (entry.personId ?? '').trim() === normalizedPersonId);

type ManualUnmarkCandidate = ManualUnmarkTarget & {
  appliedAt: number;
};

const toManualUnmarkCandidates = (
  application: FilemakerJobApplication,
  normalizedPersonId: string
): ManualUnmarkCandidate[] => {
  if (application.personId.trim() !== normalizedPersonId) return [];
  return (application.applicationLog ?? [])
    .map((entry: FilemakerJobApplicationLogEntry): ManualUnmarkCandidate | null => {
      if (!isManualUnmarkLogEntry(entry, normalizedPersonId)) return null;
      const removeLogEntryId = getTrimmedId(entry.id);
      if (removeLogEntryId === null) return null;
      return {
        applicationId: application.id,
        removeLogEntryId,
        appliedAt: getLogEntryTimestamp(entry),
      };
    })
    .filter((target): target is ManualUnmarkCandidate => target !== null);
};

const selectManualUnmarkTargetFromApplications = (
  applications: FilemakerJobApplication[],
  personId: string
): ManualUnmarkTarget | null => {
  const normalizedPersonId = normalizeSearchInput(personId);
  if (normalizedPersonId.length === 0) return null;

  const manualTargets = applications.flatMap((application) =>
    toManualUnmarkCandidates(application, normalizedPersonId)
  );

  const latestManualTarget = manualTargets.sort(
    (left: ManualUnmarkCandidate, right: ManualUnmarkCandidate): number =>
      right.appliedAt - left.appliedAt
  )[0];

  if (latestManualTarget !== undefined) {
    return {
      applicationId: latestManualTarget.applicationId,
      removeLogEntryId: latestManualTarget.removeLogEntryId,
    };
  }

  const statusTargets = applications
    .filter(
      (application: FilemakerJobApplication): boolean =>
        application.personId.trim() === normalizedPersonId && application.status === 'applied'
    )
    .sort((left: FilemakerJobApplication, right: FilemakerJobApplication) => {
      return getApplicationTimestamp(right) - getApplicationTimestamp(left);
    })
    .map((application: FilemakerJobApplication) => application.id);

  if (statusTargets.length === 0) return null;
  return { applicationId: statusTargets[0] };
};

const parseJobApplicationsPayload = (value: unknown): FilemakerJobApplication[] => {
  const applications = (value as { applications?: unknown }).applications;
  if (!Array.isArray(applications)) return [];
  return applications.filter((candidate): candidate is FilemakerJobApplication => {
    if (typeof candidate !== 'object' || candidate === null) return false;
    if (!('id' in candidate)) return false;
    return true;
  });
};

const resolveManualUnmarkFallback = (mutableApplicationId: string | null): ManualUnmarkTarget | null => {
  const fallbackId = mutableApplicationId?.trim();
  return fallbackId === undefined || fallbackId.length === 0 ? null : { applicationId: fallbackId };
};

function SalaryCell({ listing }: { listing: FilemakerJobListing }): ReactNode {
  const salaryText = getSalaryText(listing);
  if (salaryText === null) return null;
  return <span>{salaryText}</span>;
}

function ApplicationLogTime({ appliedAt }: { appliedAt: string }): React.JSX.Element {
  return <span>{formatTimestamp(appliedAt)}</span>;
}

function ManualLogLabel({ method }: { method: string }): React.JSX.Element | null {
  if (method !== 'manual') return null;
  return <span className='rounded bg-gray-800 px-1 py-0.5 text-[10px] text-gray-500'>manual</span>;
}

export type { EnrichedJobListing, ManualUnmarkTarget };
export {
  ApplicationLogTime,
  ManualLogLabel,
  SalaryCell,
  getPersonDisplayName,
  hasTrimmedText,
  normalizeSearchInput,
  parseJobApplicationsPayload,
  resolveManualUnmarkFallback,
  selectManualUnmarkTargetFromApplications,
  STATUS_VARIANT_MAP,
};
