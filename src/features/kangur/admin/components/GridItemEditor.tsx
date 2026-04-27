import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import React from 'react';

import { convertKangurLessonInlineBlockType } from '@/features/kangur/lesson-documents';
import type { KangurLessonGridItem } from '@/features/kangur/shared/contracts/kangur';
import { Badge, Button, FormField, Input, SelectSimple } from '@/features/kangur/shared/ui';

import { INLINE_BLOCK_TYPE_OPTIONS } from '../constants';
import {
  clamp,
  clampGridColumnStart,
  parseNumberInput,
  parseOptionalNumberInput,
  resolveInlineAccent,
} from '../utils';
import { InlineEditorCard } from './InlineEditorCard';

export function GridItemEditor(props: {
  item: KangurLessonGridItem;
  index: number;
  itemCount: number;
  columns: number;
  onChange: (nextValue: KangurLessonGridItem) => void;
  onDuplicate: () => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onDelete: () => void;
}): React.JSX.Element {
  const { item, index, itemCount, columns, onChange, onDuplicate, onMove, onDelete } = props;

  return (
    <div className='rounded-2xl border border-violet-200/80 bg-white/85 p-4'>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <div className='text-sm font-semibold text-slate-800'>Grid item {index + 1}</div>
          <Badge variant='outline' className='text-[10px] uppercase tracking-wide'>
            {item.block.type}
          </Badge>
        </div>
        <div className='flex items-center gap-1'>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-8 px-2'
            onClick={onDuplicate}
            aria-label={`Duplicate grid item ${index + 1}`}
            title={`Duplicate grid item ${index + 1}`}>
            <Copy className='size-3.5' />
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-8 px-2'
            onClick={(): void => onMove(index, index - 1)}
            disabled={index === 0}
            aria-label={`Move grid item ${index + 1} up`}
            title={`Move grid item ${index + 1} up`}>
            <ArrowUp className='size-3.5' />
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-8 px-2'
            onClick={(): void => onMove(index, index + 1)}
            disabled={index === itemCount - 1}
            aria-label={`Move grid item ${index + 1} down`}
            title={`Move grid item ${index + 1} down`}>
            <ArrowDown className='size-3.5' />
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-8 px-2 text-rose-600'
            onClick={onDelete}
            aria-label={`Delete grid item ${index + 1}`}
            title={`Delete grid item ${index + 1}`}>
            <Trash2 className='size-3.5' />
          </Button>
        </div>
      </div>

      <div className='mb-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5'>
        <FormField label='Item Type'>
          <SelectSimple
            size='sm'
            value={item.block.type}
            onValueChange={(nextValue: string): void => {
              if (nextValue !== 'text' && nextValue !== 'svg' && nextValue !== 'image') return;
              onChange({
                ...item,
                block: convertKangurLessonInlineBlockType(item.block, nextValue),
              });
            }}
            options={INLINE_BLOCK_TYPE_OPTIONS}
            triggerClassName='h-9'
            ariaLabel={`Grid item ${index + 1} type`}
           title='Item Type'/>
        </FormField>

        <FormField label='Column Span'>
          <Input
            type='number'
            min={1}
            max={columns}
            value={String(item.colSpan)}
            onChange={(event): void => {
              const nextColSpan = clamp(
                parseNumberInput(event.target.value, item.colSpan),
                1,
                columns
              );
              onChange({
                ...item,
                colSpan: nextColSpan,
                columnStart: clampGridColumnStart(item.columnStart, nextColSpan, columns),
              });
            }}
            className='h-9'
           aria-label='Column Span' title='Column Span'/>
        </FormField>

        <FormField label='Row Span'>
          <Input
            type='number'
            min={1}
            max={4}
            value={String(item.rowSpan)}
            onChange={(event): void => {
              onChange({
                ...item,
                rowSpan: clamp(parseNumberInput(event.target.value, item.rowSpan), 1, 4),
              });
            }}
            className='h-9'
           aria-label='Row Span' title='Row Span'/>
        </FormField>

        <FormField label='Column Start'>
          <Input
            type='number'
            min={1}
            max={columns}
            value={item.columnStart === null ? '' : String(item.columnStart)}
            placeholder='Auto'
            onChange={(event): void => {
              onChange({
                ...item,
                columnStart: clampGridColumnStart(
                  parseOptionalNumberInput(event.target.value, 1, columns),
                  item.colSpan,
                  columns
                ),
              });
            }}
            className='h-9'
           aria-label='Column Start' title='Column Start'/>
        </FormField>

        <FormField label='Row Start'>
          <Input
            type='number'
            min={1}
            max={12}
            value={item.rowStart === null ? '' : String(item.rowStart)}
            placeholder='Auto'
            onChange={(event): void => {
              onChange({
                ...item,
                rowStart: parseOptionalNumberInput(event.target.value, 1, 12),
              });
            }}
            className='h-9'
           aria-label='Row Start' title='Row Start'/>
        </FormField>
      </div>

      <InlineEditorCard
        block={item.block}
        onChange={(nextBlock): void => {
          onChange({ ...item, block: nextBlock });
        }}
        heading='Grid item content'
        accent={resolveInlineAccent(item.block.type)}
      />
    </div>
  );
}
