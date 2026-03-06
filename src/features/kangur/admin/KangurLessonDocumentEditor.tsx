'use client';

import { DocumentWysiwygEditor } from '@/features/document-editor';
import {
  cloneKangurLessonGridItem,
  cloneKangurLessonRootBlock,
  convertKangurLessonInlineBlockType,
  createKangurLessonDocumentFromTemplate,
  createKangurLessonGridBlock,
  createKangurLessonGridBlockFromTemplate,
  createKangurLessonGridItem,
  createKangurLessonSvgBlock,
  createKangurLessonTextBlock,
  type KangurLessonDocumentTemplateId,
  type KangurLessonGridTemplateId,
} from '@/features/kangur/lesson-documents';
import { KangurLessonDocumentRenderer } from '@/features/kangur/ui/components/KangurLessonDocumentRenderer';
import type {
  KangurLessonDocument,
  KangurLessonGridBlock,
  KangurLessonGridItem,
  KangurLessonInlineBlock,
  KangurLessonRootBlock,
} from '@/shared/contracts/kangur';
import { Badge, Button, FormField, Input, SelectSimple, Switch, Textarea } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { ArrowDown, ArrowUp, Copy, Grid2x2, Image, Plus, Trash2, Type } from 'lucide-react';
import React, { useCallback } from 'react';

type KangurLessonDocumentEditorProps = {
  value: KangurLessonDocument;
  onChange: (nextValue: KangurLessonDocument) => void;
};

const ALIGNMENT_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
] as const;

const SVG_FIT_OPTIONS = [
  { value: 'contain', label: 'Contain' },
  { value: 'cover', label: 'Cover' },
  { value: 'none', label: 'Natural' },
] as const;

const INLINE_BLOCK_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'svg', label: 'SVG' },
] as const;

const GRID_TEMPLATE_OPTIONS: Array<{
  id: KangurLessonGridTemplateId;
  label: string;
}> = [
  { id: 'two-column', label: '2 columns' },
  { id: 'three-column', label: '3 columns' },
  { id: 'hero-left', label: 'Hero left' },
  { id: 'hero-right', label: 'Hero right' },
  { id: 'svg-duo', label: 'SVG duo' },
  { id: 'svg-trio', label: 'SVG trio' },
  { id: 'svg-gallery', label: 'SVG gallery' },
  { id: 'svg-mosaic', label: 'SVG mosaic' },
] as const;

const DOCUMENT_TEMPLATE_OPTIONS: Array<{
  id: KangurLessonDocumentTemplateId;
  label: string;
}> = [
  { id: 'article', label: 'Article starter' },
  { id: 'text-with-figure', label: 'Text + figure' },
  { id: 'svg-gallery-page', label: 'SVG gallery page' },
  { id: 'svg-mosaic-page', label: 'SVG mosaic page' },
] as const;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const moveItem = <T,>(items: readonly T[], fromIndex: number, toIndex: number): T[] => {
  if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) {
    return [...items];
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  if (movedItem === undefined) {
    return [...items];
  }
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
};

const parseNumberInput = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampGridColumnStart = (
  columnStart: number | null,
  colSpan: number,
  columns: number
): number | null => {
  if (columnStart === null) {
    return null;
  }

  const maxColumnStart = Math.max(1, columns - colSpan + 1);
  return clamp(columnStart, 1, maxColumnStart);
};

const parseOptionalNumberInput = (value: string, min: number, max: number): number | null => {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return clamp(parsed, min, max);
};

const insertAfterIndex = <T,>(items: readonly T[], index: number, value: T): T[] => {
  const nextItems = [...items];
  nextItems.splice(index + 1, 0, value);
  return nextItems;
};

