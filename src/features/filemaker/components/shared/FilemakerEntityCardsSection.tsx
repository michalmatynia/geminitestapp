import { Edit2, Plus, Trash2 } from 'lucide-react';
import React from 'react';

import { Button, Card } from '@/shared/ui/primitives.public';
import { CompactEmptyState } from '@/shared/ui/navigation-and-layout.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

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

interface FilemakerEntityCardProps<TItem extends { id: string }> {
  item: TItem;
  renderMain: (item: TItem) => React.ReactNode;
  renderMeta: (item: TItem) => React.ReactNode;
  onEdit: (item: TItem) => void;
  onDelete: (item: TItem) => void;
  isPending: boolean;
}

interface FilemakerEntityCardActionsProps<TItem extends { id: string }> {
  item: TItem;
  onEdit: (item: TItem) => void;
  onDelete: (item: TItem) => void;
  isPending: boolean;
}

function FilemakerEntityCardActions<TItem extends { id: string }>({
  item,
  onEdit,
  onDelete,
  isPending,
}: FilemakerEntityCardActionsProps<TItem>): React.JSX.Element {
  return (
    <div className='flex items-center gap-2'>
      <Button
        type='button'
        variant='outline'
        className='h-8 w-8 p-0'
        aria-label='Edit item'
        onClick={(): void => {
          onEdit(item);
        }}
        title='Edit item'
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
        title='Delete item'
      >
        <Trash2 className='size-3.5' />
      </Button>
    </div>
  );
}

function FilemakerEntityCard<TItem extends { id: string }>({
  item,
  renderMain,
  renderMeta,
  onEdit,
  onDelete,
  isPending,
}: FilemakerEntityCardProps<TItem>): React.JSX.Element {
  return (
    <Card key={item.id} variant='subtle-compact' padding='md' className='border-border/60 bg-card/35'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0 flex-1 space-y-1'>
          {renderMain(item)}
          {renderMeta(item)}
        </div>
        <FilemakerEntityCardActions
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          isPending={isPending}
        />
      </div>
    </Card>
  );
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
          <CompactEmptyState
            title={emptyTitle}
            description={emptyDescription}
            className='border-border/60 bg-card/20 py-8 border-dashed'
          />
        ) : (
          items.map((item) => (
            <FilemakerEntityCard
              key={item.id}
              item={item}
              renderMain={renderMain}
              renderMeta={renderMeta}
              onEdit={onEdit}
              onDelete={onDelete}
              isPending={isPending}
            />
          ))
        )}
      </div>
    </FormSection>
  );
}
