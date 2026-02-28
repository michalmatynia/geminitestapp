'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import type { FolderTreeNodeView } from '../types';

import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import { EmptyState } from '@/shared/ui';
import { resolveVerticalDropPosition } from '@/shared/utils/drag-drop';
import type {
  MasterTreeDropPosition,
  MasterTreeId,
} from '@/shared/utils/master-folder-tree-contract';
import type { MasterTreeViewNode } from '@/shared/utils/master-folder-tree-engine';

import { flattenVisibleNodesV2 } from '../core/engine';
import { useMasterFolderTreeRuntime } from '../runtime/MasterFolderTreeRuntimeProvider';

const MASTER_TREE_DRAG_NODE_ID = 'application/x-master-tree-node-id';

const getMasterTreeDragNodeId = (dataTransfer: DataTransfer | null): MasterTreeId | null => {
  if (!dataTransfer) return null;
  try {
    const value = dataTransfer.getData(MASTER_TREE_DRAG_NODE_ID);
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  } catch {
    // no-op
  }
  return null;
};

export type FolderTreeViewportRenderNodeInput = {
  node: MasterTreeViewNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  /** True when this node is part of a multi-selection. */
  isMultiSelected: boolean;
  isRenaming: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  dropPosition: MasterTreeDropPosition | null;
  select: () => void;
  toggleExpand: () => void;
  startRename: () => void;
};

export type FolderTreeViewportV2Props = {
  controller: MasterFolderTreeController;
  enableDnd?: boolean | undefined;
  className?: string | undefined;
  emptyLabel?: string | undefined;
  renderToolbar?: ((controller: MasterFolderTreeController) => React.ReactNode) | undefined;
  renderNode?: ((input: FolderTreeViewportRenderNodeInput) => React.ReactNode) | undefined;
  resolveDraggedNodeId?: ((event: React.DragEvent<HTMLElement>) => MasterTreeId | null) | undefined;
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
  /**
   * Estimate row height for virtualization. Pass a number for a fixed height
   * (default: 34) or a function for per-row dynamic sizing.
   */
  estimateRowHeight?: ((row: FolderTreeNodeView) => number) | number | undefined;
  /**
   * Milliseconds to wait while dragging over a collapsed folder before auto-expanding it.
   * Default: 600. Set to 0 to disable.
   */
  autoExpandOnHoverMs?: number | undefined;
  /**
   * Ref that the viewport fills with a scroll-to-node function once mounted.
   * Call `scrollToNodeRef.current(nodeId)` to bring a node into view.
   */
  scrollToNodeRef?: React.MutableRefObject<((nodeId: MasterTreeId) => void) | null> | undefined;
};

const defaultRootDropIdleClassName = 'border-border/45 bg-card/25 text-gray-400';
const defaultRootDropActiveClassName = 'border-sky-200/55 bg-sky-500/12 text-sky-100';