function InlineEditorCard(
  props: {
    block: KangurLessonInlineBlock;
    onChange: (nextValue: KangurLessonInlineBlock) => void;
    heading: string;
    accent?: 'text' | 'svg';
  }
): React.JSX.Element {
  const { block, onChange, heading, accent = 'text' } = props;

  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        accent === 'svg'
          ? 'border-sky-200/80 bg-sky-50/60'
          : 'border-indigo-200/80 bg-indigo-50/50'
      )}
    >
      <div className='mb-3 flex items-center justify-between gap-2'>
        <div className='text-sm font-semibold text-slate-800'>{heading}</div>
        <Badge variant='outline' className='text-[10px] uppercase tracking-wide'>
          {block.type}
        </Badge>
      </div>

      {block.type === 'text' ? (
        <div className='space-y-3'>
          <FormField label='Alignment'>
            <SelectSimple
              size='sm'
              value={block.align}
              onValueChange={(nextValue: string): void => {
                if (nextValue !== 'left' && nextValue !== 'center' && nextValue !== 'right') return;
                onChange({ ...block, align: nextValue });
              }}
              options={ALIGNMENT_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              triggerClassName='h-9'
            />
          </FormField>

          <FormField label='Text Content'>
            <DocumentWysiwygEditor
              value={block.html}
              onChange={(nextValue): void => {
                onChange({ ...block, html: nextValue });
              }}
              placeholder='Write the lesson text here...'
            />
          </FormField>

          <FormField label='Narration Override'>
            <Textarea
              value={block.ttsText ?? ''}
              onChange={(event): void => {
                onChange({ ...block, ttsText: event.target.value });
              }}
              placeholder='Optional spoken version for this block'
              className='min-h-[100px]'
            />
          </FormField>
        </div>
      ) : (
        <div className='space-y-3'>
          <div className='grid gap-3 md:grid-cols-2'>
            <FormField label='Title'>
              <Input
                value={block.title}
                onChange={(event): void => {
                  onChange({ ...block, title: event.target.value });
                }}
                placeholder='Optional SVG title'
                className='h-9'
              />
            </FormField>
            <FormField label='Alignment'>
              <SelectSimple
                size='sm'
                value={block.align}
                onValueChange={(nextValue: string): void => {
                  if (nextValue !== 'left' && nextValue !== 'center' && nextValue !== 'right') return;
                  onChange({ ...block, align: nextValue });
                }}
                options={ALIGNMENT_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                triggerClassName='h-9'
              />
            </FormField>
          </div>

          <div className='grid gap-3 md:grid-cols-3'>
            <FormField label='ViewBox'>
              <Input
                value={block.viewBox}
                onChange={(event): void => {
                  onChange({ ...block, viewBox: event.target.value });
                }}
                placeholder='0 0 100 100'
                className='h-9'
              />
            </FormField>

            <FormField label='Fit'>
              <SelectSimple
                size='sm'
                value={block.fit}
                onValueChange={(nextValue: string): void => {
                  if (nextValue !== 'contain' && nextValue !== 'cover' && nextValue !== 'none') return;
                  onChange({ ...block, fit: nextValue });
                }}
                options={SVG_FIT_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                triggerClassName='h-9'
              />
            </FormField>

            <FormField label='Max Width'>
              <Input
                type='number'
                min={120}
                max={1200}
                value={String(block.maxWidth)}
                onChange={(event): void => {
                  onChange({
                    ...block,
                    maxWidth: clamp(parseNumberInput(event.target.value, block.maxWidth), 120, 1200),
                  });
                }}
                className='h-9'
              />
            </FormField>
          </div>

          <FormField label='Narration Description'>
            <Textarea
              value={block.ttsDescription ?? ''}
              onChange={(event): void => {
                onChange({ ...block, ttsDescription: event.target.value });
              }}
              placeholder='Optional spoken description of this illustration'
              className='min-h-[100px]'
            />
          </FormField>

          <FormField label='SVG Markup'>
            <Textarea
              value={block.markup}
              onChange={(event): void => {
                onChange({ ...block, markup: event.target.value });
              }}
              placeholder='<svg viewBox="0 0 100 100">...</svg>'
              className='min-h-[220px] font-mono text-xs'
            />
          </FormField>
        </div>
      )}
    </div>
  );
}

function GridItemEditor(
  props: {
    item: KangurLessonGridItem;
    index: number;
    itemCount: number;
    columns: number;
    onChange: (nextValue: KangurLessonGridItem) => void;
    onDuplicate: () => void;
    onMove: (fromIndex: number, toIndex: number) => void;
    onDelete: () => void;
  }
): React.JSX.Element {
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
          >
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
          >
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
          >
            <ArrowDown className='size-3.5' />
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-8 px-2 text-rose-600'
            onClick={onDelete}
            aria-label={`Delete grid item ${index + 1}`}
          >
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
              if (nextValue !== 'text' && nextValue !== 'svg') return;
              onChange({
                ...item,
                block: convertKangurLessonInlineBlockType(item.block, nextValue),
              });
            }}
            options={INLINE_BLOCK_TYPE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            triggerClassName='h-9'
            ariaLabel={`Grid item ${index + 1} type`}
          />
        </FormField>

        <FormField label='Column Span'>
          <Input
            type='number'
            min={1}
            max={columns}
            value={String(item.colSpan)}
            onChange={(event): void => {
              const nextColSpan = clamp(parseNumberInput(event.target.value, item.colSpan), 1, columns);
              onChange({
                ...item,
                colSpan: nextColSpan,
                columnStart: clampGridColumnStart(item.columnStart, nextColSpan, columns),
              });
            }}
            className='h-9'
          />
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
          />
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
          />
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
          />
        </FormField>
      </div>

      <InlineEditorCard
        block={item.block}
        onChange={(nextBlock): void => {
          onChange({ ...item, block: nextBlock });
        }}
        heading='Grid item content'
        accent={item.block.type === 'svg' ? 'svg' : 'text'}
      />
    </div>
  );
}

