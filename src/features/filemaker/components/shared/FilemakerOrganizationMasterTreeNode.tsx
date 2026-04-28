'use client';
/* eslint-disable max-lines, max-lines-per-function, complexity */

import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Folder,
  FolderOpen,
  Globe2,
  Loader2,
  MailSearch,
} from 'lucide-react';
import React from 'react';

import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { Badge, Button, Checkbox } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import {
  fromFilemakerOrganizationEventNodeId,
  fromFilemakerOrganizationJobListingNodeId,
  fromFilemakerOrganizationNodeId,
} from '../../entity-master-tree';
import { formatFilemakerAddress } from '../../settings';
import type { FilemakerEvent, FilemakerJobListing, FilemakerOrganization } from '../../types';
import { formatTimestamp } from '../../pages/filemaker-page-utils';

type FilemakerOrganizationTreeNodeProps = FolderTreeViewportRenderNodeInput & {
  eventsById: ReadonlyMap<string, FilemakerEvent>;
  jobListingsById: ReadonlyMap<string, FilemakerJobListing>;
  organizationById: Map<string, FilemakerOrganization>;
  organizationEmailScrapeState: Record<string, boolean>;
  organizationWebsiteSocialScrapeState: Record<string, boolean>;
  organizationSelection: Record<string, boolean>;
  onLaunchOrganizationEmailScrape: (organizationId: string) => void;
  onLaunchOrganizationWebsiteSocialScrape: (organizationId: string) => void;
  onOpenEvent: (eventId: string) => void;
  onOpenJobListing: (organizationId: string, jobListingId: string) => void;
  onOpenOrganization: (organizationId: string) => void;
  onToggleOrganizationSelection: (organizationId: string, checked: boolean) => void;
};

type OrganizationGroupNodeProps = Pick<
  FolderTreeViewportRenderNodeInput,
  'node' | 'depth' | 'hasChildren' | 'isExpanded' | 'toggleExpand' | 'select'
> & {
  stateClassName: string;
};

type OrganizationLeafNodeProps = Pick<
  FolderTreeViewportRenderNodeInput,
  'depth' | 'hasChildren' | 'isExpanded' | 'select' | 'toggleExpand'
> & {
  eventCount: number;
  isEmailScrapeRunning: boolean;
  isSelectedForBatch: boolean;
  isWebsiteSocialScrapeRunning: boolean;
  jobListingCount: number;
  organization: FilemakerOrganization;
  stateClassName: string;
  onLaunchOrganizationEmailScrape: (organizationId: string) => void;
  onLaunchOrganizationWebsiteSocialScrape: (organizationId: string) => void;
  onOpenOrganization: (organizationId: string) => void;
  onToggleOrganizationSelection: (organizationId: string, checked: boolean) => void;
};

const resolveOrganizationTreeNodeStateClassName = (input: {
  isSelected: boolean;
  isSearchMatch: boolean;
}): string => {
  if (input.isSelected) return 'bg-blue-600 text-white shadow-sm';
  if (input.isSearchMatch) {
    return 'bg-blue-500/10 text-blue-100 ring-1 ring-inset ring-blue-500/30';
  }
  return 'text-gray-300 hover:bg-muted/40';
};

const formatOptionalOrganizationField = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : 'n/a';
};

const isTreeActivationKey = (event: React.KeyboardEvent<HTMLElement>): boolean =>
  event.key === 'Enter' || event.key === ' ';

const createTreeIndentStyle = (depth: number): React.CSSProperties => ({
  paddingLeft: `${depth * 16 + 8}px`,
});

const metadataNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

function TreeNodeSpacer(): React.JSX.Element {
  return <span className='inline-flex size-5 shrink-0' aria-hidden='true' />;
}

