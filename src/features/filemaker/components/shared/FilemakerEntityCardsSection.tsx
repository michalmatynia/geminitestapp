import { Edit2, Plus, Trash2 } from 'lucide-react';
import React from 'react';

import { Button, Card, EmptyState, FormSection } from '@/shared/ui';

export interface FilemakerEntityCardsSectionProps<TItem extends { id: string }> {
  title: string;
  addLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  items: TItem[];
  renderMain: (item: TItem) => React.ReactNode;
  renderMeta: (item: TItem) => React.ReactNode;
  onAdd: () => void;
  onEdit: (item: TItem) => void;
  onDelete: (item: TItem) => void;
  isPending: boolean;
}

export function FilemakerEntityCardsSection<TItem extends { id: string }>(
  props: FilemakerEntityCardsSectionProps<TItem>
): React.JSX.Element {
  const {
    title,
    addLabel,
    emptyTitle,
    emptyDescription,
    items,
    renderMain,
    renderMeta,
    onAdd,
    onEdit,
    onDelete,
    isPending,
  } = props;

  return (
    <FormSection
      title={title}
      className='space-y-4 p-4'
      actions={
        <Button type='button' onClick={onAdd} disabled={isPending} className='h-8'>
          <Plus className='mr-1.5 size-3.5' />
          {addLabel}
        </Button>
      }
    >
      <div className='space-y-2'>
        {items.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            variant='compact'
            className='border-border/60 bg-card/20 py-8 border-dashed'
          />
        ) : (
          items.map((item) => (
            <Card
              key={item.id}
              variant='subtle-compact'
              padding='md'
              className='border-border/60 bg-card/35'
            >
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0 flex-1 space-y-1'>
                  {renderMain(item)}
                  {renderMeta(item)}
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    className='h-8 w-8 p-0'
                    aria-label='Edit item'
                    onClick={(): void => {
                      onEdit(item);
                    }}
                  >
                    <Edit2 className='size-3.5' />
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    className='h-8 w-8 p-0 text-red-300 hover:text-red-200 hover:border-red-500/40'
                    aria-label='Delete item'
                    onClick={(): void => {
                      onDelete(item);
                    }}
                    disabled={isPending}
                  >
                    <Trash2 className='size-3.5' />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </FormSection>
  );
}
