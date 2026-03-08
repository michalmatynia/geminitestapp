import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/ui', async () => {
  const React = await import('react');

  return {
    TreeCaret: ({
      ariaLabel,
      hasChildren,
      isOpen,
      onToggle,
    }: {
      ariaLabel?: string;
      hasChildren?: boolean;
      isOpen?: boolean;
      onToggle?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    }): React.JSX.Element =>
      hasChildren ? (
        <button
          type='button'
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          onClick={(event): void => onToggle?.(event)}
        >
          caret
        </button>
      ) : (
        <span aria-hidden='true'>caret</span>
      ),
    TreeContextMenu: ({ children }: { children: React.ReactNode }): React.JSX.Element => (
      <div>{children}</div>
    ),
    TreeRow: ({
      children,
      className,
      style,
      role,
      'aria-level': ariaLevel,
      'aria-selected': ariaSelected,
      'aria-expanded': ariaExpanded,
      'aria-label': ariaLabel,
    }: {
      children: React.ReactNode;
      className?: string;
      style?: React.CSSProperties;
      role?: string;
      'aria-level'?: number;
      'aria-selected'?: boolean;
      'aria-expanded'?: boolean;
      'aria-label'?: string;
    }): React.JSX.Element => (
      <div
        className={className}
        style={style}
        role={role}
        aria-level={ariaLevel}
        aria-selected={ariaSelected}
        aria-expanded={ariaExpanded}
        aria-label={ariaLabel}
      >
        {children}
      </div>
    ),
  };
});

import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { CardNodeItem } from '@/features/ai/image-studio/components/slot-tree/CardNodeItem';
import { FolderNodeItem } from '@/features/ai/image-studio/components/slot-tree/FolderNodeItem';
import { SlotTreeContext, type SlotTreeContextValue } from '@/features/ai/image-studio/components/slot-tree/SlotTreeContext';
import {
  toFolderMasterNodeId,
  toSlotMasterNodeId,
} from '@/features/ai/image-studio/utils/master-folder-tree';

const MockIcon = ({ className }: { className?: string }): React.JSX.Element => (
  <svg className={className} aria-hidden='true' />
);

const createSlotTreeContextValue = (
  overrides: Partial<SlotTreeContextValue> = {}
): SlotTreeContextValue => ({
  controller: {
    renameDraft: '',
    updateRenameDraft: vi.fn(),
    cancelRename: vi.fn(),
  } as unknown as SlotTreeContextValue['controller'],
  slotById: new Map<string, ImageStudioSlotRecord>(),
  onSelectFolder: vi.fn(),
  onDeleteFolder: vi.fn(),
  onMoveFolder: vi.fn(async () => undefined),
  onRenameFolder: vi.fn(async () => undefined),
  onDeleteSlot: vi.fn(),
  onMoveSlot: vi.fn(),
  updateSlot: vi.fn(async () => undefined),
  setSelectedSlotId: vi.fn(),
  selectedSlotId: null,
  clearSelection: vi.fn(),
  startFolderRename: vi.fn(),
  commitFolderRename: vi.fn(),
  startCardRename: vi.fn(),
  commitCardRename: vi.fn(),
  onSelectCardNode: vi.fn(),
  stickySelectionMode: false,
  clearSelectionOnAwayClick: false,
  profile: {
    nesting: {
      blockedTargetKinds: [],
      rules: [],
      defaultAllow: true,
    },
    placeholders: {
      inlineDropLabel: 'Drop inside',
    },
  } as unknown as SlotTreeContextValue['profile'],
  placeholderClasses: {
    lineActive: 'line-active',
    badgeActive: 'badge-active',
    badgeIdle: 'badge-idle',
  } as SlotTreeContextValue['placeholderClasses'],
  icons: {
    FolderClosedIcon: MockIcon,
    FolderOpenIcon: MockIcon,
    FileIcon: MockIcon,
    DragHandleIcon: MockIcon,
  },
  deleteSlotMutationPending: false,
  ...overrides,
});

