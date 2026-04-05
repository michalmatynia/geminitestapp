import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CaseListNodeItem } from '@/features/case-resolver/components/list/sections/CaseListNodeItem';
import {
  CaseListNodeRuntimeProvider,
  type CaseListNodeRuntimeContextValue,
} from '@/features/case-resolver/components/list/sections/CaseListNodeRuntimeContext';
import {
  toCaseResolverCaseContentFileNodeId,
  toCaseResolverCaseContentFolderNodeId,
  toCaseResolverCaseNodeId,
} from '@/features/case-resolver/master-tree';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver/file';
import type { MasterTreeViewNode } from '@/shared/utils/master-folder-tree-engine';

const FolderClosedIcon = () => <span data-testid='folder-closed-icon' />;
const FolderOpenIcon = () => <span data-testid='folder-open-icon' />;

const createRuntimeContextValue = (): CaseListNodeRuntimeContextValue => ({
  filesById: new Map<string, CaseResolverFile>(),
  caseTagPathById: new Map<string, string>(),
  caseIdentifierPathById: new Map<string, string>(),
  caseCategoryPathById: new Map<string, string>(),
  renameDraft: '',
  onUpdateRenameDraft: vi.fn(),
  onCommitRename: vi.fn(),
  onCancelRename: vi.fn(),
  handleToggleCaseStatus: vi.fn(),
  handleToggleHeldCase: vi.fn(),
  handleNestHeldCase: vi.fn(),
  handlePrefetchCase: vi.fn(),
  handlePrefetchFile: vi.fn(),
  handleOpenCase: vi.fn(),
  handleOpenFile: vi.fn(),
  handleCreateCase: vi.fn(),
  handleDeleteCase: vi.fn(),
  FolderClosedIcon,
  FolderOpenIcon,
});

const createBaseProps = () => ({
  node: {
    id: toCaseResolverCaseNodeId('case-1'),
    name: 'Case One',
    type: 'folder',
    kind: 'case_entry',
    path: 'case-1',
    parentId: null,
    sortOrder: 0,
    metadata: { isLocked: false },
    children: [],
  } as MasterTreeViewNode,
  depth: 0,
  hasChildren: false,
  isExpanded: false,
  isRenaming: false,
  isDragging: false,
  isDropTarget: false,
  dropPosition: null as 'inside' | 'before' | 'after' | null,
  toggleExpand: vi.fn(),
  heldCaseId: null,
  canNestHeldHere: false,
  canShowNestHeldAction: false,
  nestHeldDisabledReason: null,
});

describe('CaseListNodeItem', () => {
  it('keeps case row actions and opens case by clicking case name', () => {
    const runtime = createRuntimeContextValue();
    const props = createBaseProps();
    runtime.filesById.set('case-1', {
      id: 'case-1',
      name: 'Case One',
      fileType: 'case',
      caseStatus: 'pending',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      isLocked: false,
    } as unknown as CaseResolverFile);

    render(
      <CaseListNodeRuntimeProvider value={runtime}>
        <CaseListNodeItem {...props} />
      </CaseListNodeRuntimeProvider>
    );

    const openCaseButton = screen.getByRole('button', { name: 'Case One' });

    fireEvent.mouseEnter(openCaseButton);
    fireEvent.click(openCaseButton);

    expect(runtime.handlePrefetchCase).toHaveBeenCalledWith('case-1');
    expect(runtime.handleOpenCase).toHaveBeenCalledWith('case-1');
    expect(screen.getByRole('button', { name: 'Child' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('renders nested folder row as read-only and only toggles expand/collapse', () => {
    const runtime = createRuntimeContextValue();
    const props = createBaseProps();
    props.node = {
      id: toCaseResolverCaseContentFolderNodeId('case-1', 'evidence'),
      name: 'evidence',
      type: 'folder',
      kind: 'case_content_folder',
      path: 'case-1/evidence',
      parentId: toCaseResolverCaseNodeId('case-1'),
      sortOrder: 0,
      metadata: { isLocked: false },
      children: [],
    };
    props.hasChildren = true;
    props.isExpanded = false;

    render(
      <CaseListNodeRuntimeProvider value={runtime}>
        <CaseListNodeItem {...props} />
      </CaseListNodeRuntimeProvider>
    );

    fireEvent.click(screen.getByLabelText('Expand folder'));

    expect(props.toggleExpand).toHaveBeenCalledTimes(1);
    expect(runtime.handleOpenCase).not.toHaveBeenCalled();
    expect(runtime.handleCreateCase).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Child' })).not.toBeInTheDocument();
  });

  it('opens nested file directly in case resolver using file id', () => {
    const runtime = createRuntimeContextValue();
    const props = createBaseProps();
    props.node = {
      id: toCaseResolverCaseContentFileNodeId('case-1', 'file-1'),
      name: 'Transcript.pdf',
      type: 'file',
      kind: 'case_content_file',
      path: 'case-1/Transcript.pdf',
      parentId: toCaseResolverCaseNodeId('case-1'),
      sortOrder: 0,
      metadata: { isLocked: false },
      children: [],
    };
    runtime.filesById.set('file-1', {
      id: 'file-1',
      name: 'Transcript.pdf',
      fileType: 'document',
      createdAt: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-04T00:00:00.000Z',
      isLocked: false,
    } as unknown as CaseResolverFile);

    render(
      <CaseListNodeRuntimeProvider value={runtime}>
        <CaseListNodeItem {...props} />
      </CaseListNodeRuntimeProvider>
    );

    const openFileButton = screen.getByRole('button', { name: 'Transcript.pdf' });

    fireEvent.mouseEnter(openFileButton);
    fireEvent.click(openFileButton);

    expect(runtime.handlePrefetchFile).toHaveBeenCalledWith('file-1');
    expect(runtime.handleOpenFile).toHaveBeenCalledWith('file-1');
    expect(runtime.handleOpenCase).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Child' })).not.toBeInTheDocument();
  });
});