function OrganizationGroupToggleButton(props: {
  isExpanded: boolean;
  label: string;
  toggleExpand: () => void;
}): React.JSX.Element {
  const { isExpanded, label, toggleExpand } = props;

  return (
    <Button
      variant='ghost'
      size='sm'
      className='size-5 p-0 text-gray-500 hover:bg-white/10 hover:text-gray-300'
      onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
        event.preventDefault();
        event.stopPropagation();
        toggleExpand();
      }}
      aria-label={label}
      title={label}
    >
      {isExpanded ? <ChevronDown className='size-3.5' /> : <ChevronRight className='size-3.5' />}
    </Button>
  );
}

function FilemakerOrganizationGroupNode(props: OrganizationGroupNodeProps): React.JSX.Element {
  const { node, depth, hasChildren, isExpanded, toggleExpand, select, stateClassName } = props;
  const FolderIcon = isExpanded ? FolderOpen : Folder;

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
        if (hasChildren) toggleExpand();
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (!isTreeActivationKey(event)) return;
        event.preventDefault();
        if (hasChildren) toggleExpand();
      }}
    >
      {hasChildren ? (
        <OrganizationGroupToggleButton
          isExpanded={isExpanded}
          label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
          toggleExpand={toggleExpand}
        />
      ) : (
        <TreeNodeSpacer />
      )}
      <FolderIcon className='size-4 shrink-0 text-sky-300/80' />
      <div className='min-w-0 flex-1 truncate font-medium text-gray-100'>{node.name}</div>
      <Badge variant='outline' className='h-5 shrink-0 text-[10px]'>
        {metadataNumber(node.metadata?.['count'])}
      </Badge>
    </div>
  );
}

function FilemakerOrganizationLeafDetails(props: {
  organization: FilemakerOrganization;
  onOpenOrganization: (organizationId: string) => void;
}): React.JSX.Element {
  const { onOpenOrganization, organization } = props;
  const tradingName = organization.tradingName?.trim() ?? '';

  return (
    <div className='min-w-0 flex-1'>
      <button
        type='button'
        className='block max-w-full truncate text-left font-semibold text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
          event.preventDefault();
          event.stopPropagation();
          onOpenOrganization(organization.id);
        }}
      >
        {organization.name}
      </button>
      {tradingName.length > 0 ? (
        <div className='truncate text-[11px] italic text-gray-400'>{tradingName}</div>
      ) : null}
      <div className='truncate text-xs text-gray-300'>{formatFilemakerAddress(organization)}</div>
      <div className='truncate text-[10px] text-gray-600'>
        NIP: {formatOptionalOrganizationField(organization.taxId)} | KRS:{' '}
        {formatOptionalOrganizationField(organization.krs)} | Updated:{' '}
        {formatTimestamp(organization.updatedAt)}
      </div>
    </div>
  );
}

function OrganizationRelationBadges(props: {
  eventCount: number;
  jobListingCount: number;
}): React.JSX.Element | null {
  const { eventCount, jobListingCount } = props;
  if (eventCount === 0 && jobListingCount === 0) return null;

  return (
    <div className='hidden shrink-0 items-center gap-1 sm:flex'>
      {eventCount > 0 ? (
        <Badge variant='outline' className='h-5 text-[10px]'>
          Events {eventCount}
        </Badge>
      ) : null}
      {jobListingCount > 0 ? (
        <Badge variant='outline' className='h-5 text-[10px]'>
          Jobs {jobListingCount}
        </Badge>
      ) : null}
    </div>
  );
}

