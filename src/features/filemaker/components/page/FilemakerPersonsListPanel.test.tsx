// @vitest-environment jsdom
/* eslint-disable max-lines-per-function */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PersonListState } from '../../pages/AdminFilemakerPersonsPage.types';

const { useAdminLayoutActionsMock, useAdminLayoutStateMock } = vi.hoisted(() => ({
  useAdminLayoutActionsMock: vi.fn(),
  useAdminLayoutStateMock: vi.fn(),
}));

vi.mock('@/shared/providers/AdminLayoutProvider', () => ({
  useAdminLayoutActions: () => useAdminLayoutActionsMock(),
  useAdminLayoutState: () => useAdminLayoutStateMock(),
}));

vi.mock('@/shared/lib/foldertree/public', () => ({
  FolderTreeViewportV2: () => <div data-testid='person-tree'>Tree</div>,
  MasterFolderTreeViewport: () => <div data-testid='person-tree'>Tree</div>,
  useMasterFolderTreeViewModel: () => ({
    appearance: { rootDropUi: null },
    capabilities: { multiSelect: {}, search: {} },
    controller: {},
    searchState: { isActive: false, results: [], matchNodeIds: new Set() },
    viewport: { scrollToNodeRef: { current: null } },
  }),
  useMasterFolderTreeShell: () => ({
    appearance: { rootDropUi: null },
    controller: {},
    viewport: { scrollToNodeRef: { current: null } },
  }),
}));

vi.mock('@/shared/ui/admin.public', () => ({
  AdminFilemakerBreadcrumbs: ({ current }: { current: string }) => (
    <nav data-testid='person-breadcrumbs'>{current}</nav>
  ),
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  FocusModeTogglePortal: ({
    isFocusMode,
    onToggleFocusMode,
  }: {
    isFocusMode: boolean;
    onToggleFocusMode: () => void;
  }) => (
    <button
      type='button'
      aria-label={isFocusMode ? 'Show side panels' : 'Hide side panels'}
      aria-pressed={String(isFocusMode)}
      onClick={onToggleFocusMode}
    />
  ),
  MasterTreeSettingsButton: () => <button type='button'>Tree settings</button>,
  Pagination: ({ showPageJump }: { showPageJump?: boolean }) => (
    <div data-testid='person-pagination' data-show-page-jump={String(showPageJump)}>
      Pagination
    </div>
  ),
}));

vi.mock('@/shared/ui/templates.public', () => ({
  FilterPanel: ({
    activeValues,
  }: {
    activeValues?: Record<string, unknown>;
  }) => (
    <div data-testid='person-filters' data-active-values={JSON.stringify(activeValues ?? {})}>
      Filters
    </div>
  ),
  StandardDataTablePanel: ({
    children,
    header,
  }: {
    children?: React.ReactNode;
    header?: React.ReactNode;
  }) => (
    <section>
      <div>{header}</div>
      <div>{children}</div>
    </section>
  ),
}));

import { FilemakerPersonsListPanel } from './FilemakerPersonsListPanel';

const findDivByExactClassName = (
  root: ParentNode,
  expectedClassName: string
): HTMLDivElement => {
  const match = Array.from(root.querySelectorAll('div')).find(
    (element): element is HTMLDivElement =>
      element instanceof HTMLDivElement && element.className === expectedClassName
  );
  if (!match) throw new Error(`Expected div with className "${expectedClassName}"`);
  return match;
};

const createProps = (overrides: Partial<PersonListState> = {}): PersonListState => ({
  actions: [
    {
      key: 'create-person',
      label: 'Create Person',
      onClick: vi.fn(),
    },
    {
      key: 'refresh',
      label: 'Refresh',
      onClick: vi.fn(),
    },
  ],
  error: null,
  filters: {
    address: 'all',
    bank: 'all',
    organization: 'all',
    updatedBy: '',
  },
  isLoading: false,
  nodes: [],
  onFilterChange: vi.fn(),
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
  onQueryChange: vi.fn(),
  onResetFilters: vi.fn(),
  onSortChange: vi.fn(),
  page: 1,
  pageSize: 48,
  query: '',
  renderNode: vi.fn(),
  shownCount: 12,
  sort: 'updatedAt_desc',
  totalCount: 42,
  totalCountIsExact: true,
  totalPages: 3,
  ...overrides,
});

