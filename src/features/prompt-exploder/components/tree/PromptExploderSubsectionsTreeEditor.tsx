'use client';

import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  GripVertical,
  ListTree,
  Plus,
  Waypoints,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef } from 'react';

import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/shared/lib/foldertree/public';
import { Badge, Button, Card, Input, Textarea } from '@/shared/ui/primitives.public';
import { FormField } from '@/shared/ui/forms-and-actions.public';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { cn } from '@/shared/utils/ui-utils';

import { SegmentEditorListItemLogicalEditor } from '../SegmentEditorListItemLogicalEditor';
import {
  PromptExploderTreeNodeRuntimeProvider,
  usePromptExploderTreeNodeRuntimeContext,
} from './PromptExploderSegmentsTreeEditor';
import { useDocumentActions, useDocumentState } from '../../context';
import {
  promptExploderAddBlankListItem,
  promptExploderCreateSubsection,
} from '../../helpers/segment-helpers';
import {
  buildPromptExploderTreeRevision,
  usePromptExploderHandleOnlyDrag,
} from '../../tree/shared';
import {
  buildPromptExploderSubsectionMasterNodes,
  rebuildPromptExploderSubsectionsFromMasterNodes,
  removePromptExploderSubsectionNodeById,
  updatePromptExploderSubsectionById,
  updatePromptExploderSubsectionItemById,
} from '../../tree/subsections-master-tree';
import {
  readPromptExploderTreeMetadata,
  toPromptExploderTreeNodeId,
  type PromptExploderTreeNodeKind,
} from '../../tree/types';

import type { PromptExploderListItem, PromptExploderSegment } from '../../types';

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

const createChildListItem = (): PromptExploderListItem => {
  const [item] = promptExploderAddBlankListItem([]);
  if (!item) throw new Error('Failed to create blank list item');
  return item;
};

