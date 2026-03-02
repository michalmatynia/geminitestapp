'use client';

import React, { useEffect, useMemo, useRef } from 'react';

import { FolderTreeViewportV2, useMasterFolderTreeShell } from '@/features/foldertree/v2';
import type {
  MasterFolderTreeAdapterV3,
  MasterFolderTreeTransaction,
} from '@/shared/contracts/master-folder-tree';
import { Button, Input, Label } from '@/shared/ui';

import { usePromptExploderHierarchyTreeContext } from './PromptExploderHierarchyTreeContext';
import { PromptExploderTreeNode } from './tree/PromptExploderTreeNode';
import {
  buildPromptExploderMasterNodes,
  fromPromptExploderMasterNodeId,
  rebuildPromptExploderListFromMasterNodes,
  removePromptExploderListItemById,
  updatePromptExploderListItemById,
} from '../hierarchy-master-tree';
import {
  buildPromptExploderTreeRevision,
  usePromptExploderHandleOnlyDrag,
} from '../tree/shared';

import type { PromptExploderListItem } from '../types';

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

  const adapter = useMemo<MasterFolderTreeAdapterV3>(
    () => ({
      apply: async (tx: MasterFolderTreeTransaction) => {
        const nextItems = rebuildPromptExploderListFromMasterNodes({
          nodes: tx.nextNodes,
          previousItems: itemsRef.current,
        });
        onChangeRef.current(nextItems);
        return {
          tx,
          appliedAt: Date.now(),
        };
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

      <div className='max-h-[260px] overflow-y-auto rounded border border-border/60 bg-card/30 p-2'>
        <FolderTreeViewportV2
          controller={controller}
          scrollToNodeRef={scrollToNodeRef}
          enableDnd
          className='space-y-0.5'
          emptyLabel={emptyLabel}
          rootDropUi={rootDropUi}
          canStartDrag={canStartHandleOnlyDrag}
          renderNode={(input) => (
            <PromptExploderTreeNode
              {...input}
              armDragHandle={armDragHandle}
              releaseDragHandle={releaseDragHandle}
            />
          )}
        />
      </div>

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
                />
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
