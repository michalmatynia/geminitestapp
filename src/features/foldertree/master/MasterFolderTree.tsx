'use client';

import React from 'react';

import { resolveVerticalDropPosition } from '@/shared/utils/drag-drop';
import type {
  MasterTreeDropPosition,
  MasterTreeId,
} from '@/shared/utils/master-folder-tree-contract';
import type { MasterTreeViewNode } from '@/shared/utils/master-folder-tree-engine';

import type { MasterFolderTreeController } from './types';

const MASTER_TREE_DRAG_NODE_ID = 'application/x-master-tree-node-id';

const getMasterTreeDragNodeId = (dataTransfer: DataTransfer | null): MasterTreeId | null => {
  if (!dataTransfer) return null;
  try {
    const value = dataTransfer.getData(MASTER_TREE_DRAG_NODE_ID);
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  } catch {
    // no-op: some browser/OS combinations can block drag payload reads at certain phases
  }
  return null;
};

export type MasterFolderTreeRenderNodeInput = {
  node: MasterTreeViewNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  isRenaming: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  dropPosition: MasterTreeDropPosition | null;
  select: () => void;
  toggleExpand: () => void;
  startRename: () => void;
};

export type MasterFolderTreeProps = {
  controller: MasterFolderTreeController;
  enableDnd?: boolean | undefined;
  className?: string | undefined;
  emptyLabel?: string | undefined;
  renderToolbar?: ((controller: MasterFolderTreeController) => React.ReactNode) | undefined;
  renderNode?: ((input: MasterFolderTreeRenderNodeInput) => React.ReactNode) | undefined;
  resolveDraggedNodeId?:
    | ((event: React.DragEvent<HTMLElement>) => MasterTreeId | null)
    | undefined;
  canDrop?:
    | ((
        input: {
          draggedNodeId: MasterTreeId;
          targetId: MasterTreeId | null;
          position: MasterTreeDropPosition;
          defaultAllowed: boolean;
        },
        controller: MasterFolderTreeController
      ) => boolean)
    | undefined;
  onNodeDrop?:
    | ((
        input: {
          draggedNodeId: MasterTreeId;
          targetId: MasterTreeId | null;
          position: MasterTreeDropPosition;
          rootDropZone?: 'top' | 'bottom' | undefined;
        },
        controller: MasterFolderTreeController
      ) => Promise<void> | void)
    | undefined;
  resolveDropPosition?:
    | ((
        event: React.DragEvent<HTMLElement>,
        input: {
          draggedNodeId: MasterTreeId;
          targetId: MasterTreeId;
        },
        controller: MasterFolderTreeController
      ) => MasterTreeDropPosition)
    | undefined;
  onNodeDragStart?:
    | ((
        input: {
          node: MasterTreeViewNode;
          event: React.DragEvent<HTMLDivElement>;
        },
        controller: MasterFolderTreeController
      ) => void)
    | undefined;
  canStartDrag?:
    | ((
        input: {
          node: MasterTreeViewNode;
          event: React.DragEvent<HTMLDivElement>;
        },
        controller: MasterFolderTreeController
      ) => boolean)
    | undefined;
  rootDropUi?:
    | {
        enabled?: boolean | undefined;
        label?: string | undefined;
        idleClassName?: string | undefined;
        activeClassName?: string | undefined;
      }
    | undefined;
};

const defaultRootDropIdleClassName = 'border-border/45 bg-card/25 text-gray-400';
const defaultRootDropActiveClassName = 'border-sky-200/55 bg-sky-500/12 text-sky-100';