const DefaultRow = ({
  node,
  depth,
  hasChildren,
  isExpanded,
  isSelected,
  isMultiSelected,
  isDragging,
  dropPosition,
  select,
  toggleExpand,
}: FolderTreeViewportRenderNodeInput): React.JSX.Element => {
  const stateClassName = isSelected
    ? 'bg-blue-600 text-white'
    : isMultiSelected
      ? 'bg-blue-500/20 text-blue-100 ring-1 ring-inset ring-blue-400/40'
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

export function FolderTreeViewportV2({
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
  estimateRowHeight,
  autoExpandOnHoverMs = 600,
  scrollToNodeRef,
}: FolderTreeViewportV2Props): React.JSX.Element {
  const runtime = useMasterFolderTreeRuntime();
  const nodeById = useMemo(
    () => new Map(controller.nodes.map((node) => [node.id, node])),
    [controller.nodes]
  );
  const rootsById = useMemo(() => {
    const map = new Map<string, MasterTreeViewNode>();
    const walk = (nodes: MasterTreeViewNode[]): void => {
      nodes.forEach((node) => {
        map.set(node.id, node);
        if (node.children && node.children.length > 0) {
          walk(node.children);
        }
      });
    };
    walk(controller.roots);
    return map;
  }, [controller.roots]);

  const rows = useMemo(
    () => flattenVisibleNodesV2(controller.roots, controller.expandedNodeIds),
    [controller.expandedNodeIds, controller.roots]
  );

  const rootDropEnabled = rootDropUi?.enabled ?? true;
  const rootDropLabel = rootDropUi?.label?.trim() || 'Drop to Root';
  const rootDropIdleClassName = rootDropUi?.idleClassName ?? defaultRootDropIdleClassName;
  const rootDropActiveClassName = rootDropUi?.activeClassName ?? defaultRootDropActiveClassName;

  const [rootDropHoverZone, setRootDropHoverZone] = useState<'top' | 'bottom' | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-expand on drag hover
  const autoExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoExpandTargetRef = useRef<MasterTreeId | null>(null);

  const resolvedEstimateSize = useMemo(() => {
    const defaultHeight = 34;
    if (typeof estimateRowHeight === 'function') {
      return (index: number): number => {
        const row = rows[index];
        return row ? estimateRowHeight(row) : defaultHeight;
      };
    }
    const fixedHeight = typeof estimateRowHeight === 'number' ? estimateRowHeight : defaultHeight;
    return (): number => fixedHeight;
  }, [estimateRowHeight, rows]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: resolvedEstimateSize,
    overscan: 10,
  });

  const defaultRowHeight =
    typeof estimateRowHeight === 'number' ? estimateRowHeight : 34;
  const virtualItems = rowVirtualizer.getVirtualItems();
  const useFallbackRows = virtualItems.length === 0 && rows.length > 0;
  const renderedRows = useFallbackRows
    ? rows.map((_, index) => ({
      key: `fallback-${index}`,
      index,
      start: index * defaultRowHeight,
    }))
    : virtualItems;
  const totalSize = useFallbackRows
    ? rows.length * defaultRowHeight
    : rowVirtualizer.getTotalSize();

  // Wire scrollToNodeRef once the virtualizer is ready
  useEffect(() => {
    if (!scrollToNodeRef) return;
    scrollToNodeRef.current = (nodeId: MasterTreeId): void => {
      const index = rows.findIndex((r) => r.nodeId === nodeId);
      if (index !== -1) {
        rowVirtualizer.scrollToIndex(index, { align: 'auto' });
      }
    };
    return (): void => {
      if (scrollToNodeRef.current) {
        scrollToNodeRef.current = null;
      }
    };
  }, [rows, rowVirtualizer, scrollToNodeRef]);

  const clearDragState = (): void => {
    controller.clearDrag();
    setRootDropHoverZone(null);
    if (autoExpandTimerRef.current) {
      clearTimeout(autoExpandTimerRef.current);
      autoExpandTimerRef.current = null;
    }
    autoExpandTargetRef.current = null;
  };

  const resolveDraggedNode = (event: React.DragEvent<HTMLElement>): MasterTreeId | null => {
    if (controller.dragState?.draggedNodeId) {
      return controller.dragState.draggedNodeId;
    }
    const payloadNodeId = getMasterTreeDragNodeId(event.dataTransfer);
    if (payloadNodeId) return payloadNodeId;
    return resolveDraggedNodeId?.(event) ?? null;
  };

  const resolveDropAllowance = (
    draggedNodeId: MasterTreeId,
    targetId: MasterTreeId | null,
    position: MasterTreeDropPosition
  ): boolean => {
    const defaultCheck = controller.canDropNode(draggedNodeId, targetId, position);
    if (defaultCheck.ok) {
      if (!canDrop) return true;
      return canDrop(
        {
          draggedNodeId,
          targetId,
          position,
          defaultAllowed: true,
        },
        controller
      );
    }
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

  const resolveNodeDropPosition = (
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

    if (
      !resolveDropPosition &&
      requestedPosition !== 'inside' &&
      targetNode.type === 'folder' &&
      insideAllowed
    ) {
      const draggedNode =
        controller.nodes.find((candidate) => candidate.id === draggedNodeId) ?? null;
      if (!draggedNode || draggedNode.type === 'file') {
        return 'inside';
      }
    }

    if (requestedAllowed) return requestedPosition;
    if (requestedPosition !== 'inside' && insideAllowed) return 'inside';
    return null;
  };

  const canDropToRoot = Boolean(
    controller.dragState?.draggedNodeId &&
    resolveDropAllowance(controller.dragState.draggedNodeId, null, 'inside')
  );

  const showRootDropZones = enableDnd && rootDropEnabled && canDropToRoot;

  useEffect(() => {
    runtime.recordMetric('row_rerender', Math.max(1, renderedRows.length));
  }, [
    controller.dragState,
    controller.renamingNodeId,
    controller.selectedNodeId,
    renderedRows.length,
    rows.length,
    runtime,
  ]);

  useEffect(() => {
    if (!controller.dragState?.draggedNodeId) return;
    let rafId = 0;
    let lastTick = performance.now();
    const trackFrame = (now: number): void => {
      if (now - lastTick > 20) {
        runtime.recordMetric('frame_budget_miss');
      }
      lastTick = now;
      rafId = window.requestAnimationFrame(trackFrame);
    };
    rafId = window.requestAnimationFrame(trackFrame);
    return (): void => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [controller.dragState?.draggedNodeId, runtime]);

  return (
    <div className={className}>
      {renderToolbar ? <div>{renderToolbar(controller)}</div> : null}
      <div
        className='space-y-1'
        onDragOver={
          enableDnd
            ? (event: React.DragEvent<HTMLDivElement>): void => {
              const draggedNodeId = resolveDraggedNode(event);
              if (!draggedNodeId) return;
              if (!resolveDropAllowance(draggedNodeId, null, 'inside')) return;
              event.preventDefault();
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
                  if (onNodeDrop) {
                    await onNodeDrop(
                      {
                        draggedNodeId,
                        targetId: null,
                        position: 'inside',
                      },
                      controller
                    );
                  } else {
                    await controller.dropNodeToRoot(draggedNodeId);
                  }
                } finally {
                  clearDragState();
                }
              })();
            }
            : undefined
        }
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
              event.dataTransfer.dropEffect = 'move';
            }}
            onDragLeave={(event: React.DragEvent<HTMLDivElement>): void => {
              const nextTarget = event.relatedTarget;
              if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
              setRootDropHoverZone(null);
            }}
            onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
              const draggedNodeId = resolveDraggedNode(event);
              if (!draggedNodeId) return;
              if (!resolveDropAllowance(draggedNodeId, null, 'inside')) return;
              event.preventDefault();
              event.stopPropagation();
              void (async (): Promise<void> => {
                try {
                  if (onNodeDrop) {
                    await onNodeDrop(
                      {
                        draggedNodeId,
                        targetId: null,
                        position: 'inside',
                        rootDropZone: 'top',
                      },
                      controller
                    );
                  } else {
                    await controller.dropNodeToRoot(draggedNodeId, 0);
                  }
                } finally {
                  clearDragState();
                }
              })();
            }}
            className={`flex h-8 items-center justify-center rounded-md border border-dashed text-[10px] font-medium uppercase tracking-[0.08em] transition-all duration-150 ${
              rootDropHoverZone === 'top' ? rootDropActiveClassName : rootDropIdleClassName
            }`}
          >
            {rootDropLabel}
          </div>
        ) : null}

        {rows.length > 0 ? (
          <div ref={scrollRef} className='max-h-[60vh] overflow-auto'>
            <div
              style={{
                height: `${totalSize}px`,
                position: 'relative',
                width: '100%',
              }}
            >
              {renderedRows.map((virtualRow) => {
                const row = rows[virtualRow.index];
                if (!row) return null;
                const node = nodeById.get(row.nodeId);
                const viewNode = rootsById.get(row.nodeId);
                if (!node || !viewNode) return null;

                const isSelected = controller.selectedNodeId === node.id;
                const isMultiSelected = controller.selectedNodeIds?.has(node.id) ?? false;
                const isDragging = controller.dragState?.draggedNodeId === node.id;
                const isDropTarget = controller.dragState?.targetId === node.id;
                const dropPosition =
                  controller.dragState?.targetId === node.id ? controller.dragState.position : null;

                const rowNode = renderNode ? (
                  renderNode({
                    node: viewNode,
                    depth: row.depth,
                    hasChildren: row.hasChildren,
                    isExpanded: row.isExpanded,
                    isSelected,
                    isMultiSelected,
                    isRenaming: controller.renamingNodeId === node.id,
                    isDragging: Boolean(isDragging),
                    isDropTarget: Boolean(isDropTarget),
                    dropPosition,
                    select: () => controller.selectNode(node.id),
                    toggleExpand: () => controller.toggleNodeExpanded(node.id),
                    startRename: () => controller.startRename(node.id),
                  })
                ) : (
                  <DefaultRow
                    node={viewNode}
                    depth={row.depth}
                    hasChildren={row.hasChildren}
                    isExpanded={row.isExpanded}
                    isSelected={isSelected}
                    isMultiSelected={isMultiSelected}
                    isRenaming={controller.renamingNodeId === node.id}
                    isDragging={Boolean(isDragging)}
                    isDropTarget={Boolean(isDropTarget)}
                    dropPosition={dropPosition}
                    select={() => controller.selectNode(node.id)}
                    toggleExpand={() => controller.toggleNodeExpanded(node.id)}
                    startRename={() => controller.startRename(node.id)}
                  />
                );

                return (
                  <div
                    key={node.id}
                    ref={useFallbackRows ? undefined : rowVirtualizer.measureElement}
                    data-index={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    draggable={enableDnd}
                    data-master-tree-node-id={node.id}
                    onDragStart={
                      enableDnd
                        ? (event: React.DragEvent<HTMLDivElement>): void => {
                          if (
                            canStartDrag &&
                              !canStartDrag(
                                {
                                  node: viewNode,
                                  event,
                                },
                                controller
                              )
                          ) {
                            event.preventDefault();
                            event.stopPropagation();
                            return;
                          }

                          try {
                            event.dataTransfer.setData(MASTER_TREE_DRAG_NODE_ID, node.id);
                            event.dataTransfer.setData('text/plain', node.id);
                          } catch {
                            // no-op
                          }
                          event.dataTransfer.effectAllowed = 'move';
                          setTimeout((): void => {
                            controller.startDrag(node.id);
                            onNodeDragStart?.(
                              {
                                node: viewNode,
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
                          clearDragState();
                        }
                        : undefined
                    }
                    onDragOver={
                      enableDnd
                        ? (event: React.DragEvent<HTMLDivElement>): void => {
                          const draggedNodeId = resolveDraggedNode(event);
                          if (!draggedNodeId) return;
                          const resolvedPosition = resolveNodeDropPosition(
                            event,
                            draggedNodeId,
                            viewNode
                          );
                          if (!resolvedPosition) return;
                          event.preventDefault();
                          event.stopPropagation();
                          setRootDropHoverZone(null);
                          controller.updateDragTarget(node.id, resolvedPosition);
                          event.dataTransfer.dropEffect = 'move';

                          // Auto-expand collapsed folders on prolonged hover
                          if (
                            autoExpandOnHoverMs > 0 &&
                            viewNode.type === 'folder' &&
                            !row.isExpanded &&
                            autoExpandTargetRef.current !== node.id
                          ) {
                            if (autoExpandTimerRef.current) {
                              clearTimeout(autoExpandTimerRef.current);
                            }
                            autoExpandTargetRef.current = node.id;
                            autoExpandTimerRef.current = setTimeout((): void => {
                              controller.expandNode(node.id);
                              autoExpandTargetRef.current = null;
                            }, autoExpandOnHoverMs);
                          } else if (autoExpandTargetRef.current !== node.id) {
                            if (autoExpandTimerRef.current) {
                              clearTimeout(autoExpandTimerRef.current);
                              autoExpandTimerRef.current = null;
                            }
                            autoExpandTargetRef.current = null;
                          }
                        }
                        : undefined
                    }
                    onDrop={
                      enableDnd
                        ? (event: React.DragEvent<HTMLDivElement>): void => {
                          const draggedNodeId = resolveDraggedNode(event);
                          if (!draggedNodeId) return;
                          const resolvedPosition = resolveNodeDropPosition(
                            event,
                            draggedNodeId,
                            viewNode
                          );
                          if (!resolvedPosition) return;
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
                              } else {
                                await controller.reorderNode(
                                  draggedNodeId,
                                  node.id,
                                  resolvedPosition
                                );
                              }
                            } finally {
                              clearDragState();
                            }
                          })();
                        }
                        : undefined
                    }
                  >
                    {rowNode}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <EmptyState
            title={emptyLabel}
            variant='compact'
            className='border-dashed border-border/50 py-4'
          />
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
              event.dataTransfer.dropEffect = 'move';
            }}
            onDragLeave={(event: React.DragEvent<HTMLDivElement>): void => {
              const nextTarget = event.relatedTarget;
              if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
              setRootDropHoverZone(null);
            }}
            onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
              const draggedNodeId = resolveDraggedNode(event);
              if (!draggedNodeId) return;
              if (!resolveDropAllowance(draggedNodeId, null, 'inside')) return;
              event.preventDefault();
              event.stopPropagation();
              void (async (): Promise<void> => {
                try {
                  if (onNodeDrop) {
                    await onNodeDrop(
                      {
                        draggedNodeId,
                        targetId: null,
                        position: 'inside',
                        rootDropZone: 'bottom',
                      },
                      controller
                    );
                  } else {
                    await controller.dropNodeToRoot(draggedNodeId);
                  }
                } finally {
                  clearDragState();
                }
              })();
            }}
            className={`flex h-8 items-center justify-center rounded-md border border-dashed text-[10px] font-medium uppercase tracking-[0.08em] transition-all duration-150 ${
              rootDropHoverZone === 'bottom' ? rootDropActiveClassName : rootDropIdleClassName
            }`}
          >
            {rootDropLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}
