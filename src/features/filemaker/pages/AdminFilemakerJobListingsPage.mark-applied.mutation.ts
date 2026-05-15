'use client';

import type { MutationResult } from '@/shared/contracts/ui/queries';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';

import type { FilemakerJobApplication } from '../types';

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