export function PromptExploderSubsectionsTreeEditor(): React.JSX.Element | null {
  const { selectedSegment } = useDocumentState();
  const { updateSegment } = useDocumentActions();

  if (
    !selectedSegment ||
    (selectedSegment.type !== 'sequence' && selectedSegment.type !== 'qa_matrix')
  ) {
    return null;
  }

  const subsections = selectedSegment.subsections ?? [];
  const subsectionsRef = useRef(subsections);
  useEffect(() => {
    subsectionsRef.current = subsections;
  }, [subsections]);

  const masterNodes = useMemo(
    () => buildPromptExploderSubsectionMasterNodes(subsections),
    [subsections]
  );
  const treeRevision = useMemo(() => buildPromptExploderTreeRevision(masterNodes), [masterNodes]);

  const adapter = useMemo(
    () =>
      createMasterFolderTreeTransactionAdapter({
        onApply: async (tx) => {
          const nextSubsections = rebuildPromptExploderSubsectionsFromMasterNodes({
            nodes: tx.nextNodes,
            previousSubsections: subsectionsRef.current,
          });
          updateSegment(selectedSegment.id, (current: PromptExploderSegment) => ({
            ...current,
            subsections: nextSubsections,
          }));
        },
      }),
    [selectedSegment.id, updateSegment]
  );

  const {
    appearance: { rootDropUi },
    controller,
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: 'prompt_exploder_hierarchy',
    nodes: masterNodes,
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

  const selectedMetadata = controller.selectedNodeId
    ? readPromptExploderTreeMetadata(
      masterNodes.find((node) => node.id === controller.selectedNodeId) ?? { metadata: undefined }
    )
    : null;

  const selectedSubsection =
    selectedMetadata?.kind === 'subsection'
      ? (subsections.find((subsection) => subsection.id === selectedMetadata.entityId) ?? null)
      : null;

  const findItemById = React.useCallback(
    (items: PromptExploderListItem[], itemId: string): PromptExploderListItem | null => {
      for (const item of items) {
        if (item.id === itemId) return item;
        const childMatch = findItemById(item.children, itemId);
        if (childMatch) return childMatch;
      }
      return null;
    },
    []
  );

  const selectedItem =
    selectedMetadata?.kind === 'subsection_item'
      ? (subsections
        .map((subsection) => findItemById(subsection.items ?? [], selectedMetadata.entityId))
        .find(Boolean) ?? null)
      : null;

  const appendSubsection = (): void => {
    updateSegment(selectedSegment.id, (current: PromptExploderSegment) => ({
      ...current,
      subsections: [...current.subsections, promptExploderCreateSubsection()],
    }));
  };

  const appendChild = (): void => {
    if (!selectedMetadata) return;
    if (selectedMetadata.kind === 'subsection') {
      updateSegment(selectedSegment.id, (current: PromptExploderSegment) => ({
        ...current,
        subsections: updatePromptExploderSubsectionById(
          current.subsections,
          selectedMetadata.entityId,
          (subsection) => ({
            ...subsection,
            items: [...(subsection.items ?? []), createChildListItem()],
          })
        ),
      }));
      controller.expandNode(toPromptExploderTreeNodeId('subsection', selectedMetadata.entityId));
      return;
    }
    if (selectedMetadata.kind === 'subsection_item') {
      updateSegment(selectedSegment.id, (current: PromptExploderSegment) => ({
        ...current,
        subsections: updatePromptExploderSubsectionItemById(
          current.subsections,
          selectedMetadata.entityId,
          (item) => ({
            ...item,
            children: [...item.children, createChildListItem()],
          })
        ),
      }));
      controller.expandNode(
        toPromptExploderTreeNodeId('subsection_item', selectedMetadata.entityId)
      );
    }
  };

  const removeSelectedNode = (): void => {
    if (!selectedMetadata) return;
    updateSegment(selectedSegment.id, (current: PromptExploderSegment) => ({
      ...current,
      subsections: removePromptExploderSubsectionNodeById(current.subsections, {
        kind: selectedMetadata.kind === 'subsection' ? 'subsection' : 'subsection_item',
        entityId: selectedMetadata.entityId,
      }),
    }));
    controller.selectNode(null);
  };

  return (
    <div className='space-y-3'>
      <SectionHeader
        title={selectedSegment.type === 'qa_matrix' ? 'QA Subsections' : 'Sequence Subsections'}
        size='xxs'
        actions={
          <div className='flex items-center gap-1'>
            <Button type='button' variant='outline' size='sm' onClick={appendSubsection}>
              <Plus className='mr-2 size-3.5' />
              Add Subsection
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={appendChild}
              disabled={!selectedMetadata}
            >
              Add Item
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={removeSelectedNode}
              disabled={!selectedMetadata}
            >
              Remove
            </Button>
          </div>
        }
      />
      <div className='grid gap-3 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]'>
        <Card
          variant='subtle-compact'
          padding='sm'
          className='space-y-2 border-border/60 bg-card/20'
        >
          <PromptExploderTreeNodeRuntimeProvider value={treeNodeRuntimeContextValue}>
            <div className='max-h-[320px] overflow-y-auto rounded border border-border/60 bg-card/30 p-2'>
              <FolderTreeViewportV2
                controller={controller}
                scrollToNodeRef={scrollToNodeRef}
                enableDnd
                className='space-y-0.5'
                emptyLabel='No subsections detected.'
                rootDropUi={rootDropUi}
                canStartDrag={canStartHandleOnlyDrag}
                canDrop={({ draggedNodeId, targetId, position, defaultAllowed }) => {
                  if (!defaultAllowed) return false;
                  const dragged = readPromptExploderTreeMetadata(
                    masterNodes.find((node) => node.id === draggedNodeId) ?? { metadata: undefined }
                  );
                  const target =
                    targetId === null
                      ? null
                      : readPromptExploderTreeMetadata(
                        masterNodes.find((node) => node.id === targetId) ?? {
                          metadata: undefined,
                        }
                      );
                  if (!dragged) return false;
                  if (targetId === null) {
                    return dragged.kind === 'subsection';
                  }
                  if (!target) return false;
                  if (dragged.kind === 'subsection') {
                    return target.kind === 'subsection' && position !== 'inside';
                  }
                  if (dragged.kind === 'subsection_item') {
                    if (target.kind === 'subsection') return position === 'inside';
                    if (target.kind === 'subsection_item') return true;
                    return false;
                  }
                  return false;
                }}
                renderNode={(input) => <PromptExploderTreeNode {...input} />}
              />
            </div>
          </PromptExploderTreeNodeRuntimeProvider>
        </Card>
        <Card
          variant='subtle-compact'
          padding='md'
          className='space-y-3 border-border/60 bg-card/20'
        >
          {selectedSubsection ? (
            <>
              <FormField label='Subsection Title'>
                <Input
                  value={selectedSubsection.title}
                  onChange={(event) => {
                    updateSegment(selectedSegment.id, (current: PromptExploderSegment) => ({
                      ...current,
                      subsections: updatePromptExploderSubsectionById(
                        current.subsections,
                        selectedSubsection.id,
                        (subsection) => ({
                          ...subsection,
                          title: event.target.value,
                        })
                      ),
                    }));
                  }}
                 aria-label='Subsection Title' title='Subsection Title'/>
              </FormField>
              <div className='grid gap-3 md:grid-cols-2'>
                <FormField label='Code'>
                  <Input
                    value={selectedSubsection.code ?? ''}
                    onChange={(event) => {
                      updateSegment(selectedSegment.id, (current: PromptExploderSegment) => ({
                        ...current,
                        subsections: updatePromptExploderSubsectionById(
                          current.subsections,
                          selectedSubsection.id,
                          (subsection) => ({
                            ...subsection,
                            code: event.target.value.trim().toUpperCase() || null,
                          })
                        ),
                      }));
                    }}
                   aria-label='Code' title='Code'/>
                </FormField>
                <FormField label='Condition'>
                  <Input
                    value={selectedSubsection.condition ?? ''}
                    onChange={(event) => {
                      updateSegment(selectedSegment.id, (current: PromptExploderSegment) => ({
                        ...current,
                        subsections: updatePromptExploderSubsectionById(
                          current.subsections,
                          selectedSubsection.id,
                          (subsection) => ({
                            ...subsection,
                            condition: event.target.value.trim() || null,
                          })
                        ),
                      }));
                    }}
                   aria-label='Condition' title='Condition'/>
                </FormField>
              </div>
              <FormField label='Guidance'>
                <Textarea
                  className='min-h-[140px]'
                  value={selectedSubsection.guidance ?? ''}
                  onChange={(event) => {
                    updateSegment(selectedSegment.id, (current: PromptExploderSegment) => ({
                      ...current,
                      subsections: updatePromptExploderSubsectionById(
                        current.subsections,
                        selectedSubsection.id,
                        (subsection) => ({
                          ...subsection,
                          guidance: event.target.value || null,
                        })
                      ),
                    }));
                  }}
                 aria-label='Guidance' title='Guidance'/>
              </FormField>
            </>
          ) : selectedItem ? (
            <>
              <FormField label='Item Text'>
                <Input
                  value={selectedItem.text ?? ''}
                  onChange={(event) => {
                    updateSegment(selectedSegment.id, (current: PromptExploderSegment) => ({
                      ...current,
                      subsections: updatePromptExploderSubsectionItemById(
                        current.subsections,
                        selectedItem.id,
                        (item) => ({
                          ...item,
                          text: event.target.value,
                        })
                      ),
                    }));
                  }}
                 aria-label='Item Text' title='Item Text'/>
              </FormField>
              <SegmentEditorListItemLogicalEditor
                item={selectedItem}
                onChange={(updater) => {
                  updateSegment(selectedSegment.id, (current: PromptExploderSegment) => ({
                    ...current,
                    subsections: updatePromptExploderSubsectionItemById(
                      current.subsections,
                      selectedItem.id,
                      updater
                    ),
                  }));
                }}
              />
            </>
          ) : (
            <div className='text-sm text-gray-500'>
              Select a subsection or subsection item to edit.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
