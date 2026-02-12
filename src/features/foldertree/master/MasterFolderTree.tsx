'use client';

import React from 'react';

import { resolveVerticalDropPosition } from '@/shared/utils/drag-drop';
import type {
  MasterTreeDropPosition,
  MasterTreeId,
} from '@/shared/utils/master-folder-tree-contract';
import type { MasterTreeViewNode } from '@/shared/utils/master-folder-tree-engine';

import type { MasterFolderTreeController } from './types';

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
};

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
  className,
  emptyLabel = 'No items',
  renderToolbar,
  renderNode,
  resolveDraggedNodeId,
  canDrop,
  onNodeDrop,
  resolveDropPosition,
}: MasterFolderTreeProps): React.JSX.Element {
  const resolveDraggedNode = (
    event: React.DragEvent<HTMLElement>
  ): MasterTreeId | null => {
    if (controller.dragState?.draggedNodeId) {
      return controller.dragState.draggedNodeId;
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
              draggable
              data-master-tree-node-id={node.id}
              onDragStart={(event: React.DragEvent<HTMLDivElement>): void => {
                controller.startDrag(node.id);
                event.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={(): void => {
                controller.clearDrag();
              }}
              onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
                const draggedNodeId = resolveDraggedNode(event);
                if (!draggedNodeId) return;
                const targetRect = event.currentTarget.getBoundingClientRect();
                const edgePosition = resolveVerticalDropPosition(event.clientY, targetRect, {
                  thresholdRatio: 0.34,
                });
                const requestedPosition =
                  resolveDropPosition?.(
                    event,
                    {
                      draggedNodeId,
                      targetId: node.id,
                    },
                    controller
                  ) ??
                  edgePosition ??
                  'inside';
                const resolvedPosition =
                  resolveDropAllowance(draggedNodeId, node.id, requestedPosition)
                    ? requestedPosition
                    : requestedPosition !== 'inside' &&
                        resolveDropAllowance(draggedNodeId, node.id, 'inside')
                      ? 'inside'
                      : null;
                if (!resolvedPosition) return;
                event.preventDefault();
                event.stopPropagation();
                if (controller.dragState) {
                  controller.updateDragTarget(node.id, resolvedPosition);
                }
                event.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
                const draggedNodeId = resolveDraggedNode(event);
                if (!draggedNodeId) return;
                const targetRect = event.currentTarget.getBoundingClientRect();
                const edgePosition = resolveVerticalDropPosition(event.clientY, targetRect, {
                  thresholdRatio: 0.34,
                });
                const requestedPosition =
                  resolveDropPosition?.(
                    event,
                    {
                      draggedNodeId,
                      targetId: node.id,
                    },
                    controller
                  ) ??
                  edgePosition ??
                  'inside';
                const resolvedPosition =
                  resolveDropAllowance(draggedNodeId, node.id, requestedPosition)
                    ? requestedPosition
                    : requestedPosition !== 'inside' &&
                        resolveDropAllowance(draggedNodeId, node.id, 'inside')
                      ? 'inside'
                      : null;
                if (!resolvedPosition) return;
                event.preventDefault();
                event.stopPropagation();
                void (async (): Promise<void> => {
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
                })();
              }}
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
        onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
          const draggedNodeId = resolveDraggedNode(event);
          if (!draggedNodeId) return;
          if (!resolveDropAllowance(draggedNodeId, null, 'inside')) return;
          event.preventDefault();
          if (controller.dragState) {
            controller.updateDragTarget(null, 'inside');
          }
          event.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
          const draggedNodeId = resolveDraggedNode(event);
          if (!draggedNodeId) return;
          if (!resolveDropAllowance(draggedNodeId, null, 'inside')) return;
          event.preventDefault();
          void (async (): Promise<void> => {
            if (onNodeDrop) {
              await onNodeDrop(
                {
                  draggedNodeId,
                  targetId: null,
                  position: 'inside',
                },
                controller
              );
              return;
            }
            await controller.dropNodeToRoot(draggedNodeId);
          })();
        }}
        className='space-y-1'
      >
        {controller.roots.length > 0 ? (
          renderTree(controller.roots, 0)
        ) : (
          <div className='rounded border border-dashed border-border/50 px-3 py-4 text-sm text-gray-400'>
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );
}
