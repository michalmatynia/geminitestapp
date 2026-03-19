// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProductValidationPattern } from '@/shared/contracts/products';

const { useValidatorPatternTreeContextMock } = vi.hoisted(() => ({
  useValidatorPatternTreeContextMock: vi.fn(),
}));

vi.mock('../ValidatorPatternTreeContext', () => ({
  useValidatorPatternTreeContext: () => useValidatorPatternTreeContextMock(),
}));

vi.mock('@/shared/ui', () => ({
  TreeContextMenu: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TreeRow: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TreeCaret: () => <span data-testid='tree-caret' />,
  StatusToggle: () => <button type='button'>toggle</button>,
  StatusBadge: ({
    status,
    label,
    title,
    onClick,
  }: {
    status: string;
    label?: string;
    title?: string;
    onClick?: () => void;
  }) =>
    onClick ? (
      <button type='button' data-testid='status-badge' data-status={status} title={title} onClick={onClick}>
        {label ?? status}
      </button>
    ) : (
      <span data-testid='status-badge' data-status={status} title={title}>
        {label ?? status}
      </span>
    ),
}));

import { PatternNodeItem } from './PatternNodeItem';

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
  semanticState: null,
  semanticAudit: null,
  semanticAuditHistory: [],
  createdAt: '2026-03-19T09:00:00.000Z',
  updatedAt: '2026-03-19T09:00:00.000Z',
  ...overrides,
});

const buildProps = (
  overrides: Partial<React.ComponentProps<typeof PatternNodeItem>> = {}
) =>
  ({
    node: {
      id: 'vpat:pattern-1',
      type: 'file',
      name: 'Name EN to PL',
    },
    depth: 0,
    hasChildren: false,
    isExpanded: false,
    isSelected: false,
    isMultiSelected: false,
    isRenaming: false,
    isDragging: false,
    isDropTarget: false,
    dropPosition: null,
    nodeStatus: null,
    isSearchMatch: false,
    select: vi.fn(),
    toggleExpand: vi.fn(),
    startRename: vi.fn(),
    ...overrides,
  }) as React.ComponentProps<typeof PatternNodeItem>;

describe('PatternNodeItem', () => {
  it('opens the pattern modal when the pattern label is clicked', () => {
    const select = vi.fn();
    const onEditPattern = vi.fn();
    const pattern = buildPattern();

    useValidatorPatternTreeContextMock.mockReturnValue({
      patternById: new Map([[pattern.id, pattern]]),
      isPending: false,
      onEditPattern,
      onDuplicatePattern: vi.fn(),
      onDeletePattern: vi.fn(),
      onTogglePattern: vi.fn(),
      onOpenSemanticHistory: vi.fn(),
    });

    render(<PatternNodeItem {...buildProps()} select={select} />);

    const labelButton = screen.getByRole('button', { name: 'Name EN to PL' });
    const labelText = screen.getByText('Name EN to PL');

    expect(labelButton.className).toContain('cursor-pointer');
    expect(labelButton.className).not.toContain('hover:bg-sky-500/10');
    expect(labelText.className).toContain('hover:scale-[1.02]');
    expect(labelText.className).toContain('hover:text-sky-100');

    fireEvent.click(labelButton);

    expect(select).toHaveBeenCalledTimes(1);
    expect(onEditPattern).toHaveBeenCalledWith(pattern);
    expect(select.mock.invocationCallOrder[0]).toBeLessThan(onEditPattern.mock.invocationCallOrder[0]);
  });

  it('renders a semantic history badge for patterns with audit history', () => {
    const pattern = buildPattern({
      semanticAudit: {
        recordedAt: '2026-03-19T11:30:00.000Z',
        source: 'manual_save',
        trigger: 'update',
        transition: 'migrated',
        previous: {
          version: 2,
          presetId: 'products.latest-field-mirror.v2',
          operation: 'mirror_latest_field',
        },
        current: {
          version: 2,
          presetId: 'products.name-mirror-polish.base.v2',
          operation: 'mirror_name_locale',
        },
      },
      semanticAuditHistory: [
        {
          recordedAt: '2026-03-19T09:15:00.000Z',
          source: 'template',
          trigger: 'create',
          transition: 'recognized',
          previous: null,
          current: {
            version: 2,
            presetId: 'products.latest-field-mirror.v2',
            operation: 'mirror_latest_field',
          },
        },
      ],
    });

    useValidatorPatternTreeContextMock.mockReturnValue({
      patternById: new Map([[pattern.id, pattern]]),
      isPending: false,
      onEditPattern: vi.fn(),
      onDuplicatePattern: vi.fn(),
      onDeletePattern: vi.fn(),
      onTogglePattern: vi.fn(),
      onOpenSemanticHistory: vi.fn(),
    });

    render(<PatternNodeItem {...buildProps()} />);

    expect(screen.getByText('MIG 2')).toBeInTheDocument();
    expect(
      screen.getByTitle(
        'Semantic history (2): Migrated semantic operation from "Mirror Latest Field" to "Mirror Name Locale".'
      )
    ).toBeInTheDocument();
  });

  it('opens semantic history when the badge is clicked', () => {
    const select = vi.fn();
    const onOpenSemanticHistory = vi.fn();
    const pattern = buildPattern({
      semanticAudit: {
        recordedAt: '2026-03-19T11:30:00.000Z',
        source: 'manual_save',
        trigger: 'update',
        transition: 'migrated',
        previous: {
          version: 2,
          presetId: 'products.latest-field-mirror.v2',
          operation: 'mirror_latest_field',
        },
        current: {
          version: 2,
          presetId: 'products.name-mirror-polish.base.v2',
          operation: 'mirror_name_locale',
        },
      },
      semanticAuditHistory: [],
    });

    useValidatorPatternTreeContextMock.mockReturnValue({
      patternById: new Map([[pattern.id, pattern]]),
      isPending: false,
      onEditPattern: vi.fn(),
      onDuplicatePattern: vi.fn(),
      onDeletePattern: vi.fn(),
      onTogglePattern: vi.fn(),
      onOpenSemanticHistory,
    });

    render(<PatternNodeItem {...buildProps()} select={select} />);

    fireEvent.click(screen.getByText('MIG 1'));

    expect(select).toHaveBeenCalled();
    expect(onOpenSemanticHistory).toHaveBeenCalledWith(
      'pattern-1',
      expect.stringContaining('2026-03-19T11:30:00.000Z')
    );
  });

  it('does not render a semantic badge when there is no semantic audit history', () => {
    const pattern = buildPattern();

    useValidatorPatternTreeContextMock.mockReturnValue({
      patternById: new Map([[pattern.id, pattern]]),
      isPending: false,
      onEditPattern: vi.fn(),
      onDuplicatePattern: vi.fn(),
      onDeletePattern: vi.fn(),
      onTogglePattern: vi.fn(),
      onOpenSemanticHistory: vi.fn(),
    });

    render(<PatternNodeItem {...buildProps()} />);

    expect(screen.queryByText(/^MIG /)).not.toBeInTheDocument();
    expect(screen.queryByText(/^SEM /)).not.toBeInTheDocument();
    expect(screen.queryByText(/^GEN /)).not.toBeInTheDocument();
  });
});
