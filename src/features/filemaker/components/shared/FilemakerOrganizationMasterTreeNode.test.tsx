// @vitest-environment jsdom

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import {
  toFilemakerOrganizationEventNodeId,
  toFilemakerOrganizationJobListingNodeId,
  toFilemakerOrganizationNodeId,
} from '../../entity-master-tree';
import type { FilemakerEvent, FilemakerJobListing, FilemakerOrganization } from '../../types';
import { FilemakerOrganizationMasterTreeNode } from './FilemakerOrganizationMasterTreeNode';

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Checkbox: ({
    'aria-label': ariaLabel,
    checked,
    onCheckedChange,
    onClick,
  }: {
    'aria-label'?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    onClick?: React.MouseEventHandler<HTMLInputElement>;
  }) => (
    <input
      type='checkbox'
      aria-label={ariaLabel}
      checked={checked === true}
      onClick={onClick}
      onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
        onCheckedChange?.(event.currentTarget.checked);
      }}
    />
  ),
}));

const timestamp = '2026-03-01T10:00:00.000Z';

const organizationFixture: FilemakerOrganization = {
  id: 'org-1',
  name: 'Acme Inc',
  addressId: '',
  street: '',
  streetNumber: '',
  city: '',
  postalCode: '',
  country: '',
  countryId: '',
  createdAt: timestamp,
  updatedAt: timestamp,
};

const eventFixture: FilemakerEvent = {
  id: 'event-1',
  eventName: 'Spring Fair',
  addressId: '',
  street: '',
  streetNumber: '',
  city: 'Warsaw',
  postalCode: '',
  country: '',
  countryId: '',
  createdAt: timestamp,
  updatedAt: timestamp,
};

const jobListingFixture: FilemakerJobListing = {
  id: 'job-1',
  organizationId: 'org-1',
  title: 'Frontend Developer',
  description: 'Build interfaces.',
  location: 'Warszawa',
  salaryMin: null,
  salaryMax: null,
  salaryPeriod: 'monthly',
  status: 'open',
  targetedCampaignIds: [],
  postedAt: '2026-04-28T09:00:00.000Z',
  expiresAt: '2026-05-28T23:59:59.000Z',
  lexiconTermIds: [],
  createdAt: timestamp,
  updatedAt: timestamp,
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
    id: toFilemakerOrganizationNodeId('org-1'),
    type: 'file',
    kind: 'filemaker_organization',
    parentId: null,
    name: 'Acme Inc',
    path: 'organizations/Acme Inc',
    sortOrder: 0,
    metadata: {
      entity: 'filemaker_organization',
      eventCount: 1,
      jobListingCount: 0,
      rawId: 'org-1',
    },
    children: [],
  },
  nodeStatus: null,
  select: vi.fn(),
  startRename: vi.fn(),
  toggleExpand: vi.fn(),
  ...overrides,
});

const renderOrganizationNode = (
  overrides: Partial<FolderTreeViewportRenderNodeInput> = {},
  propOverrides: Partial<React.ComponentProps<typeof FilemakerOrganizationMasterTreeNode>> = {}
) => {
  const props = {
    ...createRenderInput(overrides),
    eventsById: new Map<string, FilemakerEvent>([['event-1', eventFixture]]),
    jobListingsById: new Map<string, FilemakerJobListing>([['job-1', jobListingFixture]]),
    organizationById: new Map<string, FilemakerOrganization>([['org-1', organizationFixture]]),
    organizationEmailScrapeState: {},
    organizationWebsiteSocialScrapeState: {},
    organizationSelection: {},
    onLaunchOrganizationEmailScrape: vi.fn(),
    onLaunchOrganizationWebsiteSocialScrape: vi.fn(),
    onOpenEvent: vi.fn(),
    onOpenJobListing: vi.fn(),
    onOpenOrganization: vi.fn(),
    onToggleOrganizationSelection: vi.fn(),
    ...propOverrides,
  };
  render(<FilemakerOrganizationMasterTreeNode {...props} />);
  return props;
};

