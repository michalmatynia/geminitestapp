'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useEffect, useMemo, useRef } from 'react';
import type { ResolvedFolderTreeMultiSelectConfig } from '@/shared/utils/folder-tree-profiles-v2';

import type { FolderTreeNodeView } from '../types';

import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import { EmptyState } from '@/shared/ui';
import type { MasterTreeId, MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import type { MasterTreeViewNode } from '@/shared/utils/master-folder-tree-engine';

import { getMasterTreeNodeStatus } from '../operations/node-status';
import { FolderTreeContextMenu } from './FolderTreeContextMenu';
import type { FolderTreeContextMenuItem } from './FolderTreeContextMenu';

import { buildRootsV2, flattenVisibleNodesV2 } from '../core/engine';
import { setMasterTreeDragNodeData } from '../operations/drag-data';
import type { MasterFolderTreeSearchState } from '../search/useMasterFolderTreeSearch';
import {
  useFolderTreeShellRuntime,
  type MasterFolderTreeShellRuntime,
} from '../shell/useFolderTreeShellRuntime';

import { DefaultRow } from './DefaultRow';
import { FolderTreeViewportRenderNodeInput } from './types';
import { useFolderTreeViewportSelection } from '../hooks/useFolderTreeViewportSelection';
import { useFolderTreeViewportDnd } from '../hooks/useFolderTreeViewportDnd';
import { useOptionalMasterFolderTreeShellContext } from '../shell/MasterFolderTreeShellContext';

export type { FolderTreeViewportRenderNodeInput };

export type FolderTreeViewportV2Props = {
  controller?: MasterFolderTreeController | undefined;
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
          position: any;
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
          position: any;
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
      ) => any)
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
  contextMenuItems?:
    | ((
        node: MasterTreeNode,
        controller: MasterFolderTreeController
      ) => FolderTreeContextMenuItem[])
    | undefined;
  estimateRowHeight?: ((row: FolderTreeNodeView) => number) | number | undefined;
  autoExpandOnHoverMs?: number | undefined;
  multiSelectConfig?: ResolvedFolderTreeMultiSelectConfig | undefined;
  searchState?: MasterFolderTreeSearchState | undefined;
  scrollToNodeRef?: React.MutableRefObject<((nodeId: MasterTreeId) => void) | null> | undefined;
  runtime?: MasterFolderTreeShellRuntime | undefined;
};

const defaultRootDropIdleClassName = 'border-border/45 bg-card/25 text-gray-400';
const defaultRootDropActiveClassName = 'border-sky-200/55 bg-sky-500/12 text-sky-100';

