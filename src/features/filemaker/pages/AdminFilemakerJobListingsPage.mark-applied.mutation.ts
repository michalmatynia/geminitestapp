'use client';

import type { MutationResult } from '@/shared/contracts/ui/queries';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';

import type { FilemakerJobApplication } from '../types';
import {
  normalizeSearchInput,
  parseJobApplicationsPayload,
  resolveManualUnmarkFallback,
  selectManualUnmarkTargetFromApplications,
  type ManualUnmarkTarget,
} from './AdminFilemakerJobListingsPage.components';

export type ApplicationInfoPayload = {
  application?: FilemakerJobApplication;
};

export type ManualMarkRequest = {
  url: string;
  method: 'POST' | 'PATCH';
  body: {
    removeLogEntryId?: string;
    status: 'draft' | 'ready' | 'applied' | 'rejected' | 'archived';
    action?: 'mark_applied_manual';
    jobListingId?: string;
    jobTitle?: string;
    organizationId?: string;
    organizationName?: string | null;
    personId?: string;
    personName?: string;
    sourceSite?: string | null;
    sourceUrl?: string | null;
  };
};

export type ManualMarkMutationVariables = {
  request: ManualMarkRequest;
  wasApplied: boolean;
};

export type ResolveManualUnmarkTargetVariables = {
  listingId: string;
  mutableApplicationId: string | null;
  personId: string;
};

export const useResolveManualUnmarkTargetMutation = (): MutationResult<
  ManualUnmarkTarget | null,
  ResolveManualUnmarkTargetVariables
> =>
  createMutationV2<ManualUnmarkTarget | null, ResolveManualUnmarkTargetVariables>({
    mutationKey: ['filemaker', 'job-applications', 'manual-unmark-target'],
    mutationFn: async ({ listingId, mutableApplicationId, personId }) => {
      const normalizedPersonId = normalizeSearchInput(personId);
      if (normalizedPersonId.length === 0) return null;

      const query = new URLSearchParams({
        jobListingId: listingId,
        personId: normalizedPersonId,
        limit: '100',
      });

      const response = await fetch(`/api/filemaker/job-applications?${query.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to load related applications (${response.status}).`);
      }

      const applications = parseJobApplicationsPayload(await response.json());
      const target = selectManualUnmarkTargetFromApplications(applications, normalizedPersonId);
      if (target === null) {
        return resolveManualUnmarkFallback(mutableApplicationId);
      }

      const resolvedId = target.applicationId.trim();
      if (resolvedId.length === 0) return null;
      return { ...target, applicationId: resolvedId };
    },
    meta: {
      source: 'features.filemaker.pages.AdminFilemakerJobListingsPage.resolveManualUnmarkTarget',
      operation: 'fetch',
      resource: 'filemaker.job-application',
      domain: 'files',
      description: 'Resolve the Filemaker job application target for manual unmark applied.',
      errorPresentation: 'toast',
    },
  });

export const useMarkAppliedMutation = (): MutationResult<
  ApplicationInfoPayload,
  ManualMarkMutationVariables
> =>
  createMutationV2<ApplicationInfoPayload, ManualMarkMutationVariables>({
    mutationKey: ['filemaker', 'job-applications', 'manual-mark'],
    mutationFn: async ({ request, wasApplied }) => {
      const response = await fetch(request.url, {
        method: request.method,
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(request.body),
      });
      if (!response.ok) {
        throw new Error(
          wasApplied
            ? `Failed to unmark application (${response.status}).`
            : `Failed to mark as applied (${response.status}).`
        );
      }
      return (await response.json()) as ApplicationInfoPayload;
    },
    meta: {
      source: 'features.filemaker.pages.AdminFilemakerJobListingsPage.markApplied',
      operation: 'update',
      resource: 'filemaker.job-application',
      domain: 'files',
      description: 'Manually mark or unmark a Filemaker job application as applied.',
      errorPresentation: 'toast',
    },
  });