describe('Image Studio slot tree accessibility', () => {
  it('renders folder rows with separate expand, select, and delete buttons', () => {
    const contextValue = createSlotTreeContextValue();
    const select = vi.fn();
    const toggleExpand = vi.fn();

    render(
      <SlotTreeContext.Provider value={contextValue}>
        <FolderNodeItem
          node={{
            id: toFolderMasterNodeId('folder-a'),
            type: 'folder',
            kind: 'folder',
            parentId: null,
            name: 'Folder A',
            path: 'folder-a',
            sortOrder: 1,
          }}
          depth={0}
          hasChildren
          isExpanded={false}
          isSelected={false}
          isRenaming={false}
          isDropTarget={false}
          dropPosition={null}
          select={select}
          toggleExpand={toggleExpand}
        />
      </SlotTreeContext.Provider>
    );

    const expandButton = screen.getByRole('button', { name: 'Expand Folder A' });
    const selectButton = screen.getByRole('button', { name: 'Folder A' });
    const deleteButton = screen.getByRole('button', { name: 'Delete Folder A' });
    const treeItem = screen.getByRole('treeitem', { name: 'Folder A' });

    expect(treeItem).toHaveAttribute('aria-level', '1');
    expect(treeItem).toHaveAttribute('aria-expanded', 'false');
    expect(treeItem).toHaveAttribute('aria-selected', 'false');
    expect(within(selectButton).queryByRole('button')).not.toBeInTheDocument();

    fireEvent.click(expandButton);
    expect(toggleExpand).toHaveBeenCalledTimes(1);

    fireEvent.click(deleteButton);
    expect(contextValue.onDeleteFolder).toHaveBeenCalledWith('folder-a');
    expect(select).not.toHaveBeenCalled();

    fireEvent.click(selectButton);
    expect(select).toHaveBeenCalledTimes(1);
    expect(contextValue.onSelectFolder).toHaveBeenCalledWith('folder-a');
  });

  it('renders card rows with separate select and delete buttons', () => {
    const card = {
      id: 'slot-1',
      name: 'Hero card',
      folderPath: 'folder-a',
    } as ImageStudioSlotRecord;
    const contextValue = createSlotTreeContextValue({
      slotById: new Map([[card.id, card]]),
    });
    const select = vi.fn();

    render(
      <SlotTreeContext.Provider value={contextValue}>
        <CardNodeItem
          node={{
            id: toSlotMasterNodeId(card.id),
            type: 'file',
            kind: 'card',
            parentId: toFolderMasterNodeId('folder-a'),
            name: card.name,
            path: `folder-a/${card.id}`,
            sortOrder: 1,
            metadata: {
              roleLabel: 'mask',
            },
          }}
          depth={1}
          hasChildren={false}
          isExpanded={false}
          isSelected={false}
          isRenaming={false}
          select={select}
          toggleExpand={vi.fn()}
        />
      </SlotTreeContext.Provider>
    );

    const selectButton = screen.getByRole('button', { name: /Hero card.*mask/i });
    const deleteButton = screen.getByRole('button', { name: 'Delete Hero card' });
    const treeItem = screen.getByRole('treeitem', { name: 'Hero card' });

    expect(treeItem).toHaveAttribute('aria-level', '2');
    expect(treeItem).toHaveAttribute('aria-selected', 'false');
    expect(within(selectButton).queryByRole('button')).not.toBeInTheDocument();

    fireEvent.click(deleteButton);
    expect(contextValue.onDeleteSlot).toHaveBeenCalledWith(card);
    expect(select).not.toHaveBeenCalled();

    fireEvent.click(selectButton);
    expect(select).toHaveBeenCalledTimes(1);
    expect(contextValue.onSelectCardNode).toHaveBeenCalledWith(card, toSlotMasterNodeId(card.id));
  });
});
