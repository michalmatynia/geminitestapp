'use client';

import { BriefcaseBusiness, CalendarDays, ExternalLink } from 'lucide-react';
import React from 'react';

import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { Badge } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import type { FilemakerEvent, FilemakerJobListing } from '../../types';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import { JobBoardOriginBadge } from './JobBoardOriginBadge';
import {
  createTreeIndentStyle,
  isTreeActivationKey,
  TreeNodeSpacer,
} from './FilemakerOrganizationMasterTreeNode.shared';

function OrganizationRelationLinkNode(
  props: Pick<FolderTreeViewportRenderNodeInput, 'depth' | 'node' | 'select'> & {
    description: string;
    icon: React.ReactNode;
    label: string;
    metaBadge?: string;
    onOpen: () => void;
    stateClassName: string;
  }
): React.JSX.Element {
  const { depth, description, icon, label, metaBadge, node, onOpen, select, stateClassName } = props;
  const resolvedLabel = label.trim().length > 0 ? label : node.name;
  const normalizedMetaBadge = metaBadge?.trim() ?? '';

  return (
    <div
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition',
        stateClassName
      )}
      style={createTreeIndentStyle(depth)}
      role='button'
      tabIndex={0}
      onClick={(event: React.MouseEvent<HTMLDivElement>): void => {
        select(event);
        onOpen();
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (!isTreeActivationKey(event)) return;
        event.preventDefault();
        onOpen();
      }}
    >
      <TreeNodeSpacer />
      <span className='shrink-0 text-sky-300/90'>{icon}</span>
      <div className='min-w-0 flex-1'>
        <div className='truncate font-medium text-gray-100'>{resolvedLabel}</div>
        <div className='truncate text-[11px] text-gray-500'>{description}</div>
      </div>
      {normalizedMetaBadge.length > 0 ? (
        <Badge variant='outline' className='h-5 shrink-0 text-[10px] capitalize'>
          {normalizedMetaBadge}
        </Badge>
      ) : null}
      <ExternalLink className='size-3.5 shrink-0 text-gray-500' aria-hidden='true' />
    </div>
  );
}

export function FilemakerOrganizationEventLinkNode(
  props: Pick<FolderTreeViewportRenderNodeInput, 'depth' | 'node' | 'select'> & {
    event: FilemakerEvent | null;
    eventId: string;
    onOpenEvent: (eventId: string) => void;
    stateClassName: string;
  }
): React.JSX.Element {
  const { event, eventId, onOpenEvent } = props;
  const eventDescription =
    event !== null
      ? `${event.city.trim().length > 0 ? event.city : 'No city'} | Updated: ${formatTimestamp(event.updatedAt)}`
      : eventId;
  return (
    <OrganizationRelationLinkNode
      {...props}
      description={eventDescription}
      icon={<CalendarDays className='size-4' aria-hidden='true' />}
      label={event?.eventName ?? props.node.name}
      onOpen={() => onOpenEvent(eventId)}
    />
  );
}

const jobListingDatePart = (label: string, value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? `${label}: ${normalized}` : '';
};

const jobListingDescription = (jobListing: FilemakerJobListing | null): string => {
  if (jobListing === null) return 'Open organization job listing';
  const location = jobListing.location?.trim() ?? '';
  const parts = [
    location,
    jobListingDatePart('Posted', jobListing.postedAt),
    jobListingDatePart('Expires', jobListing.expiresAt),
  ].filter((part: string): boolean => part.length > 0);
  return parts.length > 0 ? parts.join(' | ') : 'Open organization job listing';
};

export function FilemakerOrganizationJobListingLinkNode(
  props: Pick<FolderTreeViewportRenderNodeInput, 'depth' | 'node'> & {
    jobListing: FilemakerJobListing | null;
    jobListingId: string;
    onOpenJobListing: (organizationId: string, jobListingId: string) => void;
    organizationId: string;
    stateClassName: string;
  }
): React.JSX.Element {
  const { jobListing, jobListingId, onOpenJobListing, organizationId } = props;
  const label = jobListing?.title ?? props.node.name;
  const resolvedLabel = label.trim().length > 0 ? label : props.node.name;
  const normalizedMetaBadge = jobListing !== null ? jobListing.status.trim() : '';

  return (
    <div
      className={cn(
        'flex cursor-default items-center gap-2 rounded px-2 py-1.5 text-sm transition',
        props.stateClassName
      )}
      style={createTreeIndentStyle(props.depth)}
    >
      <TreeNodeSpacer />
      <span className='shrink-0 text-sky-300/90'>
        <BriefcaseBusiness className='size-4' aria-hidden='true' />
      </span>
      <div className='min-w-0 flex-1 cursor-default'>
        <button
          type='button'
          className='inline-block max-w-full cursor-pointer select-text truncate align-top text-left font-medium text-gray-100 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
            event.preventDefault();
            event.stopPropagation();
            onOpenJobListing(organizationId, jobListingId);
          }}
        >
          {resolvedLabel}
        </button>
        <div className='cursor-default text-[11px] text-gray-500'>
          <span className='inline-block max-w-full cursor-text select-text truncate align-top'>
            {jobListingDescription(jobListing)}
          </span>
        </div>
      </div>
      {normalizedMetaBadge.length > 0 ? (
        <Badge variant='outline' className='h-5 shrink-0 text-[10px] capitalize'>
          {normalizedMetaBadge}
        </Badge>
      ) : null}
      <JobBoardOriginBadge
        compact
        sourceSite={jobListing?.sourceSite}
        sourceUrl={jobListing?.sourceUrl}
      />
      <ExternalLink className='size-3.5 shrink-0 text-gray-500' aria-hidden='true' />
    </div>
  );
}
