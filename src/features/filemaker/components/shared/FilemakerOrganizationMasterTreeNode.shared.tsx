'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import React from 'react';

import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { Button } from '@/shared/ui/primitives.public';

import type { FilemakerEvent, FilemakerJobListing, FilemakerOrganization } from '../../types';

export type FilemakerOrganizationTreeNodeProps = FolderTreeViewportRenderNodeInput & {
  eventsById: ReadonlyMap<string, FilemakerEvent>;
  jobListingsById: ReadonlyMap<string, FilemakerJobListing>;
  jobListingsByOrganizationId?: ReadonlyMap<string, readonly FilemakerJobListing[]>;
  organizationById: Map<string, FilemakerOrganization>;
  organizationEmailScrapeState: Record<string, boolean>;
  organizationWebsiteSocialScrapeState: Record<string, boolean>;
  organizationSelection: Record<string, boolean>;
  onDeleteOrganization: (organization: FilemakerOrganization) => void;
  onLaunchOrganizationEmailScrape: (organizationId: string) => void;
  onLaunchOrganizationWebsiteSocialScrape: (organizationId: string) => void;
  onOpenEvent: (eventId: string) => void;
  onOpenJobListing: (organizationId: string, jobListingId: string) => void;
  onOpenOrganization: (organizationId: string) => void;
  onToggleOrganizationSelection: (organizationId: string, checked: boolean) => void;
};

export type OrganizationGroupNodeProps = Pick<
  FolderTreeViewportRenderNodeInput,
  'node' | 'depth' | 'hasChildren' | 'isExpanded' | 'toggleExpand' | 'select'
> & {
  stateClassName: string;
};

export type OrganizationLeafNodeProps = Pick<
  FolderTreeViewportRenderNodeInput,
  'depth' | 'hasChildren' | 'isExpanded' | 'toggleExpand'
> & {
  eventCount: number;
  isEmailScrapeRunning: boolean;
  isSelectedForBatch: boolean;
  isWebsiteSocialScrapeRunning: boolean;
  jobListings: readonly FilemakerJobListing[];
  jobListingCount: number;
  organization: FilemakerOrganization;
  stateClassName: string;
  onDeleteOrganization: (organization: FilemakerOrganization) => void;
  onLaunchOrganizationEmailScrape: (organizationId: string) => void;
  onLaunchOrganizationWebsiteSocialScrape: (organizationId: string) => void;
  onOpenOrganization: (organizationId: string) => void;
  onToggleOrganizationSelection: (organizationId: string, checked: boolean) => void;
};

export const resolveOrganizationTreeNodeStateClassName = (input: {
  isSelected: boolean;
  isSearchMatch: boolean;
}): string => {
  if (input.isSelected) return 'bg-blue-600 text-white shadow-sm';
  if (input.isSearchMatch) {
    return 'bg-blue-500/10 text-blue-100 ring-1 ring-inset ring-blue-500/30';
  }
  return 'text-gray-300 hover:bg-muted/40';
};

export const formatOptionalOrganizationField = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : 'n/a';
};

export const isTreeActivationKey = (event: React.KeyboardEvent<HTMLElement>): boolean =>
  event.key === 'Enter' || event.key === ' ';

export const createTreeIndentStyle = (depth: number): React.CSSProperties => ({
  paddingLeft: `${depth * 16 + 8}px`,
});

export const metadataNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

export const firstNonEmptyString = (
  ...values: Array<string | null | undefined>
): string | undefined => {
  for (const value of values) {
    const normalized = value?.trim() ?? '';
    if (normalized.length > 0) return normalized;
  }
  return undefined;
};

export const jobBoardProfileOriginUrl = (
  organization: FilemakerOrganization
): string | undefined => {
  const sourceUrl = organization.jobBoardSourceUrl?.trim() ?? '';
  if (sourceUrl.length > 0) return sourceUrl;
  const profileUrl = organization.jobBoardCompanyProfileUrl?.trim() ?? '';
  return /pracuj\.pl|justjoin\.it|nofluffjobs/iu.test(profileUrl) ? profileUrl : undefined;
};

export function TreeNodeSpacer(): React.JSX.Element {
  return <span className='inline-flex size-5 shrink-0' aria-hidden='true' />;
}

export function OrganizationGroupToggleButton(props: {
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
