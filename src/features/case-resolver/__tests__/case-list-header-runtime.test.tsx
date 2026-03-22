import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CaseListHeader } from '@/features/case-resolver/components/list/CaseListHeader';
import {
  CaseListPanelControlsContext,
  type CaseListPanelControlsContextValue,
} from '@/features/case-resolver/components/list/CaseListPanelControlsContext';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

const buildPanelControlsValue = (
  overrides: Partial<CaseListPanelControlsContextValue> = {}
): CaseListPanelControlsContextValue => ({
  caseSortBy: 'updated',
  setCaseSortBy: vi.fn(),
  caseSortOrder: 'desc',
  setCaseSortOrder: vi.fn(),
  onCreateCase: vi.fn(),
  totalCount: 8,
  filteredCount: 5,
  page: 2,
  totalPages: 4,
  onPageChange: vi.fn(),
  pageSize: 24,
  onPageSizeChange: vi.fn(),
  onSearchChange: vi.fn(),
  isHierarchyLocked: true,
  setIsHierarchyLocked: vi.fn(),
  caseShowNestedContent: false,
  setCaseShowNestedContent: vi.fn(),
  handleSaveDefaults: vi.fn(async () => {}),
  isSavingDefaults: false,
  heldCaseFile: null,
  workspace: { files: [] } as CaseResolverWorkspace,
  identifierLabelById: new Map(),
  searchQuery: 'alpha',
  caseOrderById: new Map(),
  onPrefetchCase: vi.fn(),
  onPrefetchFile: vi.fn(),
  onOpenCase: vi.fn(),
  onOpenFile: vi.fn(),
  onClearHeldCase: vi.fn(),
  ...overrides,
});

describe('CaseListHeader runtime context', () => {
  it('supports the panel context path when runtime props are omitted', () => {
    const onCreateCase = vi.fn();
    const onSearchChange = vi.fn();

    render(
      <CaseListPanelControlsContext.Provider
        value={buildPanelControlsValue({
          onCreateCase,
          onSearchChange,
          searchQuery: 'invoice',
          totalCount: 12,
          filteredCount: 3,
        })}
      >
        <CaseListHeader filtersContent={<div>Filters</div>} />
      </CaseListPanelControlsContext.Provider>
    );

    expect(screen.getAllByText('3 matches / 12 total')).toHaveLength(2);
    expect(screen.getAllByText('Filters')).toHaveLength(2);

    fireEvent.click(screen.getAllByLabelText('Create new case')[0]);
    expect(onCreateCase).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getAllByPlaceholderText('Search cases & files…')[0], {
      target: { value: 'invoice-2' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('invoice-2');
  });

  it('supports the explicit props path without the panel context', () => {
    const onCreateCase = vi.fn();
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    const onSearchChange = vi.fn();

    render(
      <CaseListHeader
        filtersContent={<div>Direct filters</div>}
        onCreateCase={onCreateCase}
        totalCount={9}
        filteredCount={4}
        page={1}
        totalPages={3}
        onPageChange={onPageChange}
        pageSize={12}
        onPageSizeChange={onPageSizeChange}
        searchQuery='report'
        onSearchChange={onSearchChange}
      />
    );

    expect(screen.getAllByText('4 matches / 9 total')).toHaveLength(2);
    expect(screen.getAllByText('Direct filters')).toHaveLength(2);

    fireEvent.click(screen.getAllByLabelText('Create new case')[0]);
    expect(onCreateCase).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getAllByPlaceholderText('Search cases & files…')[0], {
      target: { value: 'report-2' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('report-2');
  });
});
