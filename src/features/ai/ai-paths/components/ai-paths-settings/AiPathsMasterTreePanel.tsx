'use client';

import { Eye, FileCode2, Folder, FolderOpen, FolderPlus, GripVertical, Plus, Trash2 } from 'lucide-react';
import React from 'react';

import { createAiPathsMasterTreeAdapter } from '@/features/ai/ai-paths/utils/ai-paths-master-tree-adapter';
import {
  buildMasterNodesFromAiPaths,
  findAiPathMasterNodeAncestorIds,
  fromAiPathFolderNodeId,
  fromAiPathNodeId,
  toAiPathNodeId,
} from '@/features/ai/ai-paths/utils/master-folder-tree';
import { usePrompt } from '@/shared/hooks/ui/usePrompt';
import type { PathMeta } from '@/shared/lib/ai-paths';
import {
  FolderTreeViewportV2,
  handleMasterTreeDrop,
  resolveFolderTreeIconSet,
  useMasterFolderTreeSearch,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/shared/lib/foldertree/public';
import { FolderTreePanel } from '@/shared/ui/navigation-and-layout.public';
import { TreeCaret, TreeContextMenu, TreeRow } from '@/shared/ui/data-display.public';
import { Button, Input } from '@/shared/ui/primitives.public';
import { canNestTreeNodeV2 } from '@/shared/utils/folder-tree-profiles-v2';
import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type { Toast } from '@/shared/contracts/ui/base';
import type { MasterTreeDropPosition, MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { resolveVerticalDropPosition } from '@/shared/utils/drag-drop';
import { focusOnMount } from '@/shared/utils/focus-on-mount';
import { normalizeTreePath } from '@/shared/utils/tree-operations';

type PathCreateFolderOptions = {
  folderPath?: string | null;
};

type TreeNodeToast = Toast;

type PathClickBehavior = 'open' | 'select';

type AiPathsMasterTreeContextValue = {
  activePathId: string | null;
  controller: MasterFolderTreeController;
  handleDeletePath: (pathId?: string) => Promise<void>;
  handleDuplicatePath: (pathId?: string, options?: PathCreateFolderOptions) => void;
  handleMoveFolder: (folderPath: string, targetFolderPath?: string | null) => Promise<void>;
  handleMovePathToFolder: (pathId: string, folderPath?: string | null) => Promise<void>;
  handleRenameFolder: (folderPath: string, nextFolderPath: string) => Promise<void>;
  icons: {
    FolderClosedIcon: React.ComponentType<{ className?: string }>;
    FolderOpenIcon: React.ComponentType<{ className?: string }>;
    FileIcon: React.ComponentType<{ className?: string }>;
    DragHandleIcon: React.ComponentType<{ className?: string }>;
  };
  onCopyPathJson?: ((pathId: string) => void) | undefined;
  openPath: (pathId: string) => void;
  pathClickBehavior: PathClickBehavior;
  profile: ReturnType<typeof useMasterFolderTreeShell>['profile'];
  selectedPathFolderById: Map<string, string>;
  setSelectedTreeNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  showPathHoverActions: boolean;
  toast: TreeNodeToast;
};

const AiPathsMasterTreeContext = React.createContext<AiPathsMasterTreeContextValue | null>(null);

function useAiPathsMasterTree(): AiPathsMasterTreeContextValue {
  const context = React.useContext(AiPathsMasterTreeContext);
  if (!context) {
    throw new Error('useAiPathsMasterTree must be used within AiPathsMasterTreePanel.');
  }
  return context;
}

function AiPathsTreeNode(props: FolderTreeViewportRenderNodeInput): React.JSX.Element | null {
  const {
    node,
    depth,
    hasChildren,
    isExpanded,
    isSelected,
    isRenaming,
    isDropTarget,
    dropPosition,
    select,
    toggleExpand,
    startRename,
  } = props;

  const {
    activePathId,
    controller,
    handleDeletePath,
    handleDuplicatePath,
    handleMoveFolder,
    handleMovePathToFolder,
    handleRenameFolder,
    icons: { FolderClosedIcon, FolderOpenIcon, FileIcon, DragHandleIcon },
    onCopyPathJson,
    openPath,
    pathClickBehavior,
    profile,
    selectedPathFolderById,
    setSelectedTreeNodeId,
    showPathHoverActions,
    toast,
  } = useAiPathsMasterTree();

  const folderPath = fromAiPathFolderNodeId(node.id);
  const pathId = fromAiPathNodeId(node.id);
  const allowMoveFolderToRoot =
    folderPath !== null &&
    canNestTreeNodeV2({
      profile,
      nodeType: 'folder',
      nodeKind: 'folder',
      targetType: 'root',
    });
  const allowMovePathToRoot =
    pathId !== null &&
    canNestTreeNodeV2({
      profile,
      nodeType: 'file',
      nodeKind: 'path',
      targetType: 'root',
    });
  const showInlineDrop = isDropTarget && dropPosition === 'inside';
  const commitFolderRename = React.useCallback((): void => {
    if (folderPath === null) {
      controller.cancelRename();
      return;
    }
    const normalizedLeaf = controller.renameDraft.replace(/[\\/]+/g, ' ').trim();
    if (!normalizedLeaf) {
      toast('Group name cannot be empty.', { variant: 'info' });
      return;
    }
    const parentPath = folderPath.includes('/') ? folderPath.slice(0, folderPath.lastIndexOf('/')) : '';
    const nextFolderPath = normalizeTreePath(
      parentPath ? `${parentPath}/${normalizedLeaf}` : normalizedLeaf
    );
    if (nextFolderPath === folderPath) {
      controller.cancelRename();
      return;
    }
    controller.cancelRename();
    void handleRenameFolder(folderPath, nextFolderPath);
  }, [controller, folderPath, handleRenameFolder, toast]);

  if (folderPath !== null) {
    return (
      <TreeContextMenu
        items={[
          {
            id: 'select-group',
            label: 'Select group',
            onSelect: (): void => {
              setSelectedTreeNodeId(node.id);
              select();
            },
          },
          {
            id: 'rename-group',
            label: 'Rename group',
            onSelect: (): void => startRename(),
          },
          ...(allowMoveFolderToRoot && folderPath
            ? [
                {
                  id: 'move-group-root',
                  label: 'Move group to root',
                  onSelect: (): void => {
                    void handleMoveFolder(folderPath, '');
                  },
                },
              ]
            : []),
        ]}
      >
        {isRenaming ? (
          <TreeRow
            depth={depth}
            baseIndent={8}
            indent={12}
            tone='subtle'
            role='treeitem'
            aria-level={depth + 1}
            aria-selected={isSelected}
            aria-expanded={hasChildren ? isExpanded : undefined}
            selected={isSelected}
            selectedClassName='bg-muted text-white hover:bg-muted'
            className='h-8 text-xs'
          >
            <div
              className='flex h-full w-full min-w-0 items-center gap-1'
              onMouseDownCapture={(event: React.MouseEvent<HTMLDivElement>): void => {
                event.stopPropagation();
              }}
              onClickCapture={(event: React.MouseEvent<HTMLDivElement>): void => {
                event.stopPropagation();
              }}
            >
              <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center' />
              <TreeCaret
                isOpen={isExpanded}
                hasChildren={hasChildren}
                ariaLabel={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
                onToggle={hasChildren ? toggleExpand : undefined}
                className='w-3 text-gray-400'
                buttonClassName='hover:bg-gray-700'
                placeholderClassName='w-3'
              />
              <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center'>
                <FolderOpenIcon className='size-3.5 text-gray-400' />
              </span>
              <input
                ref={focusOnMount}
                value={controller.renameDraft}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  controller.updateRenameDraft(event.target.value);
                }}
                onBlur={commitFolderRename}
                onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>): void => {
                  event.stopPropagation();
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitFolderRename();
                    return;
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    controller.cancelRename();
                  }
                }}
                onPointerDown={(event: React.PointerEvent<HTMLInputElement>): void => {
                  event.stopPropagation();
                }}
                onClick={(event: React.MouseEvent<HTMLInputElement>): void => {
                  event.stopPropagation();
                }}
                className='h-6 w-full rounded border border-border/70 bg-card/80 px-2 text-xs text-gray-100 outline-none ring-0 focus:border-sky-400'
                aria-label='Rename group'
              />
            </div>
          </TreeRow>
        ) : (
          <TreeRow
            depth={depth}
            baseIndent={8}
            indent={12}
            tone='subtle'
            role='treeitem'
            aria-level={depth + 1}
            aria-selected={isSelected}
            aria-expanded={hasChildren ? isExpanded : undefined}
            selected={isSelected}
            selectedClassName='bg-muted text-white hover:bg-muted'
            dragOver={showInlineDrop}
            dragOverClassName='bg-transparent text-gray-100 ring-0'
            className='relative h-8 text-xs'
          >
            <div className='flex h-full w-full min-w-0 items-center gap-1 text-left'>
              <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100'>
                <DragHandleIcon className='size-3.5 text-gray-500' />
              </span>
              <TreeCaret
                isOpen={isExpanded}
                hasChildren={hasChildren}
                ariaLabel={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
                onToggle={hasChildren ? toggleExpand : undefined}
                className='w-3 text-gray-400'
                buttonClassName='hover:bg-gray-700'
                placeholderClassName='w-3'
              />
              <button
                type='button'
                className='flex h-full min-w-0 flex-1 items-center gap-1 text-left'
                onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                  event.stopPropagation();
                  select(event);
                  setSelectedTreeNodeId(node.id);
                }}
                onDoubleClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                  event.preventDefault();
                  event.stopPropagation();
                  startRename();
                }}
                title={folderPath || 'Root'}
              >
                {isExpanded ? (
                  <FolderOpenIcon className='size-3.5 shrink-0 text-gray-400' />
                ) : (
                  <FolderClosedIcon className='size-3.5 shrink-0 text-gray-400' />
                )}
                <span className='min-w-0 flex-1 truncate'>{node.name}</span>
              </button>
            </div>
          </TreeRow>
        )}
      </TreeContextMenu>
    );
  }

  if (!pathId) return null;
  const currentFolderPath = selectedPathFolderById.get(pathId) ?? '';

  return (
    <TreeContextMenu
      items={[
        {
          id: 'open-path',
          label: 'Open path',
          onSelect: (): void => {
            setSelectedTreeNodeId(node.id);
            openPath(pathId);
          },
        },
        {
          id: 'duplicate-path',
          label: 'Duplicate path',
          onSelect: (): void => {
            handleDuplicatePath(pathId, { folderPath: currentFolderPath });
          },
        },
        ...(onCopyPathJson
          ? [
              {
                id: 'copy-path-json',
                label: 'Copy JSON',
                onSelect: (): void => {
                  onCopyPathJson(pathId);
                },
              },
            ]
          : []),
        ...(allowMovePathToRoot && currentFolderPath
          ? [
              {
                id: 'move-path-root',
                label: 'Move to root',
                onSelect: (): void => {
                  void handleMovePathToFolder(pathId, '');
                },
              },
            ]
          : []),
        {
          id: 'delete-path',
          label: 'Delete path',
          tone: 'danger' as const,
          onSelect: (): void => {
            void handleDeletePath(pathId);
          },
        },
      ]}
    >
      <TreeRow
        depth={depth}
        baseIndent={8}
        indent={12}
        tone='subtle'
        role='treeitem'
        aria-level={depth + 1}
        aria-selected={isSelected}
        selected={isSelected}
        selectedClassName='bg-muted text-white hover:bg-muted'
        className='relative h-8 text-xs'
      >
        <div className='flex h-full w-full min-w-0 items-center gap-1 text-left'>
          <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100'>
            <GripVertical className='size-3.5 text-gray-500' />
          </span>
          <TreeCaret
            isOpen={isExpanded}
            hasChildren={hasChildren}
            ariaLabel={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            onToggle={hasChildren ? toggleExpand : undefined}
            className='w-3 text-gray-400'
            buttonClassName='hover:bg-gray-700'
            placeholderClassName='w-3'
          />
          <button
            type='button'
            className='flex h-full min-w-0 flex-1 items-center gap-1 text-left'
            onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
              event.stopPropagation();
              select(event);
              setSelectedTreeNodeId(node.id);
              if (pathClickBehavior === 'open') {
                openPath(pathId);
              }
            }}
            title={node.name}
          >
            <FileIcon className='size-3.5 shrink-0 text-gray-400' />
            <span className='min-w-0 flex-1 truncate'>{node.name}</span>
          </button>
          {activePathId === pathId || showPathHoverActions ? (
            <div className='ml-auto flex shrink-0 items-center gap-1'>
              {activePathId === pathId ? (
                <span className='shrink-0 rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[10px] text-sky-100'>
                  Active
                </span>
              ) : null}
              {showPathHoverActions ? (
                <div className='flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'>
                  <button
                    type='button'
                    aria-label={`Preview ${node.name}`}
                    title={`Preview ${node.name}`}
                    className='inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-muted/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
                    onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                      event.preventDefault();
                      event.stopPropagation();
                      openPath(pathId);
                    }}
                  >
                    <Eye className='size-3.5' />
                  </button>
                  <button
                    type='button'
                    aria-label={`Delete ${node.name}`}
                    title={`Delete ${node.name}`}
                    className='inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-500/15 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40'
                    onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
                      event.preventDefault();
                      event.stopPropagation();
                      void handleDeletePath(pathId);
                    }}
                  >
                    <Trash2 className='size-3.5' />
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </TreeRow>
    </TreeContextMenu>
  );
}