describe('FilemakerOrganizationMasterTreeNode', () => {
  it('opens the organization only from the name, while explicit expand expands relations', async () => {
    const user = userEvent.setup();
    const props = renderOrganizationNode({ hasChildren: true });

    const titleButton = screen.getByRole('button', { name: 'Acme Inc' });
    expect(titleButton).toHaveClass('cursor-pointer');

    await user.click(titleButton);

    expect(props.onOpenOrganization).toHaveBeenCalledWith('org-1');
    expect(screen.queryByRole('button', { name: 'Edit organization Acme Inc' })).toBeNull();
    expect(props.toggleExpand).not.toHaveBeenCalled();
    expect(props.select).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Expand Acme Inc/i }));

    expect(props.toggleExpand).toHaveBeenCalledTimes(1);
    expect(props.onOpenOrganization).toHaveBeenCalledTimes(1);
    expect(props.select).not.toHaveBeenCalled();
  });

  it('uses text cursors for supporting text and does not select the row on text click', async () => {
    const user = userEvent.setup();
    const props = renderOrganizationNode({ hasChildren: true });
    const metadataText = screen.getByText(
      (_content: string, element: Element | null): boolean =>
        element?.tagName === 'SPAN' && element.textContent?.includes('NIP:') === true
    );
    const metadata = metadataText.closest('div');
    expect(metadata).not.toBeNull();
    const formattedTimestamp = new Date(timestamp).toLocaleString();
    const createdAtColumn = screen.getByLabelText(`Created at ${formattedTimestamp}`);
    const createdAtText = within(createdAtColumn).getByText(formattedTimestamp);

    expect(metadata as HTMLElement).toHaveClass('cursor-default');
    expect(metadataText).toHaveClass('cursor-text', 'select-text');
    expect(createdAtColumn).toHaveClass('cursor-default');
    expect(createdAtText).toHaveClass('cursor-text', 'select-text');

    await user.click(metadata as HTMLElement);
    await user.click(createdAtColumn);

    expect(props.select).not.toHaveBeenCalled();
    expect(props.toggleExpand).not.toHaveBeenCalled();
    expect(props.onOpenOrganization).not.toHaveBeenCalled();
  });

  it('toggles batch selection from the checkbox without navigating', async () => {
    const user = userEvent.setup();
    const props = renderOrganizationNode();

    await user.click(screen.getByRole('checkbox', { name: 'Select organization Acme Inc' }));

    expect(props.onToggleOrganizationSelection).toHaveBeenCalledWith('org-1', true);
    expect(props.onOpenOrganization).not.toHaveBeenCalled();
    expect(props.toggleExpand).not.toHaveBeenCalled();
  });

  it('shows when the organization record was created', () => {
    renderOrganizationNode();

    const formattedTimestamp = new Date(timestamp).toLocaleString();
    expect(screen.getByLabelText(`Created at ${formattedTimestamp}`)).toBeInTheDocument();
    expect(screen.getByLabelText(`Updated at ${formattedTimestamp}`)).toBeInTheDocument();
  });

  it('keeps relation counts in fixed columns so created dates stay aligned', () => {
    renderOrganizationNode();

    const eventsColumn = screen.getByLabelText('Events: 1');
    const jobsColumn = screen.getByLabelText('Jobs: 0');

    expect(eventsColumn).toHaveClass('w-20', 'cursor-default');
    expect(jobsColumn).toHaveClass('w-16', 'cursor-default');
    expect(within(eventsColumn).getByText('Events 1')).toBeInTheDocument();
    expect(within(jobsColumn).queryByText(/Jobs/u)).toBeNull();
  });

  it('shows job listing dates on organization job relation nodes', () => {
    renderOrganizationNode({
      node: {
        id: toFilemakerOrganizationJobListingNodeId('org-1', 'job-1'),
        type: 'file',
        kind: 'filemaker_organization_job_listing',
        parentId: toFilemakerOrganizationNodeId('org-1'),
        name: 'Frontend Developer',
        path: 'organizations/Acme Inc/jobs/Frontend Developer',
        sortOrder: 0,
        metadata: {
          entity: 'filemaker_organization_job_listing',
          organizationId: 'org-1',
          rawId: 'job-1',
        },
        children: [],
      },
    });

    expect(
      screen.getByText(
        'Warszawa | Posted: 2026-04-28T09:00:00.000Z | Expires: 2026-05-28T23:59:59.000Z'
      )
    ).toBeInTheDocument();
  });

  it('launches website/social/email scraping from the row action without navigating', async () => {
    const user = userEvent.setup();
    const props = renderOrganizationNode();

    await user.click(
      screen.getByRole('button', {
        name: 'Scrape website, social profiles, and emails for organization Acme Inc',
      })
    );

    expect(props.onLaunchOrganizationEmailScrape).toHaveBeenCalledWith('org-1');
    expect(props.onOpenOrganization).not.toHaveBeenCalled();
    expect(props.toggleExpand).not.toHaveBeenCalled();
  });

  it('launches website and social scraping from the row action without navigating', async () => {
    const user = userEvent.setup();
    const props = renderOrganizationNode();

    await user.click(
      screen.getByRole('button', {
        name: 'Discover website and social profiles for organization Acme Inc',
      })
    );

    expect(props.onLaunchOrganizationWebsiteSocialScrape).toHaveBeenCalledWith('org-1');
    expect(props.onOpenOrganization).not.toHaveBeenCalled();
    expect(props.toggleExpand).not.toHaveBeenCalled();
  });

  it('opens linked event child nodes', async () => {
    const user = userEvent.setup();
    const node = {
      id: toFilemakerOrganizationEventNodeId('org-1', 'event-1'),
      type: 'file' as const,
      kind: 'filemaker_organization_event_link',
      parentId: 'events-folder',
      name: 'Spring Fair',
      path: 'organizations/Acme Inc/events/Spring Fair',
      sortOrder: 0,
      metadata: { entity: 'filemaker_organization_event_link', rawId: 'event-1' },
      children: [],
    };
    const props = renderOrganizationNode({
      depth: 2,
      node,
    });

    await user.click(screen.getByText('Spring Fair'));

    expect(props.onOpenEvent).toHaveBeenCalledWith('event-1');
  });
});