const DefaultRow = ({
  node,
  depth,
  hasChildren,
  isExpanded,
  isSelected,
  isDragging,
  dropPosition,
  select,
  toggleExpand,
}: MasterFolderTreeRenderNodeInput): React.JSX.Element => {
  const stateClassName = isSelected
    ? 'bg-blue-600 text-white'
    : dropPosition === 'before'
      ? 'bg-blue-500/10 text-gray-100 ring-1 ring-inset ring-blue-500/60'
      : dropPosition === 'after'
        ? 'bg-blue-500/10 text-gray-100 ring-1 ring-inset ring-cyan-400/60'
        : isDragging
          ? 'opacity-50'
          : 'text-gray-300 hover:bg-muted/40';

  return (
    <button
      type='button'
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition ${stateClassName}`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={select}
    >
      {hasChildren ? (
        <span
          aria-hidden='true'
          onClick={(event: React.MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            toggleExpand();
          }}
          className='inline-flex size-4 items-center justify-center rounded hover:bg-muted/40'
        >
          {isExpanded ? '▾' : '▸'}
        </span>
      ) : (
        <span className='inline-flex size-4 items-center justify-center text-xs opacity-40'>•</span>
      )}
      <span className='truncate'>{node.name}</span>
    </button>
  );
};

export function MasterFolderTree({
  controller,
  enableDnd = true,
  className,
  emptyLabel = 'No items',
  renderToolbar,
  renderNode,
  resolveDraggedNodeId,
  canDrop,
  onNodeDrop,
  resolveDropPosition,
  onNodeDragStart,
  canStartDrag,
  rootDropUi,
}: MasterFolderTreeProps): React.JSX.Element {
  const [externalDraggedNodeId, setExternalDraggedNodeId] = React.useState<MasterTreeId | null>(null);
  const [rootDropHoverZone, setRootDropHoverZone] = React.useState<'top' | 'bottom' | null>(null);

  const resolveDraggedNode = (
    event: React.DragEvent<HTMLElement>
  ): MasterTreeId | null => {
    if (controller.dragState?.draggedNodeId) {
      return controller.dragState.draggedNodeId;
    }
    const dragPayloadNodeId = getMasterTreeDragNodeId(event.dataTransfer);
    if (dragPayloadNodeId) {
      return dragPayloadNodeId;
    }
    return resolveDraggedNodeId?.(event) ?? null;
  };

  const resolveDropAllowance = (
    draggedNodeId: MasterTreeId,
    targetId: MasterTreeId | null,
    position: MasterTreeDropPosition
  ): boolean => {
    const defaultCheck = controller.canDropNode(draggedNodeId, targetId, position);
    if (defaultCheck.ok) return true;
    if (!canDrop) return false;
    return canDrop(
      {
        draggedNodeId,
        targetId,
        position,
        defaultAllowed: false,
      },
      controller
    );
  };

  const rootDropEnabled = rootDropUi?.enabled ?? true;
  const rootDropLabel = rootDropUi?.label?.trim() || 'Drop to Root';
  const rootDropIdleClassName = rootDropUi?.idleClassName ?? defaultRootDropIdleClassName;
  const rootDropActiveClassName = rootDropUi?.activeClassName ?? defaultRootDropActiveClassName;
  const activeDraggedNodeId = controller.dragState?.draggedNodeId ?? externalDraggedNodeId;
  const canDropToRoot = activeDraggedNodeId
    ? resolveDropAllowance(activeDraggedNodeId, null, 'inside')
    : false;
  const showRootDropZones = enableDnd && rootDropEnabled && canDropToRoot;

  const clearDragIndicators = React.useCallback((): void => {
    setExternalDraggedNodeId(null);
    setRootDropHoverZone(null);
  }, []);

  const clearAllDragState = React.useCallback((): void => {
    controller.clearDrag();
    clearDragIndicators();
  }, [clearDragIndicators, controller]);

  const applyRootDrop = React.useCallback(
    async (
      draggedNodeId: MasterTreeId,
      rootDropZone?: 'top' | 'bottom' | undefined
    ): Promise<void> => {
      if (onNodeDrop) {
        await onNodeDrop(
          {
            draggedNodeId,
            targetId: null,
            position: 'inside',
            ...(rootDropZone ? { rootDropZone } : {}),
          },
          controller
        );
        return;
      }
      if (rootDropZone === 'top') {
        await controller.dropNodeToRoot(draggedNodeId, 0);
        return;
      }
      await controller.dropNodeToRoot(draggedNodeId);
    },
    [controller, onNodeDrop]
  );

  const resolveNodeDropPosition = React.useCallback(
    (
      event: React.DragEvent<HTMLDivElement>,
      draggedNodeId: MasterTreeId,
      targetNode: MasterTreeViewNode
    ): MasterTreeDropPosition | null => {
      const targetRect = event.currentTarget.getBoundingClientRect();
      const edgePosition = resolveVerticalDropPosition(event.clientY, targetRect, {
        thresholdRatio: 0.34,
      });
      const requestedPosition =
        resolveDropPosition?.(
          event,
          {
            draggedNodeId,
            targetId: targetNode.id,
          },
          controller
        ) ??
        edgePosition ??
        'inside';

      const insideAllowed = resolveDropAllowance(draggedNodeId, targetNode.id, 'inside');
      const requestedAllowed = resolveDropAllowance(draggedNodeId, targetNode.id, requestedPosition);

      // Global default: when a file is dropped onto a folder row, prefer nesting inside
      // over edge reordering unless the consumer provided explicit position logic.
      if (
        !resolveDropPosition &&
        requestedPosition !== 'inside' &&
        targetNode.type === 'folder' &&
        insideAllowed
      ) {
        const draggedNode = controller.nodes.find((candidate) => candidate.id === draggedNodeId) ?? null;
        if (!draggedNode || draggedNode.type === 'file') {
          return 'inside';
        }
      }

      if (requestedAllowed) return requestedPosition;
      if (requestedPosition !== 'inside' && insideAllowed) return 'inside';
      return null;
    },
    [controller, resolveDropAllowance, resolveDropPosition]
  );

  const renderTree = (nodes: MasterTreeViewNode[], depth: number): React.JSX.Element => (
    <div className='space-y-0.5'>
      {nodes.map((node: MasterTreeViewNode) => {
        const hasChildren = node.children.length > 0;
        const isExpanded = controller.expandedNodeIds.has(node.id);
        const isSelected = controller.selectedNodeId === node.id;
        const isRenaming = controller.renamingNodeId === node.id;
        const isDragging = controller.dragState?.draggedNodeId === node.id;
        const isDropTarget = controller.dragState?.targetId === node.id;
        const dropPosition =
          controller.dragState?.targetId === node.id
            ? controller.dragState.position
            : null;

        const row = renderNode ? (
          renderNode({
            node,
            depth,
            hasChildren,
            isExpanded,
            isSelected,
            isRenaming,
            isDragging: Boolean(isDragging),
            isDropTarget: Boolean(isDropTarget),
            dropPosition,
            select: () => controller.selectNode(node.id),
            toggleExpand: () => controller.toggleNodeExpanded(node.id),
            startRename: () => controller.startRename(node.id),
          })
        ) : (
          <DefaultRow
            node={node}
            depth={depth}
            hasChildren={hasChildren}
            isExpanded={isExpanded}
            isSelected={isSelected}
            isRenaming={isRenaming}
            isDragging={Boolean(isDragging)}
            isDropTarget={Boolean(isDropTarget)}
            dropPosition={dropPosition}
            select={() => controller.selectNode(node.id)}
            toggleExpand={() => controller.toggleNodeExpanded(node.id)}
            startRename={() => controller.startRename(node.id)}
          />
        );

        return (
          <div key={node.id} className='group'>
            <div
              draggable={enableDnd}
              data-master-tree-node-id={node.id}
              onDragStart={
                enableDnd
                  ? (event: React.DragEvent<HTMLDivElement>): void => {
                    if (
                      canStartDrag &&
                      !canStartDrag(
                        {
                          node,
                          event,
                        },
                        controller
                      )
                    ) {
                      event.preventDefault();
                      event.stopPropagation();
                      return;
                    }
                    // Set drag data synchronously — dataTransfer is only writable
                    // during the dragStart event.
                    try {
                      event.dataTransfer.setData(MASTER_TREE_DRAG_NODE_ID, node.id);
                      event.dataTransfer.setData('text/plain', node.id);
                    } catch {
                      // no-op: setData can throw in a few host environments
                    }
                    event.dataTransfer.effectAllowed = 'move';
                    // Defer React state updates so the re-render does not cancel
                    // the browser's native drag operation before it fully starts.
                    setTimeout((): void => {
                      controller.startDrag(node.id);
                      onNodeDragStart?.(
                        {
                          node,
                          event,
                        },
                        controller
                      );
                    }, 0);
                  }
                  : undefined
              }
              onDragEnd={
                enableDnd
                  ? (): void => {
                    clearAllDragState();
                  }
                  : undefined
              }
              onDragOver={
                enableDnd
                  ? (event: React.DragEvent<HTMLDivElement>): void => {
                    const draggedNodeId = resolveDraggedNode(event);
                    if (!draggedNodeId) return;
                    setRootDropHoverZone(null);
                    const resolvedPosition = resolveNodeDropPosition(event, draggedNodeId, node);
                    if (!resolvedPosition) {
                      if (process.env.NODE_ENV !== 'production' && node.type === 'folder') {
                        console.warn('[MasterTree:dragover] REJECTED for folder target', { draggedNodeId, targetId: node.id, targetType: node.type, targetKind: node.kind });
                      }
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    if (!controller.dragState) {
                      setExternalDraggedNodeId(draggedNodeId);
                    }
                    if (controller.dragState) {
                      controller.updateDragTarget(node.id, resolvedPosition);
                    }
                    event.dataTransfer.dropEffect = 'move';
                  }
                  : undefined
              }
              onDrop={
                enableDnd
                  ? (event: React.DragEvent<HTMLDivElement>): void => {
                    const draggedNodeId = resolveDraggedNode(event);
                    if (!draggedNodeId) {
                      if (process.env.NODE_ENV !== 'production') {
                        console.warn('[MasterTree:drop] no draggedNodeId for', node.id);
                      }
                      return;
                    }
                    const resolvedPosition = resolveNodeDropPosition(event, draggedNodeId, node);
                    if (!resolvedPosition) {
                      if (process.env.NODE_ENV !== 'production') {
                        console.warn('[MasterTree:drop] resolvedPosition=null', { draggedNodeId, targetId: node.id, targetType: node.type });
                      }
                      return;
                    }
                    if (process.env.NODE_ENV !== 'production') {
                      console.warn('[MasterTree:drop] EXECUTING', { draggedNodeId, targetId: node.id, position: resolvedPosition, targetType: node.type });
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    void (async (): Promise<void> => {
                      try {
                        if (onNodeDrop) {
                          await onNodeDrop(
                            {
                              draggedNodeId,
                              targetId: node.id,
                              position: resolvedPosition,
                            },
                            controller
                          );
                          return;
                        }
                        if (resolvedPosition === 'inside') {
                          await controller.moveNode(draggedNodeId, node.id);
                          return;
                        }
                        await controller.reorderNode(draggedNodeId, node.id, resolvedPosition);
                      } finally {
                        clearAllDragState();
                      }
                    })();
                  }
                  : undefined
              }
            >
              {row}
            </div>
            {hasChildren && isExpanded ? <div>{renderTree(node.children, depth + 1)}</div> : null}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={className}>
      {renderToolbar ? <div>{renderToolbar(controller)}</div> : null}
      <div
        onDragLeave={
          enableDnd
            ? (event: React.DragEvent<HTMLDivElement>): void => {
              const nextTarget = event.relatedTarget;
              if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
              clearDragIndicators();
            }
            : undefined
        }
        onDragOver={
          enableDnd
            ? (event: React.DragEvent<HTMLDivElement>): void => {
              const draggedNodeId = resolveDraggedNode(event);
              if (!draggedNodeId) {
                clearDragIndicators();
                return;
              }
              if (!controller.dragState) {
                setExternalDraggedNodeId(draggedNodeId);
              }
              setRootDropHoverZone(null);
              if (!resolveDropAllowance(draggedNodeId, null, 'inside')) return;
              event.preventDefault();
              if (controller.dragState) {
                controller.updateDragTarget(null, 'inside');
              }
              event.dataTransfer.dropEffect = 'move';
            }
            : undefined
        }
        onDrop={
          enableDnd
            ? (event: React.DragEvent<HTMLDivElement>): void => {
              const draggedNodeId = resolveDraggedNode(event);
              if (!draggedNodeId) return;
              if (!resolveDropAllowance(draggedNodeId, null, 'inside')) return;
              event.preventDefault();
              void (async (): Promise<void> => {
                try {
                  await applyRootDrop(draggedNodeId);
                } finally {
                  clearAllDragState();
                }
              })();
            }
            : undefined
        }
        onDragEnd={
          enableDnd
            ? (): void => {
              clearAllDragState();
            }
            : undefined
        }
        className='space-y-1'
      >
        {showRootDropZones ? (
          <div
            data-master-tree-root-drop='top'
            onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
              const draggedNodeId = resolveDraggedNode(event);
              if (!draggedNodeId) return;
              if (!resolveDropAllowance(draggedNodeId, null, 'inside')) return;
              event.preventDefault();
              event.stopPropagation();
              setRootDropHoverZone('top');
              if (!controller.dragState) {
                setExternalDraggedNodeId(draggedNodeId);
              }
              if (controller.dragState) {
                controller.updateDragTarget(null, 'inside');
              }
              event.dataTransfer.dropEffect = 'move';
            }}
            onDragLeave={(event: React.DragEvent<HTMLDivElement>): void => {
              const nextTarget = event.relatedTarget;
              if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
              setRootDropHoverZone((current) => (current === 'top' ? null : current));
            }}
            onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
              const draggedNodeId = resolveDraggedNode(event);
              if (!draggedNodeId) return;
              if (!resolveDropAllowance(draggedNodeId, null, 'inside')) return;
              event.preventDefault();
              event.stopPropagation();
              void (async (): Promise<void> => {
                try {
                  await applyRootDrop(draggedNodeId, 'top');
                } finally {
                  clearAllDragState();
                }
              })();
            }}
            className={`flex h-8 items-center justify-center rounded-md border border-dashed text-[10px] font-medium uppercase tracking-[0.08em] transition-all duration-150 ${
              rootDropHoverZone === 'top'
                ? rootDropActiveClassName
                : rootDropIdleClassName
            }`}
          >
            {rootDropLabel}
          </div>
        ) : null}
        {controller.roots.length > 0 ? (
          renderTree(controller.roots, 0)
        ) : (
          <div className='rounded border border-dashed border-border/50 px-3 py-4 text-sm text-gray-400'>
            {emptyLabel}
          </div>
        )}
        {showRootDropZones ? (
          <div
            data-master-tree-root-drop='bottom'
            onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
              const draggedNodeId = resolveDraggedNode(event);
              if (!draggedNodeId) return;
              if (!resolveDropAllowance(draggedNodeId, null, 'inside')) return;
              event.preventDefault();
              event.stopPropagation();
              setRootDropHoverZone('bottom');
              if (!controller.dragState) {
                setExternalDraggedNodeId(draggedNodeId);
              }
              if (controller.dragState) {
                controller.updateDragTarget(null, 'inside');
              }
              event.dataTransfer.dropEffect = 'move';
            }}
            onDragLeave={(event: React.DragEvent<HTMLDivElement>): void => {
              const nextTarget = event.relatedTarget;
              if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
              setRootDropHoverZone((current) => (current === 'bottom' ? null : current));
            }}
            onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
              const draggedNodeId = resolveDraggedNode(event);
              if (!draggedNodeId) return;
              if (!resolveDropAllowance(draggedNodeId, null, 'inside')) return;
              event.preventDefault();
              event.stopPropagation();
              void (async (): Promise<void> => {
                try {
                  await applyRootDrop(draggedNodeId, 'bottom');
                } finally {
                  clearAllDragState();
                }
              })();
            }}
            className={`flex h-8 items-center justify-center rounded-md border border-dashed text-[10px] font-medium uppercase tracking-[0.08em] transition-all duration-150 ${
              rootDropHoverZone === 'bottom'
                ? rootDropActiveClassName
                : rootDropIdleClassName
            }`}
          >
            {rootDropLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}