export type AiPathsMasterTreePanelProps = {
  activePathId: string | null;
  bodyClassName?: string | undefined;
  emptyLabel?: string | undefined;
  handleCreatePath: (options?: PathCreateFolderOptions) => void;
  handleDeletePath: (pathId?: string) => Promise<void>;
  handleDuplicatePath: (pathId?: string, options?: PathCreateFolderOptions) => void;
  handleMoveFolder: (folderPath: string, targetFolderPath?: string | null) => Promise<void>;
  handleMovePathToFolder: (pathId: string, folderPath?: string | null) => Promise<void>;
  handleRenameFolder: (folderPath: string, nextFolderPath: string) => Promise<void>;
  handleSwitchPath: (pathId: string) => void;
  headerDescription?: string | undefined;
  headerTitle?: string | undefined;
  onCopyPathJson?: ((pathId: string) => void) | undefined;
  onPathOpen?: ((pathId: string) => void) | undefined;
  panelClassName?: string | undefined;
  pathClickBehavior?: PathClickBehavior | undefined;
  paths: PathMeta[];
  renderHeaderActions?: ((input: { selectedFolderPath: string }) => React.ReactNode) | undefined;
  searchAriaLabel?: string | undefined;
  searchPlaceholder?: string | undefined;
  showPathHoverActions?: boolean | undefined;
  toast: TreeNodeToast;
  viewportClassName?: string | undefined;
};

