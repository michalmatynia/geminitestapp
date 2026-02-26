import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CaseListNodeItem } from '@/features/case-resolver/components/list/sections/CaseListNodeItem';
import {
  toCaseResolverCaseContentFileNodeId,
  toCaseResolverCaseContentFolderNodeId,
  toCaseResolverCaseNodeId,
} from '@/features/case-resolver/master-tree';

const FolderClosedIcon = () => <span data-testid='folder-closed-icon' />;
const FolderOpenIcon = () => <span data-testid='folder-open-icon' />;

const createBaseProps = () => ({
  node: {
    id: toCaseResolverCaseNodeId('case-1'),
    name: 'Case One',
    kind: 'case_entry',
    metadata: { isLocked: false },
  } as any,
  depth: 0,
  hasChildren: false,
  isExpanded: false,
  isRenaming: false,
  isDragging: false,
  isDropTarget: false,
  dropPosition: null as 'inside' | 'before' | 'after' | null,
  toggleExpand: vi.fn(),
  filesById: new Map<string, any>(),
  caseTagPathById: new Map<string, string>(),
  caseIdentifierPathById: new Map<string, string>(),
  caseCategoryPathById: new Map<string, string>(),
  controller: {
    renameDraft: '',
    updateRenameDraft: vi.fn(),
    commitRename: vi.fn(),
    cancelRename: vi.fn(),
  },
  handleToggleCaseStatus: vi.fn(),
  heldCaseId: null,
  canNestHeldHere: false,
  canShowNestHeldAction: false,
  nestHeldDisabledReason: null,
  handleToggleHeldCase: vi.fn(),
  handleNestHeldCase: vi.fn(),
  handleOpenCase: vi.fn(),
  handleOpenFile: vi.fn(),
  handleEditCase: vi.fn(),
  handleCreateCase: vi.fn(),
  handleDeleteCase: vi.fn(),
  FolderClosedIcon,
  FolderOpenIcon,
});

describe('CaseListNodeItem', () => {
  it('keeps case row actions and opens case by clicking case name', () => {
    const props = createBaseProps();
    props.filesById.set('case-1', {
      id: 'case-1',
      name: 'Case One',
      fileType: 'case',
      caseStatus: 'pending',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      isLocked: false,
    });

    render(<CaseListNodeItem {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Case One' }));

    expect(props.handleOpenCase).toHaveBeenCalledWith('case-1');
    expect(screen.getByRole('button', { name: 'Child' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('renders nested folder row as read-only and only toggles expand/collapse', () => {
    const props = createBaseProps();
    props.node = {
      id: toCaseResolverCaseContentFolderNodeId('case-1', 'evidence'),
      name: 'evidence',
      kind: 'case_content_folder',
      metadata: { isLocked: false },
    } as any;
    props.hasChildren = true;
    props.isExpanded = false;

    render(<CaseListNodeItem {...props} />);

    fireEvent.click(screen.getByLabelText('Expand folder'));

    expect(props.toggleExpand).toHaveBeenCalledTimes(1);
    expect(props.handleOpenCase).not.toHaveBeenCalled();
    expect(props.handleCreateCase).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Child' })).not.toBeInTheDocument();
  });

  it('opens nested file directly in case resolver using file id', () => {
    const props = createBaseProps();
    props.node = {
      id: toCaseResolverCaseContentFileNodeId('case-1', 'file-1'),
      name: 'Transcript.pdf',
      kind: 'case_content_file',
      metadata: { isLocked: false },
    } as any;
    props.filesById.set('file-1', {
      id: 'file-1',
      name: 'Transcript.pdf',
      fileType: 'document',
      createdAt: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-04T00:00:00.000Z',
      isLocked: false,
    });

    render(<CaseListNodeItem {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Transcript.pdf' }));

    expect(props.handleOpenFile).toHaveBeenCalledWith('file-1');
    expect(props.handleOpenCase).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Child' })).not.toBeInTheDocument();
  });
});
