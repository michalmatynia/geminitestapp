'use client';

import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  GripVertical,
  ListTree,
  Waypoints,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef } from 'react';

import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/features/foldertree/public';
import { Badge, Button, Input, Label } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { internalError } from '@/shared/errors/app-error';
import {
  buildPromptExploderMasterNodes,
  fromPromptExploderMasterNodeId,
  rebuildPromptExploderListFromMasterNodes,
  removePromptExploderListItemById,
  updatePromptExploderListItemById,
} from '../hierarchy-master-tree';
import {
  PromptExploderTreeNodeRuntimeProvider,
  usePromptExploderTreeNodeRuntimeContext,
} from './tree/PromptExploderSegmentsTreeEditor';
import { buildPromptExploderTreeRevision, usePromptExploderHandleOnlyDrag } from '../tree/shared';
import { readPromptExploderTreeMetadata, type PromptExploderTreeNodeKind } from '../tree/types';

import type { PromptExploderListItem } from '../types';

type PromptExploderHierarchyTreeContextValue = {
  items: PromptExploderListItem[];
  onChange: (nextItems: PromptExploderListItem[]) => void;
  emptyLabel: string;
  renderLogicalEditor?: (args: {
    item: PromptExploderListItem;
    onChange: (updater: (item: PromptExploderListItem) => PromptExploderListItem) => void;
  }) => React.ReactNode;
};

const PromptExploderHierarchyTreeContext =
  React.createContext<PromptExploderHierarchyTreeContextValue | null>(null);

export function PromptExploderHierarchyTreeProvider({
  value,
  children,
}: {
  value: PromptExploderHierarchyTreeContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <PromptExploderHierarchyTreeContext.Provider value={value}>
      {children}
    </PromptExploderHierarchyTreeContext.Provider>
  );
}

function usePromptExploderHierarchyTreeContext(): PromptExploderHierarchyTreeContextValue {
  const context = React.useContext(PromptExploderHierarchyTreeContext);
  if (!context) {
    throw internalError(
      'usePromptExploderHierarchyTreeContext must be used inside PromptExploderHierarchyTreeProvider'
    );
  }
  return context;
}

type PromptExploderTreeNodeProps = FolderTreeViewportRenderNodeInput;

const resolveNodeIcon = (kind: PromptExploderTreeNodeKind | null) => {
  switch (kind) {
    case 'segment':
      return FileText;
    case 'subsection':
      return Folder;
    case 'subsection_item':
      return ListTree;
    case 'list_item':
    case 'hierarchy_item':
      return Waypoints;
    default:
      return Folder;
  }
};

