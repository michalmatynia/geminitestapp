'use client';

import { Building2 } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { Badge, Checkbox } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { resolveJobBoardOrigin } from '../../job-board-origin';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import { formatFilemakerAddress } from '../../settings';
import type { FilemakerJobListing, FilemakerOrganization } from '../../types';
import { JobBoardOriginBadge } from './JobBoardOriginBadge';
import { OrganizationLeafActions } from './FilemakerOrganizationMasterTreeNode.leaf-actions';
import {
  createTreeIndentStyle,
  firstNonEmptyString,
  formatOptionalOrganizationField,
  jobBoardProfileOriginUrl,
  OrganizationGroupToggleButton,
  type OrganizationLeafNodeProps,
  TreeNodeSpacer,
} from './FilemakerOrganizationMasterTreeNode.shared';

const organizationSourceSummary = (
  organization: FilemakerOrganization,
  jobListings: readonly FilemakerJobListing[]
): { badgeSourceSite: string | undefined; badgeSourceUrl: string | undefined; extraCount: number } => {
  const originUrl = jobBoardProfileOriginUrl(organization);
  const fallbackListing = jobListings.find(
    (listing) =>
      (listing.sourceSite ?? '').trim().length > 0 ||
      (listing.sourceUrl ?? '').trim().length > 0
  );
  const badgeSourceSite = firstNonEmptyString(
    organization.jobBoardSourceSite,
    fallbackListing?.sourceSite
  );
  const badgeSourceUrl = firstNonEmptyString(originUrl, fallbackListing?.sourceUrl);
  const primaryOrigin = resolveJobBoardOrigin({
    sourceLabel: organization.jobBoardSourceLabel,
    sourceSite: badgeSourceSite,
    sourceUrl: badgeSourceUrl,
  });
  const sourceLabels = new Set<string>();
  if (primaryOrigin !== null) sourceLabels.add(primaryOrigin.label);
  jobListings.forEach((listing) => {
    const origin = resolveJobBoardOrigin({ sourceSite: listing.sourceSite, sourceUrl: listing.sourceUrl });
    if (origin !== null) sourceLabels.add(origin.label);
  });
  return {
    badgeSourceSite,
    badgeSourceUrl,
    extraCount: Math.max(0, sourceLabels.size - (primaryOrigin === null ? 0 : 1)),
  };
};

function OrganizationNameAndOrigin(props: {
  jobListings: readonly FilemakerJobListing[];
  organization: FilemakerOrganization;
  onOpenOrganization: (organizationId: string) => void;
}): React.JSX.Element {
  const { badgeSourceSite, badgeSourceUrl, extraCount } = organizationSourceSummary(
    props.organization,
    props.jobListings
  );
  return (
    <div className='flex min-w-0 items-center gap-2'>
      <button
        type='button'
        className='inline-block max-w-full cursor-pointer select-text truncate align-top text-left font-semibold text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
          event.preventDefault();
          event.stopPropagation();
          props.onOpenOrganization(props.organization.id);
        }}
      >
        {props.organization.name}
      </button>
      <JobBoardOriginBadge
        compact
        extraCount={extraCount}
        sourceLabel={props.organization.jobBoardSourceLabel}
        sourceSite={badgeSourceSite}
        sourceUrl={badgeSourceUrl}
      />
    </div>
  );
}

function OrganizationTradingName(props: { organization: FilemakerOrganization }): React.JSX.Element | null {
  const tradingName = props.organization.tradingName?.trim() ?? '';
  if (tradingName.length === 0) return null;
  return (
    <div className='cursor-default text-[11px] italic text-gray-400'>
      <span className='inline-block max-w-full cursor-text select-text truncate align-top'>
        {tradingName}
      </span>
    </div>
  );
}

