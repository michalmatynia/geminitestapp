'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Plus } from 'lucide-react';

import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
} from '@/features/foldertree';
import { Button, Card, FormField, Input, SectionHeader, Textarea } from '@/shared/ui';

import { SegmentEditorListItemLogicalEditor } from '../SegmentEditorListItemLogicalEditor';
import { PromptExploderTreeNode } from './PromptExploderTreeNode';
import { PromptExploderTreeNodeRuntimeProvider } from './PromptExploderTreeNodeRuntimeContext';
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
  promptExploderAddBlankListItem,
  promptExploderCreateSubsection,
} from '../../helpers/segment-helpers';
import { readPromptExploderTreeMetadata, toPromptExploderTreeNodeId } from '../../tree/types';
import { useDocumentActions, useDocumentState } from '../../context/hooks/useDocument';

import type { PromptExploderListItem, PromptExploderSegment } from '../../types';

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
                />
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
                  />
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
                  />
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
                />
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
                />
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
