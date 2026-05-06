'use client';

/* eslint-disable max-lines */

import {
  BriefcaseBusiness,
  ExternalLink,
  Loader2,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';

import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { fromFilemakerJobListingNodeId } from '../../entity-master-tree';
import type { FilemakerJobApplication } from '../../types';
import {
  SalaryCell,
  STATUS_VARIANT_MAP,
} from '../../pages/AdminFilemakerJobListingsPage.components';
import type { EnrichedJobListing } from '../../pages/AdminFilemakerJobListingsPage.components';
import { MarkAppliedButton } from '../../pages/AdminFilemakerJobListingsPage.mark-applied';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import { JobBoardOriginBadge } from './JobBoardOriginBadge';

type FilemakerJobListingTreeNodeProps = FolderTreeViewportRenderNodeInput & {
  jobListingById: ReadonlyMap<string, EnrichedJobListing>;
  onOpenJobListing: (organizationId: string, jobListingId: string) => void;
  onRefreshListings: () => Promise<void> | void;
  personId: string;
  personName: string;
};

type JobListingLeafNodeProps = Pick<FolderTreeViewportRenderNodeInput, 'depth'> & {
  listing: EnrichedJobListing;
  onOpenJobListing: (organizationId: string, jobListingId: string) => void;
  onRefreshListings: () => Promise<void> | void;
  personId: string;
  personName: string;
  stateClassName: string;
};

type JobListingApplicationState = {
  applicationId: string | null;
  deleteGen: number;
  isApplied: boolean;
  isDeleting: boolean;
  onApplicationUpdated: (application: FilemakerJobApplication | null) => void;
  onDeleteApplication: () => Promise<void>;
};

const resolveJobListingTreeNodeStateClassName = (input: {
  isSearchMatch: boolean;
  isSelected: boolean;
}): string => {
  if (input.isSelected) return 'bg-blue-600 text-white shadow-sm';
  if (input.isSearchMatch) {
    return 'bg-blue-500/10 text-blue-100 ring-1 ring-inset ring-blue-500/30';
  }
  return 'text-gray-300 hover:bg-muted/40';
};

const createTreeIndentStyle = (depth: number): React.CSSProperties => ({
  paddingLeft: `${depth * 16 + 8}px`,
});

const hasText = (value: string | null | undefined): value is string =>
  (value?.trim().length ?? 0) > 0;

function TreeNodeSpacer(): React.JSX.Element {
  return <span className='inline-flex size-5 shrink-0' aria-hidden='true' />;
}

function useJobListingApplicationState(
  listing: EnrichedJobListing,
  onRefreshListings: () => Promise<void> | void
): JobListingApplicationState {
  const [applicationId, setApplicationId] = useState<string | null>(listing.applicationId);
  const [isApplied, setIsApplied] = useState<boolean>(listing.isApplied);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteGen, setDeleteGen] = useState<number>(0);

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
      const response = await fetch(
        `/api/filemaker/job-applications/${encodeURIComponent(applicationId)}`,
        {
          method: 'DELETE',
          headers: withCsrfHeaders({}),
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to delete application (${response.status}).`);
      }
      setApplicationId(null);
      setIsApplied(false);
      setDeleteGen((value: number) => value + 1);
      void onRefreshListings();
    } finally {
      setIsDeleting(false);
    }
  }, [applicationId, onRefreshListings]);

  return {
    applicationId,
    deleteGen,
    isApplied,
    isDeleting,
    onApplicationUpdated,
    onDeleteApplication,
  };
}

function JobListingTitle(props: {
  isApplied: boolean;
  listing: EnrichedJobListing;
  onOpenJobListing: (organizationId: string, jobListingId: string) => void;
}): React.JSX.Element {
  const { isApplied, listing, onOpenJobListing } = props;
  const title = listing.title.trim().length > 0 ? listing.title : 'Untitled listing';
  const statusVariant = STATUS_VARIANT_MAP[listing.status];

  return (
    <div className='flex min-w-0 flex-wrap items-center gap-2'>
      <button
        type='button'
        className='inline-block max-w-full cursor-pointer select-text truncate align-top text-left font-semibold text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
          event.preventDefault();
          event.stopPropagation();
          onOpenJobListing(listing.organizationId, listing.id);
        }}
      >
        {title}
      </button>
      <Badge variant={statusVariant} className='h-5 shrink-0 text-[10px] capitalize'>
        {listing.status}
      </Badge>
      {isApplied ? (
        <Badge variant='success' className='h-5 shrink-0 text-[10px]'>
          Applied
        </Badge>
      ) : null}
      <JobBoardOriginBadge compact sourceSite={listing.sourceSite} sourceUrl={listing.sourceUrl} />
    </div>
  );
}

function JobListingDetails(props: {
  isApplied: boolean;
  listing: EnrichedJobListing;
  onOpenJobListing: (organizationId: string, jobListingId: string) => void;
  orgHref: string;
}): React.JSX.Element {
  const { isApplied, listing, onOpenJobListing, orgHref } = props;
  const displayOrgName = listing.organizationName ?? listing.organizationId;

  return (
    <div className='min-w-0 flex-1 cursor-default'>
      <JobListingTitle
        isApplied={isApplied}
        listing={listing}
        onOpenJobListing={onOpenJobListing}
      />
      <div className='mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-300'>
        <Link
          href={orgHref}
          className='max-w-full truncate underline-offset-2 hover:underline'
          onClick={(event: React.MouseEvent<HTMLAnchorElement>): void => {
            event.stopPropagation();
          }}
        >
          {displayOrgName}
        </Link>
        {hasText(listing.location) ? (
          <span className='inline-block cursor-text select-text'>{listing.location}</span>
        ) : null}
        <SalaryCell listing={listing} />
        {hasText(listing.postedAt) ? (
          <span className='inline-block cursor-text select-text'>
            Posted {formatTimestamp(listing.postedAt)}
          </span>
        ) : null}
      </div>
      <div className='mt-0.5 truncate text-[10px] text-gray-600'>
        <span className='inline-block max-w-full cursor-text select-text truncate align-top'>
          Updated: {formatTimestamp(listing.updatedAt)}
          {hasText(listing.expiresAt) ? ` | Expires: ${formatTimestamp(listing.expiresAt)}` : ''}
        </span>
      </div>
    </div>
  );
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
  if (!hasText(props.listing.sourceUrl)) return null;
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

function JobListingActionPanel(props: {
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

function FilemakerJobListingLeafNode(props: JobListingLeafNodeProps): React.JSX.Element {
  const {
    listing,
    depth,
    onOpenJobListing,
    onRefreshListings,
    personId,
    personName,
    stateClassName,
  } = props;
  const orgHref = `/admin/filemaker/organizations/${encodeURIComponent(listing.organizationId)}/job-listings`;
  const applicationState = useJobListingApplicationState(listing, onRefreshListings);

  return (
    <div
      className={cn(
        'flex cursor-default items-center gap-2 rounded px-2 py-2 text-sm transition',
        stateClassName
      )}
      style={createTreeIndentStyle(depth)}
    >
      <TreeNodeSpacer />
      <BriefcaseBusiness className='size-4 shrink-0 text-blue-300' />
      <JobListingDetails
        isApplied={applicationState.isApplied}
        listing={listing}
        onOpenJobListing={onOpenJobListing}
        orgHref={orgHref}
      />
      <JobListingActionPanel
        applicationId={applicationState.applicationId}
        deleteGen={applicationState.deleteGen}
        isApplied={applicationState.isApplied}
        isDeleting={applicationState.isDeleting}
        listing={listing}
        onApplicationUpdated={applicationState.onApplicationUpdated}
        onDeleteApplication={applicationState.onDeleteApplication}
        onRefreshListings={onRefreshListings}
        orgHref={orgHref}
        personId={personId}
        personName={personName}
      />
    </div>
  );
}

export function FilemakerJobListingMasterTreeNode(
  props: FilemakerJobListingTreeNodeProps
): React.JSX.Element | null {
  const { isSearchMatch, isSelected, jobListingById, node } = props;
  const listingId = fromFilemakerJobListingNodeId(node.id);
  const listing = listingId !== null ? (jobListingById.get(listingId) ?? null) : null;
  if (listing === null) return null;
  const stateClassName = resolveJobListingTreeNodeStateClassName({ isSearchMatch, isSelected });

  return (
    <FilemakerJobListingLeafNode
      depth={props.depth}
      listing={listing}
      onOpenJobListing={props.onOpenJobListing}
      onRefreshListings={props.onRefreshListings}
      personId={props.personId}
      personName={props.personName}
      stateClassName={stateClassName}
    />
  );
}
