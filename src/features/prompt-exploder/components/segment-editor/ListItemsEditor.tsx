'use client';

import React from 'react';
import { GripVertical, Plus } from 'lucide-react';
import { Button, Card, FormField, Input } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { useDocumentState, useDocumentActions } from '../../context/hooks/useDocument';
import {
  useSegmentEditorState,
  useSegmentEditorActions,
} from '../../context/hooks/useSegmentEditor';
import { promptExploderAddBlankListItem } from '../../helpers/segment-helpers';
import { SegmentEditorListItemLogicalEditor } from '../SegmentEditorListItemLogicalEditor';
import type { PromptExploderListItem, PromptExploderSegment } from '../../types';

export function ListItemsEditor(): React.JSX.Element {
  const { selectedSegment } = useDocumentState();

  const { updateSegment } = useDocumentActions();
  const { draggingListItemIndex } = useSegmentEditorState();
  const {
    handleListItemDragStart,
    handleListItemDragEnd,
    handleListItemDragOver,
    handleListItemDrop,
  } = useSegmentEditorActions();

  if (!selectedSegment) return <></>;

  const updateTopLevelListItem = (
    index: number,
    updater: (item: PromptExploderListItem) => PromptExploderListItem
  ) => {
    updateSegment(selectedSegment.id, (c: PromptExploderSegment) => ({
      ...c,
      listItems: (c.listItems || []).map((item: PromptExploderListItem, i: number) =>
        i === index ? updater(item) : item
      ),
    }));
  };

  return (
    <FormField
      label='List Items'
      actions={
        <Button
          variant='outline'
          size='sm'
          onClick={() =>
            updateSegment(selectedSegment.id, (c: PromptExploderSegment) => ({
              ...c,
              listItems: promptExploderAddBlankListItem(c.listItems || []),
            }))
          }
        >
          <Plus className='mr-2 size-3.5' /> Add Item
        </Button>
      }
    >
      <div className='space-y-2'>
        {(selectedSegment.listItems || []).map((item: PromptExploderListItem, index: number) => (
          <div
            key={item.id}
            className={cn(
              'relative transition-all',
              draggingListItemIndex === index && 'opacity-60'
            )}
            onDragOver={(e) => handleListItemDragOver(e, index)}
            onDrop={(e) => handleListItemDrop(e, index)}
          >
            <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/20'>
              <div className='flex items-center gap-1'>
                <button
                  type='button'
                  className='size-9 flex items-center justify-center rounded border border-border/60 bg-card/50'
                  draggable
                  onDragStart={() => handleListItemDragStart(index)}
                  onDragEnd={handleListItemDragEnd}
                >
                  <GripVertical size={14} />
                </button>
                <Input
                  value={item.text}
                  onChange={(e) =>
                    updateTopLevelListItem(index, (it) => ({ ...it, text: e.target.value }))
                  }
                />
              </div>
              <SegmentEditorListItemLogicalEditor
                item={item}
                onChange={(updater) => updateTopLevelListItem(index, updater)}
              />
            </Card>
          </div>
        ))}
      </div>
    </FormField>
  );
}
