// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProductValidationPattern } from '@/shared/contracts/products/validation';

const { useValidatorSettingsContextMock, useMasterFolderTreeShellMock } = vi.hoisted(() => ({
  useValidatorSettingsContextMock: vi.fn(),
  useMasterFolderTreeShellMock: vi.fn(),
}));

vi.mock('@/features/products/hooks/useProductSettingsQueries', () => ({
  useReorderValidationPatternsMutation: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

vi.mock('@/shared/lib/foldertree/public', () => ({
  createMasterFolderTreeTransactionAdapter: () => ({}),
  FolderTreeViewportV2: () => <div data-testid='tree-viewport' />,
  useMasterFolderTreeShell: (...args: unknown[]) => useMasterFolderTreeShellMock(...args),
}));

vi.mock('@/shared/ui/FolderTreePanel', () => ({
  FolderTreePanel: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid='folder-tree-panel' className={className}>
      {children}
    </div>
  ),
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type='button' onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/shared/ui/form-section', () => ({
  FormField: ({ children, label }: { children?: React.ReactNode; label?: string }) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
}));

vi.mock('@/shared/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('./ValidatorSettingsContext', () => ({
  useValidatorSettingsContext: () => useValidatorSettingsContextMock(),
}));

import { ValidatorPatternTree } from './ValidatorPatternTree';

const buildPattern = (
  overrides: Partial<ProductValidationPattern> = {}
): ProductValidationPattern => ({
  id: 'pattern-1',
  label: 'Name EN to PL',
  target: 'name',
  locale: 'pl',
  regex: '^$',
  flags: null,
  message: 'Mirror name',
  severity: 'error',
  enabled: true,
  replacementEnabled: true,
  replacementAutoApply: true,
  skipNoopReplacementProposal: true,
  replacementValue: 'value',
  replacementFields: [],
  replacementAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  runtimeEnabled: false,
  runtimeType: 'none',
  runtimeConfig: null,
  postAcceptBehavior: 'revalidate',
  denyBehaviorOverride: null,
  validationDebounceMs: 0,
  sequenceGroupId: null,
  sequenceGroupLabel: null,
  sequenceGroupDebounceMs: 0,
  sequence: null,
  chainMode: 'continue',
  maxExecutions: 1,
  passOutputToNext: true,
  launchEnabled: false,
  launchAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  launchScopeBehavior: 'gate',
  launchSourceMode: 'current_field',
  launchSourceField: null,
  launchOperator: 'equals',
  launchValue: null,
  launchFlags: null,
  appliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  semanticState: {
    version: 2,
    presetId: 'products.name-mirror-polish.base.v2',
    operation: 'mirror_name_locale',
    sourceField: 'name_en',
    targetField: 'name_pl',
  },
  semanticAudit: {
    recordedAt: '2026-03-19T11:30:00.000Z',
    source: 'manual_save',
    trigger: 'update',
    transition: 'migrated',
    previous: {
      version: 2,
      presetId: 'products.latest-field-mirror.v2',
      operation: 'mirror_latest_field',
      sourceField: 'price',
      targetField: 'price',
    },
    current: {
      version: 2,
      presetId: 'products.name-mirror-polish.base.v2',
      operation: 'mirror_name_locale',
      sourceField: 'name_en',
      targetField: 'name_pl',
    },
  },
  semanticAuditHistory: [],
  createdAt: '2026-03-19T09:00:00.000Z',
  updatedAt: '2026-03-19T11:30:00.000Z',
  ...overrides,
});

