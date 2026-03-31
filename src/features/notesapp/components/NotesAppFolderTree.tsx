'use client';

import { FileText, Folder, FolderOpen, GripVertical } from 'lucide-react';
import React, { useEffect, useMemo, useRef } from 'react';

import {
  FolderTreeViewportV2,
  handleMasterTreeDrop,
  resolveFolderTreeIconSet,
  useMasterFolderTreeShell,
} from '@/shared/lib/foldertree/public';
import { useNotesAppActions, useNotesAppState } from '@/features/notesapp/hooks/NotesAppContext';
import {
  buildMasterNodesFromNotesFolderTree,
  toFolderMasterNodeId,
  toNoteMasterNodeId,
} from '@/features/notesapp/utils/master-folder-tree';
import {
  createNotesMasterTreeAdapter,
  resolveNotesFolderTargetForNode,
} from '@/features/notesapp/utils/notes-master-tree-adapter';
import {
  canDropNotesNode,
  resolveNotesExternalDropAction,
} from '@/features/notesapp/utils/notes-master-tree-external-drop';
import type { NotesMasterTreeOperations } from '@/shared/contracts/notes';
import { FolderTreePanel } from '@/shared/ui';
import { type MasterTreeId, type MasterTreeNode } from '@/shared/utils';
import { getFolderDragId, getNoteDragId } from '@/shared/utils/drag-drop';


import { NotesAppTreeHeader } from './tree/NotesAppTreeHeader';
import { NotesAppTreeNode } from './tree/NotesAppTreeNode';
import { NotesAppTreeNodeRuntimeProvider } from './tree/NotesAppTreeNodeRuntimeContext';

type NotesAppFolderTreeOperations = NotesMasterTreeOperations & {
  handleRelateNotes: (sourceNoteId: string, targetNoteId: string) => Promise<void>;
};

type NotesAppFolderTreeDropInput = Parameters<typeof handleMasterTreeDrop>[0]['input'];