function PromptExploderTreeNode(props: PromptExploderTreeNodeProps): React.JSX.Element {
  const {
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
  } = props;

  const { armDragHandle, releaseDragHandle } = usePromptExploderTreeNodeRuntimeContext();
  const metadata = readPromptExploderTreeMetadata(node);
  const Icon = resolveNodeIcon(metadata?.kind ?? null);
  const stateClassName = isSelected
    ? 'bg-blue-600/20 text-white ring-1 ring-inset ring-blue-400/40 shadow-sm'
    : isMultiSelected
      ? 'bg-blue-500/15 text-blue-100 ring-1 ring-inset ring-blue-400/25'
      : dropPosition === 'before'
        ? 'bg-blue-500/10 text-gray-100 ring-1 ring-inset ring-blue-500/60'
        : dropPosition === 'after'
          ? 'bg-blue-500/10 text-gray-100 ring-1 ring-inset ring-cyan-400/60'
          : isDragging
            ? 'opacity-50'
            : 'text-gray-300 hover:bg-muted/40';

  const badgeLabel =
    metadata?.kind === 'segment'
      ? (metadata.segmentType?.replaceAll('_', ' ') ?? 'segment')
      : metadata?.kind === 'subsection'
        ? metadata.code?.trim() || 'subsection'
        : metadata?.kind === 'subsection_item'
          ? metadata.logicalOperator?.replaceAll('_', ' ') || 'item'
          : metadata?.kind === 'list_item' || metadata?.kind === 'hierarchy_item'
            ? metadata.logicalOperator?.replaceAll('_', ' ') || 'item'
            : null;

  return (
    <div
      className={cn(
        'group flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-all',
        stateClassName
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <button
        type='button'
        aria-label='Drag node'
        data-master-tree-drag-handle='true'
        onPointerDown={(): void => {
          armDragHandle(node.id);
        }}
        onPointerUp={releaseDragHandle}
        onPointerCancel={releaseDragHandle}
        onMouseDown={(): void => {
          armDragHandle(node.id);
        }}
        onMouseUp={releaseDragHandle}
        className='inline-flex size-5 shrink-0 items-center justify-center rounded cursor-grab text-gray-400 transition hover:bg-white/10 hover:text-gray-100 active:cursor-grabbing'
        title='Drag node'
      >
        <GripVertical className='size-3.5' />
      </button>
      {hasChildren ? (
        <Button
          variant='ghost'
          size='sm'
          className='size-4 p-0 text-gray-500 hover:bg-white/10 hover:text-gray-300'
          onClick={(event): void => {
            event.preventDefault();
            event.stopPropagation();
            toggleExpand();
          }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronDown className='size-3' /> : <ChevronRight className='size-3' />}
        </Button>
      ) : (
        <span className='inline-flex size-4 items-center justify-center text-xs opacity-40'>•</span>
      )}
      <button
        type='button'
        onClick={select}
        aria-pressed={isSelected}
        aria-label={`Select ${node.name}`}
        className='flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
      >
        <Icon className='size-4 shrink-0 text-sky-200/80' />
        <span className='min-w-0 flex-1 truncate'>{node.name}</span>
        {badgeLabel ? (
          <Badge
            variant='neutral'
            className='shrink-0 border-border/60 bg-card/40 text-[10px] h-4 px-1 uppercase tracking-wider'
          >
            {badgeLabel}
          </Badge>
        ) : null}
      </button>
    </div>
  );
}

const RGB_LITERAL_RE = /RGB\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/i;

const clampRgb = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

const extractRgbLiteral = (text: string): [number, number, number] | null => {
  const match = RGB_LITERAL_RE.exec(text);
  if (!match) return null;
  const red = Number(match[1]);
  const green = Number(match[2]);
  const blue = Number(match[3]);
  if (![red, green, blue].every((value) => Number.isFinite(value))) return null;
  return [clampRgb(red), clampRgb(green), clampRgb(blue)];
};

const rgbToHex = ([red, green, blue]: [number, number, number]): string =>
  `#${[red, green, blue].map((value) => clampRgb(value).toString(16).padStart(2, '0')).join('')}`;

const hexToRgb = (value: string): [number, number, number] | null => {
  const match = /^#?([a-f0-9]{6})$/i.exec(value.trim());
  if (!match) return null;
  const hex = match[1] ?? '';
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
};

const replaceRgbLiteral = (text: string, rgb: [number, number, number]): string =>
  text.replace(RGB_LITERAL_RE, `RGB(${clampRgb(rgb[0])},${clampRgb(rgb[1])},${clampRgb(rgb[2])})`);

const createListItem = (text = 'New item'): PromptExploderListItem => ({
  id: `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  text,
  logicalOperator: null,
  logicalConditions: [],
  referencedParamPath: null,
  referencedComparator: null,
  referencedValue: null,
  children: [],
});

export function PromptExploderHierarchyTreeEditor(): React.JSX.Element {
  const { items, onChange, emptyLabel, renderLogicalEditor } =
    usePromptExploderHierarchyTreeContext();

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const masterNodes = useMemo(() => buildPromptExploderMasterNodes(items), [items]);
  const treeRevision = useMemo(() => buildPromptExploderTreeRevision(masterNodes), [masterNodes]);
  const expandedNodeIds = useMemo(() => masterNodes.map((node) => node.id), [masterNodes]);

  const adapter = useMemo(
    () =>
      createMasterFolderTreeTransactionAdapter({
        onApply: async (tx) => {
          const nextItems = rebuildPromptExploderListFromMasterNodes({
            nodes: tx.nextNodes,
            previousItems: itemsRef.current,
          });
          onChangeRef.current(nextItems);
        },
      }),
    []
  );

  const {
    appearance: { rootDropUi },
    controller,
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: 'prompt_exploder_hierarchy',
    nodes: masterNodes,
    initiallyExpandedNodeIds: expandedNodeIds,
    externalRevision: treeRevision,
    adapter,
  });
  const { armDragHandle, releaseDragHandle, canStartHandleOnlyDrag } =
    usePromptExploderHandleOnlyDrag();
  const treeNodeRuntimeContextValue = useMemo(
    () => ({
      armDragHandle,
      releaseDragHandle,
    }),
    [armDragHandle, releaseDragHandle]
  );

  const selectedItemId = controller.selectedNodeId
    ? fromPromptExploderMasterNodeId(controller.selectedNodeId)
    : null;

  const selectedItem = useMemo((): PromptExploderListItem | null => {
    if (!selectedItemId) return null;
    let resolved: PromptExploderListItem | null = null;
    const walk = (nodes: PromptExploderListItem[]): void => {
      nodes.forEach((node) => {
        if (resolved) return;
        if (node.id === selectedItemId) {
          resolved = node;
          return;
        }
        if (node.children.length > 0) walk(node.children);
      });
    };
    walk(items);
    return resolved;
  }, [items, selectedItemId]);

  const updateSelectedItem = (
    updater: (item: PromptExploderListItem) => PromptExploderListItem
  ): void => {
    if (!selectedItemId) return;
    onChange(updatePromptExploderListItemById(items, selectedItemId, updater));
  };

  const addRootItem = (): void => {
    onChange([...items, createListItem()]);
  };

  const addChildItem = (): void => {
    if (!selectedItemId) return;
    onChange(
      updatePromptExploderListItemById(items, selectedItemId, (item) => ({
        ...item,
        children: [...item.children, createListItem()],
      }))
    );
    if (controller.selectedNodeId) {
      controller.expandNode(controller.selectedNodeId);
    }
  };

  const removeSelectedItem = (): void => {
    if (!selectedItemId) return;
    onChange(removePromptExploderListItemById(items, selectedItemId));
    controller.selectNode(null);
  };

  const moveSelectedItemToRoot = (): void => {
    if (!controller.selectedNodeId) return;
    void controller.dropNodeToRoot(controller.selectedNodeId);
  };

  return (
    <div className='space-y-2 rounded border border-border/50 bg-card/20 p-2'>
      <div className='flex items-center justify-between gap-2'>
        <Label className='text-[11px] text-gray-400'>Hierarchy (Master Folder Tree)</Label>
        <div className='flex items-center gap-1'>
          <Button type='button' variant='outline' size='sm' onClick={addRootItem}>
            Add Root
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={addChildItem}
            disabled={!selectedItemId}
          >
            Add Child
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={removeSelectedItem}
            disabled={!selectedItemId}
          >
            Remove
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={moveSelectedItemToRoot}
            disabled={!selectedItemId}
          >
            Move to Root
          </Button>
        </div>
      </div>

      <PromptExploderTreeNodeRuntimeProvider value={treeNodeRuntimeContextValue}>
        <div className='max-h-[260px] overflow-y-auto rounded border border-border/60 bg-card/30 p-2'>
          <FolderTreeViewportV2
            controller={controller}
            scrollToNodeRef={scrollToNodeRef}
            enableDnd
            className='space-y-0.5'
            emptyLabel={emptyLabel}
            rootDropUi={rootDropUi}
            canStartDrag={canStartHandleOnlyDrag}
            renderNode={(input) => <PromptExploderTreeNode {...input} />}
          />
        </div>
      </PromptExploderTreeNodeRuntimeProvider>

      {selectedItem ? (
        <div className='space-y-2 rounded border border-border/60 bg-card/30 p-2'>
          <Label className='text-[10px] text-gray-500'>Selected Item</Label>
          {(() => {
            const rgbLiteral = extractRgbLiteral(selectedItem.text || '');
            return (
              <div className='flex items-center gap-1'>
                <Input
                  value={selectedItem.text || ''}
                  onChange={(event) => {
                    updateSelectedItem((item) => ({
                      ...item,
                      text: event.target.value,
                    }));
                  }}
                 aria-label='Input field' title='Input field'/>
                {rgbLiteral ? (
                  <input
                    type='color'
                    className='h-9 w-10 cursor-pointer rounded border border-border/60 bg-transparent p-1'
                    value={rgbToHex(rgbLiteral)}
                    onChange={(event) => {
                      const parsed = hexToRgb(event.target.value);
                      if (!parsed) return;
                      updateSelectedItem((item) => ({
                        ...item,
                        text: replaceRgbLiteral(item.text || '', parsed),
                      }));
                    }}
                    aria-label='RGB color picker'
                  />
                ) : null}
              </div>
            );
          })()}{' '}
          {renderLogicalEditor
            ? renderLogicalEditor({
              item: selectedItem,
              onChange: (updater) => {
                updateSelectedItem((current) => updater(current));
              },
            })
            : null}
        </div>
      ) : null}
    </div>
  );
}