function FilemakerOrganizationLeafDetails(props: {
  jobListings: readonly FilemakerJobListing[];
  organization: FilemakerOrganization;
  onOpenOrganization: (organizationId: string) => void;
}): React.JSX.Element {
  const { jobListings, onOpenOrganization, organization } = props;
  return (
    <div className='min-w-0 flex-1 cursor-default'>
      <OrganizationNameAndOrigin
        jobListings={jobListings}
        organization={organization}
        onOpenOrganization={onOpenOrganization}
      />
      <OrganizationTradingName organization={organization} />
      <div className='cursor-default text-xs text-gray-300'>
        <span className='inline-block max-w-full cursor-text select-text truncate align-top'>
          {formatFilemakerAddress(organization)}
        </span>
      </div>
      <div className='cursor-default text-[10px] text-gray-600'>
        <span className='inline-block max-w-full cursor-text select-text truncate align-top'>
          NIP: {formatOptionalOrganizationField(organization.taxId)} | KRS:{' '}
          {formatOptionalOrganizationField(organization.krs)}
          <span className='md:hidden'> | Created: {formatTimestamp(organization.createdAt)}</span>
          {' | '}Updated: {formatTimestamp(organization.updatedAt)}
        </span>
      </div>
    </div>
  );
}

function OrganizationTimestampColumn(props: {
  label: string;
  timestamp: string;
  widthClassName: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'hidden shrink-0 cursor-default text-right text-xs font-medium text-gray-200 md:block',
        props.widthClassName
      )}
      aria-label={`${props.label} ${props.timestamp}`}
    >
      <span className='inline-block cursor-text select-text'>{props.timestamp}</span>
    </div>
  );
}

function OrganizationRelationCountColumn(props: {
  count: number;
  href?: string;
  label: string;
  widthClassName: string;
}): React.JSX.Element {
  const badge = (
    <Badge variant='outline' className='h-5 max-w-full truncate text-[10px]'>
      {props.label} {props.count}
    </Badge>
  );
  const content =
    props.href === undefined ? (
      badge
    ) : (
      <Link href={props.href} onClick={(event) => event.stopPropagation()}>
        {badge}
      </Link>
    );
  return (
    <div
      className={cn('hidden shrink-0 cursor-default justify-center md:flex', props.widthClassName)}
      aria-label={`${props.label}: ${props.count}`}
    >
      {props.count > 0 ? content : null}
    </div>
  );
}

function OrganizationLeafPrefix(props: OrganizationLeafNodeProps): React.JSX.Element {
  const { hasChildren, isExpanded, isSelectedForBatch, onToggleOrganizationSelection, organization } = props;
  return (
    <>
      <Checkbox
        checked={isSelectedForBatch}
        aria-label={`Select organization ${organization.name}`}
        className='shrink-0 cursor-pointer'
        onClick={(event: React.MouseEvent<HTMLButtonElement>): void => event.stopPropagation()}
        onCheckedChange={(checked): void =>
          onToggleOrganizationSelection(organization.id, checked === true)
        }
      />
      {hasChildren ? (
        <OrganizationGroupToggleButton
          isExpanded={isExpanded}
          label={isExpanded ? `Collapse ${organization.name}` : `Expand ${organization.name}`}
          toggleExpand={props.toggleExpand}
        />
      ) : (
        <TreeNodeSpacer />
      )}
      <Building2 className='size-4 shrink-0 text-blue-300' />
    </>
  );
}

export function FilemakerOrganizationLeafNode(props: OrganizationLeafNodeProps): React.JSX.Element {
  const { organization } = props;
  const jobListingsHref = `/admin/filemaker/organizations/${encodeURIComponent(organization.id)}/job-listings`;
  return (
    <div
      className={cn(
        'flex cursor-default items-center gap-2 rounded px-2 py-2 text-sm transition',
        props.stateClassName
      )}
      style={createTreeIndentStyle(props.depth)}
    >
      <OrganizationLeafPrefix {...props} />
      <FilemakerOrganizationLeafDetails {...props} />
      <OrganizationRelationCountColumn count={props.eventCount} label='Events' widthClassName='w-20' />
      <OrganizationRelationCountColumn
        count={props.jobListingCount}
        href={jobListingsHref}
        label='Jobs'
        widthClassName='w-16'
      />
      <OrganizationTimestampColumn
        label='Updated at'
        timestamp={formatTimestamp(organization.updatedAt)}
        widthClassName='w-44'
      />
      <OrganizationTimestampColumn
        label='Created at'
        timestamp={formatTimestamp(organization.createdAt)}
        widthClassName='w-44'
      />
      <OrganizationLeafActions {...props} />
    </div>
  );
}
