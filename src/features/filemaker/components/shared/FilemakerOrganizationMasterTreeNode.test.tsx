// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import {
  toFilemakerOrganizationEventNodeId,
  toFilemakerOrganizationNodeId,
} from '../../entity-master-tree';
import type { FilemakerEvent, FilemakerOrganization } from '../../types';
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
    jobListingsById: new Map(),
    organizationById: new Map<string, FilemakerOrganization>([['org-1', organizationFixture]]),
    organizationEmailScrapeState: {},
    organizationSelection: {},
    onLaunchOrganizationEmailScrape: vi.fn(),
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
  it('opens the organization only from the name, while row click expands', async () => {
    const user = userEvent.setup();
    const props = renderOrganizationNode({ hasChildren: true });

    await user.click(screen.getByText('Acme Inc'));

    expect(props.onOpenOrganization).toHaveBeenCalledWith('org-1');
    expect(props.toggleExpand).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Expand Acme Inc/i }));

    expect(props.toggleExpand).toHaveBeenCalledTimes(1);
    expect(props.onOpenOrganization).toHaveBeenCalledTimes(1);
  });

  it('toggles batch selection from the checkbox without navigating', async () => {
    const user = userEvent.setup();
    const props = renderOrganizationNode();

    await user.click(screen.getByRole('checkbox', { name: 'Select organization Acme Inc' }));

    expect(props.onToggleOrganizationSelection).toHaveBeenCalledWith('org-1', true);
    expect(props.onOpenOrganization).not.toHaveBeenCalled();
    expect(props.toggleExpand).not.toHaveBeenCalled();
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