describe('FilemakerPersonsListPanel', () => {
  beforeEach(() => {
    useAdminLayoutStateMock.mockReturnValue({ isMenuHidden: false });
    useAdminLayoutActionsMock.mockReturnValue({ setIsMenuHidden: vi.fn() });
  });

  it('mounts the focus-mode button and toggles the admin side menu', async () => {
    const user = userEvent.setup();
    const setIsMenuHidden = vi.fn();
    useAdminLayoutActionsMock.mockReturnValue({ setIsMenuHidden });

    render(<FilemakerPersonsListPanel {...createProps()} />);

    const button = screen.getByRole('button', { name: 'Show side panels' });
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await user.click(button);

    expect(setIsMenuHidden).toHaveBeenCalledWith(true);
  });

  it('matches the organization list header arrangement on desktop', () => {
    const { container } = render(<FilemakerPersonsListPanel {...createProps()} />);

    const desktopSection = findDivByExactClassName(container, 'hidden space-y-3 lg:block');
    const desktopHeaderRow = findDivByExactClassName(
      desktopSection,
      'flex flex-wrap items-start justify-between gap-3'
    );
    const desktopTitleStack = findDivByExactClassName(
      desktopHeaderRow,
      'space-y-1 shrink-0 min-w-max'
    );
    const desktopControlsRow = findDivByExactClassName(
      desktopHeaderRow,
      'flex flex-wrap items-center gap-2 pt-1 relative z-0 min-w-0 flex-1 justify-center'
    );
    const desktopSecondaryControlsRow = findDivByExactClassName(
      desktopSection,
      'flex w-full flex-wrap items-center gap-2'
    );

    expect(within(desktopTitleStack).getByRole('heading', { name: 'Persons' })).toBeInTheDocument();
    expect(within(desktopTitleStack).getByTestId('person-breadcrumbs')).toBeInTheDocument();
    expect(
      within(desktopTitleStack).queryByRole('button', { name: 'Create Person' })
    ).toBeNull();

    const createButton = within(desktopControlsRow).getByRole('button', {
      name: 'Create Person',
    });
    expect(createButton).toHaveClass('h-7', 'w-7', 'rounded-full');
    expect(within(desktopControlsRow).queryByRole('button', { name: 'Refresh' })).toBeNull();
    expect(within(desktopControlsRow).getByTestId('person-pagination')).toHaveAttribute(
      'data-show-page-jump',
      'true'
    );
    expect(
      within(desktopSecondaryControlsRow).getByRole('button', { name: 'Refresh' })
    ).toBeInTheDocument();

    const sharedFiltersRow = findDivByExactClassName(container, 'w-full');
    expect(within(sharedFiltersRow).getByTestId('person-filters')).toBeInTheDocument();
    expect(
      JSON.parse(within(sharedFiltersRow).getByTestId('person-filters').dataset.activeValues ?? '{}')
    ).toEqual({
      address: '',
      bank: '',
      organization: '',
      updatedBy: '',
    });

    const tableHeader = screen.getByTestId('person-table-header');
    expect(within(tableHeader).getByRole('button', { name: /Name/i })).toBeInTheDocument();
    expect(within(tableHeader).getByRole('button', { name: /Organisations/i })).toBeInTheDocument();
    expect(within(tableHeader).getByRole('button', { name: /Updated At/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(tableHeader).getByRole('button', { name: /Created At/i })).toBeInTheDocument();
    expect(
      tableHeader.compareDocumentPosition(screen.getByTestId('person-tree')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('changes person sorting from the table header row', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();

    render(<FilemakerPersonsListPanel {...createProps({ onSortChange })} />);

    await user.click(
      within(screen.getByTestId('person-table-header')).getByRole('button', {
        name: /Name/i,
      })
    );
    await user.click(
      within(screen.getByTestId('person-table-header')).getByRole('button', {
        name: /Organisations/i,
      })
    );
    await user.click(
      within(screen.getByTestId('person-table-header')).getByRole('button', {
        name: /Updated At/i,
      })
    );

    expect(onSortChange).toHaveBeenCalledWith('name_asc');
    expect(onSortChange).toHaveBeenCalledWith('organizationLinkCount_desc');
    expect(onSortChange).toHaveBeenCalledWith('updatedAt_asc');
  });
});