describe('ValidatorPatternTree', () => {
  it('renders the semantic history panel for the selected pattern node', () => {
    const pattern = buildPattern();

    useMasterFolderTreeShellMock.mockReturnValue({
      appearance: { rootDropUi: null },
      controller: { selectedNodeId: 'vpat:pattern-1' },
      viewport: { scrollToNodeRef: { current: null } },
    });

    useValidatorSettingsContextMock.mockReturnValue({
      patterns: [pattern],
      orderedPatterns: [pattern],
      sequenceGroups: new Map(),
      groupDrafts: {},
      setGroupDrafts: vi.fn(),
      getGroupDraft: vi.fn(),
      handleEditPattern: vi.fn(),
      handleDuplicatePattern: vi.fn(),
      setPatternToDelete: vi.fn(),
      handleTogglePattern: vi.fn(),
      handleSaveSequenceGroup: vi.fn(),
      handleUngroup: vi.fn(),
      patternActionsPending: false,
      reorderPending: false,
    });

    render(<ValidatorPatternTree />);

    expect(screen.getByTestId('tree-viewport')).toBeInTheDocument();
    expect(screen.getByTestId('folder-tree-panel')).toHaveClass('h-auto');
    expect(screen.getByText('Semantic History')).toBeInTheDocument();
    expect(screen.getByText('Current: Mirror Name Locale')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close History' })).toBeInTheDocument();
    expect(
      screen.getByText('Migrated semantic operation from "Mirror Latest Field" to "Mirror Name Locale".')
    ).toBeInTheDocument();
  });

  it('closes the semantic history panel without unmounting the tree viewport', () => {
    const pattern = buildPattern();

    useMasterFolderTreeShellMock.mockReturnValue({
      appearance: { rootDropUi: null },
      controller: { selectedNodeId: 'vpat:pattern-1' },
      viewport: { scrollToNodeRef: { current: null } },
    });

    useValidatorSettingsContextMock.mockReturnValue({
      patterns: [pattern],
      orderedPatterns: [pattern],
      sequenceGroups: new Map(),
      groupDrafts: {},
      setGroupDrafts: vi.fn(),
      getGroupDraft: vi.fn(),
      handleEditPattern: vi.fn(),
      handleDuplicatePattern: vi.fn(),
      setPatternToDelete: vi.fn(),
      handleTogglePattern: vi.fn(),
      handleSaveSequenceGroup: vi.fn(),
      handleUngroup: vi.fn(),
      patternActionsPending: false,
      reorderPending: false,
    });

    render(<ValidatorPatternTree />);

    fireEvent.click(screen.getByRole('button', { name: 'Close History' }));

    expect(screen.getByTestId('tree-viewport')).toBeInTheDocument();
    expect(screen.queryByText('Semantic History')).not.toBeInTheDocument();
  });

  it('shows a delete sequence action for the selected sequence group', () => {
    const handleUngroup = vi.fn();

    useMasterFolderTreeShellMock.mockReturnValue({
      appearance: { rootDropUi: null },
      controller: { selectedNodeId: 'vseq_group:group-1' },
      viewport: { scrollToNodeRef: { current: null } },
    });

    useValidatorSettingsContextMock.mockReturnValue({
      patterns: [],
      orderedPatterns: [],
      sequenceGroups: new Map([
        ['group-1', { id: 'group-1', label: 'Sequence Alpha', debounceMs: 300, patternIds: [] }],
      ]),
      groupDrafts: {},
      setGroupDrafts: vi.fn(),
      getGroupDraft: vi.fn(() => ({ label: 'Sequence Alpha', debounceMs: '300' })),
      handleEditPattern: vi.fn(),
      handleDuplicatePattern: vi.fn(),
      setPatternToDelete: vi.fn(),
      handleTogglePattern: vi.fn(),
      handleSaveSequenceGroup: vi.fn(),
      handleUngroup,
      patternActionsPending: false,
      reorderPending: false,
    });

    render(<ValidatorPatternTree />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Sequence' }));

    expect(handleUngroup).toHaveBeenCalledWith('group-1');
  });

  it('does not render group controls for a stale selected sequence id', () => {
    useMasterFolderTreeShellMock.mockReturnValue({
      appearance: { rootDropUi: null },
      controller: { selectedNodeId: 'vseq_group:missing-group' },
      viewport: { scrollToNodeRef: { current: null } },
    });

    useValidatorSettingsContextMock.mockReturnValue({
      patterns: [],
      orderedPatterns: [],
      sequenceGroups: new Map(),
      groupDrafts: {},
      setGroupDrafts: vi.fn(),
      getGroupDraft: vi.fn(() => ({ label: 'Missing', debounceMs: '300' })),
      handleEditPattern: vi.fn(),
      handleDuplicatePattern: vi.fn(),
      setPatternToDelete: vi.fn(),
      handleTogglePattern: vi.fn(),
      handleSaveSequenceGroup: vi.fn(),
      handleUngroup: vi.fn(),
      patternActionsPending: false,
      reorderPending: false,
    });

    render(<ValidatorPatternTree />);

    expect(screen.queryByRole('button', { name: 'Delete Sequence' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Group' })).not.toBeInTheDocument();
  });
});