function FilemakerOrganizationLeafNode(props: OrganizationLeafNodeProps): React.JSX.Element {
  const {
    depth,
    eventCount,
    hasChildren,
    isEmailScrapeRunning,
    isExpanded,
    isSelectedForBatch,
    isWebsiteSocialScrapeRunning,
    jobListingCount,
    onLaunchOrganizationEmailScrape,
    onLaunchOrganizationWebsiteSocialScrape,
    onOpenOrganization,
    onToggleOrganizationSelection,
    organization,
    select,
    stateClassName,
    toggleExpand,
  } = props;

  return (
    <div
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm transition',
        stateClassName
      )}
      style={createTreeIndentStyle(depth)}
      role='button'
      tabIndex={0}
      onClick={(event: React.MouseEvent<HTMLDivElement>): void => {
        select(event);
        if (hasChildren) toggleExpand();
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (!isTreeActivationKey(event)) return;
        event.preventDefault();
        if (hasChildren) toggleExpand();
      }}
    >
      <Checkbox
        checked={isSelectedForBatch}
        aria-label={`Select organization ${organization.name}`}
        className='shrink-0'
        onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
          event.stopPropagation();
        }}
        onCheckedChange={(checked): void => {
          onToggleOrganizationSelection(organization.id, checked === true);
        }}
      />
      {hasChildren ? (
        <OrganizationGroupToggleButton
          isExpanded={isExpanded}
          label={isExpanded ? `Collapse ${organization.name}` : `Expand ${organization.name}`}
          toggleExpand={toggleExpand}
        />
      ) : (
        <TreeNodeSpacer />
      )}
      <Building2 className='size-4 shrink-0 text-blue-300' />
      <FilemakerOrganizationLeafDetails
        organization={organization}
        onOpenOrganization={onOpenOrganization}
      />
      <OrganizationRelationBadges eventCount={eventCount} jobListingCount={jobListingCount} />
      <Button
        type='button'
        variant='outline'
        size='icon'
        className='size-7 cursor-pointer'
        aria-label={`Discover website and social profiles for organization ${organization.name}`}
        title={
          isWebsiteSocialScrapeRunning
            ? `Discovering website and social profiles for organization ${organization.name}`
            : `Discover website and social profiles for organization ${organization.name}`
        }
        disabled={isWebsiteSocialScrapeRunning}
        onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
          event.preventDefault();
          event.stopPropagation();
          onLaunchOrganizationWebsiteSocialScrape(organization.id);
        }}
      >
        {isWebsiteSocialScrapeRunning ? (
          <Loader2 className='size-3.5 animate-spin' />
        ) : (
          <Globe2 className='size-3.5' />
        )}
      </Button>
      <Button
        type='button'
        variant='outline'
        size='icon'
        className='size-7 cursor-pointer'
        aria-label={`Scrape website, social profiles, and emails for organization ${organization.name}`}
        title={
          isEmailScrapeRunning
            ? `Scraping website, social profiles, and emails for organization ${organization.name}`
            : `Scrape website, social profiles, and emails for organization ${organization.name}`
        }
        disabled={isEmailScrapeRunning}
        onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
          event.preventDefault();
          event.stopPropagation();
          onLaunchOrganizationEmailScrape(organization.id);
        }}
      >
        {isEmailScrapeRunning ? (
          <Loader2 className='size-3.5 animate-spin' />
        ) : (
          <MailSearch className='size-3.5' />
        )}
      </Button>
    </div>
  );
}

