'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo } from 'react';

import type { PersonaMemoryRecord } from '@/shared/contracts/persona-memory';
import { Button } from '@/shared/ui/primitives.public';
import { Tag } from '@/shared/ui/forms-and-actions.public';

import type { ColumnDef } from '@tanstack/react-table';

import {
  formatPersonaMemoryDate,
  formatPersonaMemoryOriginPrimaryLine,
  formatPersonaMemoryOriginSourceTypeLabel,
  formatPersonaMemoryPrimaryTitle,
} from './format-persona-memory';

function buildPersonaMemoryExpanderColumn(
  expanded: Record<string, boolean>,
  toggleExpanded: (id: string) => void
): ColumnDef<PersonaMemoryRecord> {
  return {
    id: 'expander',
    header: () => null,
    cell: ({ row }) => {
      const isExpanded = expanded[row.original.id] === true;
      const label = isExpanded === true ? 'Collapse memory details' : 'Expand memory details';
      return (
        <Button
          size='icon'
          variant='ghost'
          className='h-7 w-7'
          onClick={() => toggleExpanded(row.original.id)}
          aria-label={label}
          aria-expanded={isExpanded}
          title={label}
        >
          {isExpanded === true ? <ChevronUp className='size-4' /> : <ChevronDown className='size-4' />}
        </Button>
      );
    },
  };
}

function buildPersonaMemoryTitleColumn(): ColumnDef<PersonaMemoryRecord> {
  return {
    accessorKey: 'title',
    header: 'Memory',
    cell: ({ row }) => {
      const recordTypeLabel =
        row.original.recordType === 'conversation_message' ? 'Chat history' : 'Memory entry';
      return (
        <div className='flex flex-col gap-1'>
          <span className='font-medium text-white'>{formatPersonaMemoryPrimaryTitle(row.original)}</span>
          <span className='text-[10px] text-gray-500'>{recordTypeLabel}</span>
        </div>
      );
    },
  };
}

function buildPersonaMemoryOriginColumn(): ColumnDef<PersonaMemoryRecord> {
  return {
    accessorKey: 'sourceLabel',
    header: 'Origin',
    cell: ({ row }) => (
      <div className='text-xs text-gray-300'>
        <div>{formatPersonaMemoryOriginPrimaryLine(row.original)}</div>
        <div className='text-[10px] text-gray-500'>
          {formatPersonaMemoryOriginSourceTypeLabel(row.original)} | original{' '}
          {formatPersonaMemoryDate(row.original.sourceCreatedAt)}
        </div>
      </div>
    ),
  };
}

function buildPersonaMemorySignalsColumn(): ColumnDef<PersonaMemoryRecord> {
  return {
    accessorKey: 'tags',
    header: 'Signals',
    cell: ({ row }) => {
      const hasTags = row.original.tags.length > 0;
      const hasTopics = row.original.topicHints.length > 0;
      const hasMoods = row.original.moodHints.length > 0;
      const hasAny = hasTags === true || hasTopics === true || hasMoods === true;
      return (
        <div className='flex flex-wrap gap-1'>
          {row.original.tags.map((tagValue) => (
            <Tag key={`tag-${row.original.id}-${tagValue}`} label={tagValue} />
          ))}
          {row.original.topicHints.map((topicHint) => (
            <Tag
              key={`topic-${row.original.id}-${topicHint}`}
              label={`topic:${topicHint}`}
              color='#334155'
            />
          ))}
          {row.original.moodHints.map((moodHint) => (
            <Tag
              key={`mood-${row.original.id}-${moodHint}`}
              label={`mood:${moodHint}`}
              color='#1d4ed8'
            />
          ))}
          {hasAny === true ? null : <span className='text-xs text-gray-600'>None</span>}
        </div>
      );
    },
  };
}

function buildPersonaMemoryCapturedColumn(): ColumnDef<PersonaMemoryRecord> {
  return {
    accessorKey: 'updatedAt',
    header: 'Captured',
    cell: ({ row }) => (
      <span className='text-xs text-gray-400'>{formatPersonaMemoryDate(row.original.createdAt)}</span>
    ),
  };
}

export function useAgentPersonaMemoryColumns(
  expanded: Record<string, boolean>,
  toggleExpanded: (id: string) => void
): ColumnDef<PersonaMemoryRecord>[] {
  return useMemo(
    () => [
      buildPersonaMemoryExpanderColumn(expanded, toggleExpanded),
      buildPersonaMemoryTitleColumn(),
      buildPersonaMemoryOriginColumn(),
      buildPersonaMemorySignalsColumn(),
      buildPersonaMemoryCapturedColumn(),
    ],
    [expanded, toggleExpanded]
  );
}
