// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';

import { toFilemakerJobListingNodeId } from '../../entity-master-tree';
import type { EnrichedJobListing } from '../../pages/AdminFilemakerJobListingsPage.components';
import { FilemakerJobListingMasterTreeNode } from './FilemakerJobListingMasterTreeNode';

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
  Button: ({
    children,
    onClick,
    size: _size,
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
    size?: string;
    variant?: string;
  }) => (
    <button type='button' onClick={onClick} {...props}>
      {children}
    </button>
  ),
  useToast: () => ({ toast: vi.fn() }),
}));

const timestamp = '2026-03-01T10:00:00.000Z';

const listingFixture: EnrichedJobListing = {
  id: 'job-1',
  organizationId: 'org-1',
  organizationName: 'Acme Inc',
  title: 'Frontend Developer',
  description: 'Build interfaces.',
  location: 'Warszawa',
  salaryMin: null,
  salaryMax: null,
  salaryPeriod: 'monthly',
  status: 'open',
  sourceSite: 'pracuj.pl',
  sourceUrl: 'https://example.test/job-1',
  targetedCampaignIds: [],
  postedAt: '2026-04-28T09:00:00.000Z',
  expiresAt: '2026-05-28T23:59:59.000Z',
  lexiconTermIds: [],
  createdAt: timestamp,
  updatedAt: timestamp,
  isApplied: false,
  applicationId: null,
  applicationLog: [],
};

const createRenderInput = (
  overrides: Partial<FolderTreeViewportRenderNodeInput> = {}
): FolderTreeViewportRenderNodeInput => ({
  depth: 0,
  dropPosition: null,
  hasChildren: false,
  isDragging: false,
  isDropTarget: false,
  isExpanded: false,
  isMultiSelected: false,
  isRenaming: false,
  isSearchMatch: false,
  isSelected: false,
  node: {
    id: toFilemakerJobListingNodeId('job-1'),
    type: 'file',
    kind: 'filemaker_job_listing',
    parentId: null,
    name: 'Frontend Developer',
    path: 'job-listings/Frontend Developer',
    sortOrder: 0,
    metadata: {
      entity: 'filemaker_job_listing',
      organizationId: 'org-1',
      rawId: 'job-1',
    },
    children: [],
  },
  nodeStatus: null,
  select: vi.fn(),
  startRename: vi.fn(),
  toggleExpand: vi.fn(),
  ...overrides,
});

const renderJobListingNode = (
  overrides: Partial<FolderTreeViewportRenderNodeInput> = {}
) => {
  const props = {
    ...createRenderInput(overrides),
    jobListingById: new Map<string, EnrichedJobListing>([['job-1', listingFixture]]),
    onOpenJobListing: vi.fn(),
    onRefreshListings: vi.fn(),
    personId: 'person-1',
    personName: 'Jane Smith',
  };
  render(<FilemakerJobListingMasterTreeNode {...props} />);
  return props;
};

describe('FilemakerJobListingMasterTreeNode', () => {
  it('opens job listings only from the title and keeps supporting text inert', async () => {
    const user = userEvent.setup();
    const props = renderJobListingNode();

    const titleButton = screen.getByRole('button', { name: 'Frontend Developer' });
    const locationText = screen.getByText('Warszawa');

    expect(titleButton).toHaveClass('cursor-pointer');
    expect(locationText).toHaveClass('cursor-text', 'select-text');

    await user.click(locationText);

    expect(props.onOpenJobListing).not.toHaveBeenCalled();
    expect(props.select).not.toHaveBeenCalled();

    await user.click(titleButton);

    expect(props.onOpenJobListing).toHaveBeenCalledWith('org-1', 'job-1');
    expect(props.select).not.toHaveBeenCalled();
  });
});