function OrganizationRelationLinkNode(props: Pick<
  FolderTreeViewportRenderNodeInput,
  'depth' | 'node' | 'select'
> & {
  description: string;
  icon: React.ReactNode;
  label: string;
  metaBadge?: string;
  onOpen: () => void;
  stateClassName: string;
}): React.JSX.Element {
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

function FilemakerOrganizationEventLinkNode(
  props: Pick<FolderTreeViewportRenderNodeInput, 'depth' | 'node' | 'select'> & {
    event: FilemakerEvent | null;
    eventId: string;
    onOpenEvent: (eventId: string) => void;
    stateClassName: string;
  }
): React.JSX.Element {
  const { event, eventId, onOpenEvent } = props;
  return (
    <OrganizationRelationLinkNode
      {...props}
      description={
        event !== null
          ? `${event.city.trim().length > 0 ? event.city : 'No city'} | Updated: ${formatTimestamp(event.updatedAt)}`
          : eventId
      }
      icon={<CalendarDays className='size-4' aria-hidden='true' />}
      label={event?.eventName ?? props.node.name}
      onOpen={() => onOpenEvent(eventId)}
    />
  );
}

function FilemakerOrganizationJobListingLinkNode(
  props: Pick<FolderTreeViewportRenderNodeInput, 'depth' | 'node' | 'select'> & {
    jobListing: FilemakerJobListing | null;
    jobListingId: string;
    onOpenJobListing: (organizationId: string, jobListingId: string) => void;
    organizationId: string;
    stateClassName: string;
  }
): React.JSX.Element {
  const { jobListing, jobListingId, onOpenJobListing, organizationId } = props;
  const jobListingLocation = jobListing?.location?.trim() ?? '';
  return (
    <OrganizationRelationLinkNode
      {...props}
      description={
        jobListingLocation.length > 0 ? jobListingLocation : 'Open organization job listing'
      }
      icon={<BriefcaseBusiness className='size-4' aria-hidden='true' />}
      label={jobListing?.title ?? props.node.name}
      metaBadge={jobListing?.status}
      onOpen={() => onOpenJobListing(organizationId, jobListingId)}
    />
  );
}

export function FilemakerOrganizationMasterTreeNode(
  props: FilemakerOrganizationTreeNodeProps
): React.JSX.Element {
  const { node, isSelected, isSearchMatch, organizationById } = props;
  const organizationId = fromFilemakerOrganizationNodeId(node.id);
  const organization =
    organizationId !== null ? (organizationById.get(organizationId) ?? null) : null;
  const stateClassName = resolveOrganizationTreeNodeStateClassName({ isSelected, isSearchMatch });

  if (organization === null) {
    const eventLink = fromFilemakerOrganizationEventNodeId(node.id);
    if (eventLink !== null) {
      return (
        <FilemakerOrganizationEventLinkNode
          depth={props.depth}
          event={props.eventsById.get(eventLink.eventId) ?? null}
          eventId={eventLink.eventId}
          node={node}
          onOpenEvent={props.onOpenEvent}
          select={props.select}
          stateClassName={stateClassName}
        />
      );
    }

    const jobListingLink = fromFilemakerOrganizationJobListingNodeId(node.id);
    if (jobListingLink !== null) {
      return (
        <FilemakerOrganizationJobListingLinkNode
          depth={props.depth}
          jobListing={props.jobListingsById.get(jobListingLink.jobListingId) ?? null}
          jobListingId={jobListingLink.jobListingId}
          node={node}
          onOpenJobListing={props.onOpenJobListing}
          organizationId={jobListingLink.organizationId}
          select={props.select}
          stateClassName={stateClassName}
        />
      );
    }

    return <FilemakerOrganizationGroupNode {...props} stateClassName={stateClassName} />;
  }

  return (
    <FilemakerOrganizationLeafNode
      depth={props.depth}
      eventCount={metadataNumber(node.metadata?.['eventCount'])}
      hasChildren={props.hasChildren}
      isEmailScrapeRunning={props.organizationEmailScrapeState[organization.id] === true}
      isExpanded={props.isExpanded}
      isSelectedForBatch={props.organizationSelection[organization.id] === true}
      isWebsiteSocialScrapeRunning={
        props.organizationWebsiteSocialScrapeState[organization.id] === true
      }
      jobListingCount={metadataNumber(node.metadata?.['jobListingCount'])}
      organization={organization}
      select={props.select}
      stateClassName={stateClassName}
      onLaunchOrganizationEmailScrape={props.onLaunchOrganizationEmailScrape}
      onLaunchOrganizationWebsiteSocialScrape={
        props.onLaunchOrganizationWebsiteSocialScrape
      }
      onOpenOrganization={props.onOpenOrganization}
      onToggleOrganizationSelection={props.onToggleOrganizationSelection}
      toggleExpand={props.toggleExpand}
    />
  );
}
