'use client';

import {
  BriefcaseBusiness,
  ExternalLink,
  Loader2,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';

import type { MutationResult } from '@/shared/contracts/ui/queries';
import { useMutationV2 } from '@/shared/lib/query-factories-v2';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { Button } from '@/shared/ui/primitives.public';

import type { FilemakerJobApplication } from '../../types';
import type { EnrichedJobListing } from '../../pages/AdminFilemakerJobListingsPage.components';
import { MarkAppliedButton } from '../../pages/AdminFilemakerJobListingsPage.mark-applied';

type JobListingApplicationState = {
  applicationId: string | null;
  deleteGen: number;
  isApplied: boolean;
  isDeleting: boolean;
  onApplicationUpdated: (application: FilemakerJobApplication | null) => void;
  onDeleteApplication: () => Promise<void>;
};

type DeleteApplicationVariables = {
  applicationId: string;
};

const useDeleteApplicationMutation = (): MutationResult<void, DeleteApplicationVariables> =>
  useMutationV2<void, DeleteApplicationVariables>({
    mutationKey: ['filemaker', 'job-applications', 'delete'],
    mutationFn: async (variables) => {
      const response = await fetch(
        `/api/filemaker/job-applications/${encodeURIComponent(variables.applicationId)}`,
        {
          method: 'DELETE',
          headers: withCsrfHeaders({}),
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to delete application (${response.status}).`);
      }
    },
    meta: {
      source: 'features.filemaker.components.shared.FilemakerJobListingMasterTreeNode.deleteApplication',
      operation: 'delete',
      resource: 'filemaker.job-application',
      domain: 'files',
      description: 'Delete a Filemaker job application from the listing tree action panel.',
      errorPresentation: 'toast',
    },
  });

export function useJobListingApplicationState(
  listing: EnrichedJobListing,
  onRefreshListings: () => Promise<void> | void
): JobListingApplicationState {
  const [applicationId, setApplicationId] = useState<string | null>(listing.applicationId);
  const [isApplied, setIsApplied] = useState<boolean>(listing.isApplied);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteGen, setDeleteGen] = useState<number>(0);
  const deleteApplicationMutation = useDeleteApplicationMutation();

  useEffect(() => {
    setApplicationId(listing.applicationId);
    setIsApplied(listing.isApplied);
  }, [listing.applicationId, listing.isApplied]);

  const onApplicationUpdated = useCallback((application: FilemakerJobApplication | null): void => {
    if (application === null) {
      setApplicationId(null);
      setIsApplied(false);
      return;
    }
    setApplicationId(application.id);
    setIsApplied(application.status === 'applied');
  }, []);

  const onDeleteApplication = useCallback(async (): Promise<void> => {
    if (applicationId === null) return;
    if (!window.confirm('Delete this application record? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await deleteApplicationMutation.mutateAsync({ applicationId });
      setApplicationId(null);
      setIsApplied(false);
      setDeleteGen((value: number) => value + 1);
      void onRefreshListings();
    } finally {
      setIsDeleting(false);
    }
  }, [applicationId, deleteApplicationMutation, onRefreshListings]);

  return {
    applicationId,
    deleteGen,
    isApplied,
    isDeleting,
    onApplicationUpdated,
    onDeleteApplication,
  };
}

function JobListingOrganizationLink(props: {
  listing: EnrichedJobListing;
  orgHref: string;
}): React.JSX.Element {
  return (
    <Link
      href={props.orgHref}
      className='inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      aria-label={`Open organisation job listings for ${props.listing.title}`}
      title='Open organisation job listings'
      onClick={(event: React.MouseEvent<HTMLAnchorElement>): void => {
        event.stopPropagation();
      }}
    >
      <BriefcaseBusiness className='size-3.5' aria-hidden='true' />
    </Link>
  );
}

function JobListingSourceLink(props: { listing: EnrichedJobListing }): React.JSX.Element | null {
  if ((props.listing.sourceUrl?.trim().length ?? 0) === 0) return null;
  return (
    <a
      href={props.listing.sourceUrl}
      target='_blank'
      rel='noreferrer'
      className='inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      aria-label={`Open source job listing for ${props.listing.title}`}
      title='Open source job listing'
      onClick={(event: React.MouseEvent<HTMLAnchorElement>): void => {
        event.stopPropagation();
      }}
    >
      <ExternalLink className='size-3.5' aria-hidden='true' />
    </a>
  );
}

function DeleteApplicationButton(props: {
  applicationId: string | null;
  isDeleting: boolean;
  listingTitle: string;
  onDeleteApplication: () => Promise<void>;
}): React.JSX.Element | null {
  if (props.applicationId === null) return null;
  return (
    <Button
      type='button'
      variant='outline'
      size='icon'
      className='size-7 shrink-0'
      aria-label={`Delete application record for ${props.listingTitle}`}
      title='Delete application record'
      disabled={props.isDeleting}
      onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
        event.preventDefault();
        event.stopPropagation();
        void props.onDeleteApplication();
      }}
    >
      {props.isDeleting ? (
        <Loader2 className='size-3.5 animate-spin' aria-hidden='true' />
      ) : (
        <Trash2 className='size-3.5' aria-hidden='true' />
      )}
    </Button>
  );
}

export function JobListingActionPanel(props: {
  applicationId: string | null;
  deleteGen: number;
  isApplied: boolean;
  isDeleting: boolean;
  listing: EnrichedJobListing;
  onApplicationUpdated: (application: FilemakerJobApplication | null) => void;
  onDeleteApplication: () => Promise<void>;
  onRefreshListings: () => Promise<void> | void;
  orgHref: string;
  personId: string;
  personName: string;
}): React.JSX.Element {
  return (
    <div className='flex shrink-0 flex-wrap items-center justify-end gap-2'>
      <MarkAppliedButton
        key={props.deleteGen}
        listing={props.listing}
        applicationId={props.applicationId}
        personId={props.personId}
        personName={props.personName}
        initialApplied={props.isApplied}
        onApplicationUpdated={props.onApplicationUpdated}
        onRefreshRequested={props.onRefreshListings}
      />
      <JobListingOrganizationLink listing={props.listing} orgHref={props.orgHref} />
      <JobListingSourceLink listing={props.listing} />
      <DeleteApplicationButton
        applicationId={props.applicationId}
        isDeleting={props.isDeleting}
        listingTitle={props.listing.title}
        onDeleteApplication={props.onDeleteApplication}
      />
    </div>
  );
}
