// @vitest-environment jsdom

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrganizationAdvancedFilterGroup } from '../../filemaker-organization-advanced-filters';
import type { OrganizationListState } from '../../pages/AdminFilemakerOrganizationsPage.types';

const { clipboardWriteTextMock, jsonImportValue, modalPropsMock, toastMock } = vi.hoisted(() => ({
  clipboardWriteTextMock: vi.fn(),
  jsonImportValue: { current: '' },
  modalPropsMock: vi.fn(),
  toastMock: vi.fn(),
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
    children,
    trigger,
  }: {
    children?: React.ReactNode;
    trigger?: React.ReactNode;
  }) => (
    <div>
      <button type='button'>{trigger ?? 'Open actions menu'}</button>
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
      <section aria-label={title} role='dialog'>
        {children}
        {footer}
      </section>
    ) : null,
}));

vi.mock('@/shared/ui/chip', () => ({
  Chip: ({ label, onClick }: { label?: React.ReactNode; onClick?: () => void }) => (
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

vi.mock('@/shared/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/shared/ui/selection-bar', () => ({
  SelectionBar: ({
    actions,
    label,
    rightActions,
    selectedCount,
  }: {
    actions?: React.ReactNode;
    label?: string;
    rightActions?: React.ReactNode;
    selectedCount: number;
  }) => (
    <div data-testid='selection-bar' data-selected-count={String(selectedCount)}>
      <span>{label}</span>
      {actions}
      {rightActions}
    </div>
  ),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/shared/ui/templates/modals/JSONImportModal', () => ({
  JSONImportModal: ({
    isOpen,
    onImport,
    title,
  }: {
    isOpen: boolean;
    onImport: (value: string) => Promise<void> | void;
    title: string;
  }) =>
    isOpen ? (
      <section role='dialog'>
        <span>{title}</span>
        <button
          type='button'
          onClick={(): void => {
            void onImport(jsonImportValue.current);
          }}
        >
          Import JSON
        </button>
      </section>
    ) : null,
}));

vi.mock('./FilemakerJobBoardScrapeModal', () => ({
  FilemakerJobBoardScrapeModal: (props: {
    onCompleted: () => void;
    onClose: () => void;
    open: boolean;
    selectedOrganizationCount: number;
    selectedOrganizationIds: string[];
  }) => {
    modalPropsMock(props);
    return props.open ? (
      <section
        aria-label='job-board scrape modal'
        data-selected-count={String(props.selectedOrganizationCount)}
        data-selected-ids={props.selectedOrganizationIds.join(',')}
        role='dialog'
      >
        <button type='button' onClick={props.onCompleted}>
          Complete scrape
        </button>
        <button type='button' onClick={props.onClose}>
          Close scrape
        </button>
      </section>
    ) : null;
  },
}));

vi.mock('./OrganizationAdvancedFilterBuilder', () => ({
  OrganizationAdvancedFilterBuilder: () => <div data-testid='organization-preset-builder' />,
}));

import { FilemakerOrganizationsSelectionActions } from './FilemakerOrganizationsSelectionActions';

const createProps = (
  overrides: Partial<OrganizationListState> = {}
): OrganizationListState => ({
  actions: [],
  activeAdvancedFilterPresetId: null,
  advancedFilterPresets: [],
  error: null,
  filters: {
    address: 'all',
    advancedFilter: '',
    bank: 'all',
    parent: 'all',
    updatedBy: '',
  },
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
  organizationSelection: {},
  organizationWebsiteSocialScrapeState: {},
  organizations: [],
  page: 1,
  pageSize: 48,
  query: '',
  renderNode: vi.fn(),
  selectedOrganizationCount: 0,
  shownCount: 0,
  totalCount: 0,
  totalCountIsExact: true,
  totalPages: 1,
  ...overrides,
});

const warsawFilter: OrganizationAdvancedFilterGroup = {
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
};

const installClipboardMock = (): void => {
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: clipboardWriteTextMock },
  });
};

describe('FilemakerOrganizationsSelectionActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jsonImportValue.current = '';
    clipboardWriteTextMock.mockResolvedValue(undefined);
    installClipboardMock();
  });

  it('opens the job-board scrape modal with the selected organisation IDs', async () => {
    const user = userEvent.setup();
    const onJobBoardScrapeCompleted = vi.fn();

    render(
      <FilemakerOrganizationsSelectionActions
        {...createProps({
          onJobBoardScrapeCompleted,
          organizationSelection: { 'org-1': true, 'org-2': false, 'org-3': true },
          selectedOrganizationCount: 2,
        })}
      />
    );

    const selectionBar = screen.getByTestId('selection-bar');
    expect(selectionBar).toHaveAttribute('data-selected-count', '2');
    expect(screen.queryByRole('dialog', { name: 'job-board scrape modal' })).toBeNull();

    await user.click(within(selectionBar).getByRole('button', { name: /Scrape jobs/i }));

    const modal = screen.getByRole('dialog', { name: 'job-board scrape modal' });
    expect(modal).toHaveAttribute('data-selected-count', '2');
    expect(modal).toHaveAttribute('data-selected-ids', 'org-1,org-3');

    await user.click(within(modal).getByRole('button', { name: 'Complete scrape' }));

    expect(onJobBoardScrapeCompleted).toHaveBeenCalledTimes(1);
  });

  it('applies and clears an active advanced filter preset', async () => {
    const user = userEvent.setup();
    const onSetAdvancedFilterState = vi.fn();

    render(
      <FilemakerOrganizationsSelectionActions
        {...createProps({
          activeAdvancedFilterPresetId: 'preset-1',
          advancedFilterPresets: [
            {
              createdAt: '2026-04-28T00:00:00.000Z',
              filter: warsawFilter,
              id: 'preset-1',
              name: 'Warsaw roots',
              updatedAt: '2026-04-28T00:00:00.000Z',
            },
          ],
          onSetAdvancedFilterState,
        })}
      />
    );

    await user.click(screen.getByTitle('Apply preset Warsaw roots'));

    expect(onSetAdvancedFilterState).toHaveBeenCalledWith(
      expect.stringContaining('"city"'),
      'preset-1'
    );

    await user.click(screen.getByRole('button', { name: 'Warsaw roots' }));

    expect(onSetAdvancedFilterState).toHaveBeenLastCalledWith('', null);
  });

  it('saves the current advanced filter as a preset', async () => {
    const user = userEvent.setup();
    const onSetAdvancedFilterPresets = vi.fn().mockResolvedValue(undefined);

    render(
      <FilemakerOrganizationsSelectionActions
        {...createProps({
          filters: {
            address: 'all',
            advancedFilter: JSON.stringify(warsawFilter),
            bank: 'all',
            parent: 'all',
            updatedBy: '',
          },
          onSetAdvancedFilterPresets,
        })}
      />
    );

    await user.click(screen.getByRole('button', { name: /Save Current Filter/i }));
    await user.type(screen.getByRole('textbox', { name: 'Preset name' }), 'Warsaw roots');
    await user.click(screen.getByRole('button', { name: 'Save Preset' }));

    await waitFor(() => {
      expect(onSetAdvancedFilterPresets).toHaveBeenCalledWith([
        expect.objectContaining({
          filter: warsawFilter,
          name: 'Warsaw roots',
        }),
      ]);
    });
  });

  it('edits and deletes saved advanced filter presets', async () => {
    const user = userEvent.setup();
    const onSetAdvancedFilterPresets = vi.fn().mockResolvedValue(undefined);
    const onSetAdvancedFilterState = vi.fn();
    const preset = {
      createdAt: '2026-04-28T00:00:00.000Z',
      filter: warsawFilter,
      id: 'preset-1',
      name: 'Warsaw roots',
      updatedAt: '2026-04-28T00:00:00.000Z',
    };

    render(
      <FilemakerOrganizationsSelectionActions
        {...createProps({
          activeAdvancedFilterPresetId: 'preset-1',
          advancedFilterPresets: [preset],
          onSetAdvancedFilterPresets,
          onSetAdvancedFilterState,
        })}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Edit preset Warsaw roots' }));
    await user.clear(screen.getByRole('textbox', { name: 'Preset name' }));
    await user.type(screen.getByRole('textbox', { name: 'Preset name' }), 'Updated roots');
    await user.click(screen.getByRole('button', { name: 'Update Preset' }));

    await waitFor(() => {
      expect(onSetAdvancedFilterPresets).toHaveBeenCalledWith([
        expect.objectContaining({
          filter: warsawFilter,
          id: 'preset-1',
          name: 'Updated roots',
          updatedAt: expect.any(String),
        }),
      ]);
      expect(onSetAdvancedFilterState).toHaveBeenCalledWith(
        expect.stringContaining('"city"'),
        'preset-1'
      );
    });

    await user.click(screen.getByRole('button', { name: 'Delete preset Warsaw roots' }));

    await waitFor(() => {
      expect(onSetAdvancedFilterPresets).toHaveBeenLastCalledWith([]);
      expect(onSetAdvancedFilterState).toHaveBeenLastCalledWith('', null);
    });
  });

  it('imports pasted preset JSON and copies preset payloads', async () => {
    const user = userEvent.setup();
    installClipboardMock();
    const onSetAdvancedFilterPresets = vi.fn().mockResolvedValue(undefined);
    const existingPreset = {
      createdAt: '2026-04-28T00:00:00.000Z',
      filter: warsawFilter,
      id: 'preset-1',
      name: 'Warsaw roots',
      updatedAt: '2026-04-28T00:00:00.000Z',
    };
    jsonImportValue.current = JSON.stringify({
      createdAt: '2026-04-28T00:00:00.000Z',
      filter: warsawFilter,
      id: 'source-preset',
      name: 'Warsaw roots',
      updatedAt: '2026-04-28T00:00:00.000Z',
    });

    render(
      <FilemakerOrganizationsSelectionActions
        {...createProps({
          advancedFilterPresets: [existingPreset],
          onSetAdvancedFilterPresets,
        })}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Copy All Presets JSON' }));
    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith(expect.stringContaining('"presets"'));
    });

    await user.click(screen.getByRole('button', { name: 'Copy preset Warsaw roots' }));
    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith(
        expect.stringContaining('"Warsaw roots"')
      );
    });

    await user.click(screen.getByRole('button', { name: 'Import From Pasted JSON' }));
    await user.click(screen.getByRole('button', { name: 'Import JSON' }));

    await waitFor(() => {
      expect(onSetAdvancedFilterPresets).toHaveBeenCalledWith([
        existingPreset,
        expect.objectContaining({
          filter: warsawFilter,
          name: 'Warsaw roots (copy 1)',
        }),
      ]);
    });
  });
});
