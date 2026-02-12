'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

import { internalError } from '@/shared/errors/app-error';
import type { CategoryWithChildren } from '@/shared/types/domain/notes';
import { collectTreeNodeIds, defaultFolderTreeProfiles, type FolderTreeProfile } from '@/shared/utils';

import type { FolderTreeProps } from '../types/folder-tree-ui';

export interface FolderTreeContextType extends Omit<FolderTreeProps, 'profile'> {
  // Data
  folders: CategoryWithChildren[];
  selectedFolderId: string | null;
  selectedNotebookId: string | null | undefined;
  selectedNoteId: string | undefined;
  
  // Folder Actions
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (parentId?: string | null) => void;
  onDeleteFolder: (id: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onToggleExpand: (id: string) => void;
  expandedFolderIds: Set<string>;
  
  // Note Actions
  onSelectNote: (id: string) => void;
  onCreateNote: (folderId: string) => void;
  onDuplicateNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onRenameNote: (id: string, title: string) => void;
  onRelateNotes: (noteId: string, targetId: string) => void;
  
  // Drag & Drop
  draggedNoteId: string | null;
  setDraggedNoteId: (id: string | null) => void;
  draggedFolderId: string | null;
  setDraggedFolderId: (id: string | null) => void;
  onDropNote: (noteId: string, folderId: string | null) => void;
  onDropFolder: (folderId: string, parentFolderId: string | null) => void;
  onReorderFolder?: ((draggedId: string, targetId: string, position: 'before' | 'after') => void) | undefined;
  
  // UI State
  renamingFolderId: string | null;
  onStartRename: (id: string | null) => void;
  onCancelRename: () => void;
  renamingNoteId: string | null;
  onStartNoteRename: (id: string | null) => void;
  onCancelNoteRename: () => void;
  profile: FolderTreeProfile;
}

const FolderTreeContext = createContext<FolderTreeContextType | undefined>(undefined);

export function useFolderTree(): FolderTreeContextType {
  const context = useContext(FolderTreeContext);
  if (!context) {
    throw internalError('useFolderTree must be used within a FolderTreeProvider');
  }
  return context;
}

export function FolderTreeProvider({ 
  children,
  ...props
}: FolderTreeProps & { children: React.ReactNode }): React.JSX.Element {
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingNoteId, setRenamingNoteId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const profile = props.profile ?? defaultFolderTreeProfiles.notes;

  const collectFolderIds = useCallback((foldersToScan: CategoryWithChildren[]): string[] => {
    return foldersToScan.flatMap((node: CategoryWithChildren): string[] => [
      node.id,
      ...collectTreeNodeIds(node.children),
    ]);
  }, []);

  // Track if initial expansion has happened to avoid re-expanding on folder tree refresh
  const hasInitiallyExpandedRef = React.useRef(false);

  useEffect(() => {
    if (props.folders.length === 0) return;
    if (hasInitiallyExpandedRef.current) return;

    setExpandedFolderIds(new Set(collectFolderIds(props.folders)));
    hasInitiallyExpandedRef.current = true;
  }, [props.folders, collectFolderIds]);

  const handleToggleExpand = useCallback((folderId: string): void => {
    setExpandedFolderIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      ...props,
      profile,
      selectedNotebookId: props.selectedNotebookId,
      selectedNoteId: props.selectedNoteId,
      draggedFolderId,
      setDraggedFolderId,
      renamingFolderId,
      onStartRename: setRenamingFolderId,
      onCancelRename: () => setRenamingFolderId(null),
      renamingNoteId,
      onStartNoteRename: setRenamingNoteId,
      onCancelNoteRename: () => setRenamingNoteId(null),
      expandedFolderIds,
      onToggleExpand: handleToggleExpand,
    }),
    [
      props,
      profile,
      draggedFolderId,
      renamingFolderId,
      renamingNoteId,
      expandedFolderIds,
      handleToggleExpand,
    ]
  );

  return (
    <FolderTreeContext.Provider value={value}>
      {children}
    </FolderTreeContext.Provider>
  );
}