export function AiPathsMasterTreePanel({
  activePathId,
  bodyClassName,
  emptyLabel = 'No AI paths yet. Create a path or group here.',
  handleCreatePath,
  handleDeletePath,
  handleDuplicatePath,
  handleMoveFolder,
  handleMovePathToFolder,
  handleRenameFolder,
  handleSwitchPath,
  headerDescription = 'Group and switch AI paths from the canvas.',
  headerTitle = 'Path Groups',
  onCopyPathJson,
  onPathOpen,
  panelClassName,
  pathClickBehavior = 'open',
  paths,
  renderHeaderActions,
  searchAriaLabel = 'Search path groups',
  searchPlaceholder = 'Search groups or paths',
  showPathHoverActions = false,
  toast,
  viewportClassName,
}: AiPathsMasterTreePanelProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedTreeNodeId, setSelectedTreeNodeId] = React.useState<string | null>(
    activePathId ? toAiPathNodeId(activePathId) : null
  );
  const { prompt, PromptInputModal } = usePrompt();

  const masterNodes = React.useMemo(() => buildMasterNodesFromAiPaths(paths), [paths]);
  const selectedPathFolderById = React.useMemo(
    () =>
      new Map<string, string>(
        paths.map((pathMeta): [string, string] => [pathMeta.id, normalizeTreePath(pathMeta.folderPath ?? '')])
      ),
    [paths]
  );
  const treeAdapter = React.useMemo(
    () =>
      createAiPathsMasterTreeAdapter({
        movePath: handleMovePathToFolder,
        moveFolder: handleMoveFolder,
        renameFolder: handleRenameFolder,
      }),
    [handleMoveFolder, handleMovePathToFolder, handleRenameFolder]
  );

  const {
    profile,
    capabilities,
    appearance: { rootDropUi, resolveIcon },
    controller,
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: 'ai_paths',
    nodes: masterNodes,
    selectedNodeId: selectedTreeNodeId,
    adapter: treeAdapter,
  });

  const searchState = useMasterFolderTreeSearch(masterNodes, searchQuery, {
    config: capabilities.search,
  });

  const icons = React.useMemo(
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
          kind: 'path',
          fallback: FileCode2,
          fallbackId: 'FileCode2',
        },
        DragHandleIcon: {
          slot: 'dragHandle',
          fallback: GripVertical,
          fallbackId: 'GripVertical',
        },
      }),
    [resolveIcon]
  );

  React.useEffect(() => {
    const nextSelectedNodeId = activePathId ? toAiPathNodeId(activePathId) : null;
    setSelectedTreeNodeId(nextSelectedNodeId);
    if (!nextSelectedNodeId) return;
    findAiPathMasterNodeAncestorIds(masterNodes, nextSelectedNodeId).forEach((ancestorId: string) => {
      controller.expandNode(ancestorId);
    });
    scrollToNodeRef.current?.(nextSelectedNodeId);
  }, [activePathId, controller, masterNodes, scrollToNodeRef]);

  const selectedFolderPath = React.useMemo((): string => {
    if (selectedTreeNodeId) {
      const folderNodePath = fromAiPathFolderNodeId(selectedTreeNodeId);
      if (folderNodePath !== null) return folderNodePath;
      const selectedPathId = fromAiPathNodeId(selectedTreeNodeId);
      if (selectedPathId) {
        return selectedPathFolderById.get(selectedPathId) ?? '';
      }
    }
    if (activePathId) {
      return selectedPathFolderById.get(activePathId) ?? '';
    }
    return '';
  }, [activePathId, selectedPathFolderById, selectedTreeNodeId]);

  const openPath = React.useCallback(
    (pathId: string): void => {
      handleSwitchPath(pathId);
      onPathOpen?.(pathId);
    },
    [handleSwitchPath, onPathOpen]
  );

  const handleCreateGroupWithPath = React.useCallback((): void => {
    void prompt({
      title: 'New Path Group',
      message: 'Create a new group and open an initial path inside it.',
      label: 'Group name',
      placeholder: 'Examples: Enrichment, SEO, Drafting',
      confirmText: 'Create Group',
      required: true,
      onConfirm: async (value: string): Promise<void> => {
        const normalizedLeaf = normalizeTreePath(value.replace(/[\\/]+/g, '/'));
        const leafName = normalizedLeaf.split('/').filter(Boolean).pop() ?? '';
        if (!leafName) {
          toast('Group name cannot be empty.', { variant: 'info' });
          return;
        }
        const nextFolderPath = normalizeTreePath(
          selectedFolderPath ? `${selectedFolderPath}/${leafName}` : leafName
        );
        handleCreatePath({ folderPath: nextFolderPath });
      },
    });
  }, [handleCreatePath, prompt, selectedFolderPath, toast]);

  return (
    <AiPathsMasterTreeContext.Provider
      value={{
        activePathId,
        controller,
        handleDeletePath,
        handleDuplicatePath,
        handleMoveFolder,
        handleMovePathToFolder,
        handleRenameFolder,
        icons,
        onCopyPathJson,
        openPath,
        pathClickBehavior,
        profile,
        selectedPathFolderById,
        setSelectedTreeNodeId,
        showPathHoverActions,
        toast,
      }}
    >
      <FolderTreePanel
        className={panelClassName ?? 'h-full border-r border-border/60 bg-card/35'}
        bodyClassName={bodyClassName ?? 'flex min-h-0 flex-1 flex-col'}
        masterInstance='ai_paths'
        header={
          <div className='border-b border-border/60 p-3'>
            <div className='mb-2 flex items-center justify-between gap-2'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.16em] text-gray-400'>
                  {headerTitle}
                </p>
                <p className='text-[11px] text-gray-500'>{headerDescription}</p>
              </div>
            </div>
            <div className='mb-2'>
              <Input
                value={searchQuery}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  setSearchQuery(event.target.value);
                }}
                placeholder={searchPlaceholder}
                className='h-8 text-xs'
                aria-label={searchAriaLabel}
              />
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                type='button'
                size='xs'
                variant='outline'
                className='h-7 px-2 text-[11px]'
                onClick={() => handleCreatePath({ folderPath: selectedFolderPath })}
              >
                <Plus className='mr-1 size-3.5' />
                Path
              </Button>
              <Button
                type='button'
                size='xs'
                variant='outline'
                className='h-7 px-2 text-[11px]'
                onClick={handleCreateGroupWithPath}
              >
                <FolderPlus className='mr-1 size-3.5' />
                Group
              </Button>
              {renderHeaderActions?.({ selectedFolderPath })}
            </div>
          </div>
        }
      >
        <div className={viewportClassName ?? 'min-h-0 flex-1 overflow-auto p-2'}>
          <FolderTreeViewportV2
            controller={controller}
            scrollToNodeRef={scrollToNodeRef}
            className='space-y-0.5'
            emptyLabel={emptyLabel}
            rootDropUi={rootDropUi}
            searchState={searchState}
            resolveDropPosition={(event, { targetId }, ctlr): MasterTreeDropPosition => {
              const targetNode = ctlr.nodes.find(
                (candidate: MasterTreeNode): boolean => candidate.id === targetId
              );
              if (targetNode?.type === 'folder') return 'inside';
              const targetRect = event.currentTarget.getBoundingClientRect();
              return (
                resolveVerticalDropPosition(event.clientY, targetRect, {
                  thresholdRatio: 0.34,
                }) ?? 'after'
              );
            }}
            canDrop={({ defaultAllowed, targetId }, ctlr): boolean => {
              if (defaultAllowed) return true;
              if (targetId === null) return true;
              const targetNode = ctlr.nodes.find(
                (candidate: MasterTreeNode): boolean => candidate.id === targetId
              );
              return targetNode?.type === 'folder';
            }}
            onNodeDrop={async ({ draggedNodeId, targetId, position, rootDropZone }, ctlr) => {
              await handleMasterTreeDrop({
                input: {
                  draggedNodeId,
                  targetId,
                  position,
                  rootDropZone,
                },
                controller: ctlr,
              });
            }}
            renderNode={(nodeProps) => <AiPathsTreeNode {...nodeProps} />}
          />
        </div>
      </FolderTreePanel>
      <PromptInputModal />
    </AiPathsMasterTreeContext.Provider>
  );
}