export function FolderTreeViewportV2(props: FolderTreeViewportV2Props): React.JSX.Element {
  const shellContext = useOptionalMasterFolderTreeShellContext();

  const {
    controller = props.controller ?? shellContext?.controller,
    enableDnd = props.enableDnd ?? true,
    className = props.className,
    emptyLabel = props.emptyLabel ?? 'No items',
    renderToolbar = props.renderToolbar,
    renderNode = props.renderNode,
    resolveDraggedNodeId = props.resolveDraggedNodeId,
    canDrop = props.canDrop,
    onNodeDrop = props.onNodeDrop,
    resolveDropPosition = props.resolveDropPosition,
    onNodeDragStart = props.onNodeDragStart,
    canStartDrag = props.canStartDrag,
    rootDropUi = props.rootDropUi ?? shellContext?.appearance.rootDropUi,
    contextMenuItems = props.contextMenuItems,
    estimateRowHeight = props.estimateRowHeight,
    autoExpandOnHoverMs = props.autoExpandOnHoverMs ?? 600,
    multiSelectConfig = props.multiSelectConfig ?? shellContext?.capabilities.multiSelect,
    searchState = props.searchState,
    scrollToNodeRef = props.scrollToNodeRef ?? shellContext?.viewport.scrollToNodeRef,
    runtime: runtimeOverride = props.runtime,
  } = props;

  if (!controller) {
    throw new Error('FolderTreeViewportV2: controller is required (via props or context)');
  }

  const runtime = useFolderTreeShellRuntime(runtimeOverride);
  const resolvedMultiSelectConfig = useMemo<ResolvedFolderTreeMultiSelectConfig>(
    () => ({
      enabled: multiSelectConfig?.enabled ?? false,
      ctrlClick: multiSelectConfig?.ctrlClick ?? true,
      shiftClick: multiSelectConfig?.shiftClick ?? true,
      selectAll: multiSelectConfig?.selectAll ?? true,
    }),
    [multiSelectConfig]
  );
  const visibleNodes = useMemo((): MasterTreeNode[] => {
    if (!searchState?.isActive || searchState.config.filterMode !== 'filter_tree') {
      return controller.nodes;
    }
    return searchState.filteredNodes;
  }, [controller.nodes, searchState]);

  const visibleRoots = useMemo(() => buildRootsV2(visibleNodes), [visibleNodes]);
  const visibleExpandedNodeIds = useMemo((): Set<MasterTreeId> => {
    if (!searchState?.isActive || searchState.config.filterMode !== 'filter_tree') {
      return controller.expandedNodeIds;
    }
    return new Set(searchState.filteredExpandedNodeIds);
  }, [controller.expandedNodeIds, searchState]);

  const nodeById = useMemo(
    () => new Map(visibleNodes.map((node) => [node.id, node])),
    [visibleNodes]
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
    walk(visibleRoots);
    return map;
  }, [visibleRoots]);

  const rows = useMemo(
    () => flattenVisibleNodesV2(visibleRoots, visibleExpandedNodeIds),
    [visibleExpandedNodeIds, visibleRoots]
  );

  const selection = useFolderTreeViewportSelection({
    controller,
    resolvedMultiSelectConfig,
    rows,
  });

  const dnd = useFolderTreeViewportDnd({
    controller,
    enableDnd,
    canDrop,
    onNodeDrop,
    resolveDropPosition,
    resolveDraggedNodeId,
  });

  const resolvedEmptyLabel = useMemo((): string => {
    if (searchState?.isActive && searchState.effectiveQuery.length > 0) {
      return `No results for "${searchState.effectiveQuery}"`;
    }
    return emptyLabel;
  }, [emptyLabel, searchState?.effectiveQuery, searchState?.isActive]);

  const rootDropEnabled = rootDropUi?.enabled ?? true;
  const rootDropLabel = rootDropUi?.label?.trim() || 'Drop to Root';
  const rootDropIdleClassName = rootDropUi?.idleClassName ?? defaultRootDropIdleClassName;
  const rootDropActiveClassName = rootDropUi?.activeClassName ?? defaultRootDropActiveClassName;

  const scrollRef = useRef<HTMLDivElement | null>(null);

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

  const defaultRowHeight = typeof estimateRowHeight === 'number' ? estimateRowHeight : 34;
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

  const canDropToRoot = Boolean(
    controller.dragState?.draggedNodeId &&
    dnd.resolveDropAllowance(controller.dragState.draggedNodeId, null, 'inside')
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
              const draggedNodeId = dnd.resolveDraggedNode(event);
              if (!draggedNodeId) return;
              if (!dnd.resolveDropAllowance(draggedNodeId, null, 'inside')) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }
            : undefined
        }
        onDrop={
          enableDnd
            ? (event: React.DragEvent<HTMLDivElement>): void => {
              const draggedNodeId = dnd.resolveDraggedNode(event);
              if (!draggedNodeId) return;
              if (!dnd.resolveDropAllowance(draggedNodeId, null, 'inside')) return;
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
                  dnd.clearDragState();
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
              const draggedNodeId = dnd.resolveDraggedNode(event);
              if (!draggedNodeId) return;
              if (!dnd.resolveDropAllowance(draggedNodeId, null, 'inside')) return;
              event.preventDefault();
              event.stopPropagation();
              dnd.setRootDropHoverZone('top');
              event.dataTransfer.dropEffect = 'move';
            }}
            onDragLeave={(event: React.DragEvent<HTMLDivElement>): void => {
              const nextTarget = event.relatedTarget;
              if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
              dnd.setRootDropHoverZone(null);
            }}
            onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
              const draggedNodeId = dnd.resolveDraggedNode(event);
              if (!draggedNodeId) return;
              if (!dnd.resolveDropAllowance(draggedNodeId, null, 'inside')) return;
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
                  dnd.clearDragState();
                }
              })();
            }}
            className={`flex h-8 items-center justify-center rounded-md border border-dashed text-[10px] font-medium uppercase tracking-[0.08em] transition-all duration-150 ${
              dnd.rootDropHoverZone === 'top' ? rootDropActiveClassName : rootDropIdleClassName
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
                const isMultiSelected =
                  resolvedMultiSelectConfig.enabled &&
                  (controller.selectedNodeIds?.has(node.id) ?? false);
                const isDragging = controller.dragState?.draggedNodeId === node.id;
                const isDropTarget = controller.dragState?.targetId === node.id;
                const dropPosition =
                  controller.dragState?.targetId === node.id ? controller.dragState.position : null;
                const nodeStatus = getMasterTreeNodeStatus(node);
                const isSearchMatch = searchState?.matchNodeIds.has(node.id) ?? false;

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
                    nodeStatus,
                    isSearchMatch,
                    select: (event) => selection.handleSelectNode(node.id, event),
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
                    nodeStatus={nodeStatus}
                    isSearchMatch={isSearchMatch}
                    select={(event) => selection.handleSelectNode(node.id, event)}
                    toggleExpand={() => controller.toggleNodeExpanded(node.id)}
                    startRename={() => controller.startRename(node.id)}
                  />
                );

                const menuItems = contextMenuItems ? contextMenuItems(node, controller) : [];

                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    draggable={enableDnd}
                    onDragStart={(event: React.DragEvent<HTMLDivElement>): void => {
                      if (!enableDnd) return;
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
                      setMasterTreeDragNodeData(event.dataTransfer, node.id);
                      controller.startDrag(node.id);
                      onNodeDragStart?.({ node: viewNode, event }, controller);
                    }}
                    onDragEnd={(): void => {
                      if (!enableDnd) return;
                      dnd.clearDragState();
                    }}
                    onDragOver={
                      enableDnd
                        ? (event: React.DragEvent<HTMLDivElement>): void => {
                          const draggedNodeId = dnd.resolveDraggedNode(event);
                          if (!draggedNodeId || draggedNodeId === node.id) return;

                          const position = dnd.resolveNodeDropPosition(
                            event,
                            draggedNodeId,
                            viewNode
                          );
                          if (!position) return;

                          event.preventDefault();
                          event.stopPropagation();
                          event.dataTransfer.dropEffect = 'move';

                          if (
                            controller.dragState?.targetId !== node.id ||
                              controller.dragState?.position !== position
                          ) {
                            controller.updateDragTarget(node.id, position);
                          }

                          if (
                            viewNode.type === 'folder' &&
                              !row.isExpanded &&
                              autoExpandOnHoverMs > 0
                          ) {
                            if (dnd.autoExpandTargetRef.current !== node.id) {
                              if (dnd.autoExpandTimerRef.current)
                                clearTimeout(dnd.autoExpandTimerRef.current);
                              dnd.autoExpandTargetRef.current = node.id;
                              dnd.autoExpandTimerRef.current = setTimeout(() => {
                                controller.expandNode(node.id);
                              }, autoExpandOnHoverMs);
                            }
                          } else {
                            if (dnd.autoExpandTimerRef.current) {
                              clearTimeout(dnd.autoExpandTimerRef.current);
                              dnd.autoExpandTimerRef.current = null;
                            }
                            dnd.autoExpandTargetRef.current = null;
                          }
                        }
                        : undefined
                    }
                    onDragLeave={(event: React.DragEvent<HTMLDivElement>): void => {
                      const nextTarget = event.relatedTarget;
                      if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget))
                        return;

                      if (controller.dragState?.targetId === node.id) {
                        controller.updateDragTarget(null, 'inside');
                      }
                      if (dnd.autoExpandTimerRef.current) {
                        clearTimeout(dnd.autoExpandTimerRef.current);
                        dnd.autoExpandTimerRef.current = null;
                      }
                      dnd.autoExpandTargetRef.current = null;
                    }}
                    onDrop={
                      enableDnd
                        ? (event: React.DragEvent<HTMLDivElement>): void => {
                          const draggedNodeId = dnd.resolveDraggedNode(event);
                          if (!draggedNodeId || draggedNodeId === node.id) return;

                          const position = dnd.resolveNodeDropPosition(
                            event,
                            draggedNodeId,
                            viewNode
                          );
                          if (!position) return;

                          event.preventDefault();
                          event.stopPropagation();

                          void (async (): Promise<void> => {
                            try {
                              if (onNodeDrop) {
                                await onNodeDrop(
                                  {
                                    draggedNodeId,
                                    targetId: node.id,
                                    position,
                                  },
                                  controller
                                );
                              } else {
                                if (position === 'inside') {
                                  await controller.moveNode(draggedNodeId, node.id);
                                } else {
                                  await controller.reorderNode(draggedNodeId, node.id, position);
                                }
                              }
                            } finally {
                              dnd.clearDragState();
                            }
                          })();
                        }
                        : undefined
                    }
                  >
                    <FolderTreeContextMenu node={node} items={menuItems} controller={controller}>
                      {rowNode}
                    </FolderTreeContextMenu>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <EmptyState title={resolvedEmptyLabel} />
          </div>
        )}

        {showRootDropZones ? (
          <div
            data-master-tree-root-drop='bottom'
            onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
              const draggedNodeId = dnd.resolveDraggedNode(event);
              if (!draggedNodeId) return;
              if (!dnd.resolveDropAllowance(draggedNodeId, null, 'inside')) return;
              event.preventDefault();
              event.stopPropagation();
              dnd.setRootDropHoverZone('bottom');
              event.dataTransfer.dropEffect = 'move';
            }}
            onDragLeave={(event: React.DragEvent<HTMLDivElement>): void => {
              const nextTarget = event.relatedTarget;
              if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
              dnd.setRootDropHoverZone(null);
            }}
            onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
              const draggedNodeId = dnd.resolveDraggedNode(event);
              if (!draggedNodeId) return;
              if (!dnd.resolveDropAllowance(draggedNodeId, null, 'inside')) return;
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
                  dnd.clearDragState();
                }
              })();
            }}
            className={`flex h-8 items-center justify-center rounded-md border border-dashed text-[10px] font-medium uppercase tracking-[0.08em] transition-all duration-150 ${
              dnd.rootDropHoverZone === 'bottom' ? rootDropActiveClassName : rootDropIdleClassName
            }`}
          >
            {rootDropLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}
