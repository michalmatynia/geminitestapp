// @vitest-environment jsdom

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrganizationListState } from '../../pages/AdminFilemakerOrganizationsPage.types';

const {
  useAdminLayoutActionsMock,
  useAdminLayoutStateMock,
} = vi.hoisted(() => ({
  useAdminLayoutActionsMock: vi.fn(),
  useAdminLayoutStateMock: vi.fn(),
}));

vi.mock('@/shared/providers/AdminLayoutProvider', () => ({
  useAdminLayoutActions: () => useAdminLayoutActionsMock(),
  useAdminLayoutState: () => useAdminLayoutStateMock(),
}));

vi.mock('@/shared/lib/foldertree/public', () => ({
  FolderTreeViewportV2: () => <div data-testid='organization-tree'>Tree</div>,
  useMasterFolderTreeShell: () => ({
    appearance: { rootDropUi: null },
    controller: {},
    viewport: { scrollToNodeRef: { current: null } },
  }),
}));

vi.mock('@/shared/ui/admin.public', () => ({
  AdminFilemakerBreadcrumbs: ({ current }: { current: string }) => (
    <nav data-testid='organization-breadcrumbs'>{current}</nav>
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

vi.mock('@/shared/ui/ActionMenu', () => ({
  ActionMenu: ({
    ariaLabel,
    children,
    trigger,
  }: {
    ariaLabel?: string;
    children?: React.ReactNode;
    trigger?: React.ReactNode;
  }) => (
    <div>
      <button type='button'>{trigger ?? ariaLabel ?? 'Open actions menu'}</button>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock('@/shared/ui/app-modal', () => ({
  AppModal: ({
    children,
    footer,
    isOpen,
    title,
  }: {
    children?: React.ReactNode;
    footer?: React.ReactNode;
    isOpen: boolean;
    title: string;
  }) =>
    isOpen ? (
      <section role='dialog' aria-label={title}>
        {children}
        {footer}
      </section>
    ) : null,
}));

vi.mock('@/shared/ui/chip', () => ({
  Chip: ({
    label,
    onClick,
  }: {
    label: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type='button' onClick={onClick}>
      {label}
    </button>
  ),
}));

vi.mock('@/shared/ui/dropdown-menu', () => ({
  DropdownMenuItem: ({
    children,
    disabled,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
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
    <div data-testid='organization-pagination' data-show-page-jump={String(showPageJump)}>
      Pagination
    </div>
  ),
}));

vi.mock('@/shared/ui/selection-bar', () => ({
  SelectionBar: ({
    actions,
    label,
    onSelectAllGlobal,
    rightActions,
    selectedCount,
  }: {
    actions?: React.ReactNode;
    label?: string;
    onSelectAllGlobal?: () => Promise<void>;
    rightActions?: React.ReactNode;
    selectedCount: number;
  }) => (
    <div data-testid='organization-selection-actions' data-selected-count={String(selectedCount)}>
      <span>{label}</span>
      {onSelectAllGlobal ? <button type='button'>Select All Resultset</button> : null}
      {actions}
      {rightActions}
    </div>
  ),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => (
    <span className={className} data-testid='organization-badge'>
      {children}
    </span>
  ),
}));

vi.mock('@/shared/ui/select-simple', () => ({
  SelectSimple: ({
    'aria-label': ariaLabel,
    ariaLabel: explicitAriaLabel,
    onValueChange,
    options,
    value,
  }: {
    'aria-label'?: string;
    ariaLabel?: string;
    onValueChange?: (value: string) => void;
    options: Array<{ label: string; value: string }>;
    value?: string;
  }) => (
    <select
      aria-label={ariaLabel ?? explicitAriaLabel}
      value={value ?? ''}
      onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
        onValueChange?.(event.target.value)
      }
    >
      <option value=''>Filter presets</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/shared/ui/templates.public', () => ({
  FilterPanel: ({ actions }: { actions?: React.ReactNode }) => (
    <div data-testid='organization-filters'>
      Filters
      {actions}
    </div>
  ),
  StandardDataTablePanel: ({
    actions,
    children,
    header,
  }: {
    actions?: React.ReactNode;
    children?: React.ReactNode;
    header?: React.ReactNode;
  }) => (
    <section>
      <div>{header}</div>
      <div>{actions}</div>
      <div>{children}</div>
    </section>
  ),
}));

vi.mock('@/shared/ui/templates/modals/JSONImportModal', () => ({
  JSONImportModal: ({ isOpen, title }: { isOpen: boolean; title: string }) =>
    isOpen ? <div role='dialog'>{title}</div> : null,
}));

vi.mock('./FilemakerJobBoardScrapeModal', () => ({
  FilemakerJobBoardScrapeModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid='job-board-scrape-modal' /> : null,
}));

vi.mock('./FilemakerOrganizationAdvancedFilterModal', () => ({
  FilemakerOrganizationAdvancedFilterModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid='organization-advanced-filter-modal' /> : null,
}));

vi.mock('./OrganizationAdvancedFilterBuilder', () => ({
  OrganizationAdvancedFilterBuilder: () => <div data-testid='organization-preset-builder' />,
}));

import { FilemakerOrganizationsListPanel } from './FilemakerOrganizationsListPanel';

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

const createProps = (
  overrides: Partial<OrganizationListState> = {}
): OrganizationListState => ({
  actions: [
    {
      key: 'create-organization',
      label: 'Create Organisation',
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
    advancedFilter: '',
    bank: 'all',
    parent: 'all',
    updatedBy: '',
  },
  activeAdvancedFilterPresetId: null,
  advancedFilterPresets: [],
  isLoading: false,
  isSelectingAllOrganizations: false,
  nodes: [],
  onDeselectAllOrganizations: vi.fn(),
  onDeselectOrganizationsPage: vi.fn(),
  onFilterChange: vi.fn(),
  onLaunchOrganizationEmailScrape: vi.fn(),
  onLaunchOrganizationWebsiteSocialScrape: vi.fn(),
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
  onJobBoardScrapeCompleted: vi.fn(),
  onQueryChange: vi.fn(),
  onResetFilters: vi.fn(),
  onSelectAllOrganizations: vi.fn(),
  onSelectOrganizationsPage: vi.fn(),
  onSetAdvancedFilterPresets: vi.fn(),
  onSetAdvancedFilterState: vi.fn(),
  onToggleOrganizationSelection: vi.fn(),
  organizationEmailScrapeState: {},
  organizationWebsiteSocialScrapeState: {},
  organizationSelection: {},
  organizations: [],
  page: 1,
  pageSize: 48,
  query: '',
  renderNode: vi.fn(),
  selectedOrganizationCount: 0,
  shownCount: 12,
  totalCount: 42,
  totalCountIsExact: true,
  totalPages: 3,
  ...overrides,
});

describe('FilemakerOrganizationsListPanel', () => {
  beforeEach(() => {
    useAdminLayoutStateMock.mockReturnValue({ isMenuHidden: false });
    useAdminLayoutActionsMock.mockReturnValue({ setIsMenuHidden: vi.fn() });
  });

  it('mounts the focus-mode eye button and toggles the admin side menu', async () => {
    const user = userEvent.setup();
    const setIsMenuHidden = vi.fn();
    useAdminLayoutActionsMock.mockReturnValue({ setIsMenuHidden });

    render(<FilemakerOrganizationsListPanel {...createProps()} />);

    const button = screen.getByRole('button', { name: 'Show side panels' });
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await user.click(button);

    expect(setIsMenuHidden).toHaveBeenCalledWith(true);
  });

  it('matches the products list header arrangement on desktop', () => {
    const { container } = render(<FilemakerOrganizationsListPanel {...createProps()} />);

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
      'flex flex-wrap items-center gap-2 pt-1 relative z-0 min-w-0 flex-1 justify-end'
    );

    expect(
      within(desktopTitleStack).getByRole('heading', { name: 'Organisations' })
    ).toBeInTheDocument();
    expect(within(desktopTitleStack).getByTestId('organization-breadcrumbs')).toBeInTheDocument();
    const createButton = within(desktopControlsRow).getByRole('button', {
      name: 'Create Organisation',
    });
    expect(createButton).toHaveClass('h-7', 'w-7', 'rounded-full');
    expect(within(desktopControlsRow).queryByRole('button', { name: 'Import' })).toBeNull();
    expect(within(desktopControlsRow).queryByRole('button', { name: 'Refresh' })).toBeNull();
    expect(within(desktopControlsRow).getByTestId('organization-pagination')).toHaveAttribute(
      'data-show-page-jump',
      'true'
    );
    expect(within(desktopControlsRow).queryByTestId('organization-badge')).toBeNull();
    expect(within(desktopControlsRow).queryByTestId('organization-filters')).toBeNull();

    const sharedFiltersRow = findDivByExactClassName(container, 'w-full');
    expect(sharedFiltersRow).toHaveClass('w-full');
    expect(
      within(sharedFiltersRow as HTMLElement).getByTestId('organization-filters')
    ).toBeInTheDocument();

    const secondaryControlsRow = findDivByExactClassName(
      container,
      'hidden w-full flex-wrap items-center justify-end gap-2 lg:flex'
    );
    expect(within(secondaryControlsRow).getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(within(secondaryControlsRow).getAllByTestId('organization-badge')).toHaveLength(2);
  });

  it('renders product-style organization selection actions', () => {
    render(
      <FilemakerOrganizationsListPanel
        {...createProps({
          organizationSelection: { 'org-1': true },
          selectedOrganizationCount: 1,
        })}
      />
    );

    const actions = screen.getByTestId('organization-selection-actions');
    expect(actions).toHaveAttribute('data-selected-count', '1');
    expect(within(actions).getByText('Organisations')).toBeInTheDocument();
    expect(
      within(actions).getByRole('button', { name: 'Select All Resultset' })
    ).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: /Copy selected IDs/i })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: /Scrape jobs/i })).toBeInTheDocument();
  });

  it('renders advanced filter controls and applies saved presets', async () => {
    const user = userEvent.setup();
    const onSetAdvancedFilterState = vi.fn();

    render(
      <FilemakerOrganizationsListPanel
        {...createProps({
          activeAdvancedFilterPresetId: 'preset-1',
          advancedFilterPresets: [
            {
              id: 'preset-1',
              name: 'Warsaw roots',
              filter: {
                combinator: 'and',
                id: 'group-1',
                not: false,
                rules: [
                  {
                    field: 'city',
                    id: 'condition-1',
                    operator: 'contains',
                    type: 'condition',
                    value: 'Warsaw',
                  },
                ],
                type: 'group',
              },
            },
          ],
          filters: {
            address: 'all',
            advancedFilter: '{"type":"group"}',
            bank: 'all',
            parent: 'all',
            updatedBy: '',
          },
          onSetAdvancedFilterState,
        })}
      />
    );

    expect(screen.getByRole('button', { name: 'Advanced Filter' })).toBeInTheDocument();

    await user.click(screen.getByTitle('Apply preset Warsaw roots'));

    expect(onSetAdvancedFilterState).toHaveBeenCalledWith(
      expect.stringContaining('"city"'),
      'preset-1'
    );
  });
});