export function NotesAppFolderTree(): React.JSX.Element {
  const { folderTree, selectedNote, isFolderTreeCollapsed, draggedNoteId, selectedFolderId } =
    useNotesAppState();
  const { setIsFolderTreeCollapsed, operations } = useNotesAppActions();
  const hasInitializedCollapseSyncRef = useRef(false);

  const masterNodes = useMemo(
    (): MasterTreeNode[] => buildMasterNodesFromNotesFolderTree(folderTree),
    [folderTree]
  );
  const initialExpandedFolderNodeIds = useMemo(
    () =>
      masterNodes
        .filter((node: MasterTreeNode) => node.type === 'folder')
        .map((node: MasterTreeNode) => node.id),
    [masterNodes]
  );
  const selectedMasterNodeId = useMemo((): MasterTreeId | null => {
    if (selectedNote?.id) return toNoteMasterNodeId(selectedNote.id);
    if (selectedFolderId) return toFolderMasterNodeId(selectedFolderId);
    return null;
  }, [selectedNote?.id, selectedFolderId]);

  const notesAdapter = useMemo(
    () => createNotesMasterTreeAdapter(operations as NotesAppFolderTreeOperations),
    [operations]
  );
  const {
    appearance: { rootDropUi, resolveIcon },
    controller,
    panel: { collapsed: panelCollapsed, setCollapsed: setPanelCollapsed },
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: 'notes',
    nodes: masterNodes,
    selectedNodeId: selectedMasterNodeId,
    initiallyExpandedNodeIds: initialExpandedFolderNodeIds,
    adapter: notesAdapter,
  });

  useEffect(() => {
    setIsFolderTreeCollapsed(panelCollapsed);
  }, [panelCollapsed, setIsFolderTreeCollapsed]);

  useEffect(() => {
    if (!hasInitializedCollapseSyncRef.current) {
      hasInitializedCollapseSyncRef.current = true;
      return;
    }
    setPanelCollapsed(isFolderTreeCollapsed);
  }, [isFolderTreeCollapsed, setPanelCollapsed]);

  const selectedFolderForCreate = useMemo(
    (): string | null =>
      resolveNotesFolderTargetForNode(controller.nodes, controller.selectedNodeId),
    [controller.nodes, controller.selectedNodeId]
  );

  const { FolderClosedIcon, FolderOpenIcon, FileIcon, DragHandleIcon } = useMemo(
    () =>
      resolveFolderTreeIconSet(resolveIcon, {
        FolderClosedIcon: {
          slot: 'folderClosed',
          kind: 'folder',
          fallback: Folder,
          fallbackId: 'Folder',
        },
        FolderOpenIcon: {
          slot: 'folderOpen',
          kind: 'folder',
          fallback: FolderOpen,
          fallbackId: 'FolderOpen',
        },
        FileIcon: {
          slot: 'file',
          kind: 'note',
          fallback: FileText,
          fallbackId: 'FileText',
        },
        DragHandleIcon: {
          slot: 'dragHandle',
          fallback: GripVertical,
          fallbackId: 'GripVertical',
        },
      }),
    [resolveIcon]
  );
  const treeNodeRuntimeContextValue = useMemo(
    () => ({
      controller,
      FolderClosedIcon,
      FolderOpenIcon,
      FileIcon,
      DragHandleIcon,
    }),
    [DragHandleIcon, FileIcon, FolderClosedIcon, FolderOpenIcon, controller]
  );

  return (
    <FolderTreePanel
      className='bg-gray-900 border-r border-border'
      bodyClassName='flex min-h-0 flex-1 flex-col'
      masterInstance='notes'
      header={
        <NotesAppTreeHeader
          controller={controller}
          selectedFolderForCreate={selectedFolderForCreate}
          setPanelCollapsed={setPanelCollapsed}
        />
      }
    >
      <NotesAppTreeNodeRuntimeProvider value={treeNodeRuntimeContextValue}>
        <div className='min-h-0 flex-1 overflow-auto p-2'>
          <FolderTreeViewportV2
            controller={controller}
            scrollToNodeRef={scrollToNodeRef}
            rootDropUi={rootDropUi}
            resolveDraggedNodeId={(event: React.DragEvent<HTMLElement>): string | null => {
              const noteId = getNoteDragId(event.dataTransfer, draggedNoteId);
              if (noteId) return toNoteMasterNodeId(noteId);
              const folderId = getFolderDragId(event.dataTransfer);
              if (folderId) return toFolderMasterNodeId(folderId);
              return null;
            }}
            canDrop={({ draggedNodeId, targetId }, ctlr): boolean => {
              return canDropNotesNode({
                draggedNodeId,
                targetId,
                nodes: ctlr.nodes,
              });
            }}
            onNodeDrop={async (
              { draggedNodeId, targetId, position, rootDropZone }: NotesAppFolderTreeDropInput,
              ctlr
            ): Promise<void> => {
              await handleMasterTreeDrop({
                input: {
                  draggedNodeId,
                  targetId,
                  position,
                  rootDropZone,
                },
                controller: ctlr,
                onExternalDrop: async ({ input, controller }): Promise<void> => {
                  const action = resolveNotesExternalDropAction({
                    draggedNodeId: input.draggedNodeId,
                    targetId: input.targetId,
                    nodes: controller.nodes,
                    roots: controller.roots,
                    rootDropZone: input.rootDropZone,
                  });
                  if (!action) return;

                  if (action.type === 'relate_notes') {
                    await (operations as NotesAppFolderTreeOperations).handleRelateNotes(
                      action.noteId,
                      action.targetNoteId
                    );
                    return;
                  }
                  if (action.type === 'move_note') {
                    await operations.handleMoveNoteToFolder(action.noteId, action.targetFolderId);
                    return;
                  }
                  if (action.type === 'reorder_folder_root_top') {
                    await operations.handleReorderFolder(
                      action.folderId,
                      action.anchorFolderId,
                      'before'
                    );
                    return;
                  }
                  await operations.handleMoveFolderToFolder(action.folderId, action.targetFolderId);
                },
              });
            }}
            renderNode={(nodeProps) => <NotesAppTreeNode {...nodeProps} />}
          />
        </div>
      </NotesAppTreeNodeRuntimeProvider>
    </FolderTreePanel>
  );
}