export function KangurLessonDocumentEditor(
  props: KangurLessonDocumentEditorProps
): React.JSX.Element {
  const { value, onChange } = props;

  const updateDocument = useCallback(
    (nextBlocks: KangurLessonRootBlock[]): void => {
      onChange({
        ...value,
        blocks: nextBlocks,
        updatedAt: new Date().toISOString(),
      });
    },
    [onChange, value]
  );

  const updateRootBlock = useCallback(
    (blockId: string, nextBlock: KangurLessonRootBlock): void => {
      updateDocument(value.blocks.map((block) => (block.id === blockId ? nextBlock : block)));
    },
    [updateDocument, value.blocks]
  );

  const removeRootBlock = useCallback(
    (blockId: string): void => {
      updateDocument(value.blocks.filter((block) => block.id !== blockId));
    },
    [updateDocument, value.blocks]
  );

  const moveRootBlock = useCallback(
    (fromIndex: number, toIndex: number): void => {
      updateDocument(moveItem(value.blocks, fromIndex, toIndex));
    },
    [updateDocument, value.blocks]
  );

  const duplicateRootBlock = useCallback(
    (index: number): void => {
      const blockToClone = value.blocks[index];
      if (!blockToClone) return;
      updateDocument(insertAfterIndex(value.blocks, index, cloneKangurLessonRootBlock(blockToClone)));
    },
    [updateDocument, value.blocks]
  );

  const updateGridBlock = useCallback(
    (blockId: string, updater: (block: KangurLessonGridBlock) => KangurLessonGridBlock): void => {
      updateDocument(
        value.blocks.map((block) => {
          if (block.id !== blockId || block.type !== 'grid') return block;
          return updater(block);
        })
      );
    },
    [updateDocument, value.blocks]
  );

  const replaceWithDocumentTemplate = useCallback(
    (templateId: KangurLessonDocumentTemplateId): void => {
      const nextDocument = createKangurLessonDocumentFromTemplate(templateId);
      onChange({
        ...value,
        ...nextDocument,
        updatedAt: new Date().toISOString(),
      });
    },
    [onChange, value]
  );

  return (
    <div className='grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]'>
      <div className='space-y-4'>
        <div className='rounded-2xl border border-border/60 bg-card/40 p-4'>
          <div className='mb-3 flex flex-wrap items-center gap-2'>
            {DOCUMENT_TEMPLATE_OPTIONS.map((template) => (
              <Button
                key={template.id}
                type='button'
                size='sm'
                variant='outline'
                className='h-8 px-3'
                onClick={(): void => replaceWithDocumentTemplate(template.id)}
              >
                {template.label}
              </Button>
            ))}
          </div>
          <div className='mb-3 flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-3'
              onClick={(): void => updateDocument([...value.blocks, createKangurLessonTextBlock()])}
            >
              <Type className='mr-1 size-3.5' />
              Add text block
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-3'
              onClick={(): void => updateDocument([...value.blocks, createKangurLessonSvgBlock()])}
            >
              <Image className='mr-1 size-3.5' />
              Add SVG block
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-3'
              onClick={(): void => updateDocument([...value.blocks, createKangurLessonGridBlock()])}
            >
              <Grid2x2 className='mr-1 size-3.5' />
              Add grid block
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-3'
              onClick={(): void =>
                updateDocument([...value.blocks, createKangurLessonGridBlockFromTemplate('hero-left')])
              }
            >
              <Grid2x2 className='mr-1 size-3.5' />
              Add hero layout
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-3'
              onClick={(): void =>
                updateDocument([...value.blocks, createKangurLessonGridBlockFromTemplate('svg-gallery')])
              }
            >
              <Image className='mr-1 size-3.5' />
              Add SVG gallery
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-3'
              onClick={(): void =>
                updateDocument([...value.blocks, createKangurLessonGridBlockFromTemplate('svg-mosaic')])
              }
            >
              <Grid2x2 className='mr-1 size-3.5' />
              Add SVG mosaic
            </Button>
          </div>
          <div className='text-xs text-muted-foreground'>
            Build lesson pages from typed blocks. SVG is stored separately from text so layout stays predictable.
          </div>
        </div>

        {value.blocks.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-border/70 bg-card/20 p-6 text-sm text-muted-foreground'>
            No lesson content yet. Add a text, SVG, or grid block.
          </div>
        ) : null}

        {value.blocks.map((block, index) => (
          <div key={block.id} className='rounded-[28px] border border-border/60 bg-card/50 p-4'>
            <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
              <div className='flex items-center gap-2'>
                <Badge variant='outline' className='text-[10px] uppercase tracking-wide'>
                  {block.type}
                </Badge>
                <div className='text-sm font-semibold text-white'>Block {index + 1}</div>
              </div>
              <div className='flex items-center gap-1'>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-8 px-2'
                  onClick={(): void => duplicateRootBlock(index)}
                  aria-label={`Duplicate block ${index + 1}`}
                >
                  <Copy className='size-3.5' />
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-8 px-2'
                  onClick={(): void => moveRootBlock(index, index - 1)}
                  disabled={index === 0}
                  aria-label={`Move block ${index + 1} up`}
                >
                  <ArrowUp className='size-3.5' />
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-8 px-2'
                  onClick={(): void => moveRootBlock(index, index + 1)}
                  disabled={index === value.blocks.length - 1}
                  aria-label={`Move block ${index + 1} down`}
                >
                  <ArrowDown className='size-3.5' />
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-8 px-2 text-rose-600'
                  onClick={(): void => removeRootBlock(block.id)}
                  aria-label={`Delete block ${index + 1}`}
                >
                  <Trash2 className='size-3.5' />
                </Button>
              </div>
            </div>

            {block.type === 'grid' ? (
              <div className='space-y-4'>
                <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-5'>
                  <FormField label='Columns'>
                    <Input
                      type='number'
                      min={1}
                      max={4}
                      value={String(block.columns)}
                      onChange={(event): void => {
                        const nextColumns = clamp(parseNumberInput(event.target.value, block.columns), 1, 4);
                        updateGridBlock(block.id, (currentBlock) => ({
                          ...currentBlock,
                          columns: nextColumns,
                          items: currentBlock.items.map((item) => ({
                            ...item,
                            colSpan: clamp(item.colSpan, 1, nextColumns),
                            columnStart: clampGridColumnStart(
                              item.columnStart,
                              clamp(item.colSpan, 1, nextColumns),
                              nextColumns
                            ),
                          })),
                        }));
                      }}
                      className='h-9'
                    />
                  </FormField>

                  <FormField label='Gap'>
                    <Input
                      type='number'
                      min={0}
                      max={48}
                      value={String(block.gap)}
                      onChange={(event): void => {
                        updateGridBlock(block.id, (currentBlock) => ({
                          ...currentBlock,
                          gap: clamp(parseNumberInput(event.target.value, currentBlock.gap), 0, 48),
                        }));
                      }}
                      className='h-9'
                    />
                  </FormField>

                  <FormField label='Row Height'>
                    <Input
                      type='number'
                      min={120}
                      max={480}
                      value={String(block.rowHeight)}
                      onChange={(event): void => {
                        updateGridBlock(block.id, (currentBlock) => ({
                          ...currentBlock,
                          rowHeight: clamp(parseNumberInput(event.target.value, currentBlock.rowHeight), 120, 480),
                        }));
                      }}
                      className='h-9'
                    />
                  </FormField>

                  <div className='flex items-end'>
                    <div className='flex w-full items-center justify-between rounded-xl border border-border/60 bg-card/30 px-3 py-2'>
                      <div>
                        <div className='text-sm font-medium text-white'>Dense fill</div>
                        <div className='text-xs text-muted-foreground'>
                          Back-fill open grid slots when items span multiple rows or columns.
                        </div>
                      </div>
                      <Switch
                        checked={block.denseFill}
                        onCheckedChange={(checked: boolean): void => {
                          updateGridBlock(block.id, (currentBlock) => ({
                            ...currentBlock,
                            denseFill: checked,
                          }));
                        }}
                      />
                    </div>
                  </div>

                  <div className='flex items-end'>
                    <div className='flex w-full items-center justify-between rounded-xl border border-border/60 bg-card/30 px-3 py-2'>
                      <div>
                        <div className='text-sm font-medium text-white'>Stack on mobile</div>
                        <div className='text-xs text-muted-foreground'>
                          Collapse the grid to one column on small screens.
                        </div>
                      </div>
                      <Switch
                        checked={block.stackOnMobile}
                        onCheckedChange={(checked: boolean): void => {
                          updateGridBlock(block.id, (currentBlock) => ({
                            ...currentBlock,
                            stackOnMobile: checked,
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className='flex flex-wrap items-center gap-2'>
                  {GRID_TEMPLATE_OPTIONS.map((template) => (
                    <Button
                      key={template.id}
                      type='button'
                      size='sm'
                      variant='outline'
                      className='h-8 px-3'
                      onClick={(): void => {
                        updateRootBlock(block.id, {
                          ...createKangurLessonGridBlockFromTemplate(template.id),
                          id: block.id,
                        });
                      }}
                    >
                      {template.label}
                    </Button>
                  ))}
                </div>

                <div className='flex flex-wrap items-center gap-2'>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-8 px-3'
                    onClick={(): void => {
                      updateGridBlock(block.id, (currentBlock) => ({
                        ...currentBlock,
                        items: [...currentBlock.items, createKangurLessonGridItem(createKangurLessonTextBlock())],
                      }));
                    }}
                  >
                    <Plus className='mr-1 size-3.5' />
                    Add grid text
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-8 px-3'
                    onClick={(): void => {
                      updateGridBlock(block.id, (currentBlock) => ({
                        ...currentBlock,
                        items: [...currentBlock.items, createKangurLessonGridItem(createKangurLessonSvgBlock())],
                      }));
                    }}
                  >
                    <Plus className='mr-1 size-3.5' />
                    Add grid SVG
                  </Button>
                </div>

                <div className='space-y-3'>
                  {block.items.map((item, itemIndex) => (
                    <GridItemEditor
                      key={item.id}
                      item={item}
                      index={itemIndex}
                      itemCount={block.items.length}
                      columns={block.columns}
                      onMove={(fromIndex, toIndex): void => {
                        updateGridBlock(block.id, (currentBlock) => ({
                          ...currentBlock,
                          items: moveItem(currentBlock.items, fromIndex, toIndex),
                        }));
                      }}
                      onDuplicate={(): void => {
                        updateGridBlock(block.id, (currentBlock) => ({
                          ...currentBlock,
                          items: insertAfterIndex(
                            currentBlock.items,
                            itemIndex,
                            cloneKangurLessonGridItem(item)
                          ),
                        }));
                      }}
                      onDelete={(): void => {
                        updateGridBlock(block.id, (currentBlock) => ({
                          ...currentBlock,
                          items: currentBlock.items.filter((candidate) => candidate.id !== item.id),
                        }));
                      }}
                      onChange={(nextItem): void => {
                        updateGridBlock(block.id, (currentBlock) => ({
                          ...currentBlock,
                          items: currentBlock.items.map((candidate) =>
                            candidate.id === item.id ? nextItem : candidate
                          ),
                        }));
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className='space-y-3'>
                <div className='max-w-[220px]'>
                  <FormField label='Block Type'>
                    <SelectSimple
                      size='sm'
                      value={block.type}
                      onValueChange={(nextValue: string): void => {
                        if (nextValue !== 'text' && nextValue !== 'svg') return;
                        updateRootBlock(block.id, convertKangurLessonInlineBlockType(block, nextValue));
                      }}
                      options={INLINE_BLOCK_TYPE_OPTIONS.map((option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                      triggerClassName='h-9'
                      ariaLabel={`Root block ${index + 1} type`}
                    />
                  </FormField>
                </div>
                <InlineEditorCard
                  block={block}
                  onChange={(nextValue): void => {
                    updateRootBlock(block.id, nextValue);
                  }}
                  heading={block.type === 'svg' ? 'SVG block' : 'Text block'}
                  accent={block.type === 'svg' ? 'svg' : 'text'}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className='space-y-3 xl:sticky xl:top-4 xl:self-start'>
        <div className='flex items-center justify-between rounded-2xl border border-border/60 bg-card/40 px-4 py-3'>
          <div>
            <div className='text-sm font-semibold text-white'>Live preview</div>
            <div className='text-xs text-muted-foreground'>Rendered lesson document output.</div>
          </div>
          <Badge variant='outline'>{value.blocks.length} blocks</Badge>
        </div>
        <div className='max-h-[75vh] overflow-auto rounded-[32px] border border-border/60 bg-gradient-to-br from-indigo-100 via-white to-sky-100 p-4'>
          <KangurLessonDocumentRenderer document={value} />
        </div>
      </div>
    </div>
  );
}
