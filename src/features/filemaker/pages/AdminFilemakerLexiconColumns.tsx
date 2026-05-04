import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import React from 'react';
import { Badge, Button } from '@/shared/ui/primitives.public';
import type { FilemakerLexiconTerm, FilemakerLexiconTermCategory } from '../types';
import type { FilemakerLexiconTermRow } from './AdminFilemakerLexiconPage.helpers';
import { formatTimestamp } from './filemaker-page-utils';
import { formatFilemakerLexiconCategory, type FilemakerLexiconTypeMetadataMap } from './AdminFilemakerLexiconPage.type-metadata';

type FilemakerLexiconColumnActions = {
  onDeleteTerm: (term: FilemakerLexiconTerm) => void;
  onEditTerm: (term: FilemakerLexiconTerm) => void;
  typeMetadata: FilemakerLexiconTypeMetadataMap;
};

export const createFilemakerLexiconColumns = (
  actions: FilemakerLexiconColumnActions
): Array<ColumnDef<FilemakerLexiconTermRow, unknown>> => [
  {
    id: 'label',
    header: 'Term',
    cell: ({ row }) => <TermLabelCell row={row.original} />,
  },
  {
    id: 'category',
    header: 'Type',
    cell: ({ row }) => (
      <TermCategoryCell row={row.original} typeMetadata={actions.typeMetadata} />
    ),
  },
  {
    id: 'usage',
    header: 'Usage',
    cell: ({ row }) => <TermUsageCell row={row.original} />,
  },
  {
    id: 'source',
    header: 'Source',
    cell: ({ row }) => row.original.term.sourceSite ?? 'manual',
  },
  {
    id: 'lastSeenAt',
    header: 'Last seen',
    cell: ({ row }) => formatTimestamp(row.original.term.lastSeenAt),
  },
  {
    id: 'actions',
    header: () => <div className='text-right'>Actions</div>,
    cell: ({ row }) => <TermActionsCell actions={actions} row={row.original} />,
  },
];

function TermLabelCell(props: { row: FilemakerLexiconTermRow }): React.JSX.Element {
  const iconUrl = props.row.term.iconUrl ?? '';

  return (
    <div className='min-w-0'>
      <div className='flex min-w-0 items-center gap-2'>
        {iconUrl !== '' ? (
          <img
            src={iconUrl}
            alt=''
            className='size-5 shrink-0 rounded border border-border/50 bg-background object-contain p-0.5'
          />
        ) : null}
        <div className='truncate text-sm font-medium'>{props.row.term.label}</div>
      </div>
      <div className='truncate pt-0.5 text-[11px] text-muted-foreground'>
        {props.row.term.normalizedLabel}
      </div>
    </div>
  );
}

function TermCategoryCell(props: {
  row: FilemakerLexiconTermRow;
  typeMetadata: FilemakerLexiconTypeMetadataMap;
}): React.JSX.Element {
  return (
    <Badge variant='outline'>
      {formatFilemakerLexiconCategory(props.row.term.typeKey, props.typeMetadata)}
    </Badge>
  );
}

function TermUsageCell(props: { row: FilemakerLexiconTermRow }): React.JSX.Element {
  return (
    <div className='text-xs text-muted-foreground'>
      {props.row.linkedJobCount} jobs / {props.row.term.occurrenceCount} sightings
    </div>
  );
}

function TermActionsCell(props: {
  actions: FilemakerLexiconColumnActions;
  row: FilemakerLexiconTermRow;
}): React.JSX.Element {
  return (
    <div className='flex justify-end gap-2'>
      <Button size='xs' variant='outline' onClick={() => props.actions.onEditTerm(props.row.term)}>
        <Pencil className='size-3.5' />
        Edit
      </Button>
      <Button
        aria-label={`Delete ${props.row.term.label}`}
        size='xs'
        variant='outline'
        className='text-rose-400'
        onClick={() => props.actions.onDeleteTerm(props.row.term)}
      >
        <Trash2 className='size-3.5' />
      </Button>
    </div>
  );
}
