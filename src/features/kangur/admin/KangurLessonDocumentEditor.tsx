'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Grid2x2, Image, Plus, Trash2, Type } from 'lucide-react';

import {
  cloneKangurLessonGridItem,
  cloneKangurLessonPage,
  cloneKangurLessonRootBlock,
  convertKangurLessonRootBlockType,
  createKangurLessonDocumentFromTemplate,
  createKangurLessonActivityBlock,
  createKangurLessonGridBlock,
  createKangurLessonGridBlockFromTemplate,
  createKangurLessonGridItem,
  createKangurLessonImageBlock,
  createKangurLessonPage,
  createKangurLessonSvgBlock,
  createKangurLessonTextBlock,
  resolveKangurLessonDocumentPages,
  updateKangurLessonDocumentPages,
  type KangurLessonDocumentTemplateId,
} from '@/features/kangur/lesson-documents';
import { KangurLessonDocumentRenderer } from '@/features/kangur/ui/components/KangurLessonDocumentRenderer';
import type {
  KangurLessonGridBlock,
  KangurLessonGridItem,
  KangurLessonPage,
  KangurLessonRootBlock,
} from '@/shared/contracts/kangur';
import { Badge, Button, FormField, Input, SelectSimple, Switch, Textarea } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { ActivityEditorCard } from './components/ActivityEditorCard';
import { GridItemEditor } from './components/GridItemEditor';
import { InlineEditorCard } from './components/InlineEditorCard';
import {
  DOCUMENT_TEMPLATE_OPTIONS,
  GRID_TEMPLATE_OPTIONS,
  ROOT_BLOCK_TYPE_OPTIONS,
} from './constants';
import { clamp, clampGridColumnStart, insertAfterIndex, moveItem, parseNumberInput } from './utils';
import { useLessonContentEditorContext } from './context/LessonContentEditorContext';

const resolvePageSectionOptions = (
  page: KangurLessonPage | null
): {
  sectionKey?: string;
  sectionTitle?: string;
  sectionDescription?: string;
} => ({
  sectionKey: page?.sectionKey?.trim() || '',
  sectionTitle: page?.sectionTitle?.trim() || '',
  sectionDescription: page?.sectionDescription?.trim() || '',
});

export function KangurLessonDocumentEditor(): React.JSX.Element {
  const { document: value, onChange } = useLessonContentEditorContext();
  const pages = resolveKangurLessonDocumentPages(value);
  const [activePageId, setActivePageId] = useState<string | null>(pages[0]?.id ?? null);

  useEffect(() => {
    if (!pages.some((page) => page.id === activePageId)) {
      setActivePageId(pages[0]?.id ?? null);
    }
  }, [activePageId, pages]);

  const activePage = pages.find((page) => page.id === activePageId) ?? pages[0] ?? null;
  const activePageIndex = activePage ? pages.findIndex((page) => page.id === activePage.id) : -1;

  const applyPages = useCallback(
    (nextPages: KangurLessonPage[]): void => {
      const nextDocument = updateKangurLessonDocumentPages(value, nextPages);
      onChange({
        ...nextDocument,
        updatedAt: new Date().toISOString(),
      });
    },
    [onChange, value]
  );

  const updatePage = useCallback(
    (pageId: string, updater: (page: KangurLessonPage) => KangurLessonPage): void => {
      applyPages(pages.map((page) => (page.id === pageId ? updater(page) : page)));
    },
    [applyPages, pages]
  );

  const updateDocument = useCallback(
    (nextBlocks: KangurLessonRootBlock[]): void => {
      if (!activePage) return;
      updatePage(activePage.id, (page) => ({
        ...page,
        blocks: nextBlocks,
      }));
    },
    [activePage, updatePage]
  );

  const updateRootBlock = useCallback(
    (blockId: string, nextBlock: KangurLessonRootBlock): void => {
      if (!activePage) return;
      updateDocument(activePage.blocks.map((block) => (block.id === blockId ? nextBlock : block)));
    },
    [activePage, updateDocument]
  );

  const removeRootBlock = useCallback(
    (blockId: string): void => {
      if (!activePage) return;
      updateDocument(activePage.blocks.filter((block) => block.id !== blockId));
    },
    [activePage, updateDocument]
  );

  const moveRootBlock = useCallback(
    (fromIndex: number, toIndex: number): void => {
      if (!activePage) return;
      updateDocument(moveItem(activePage.blocks, fromIndex, toIndex));
    },
    [activePage, updateDocument]
  );

  const duplicateRootBlock = useCallback(
    (index: number): void => {
      if (!activePage) return;
      const blockToClone = activePage.blocks[index];
      if (!blockToClone) return;
      updateDocument(
        insertAfterIndex(activePage.blocks, index, cloneKangurLessonRootBlock(blockToClone))
      );
    },
    [activePage, updateDocument]
  );

  const updateGridBlock = useCallback(
    (blockId: string, updater: (block: KangurLessonGridBlock) => KangurLessonGridBlock): void => {
      if (!activePage) return;
      updateDocument(
        activePage.blocks.map((block) => {
          if (block.id !== blockId || block.type !== 'grid') return block;
          return updater(block);
        })
      );
    },
    [activePage, updateDocument]
  );

  const replaceWithDocumentTemplate = useCallback(
    (templateId: KangurLessonDocumentTemplateId): void => {
      const nextDocument = createKangurLessonDocumentFromTemplate(templateId);
      onChange({
        ...nextDocument,
        updatedAt: new Date().toISOString(),
      });
      setActivePageId(resolveKangurLessonDocumentPages(nextDocument)[0]?.id ?? null);
    },
    [onChange]
  );

  const insertPageAfterActive = useCallback(
    (nextPage: KangurLessonPage): void => {
      if (activePageIndex >= 0) {
        applyPages(insertAfterIndex(pages, activePageIndex, nextPage));
      } else {
        applyPages([...pages, nextPage]);
      }
      setActivePageId(nextPage.id);
    },
    [activePageIndex, applyPages, pages]
  );

  const addBlankPage = useCallback((): void => {
    const nextPage = createKangurLessonPage('', [], resolvePageSectionOptions(activePage));
    insertPageAfterActive(nextPage);
  }, [activePage, insertPageAfterActive]);

  const addPageFromTemplate = useCallback(
    (templateId: KangurLessonDocumentTemplateId): void => {
      const templatePage =
        resolveKangurLessonDocumentPages(createKangurLessonDocumentFromTemplate(templateId))[0] ??
        createKangurLessonPage('', []);
      const nextPage = {
        ...cloneKangurLessonPage(templatePage),
        ...resolvePageSectionOptions(activePage),
      };
      insertPageAfterActive(nextPage);
    },
    [activePage, insertPageAfterActive]
  );

  const duplicateActivePage = useCallback((): void => {
    if (activePageIndex < 0 || !activePage) return;
    const nextPage = cloneKangurLessonPage(activePage);
    applyPages(insertAfterIndex(pages, activePageIndex, nextPage));
    setActivePageId(nextPage.id);
  }, [activePage, activePageIndex, applyPages, pages]);

  const moveActivePage = useCallback(
    (toIndex: number): void => {
      if (activePageIndex < 0 || !activePage) return;
      applyPages(moveItem(pages, activePageIndex, toIndex));
      setActivePageId(activePage.id);
    },
    [activePage, activePageIndex, applyPages, pages]
  );

  const deleteActivePage = useCallback((): void => {
    if (!activePage || pages.length <= 1) return;
    const nextPages = pages.filter((page) => page.id !== activePage.id);
    applyPages(nextPages);
    setActivePageId(nextPages[Math.max(0, activePageIndex - 1)]?.id ?? nextPages[0]?.id ?? null);
  }, [activePage, activePageIndex, applyPages, pages]);

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

          <div className='rounded-2xl border border-border/60 bg-card/30 p-4'>
            <div className='mb-3 flex items-center justify-between gap-2'>
              <div>
                <div className='text-sm font-semibold text-white'>Lesson pages</div>
                <div className='text-xs text-muted-foreground'>
                  Build multi-step lessons that can absorb your existing slides and layouts.
                </div>
              </div>
              <Badge variant='outline'>{pages.length} pages</Badge>
            </div>

            <div className='flex flex-wrap gap-2'>
              {pages.map((page, index) => {
                const isActive = page.id === activePage?.id;
                const pageLabel = page.title?.trim() || `Page ${index + 1}`;
                const sectionLabel = page.sectionTitle?.trim();

                return (
                  <button
                    key={page.id}
                    type='button'
                    onClick={(): void => setActivePageId(page.id)}
                    className={cn(
                      'rounded-2xl border px-3 py-2 text-left transition',
                      isActive
                        ? 'border-indigo-300 bg-indigo-500/15 text-white shadow-sm'
                        : 'border-border/60 bg-card/20 text-muted-foreground hover:border-indigo-200 hover:text-white'
                    )}
                  >
                    {sectionLabel ? (
                      <div className='text-[10px] font-semibold uppercase tracking-[0.14em] opacity-75'>
                        {sectionLabel}
                      </div>
                    ) : null}
                    <div className='text-sm font-semibold'>{pageLabel}</div>
                    <div className='text-[11px] uppercase tracking-[0.14em] opacity-75'>
                      {page.blocks.length} blocks
                    </div>
                  </button>
                );
              })}
            </div>

            <div className='mt-3 flex flex-wrap gap-2'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='h-8 px-3'
                onClick={addBlankPage}
              >
                <Plus className='mr-1 size-3.5' />
                New page
              </Button>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='h-8 px-3'
                onClick={(): void => addPageFromTemplate('text-with-figure')}
              >
                <Grid2x2 className='mr-1 size-3.5' />
                Add figure page
              </Button>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='h-8 px-3'
                onClick={(): void => addPageFromTemplate('image-gallery-page')}
              >
                <Image className='mr-1 size-3.5' />
                Add SVG image page
              </Button>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='h-8 px-3'
                onClick={(): void => addPageFromTemplate('svg-gallery-page')}
              >
                <Image className='mr-1 size-3.5' />
                Add SVG page
              </Button>
            </div>
          </div>

          {activePage ? (
            <div className='mt-4 rounded-2xl border border-border/60 bg-card/30 p-4'>
              <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
                <div>
                  <div className='text-sm font-semibold text-white'>Active page</div>
                  <div className='text-xs text-muted-foreground'>
                    Use page metadata to mirror lesson hubs, slides, and summaries.
                  </div>
                </div>
                <div className='flex items-center gap-1'>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-8 px-2'
                    onClick={duplicateActivePage}
                    aria-label='Duplicate active page'
                  >
                    <Copy className='size-3.5' />
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-8 px-2'
                    onClick={(): void => moveActivePage(activePageIndex - 1)}
                    disabled={activePageIndex <= 0}
                    aria-label='Move active page up'
                  >
                    <ArrowUp className='size-3.5' />
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-8 px-2'
                    onClick={(): void => moveActivePage(activePageIndex + 1)}
                    disabled={activePageIndex < 0 || activePageIndex >= pages.length - 1}
                    aria-label='Move active page down'
                  >
                    <ArrowDown className='size-3.5' />
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-8 px-2 text-rose-600'
                    onClick={deleteActivePage}
                    disabled={pages.length <= 1}
                    aria-label='Delete active page'
                  >
                    <Trash2 className='size-3.5' />
                  </Button>
                </div>
              </div>

              <div className='grid gap-3 md:grid-cols-2'>
                <FormField label='Section Key'>
                  <Input
                    value={activePage.sectionKey ?? ''}
                    onChange={(event): void => {
                      updatePage(activePage.id, (page) => ({
                        ...page,
                        sectionKey: event.target.value,
                      }));
                    }}
                    placeholder='Optional stable section id'
                    className='h-9'
                  />
                </FormField>

                <FormField label='Section Title'>
                  <Input
                    value={activePage.sectionTitle ?? ''}
                    onChange={(event): void => {
                      updatePage(activePage.id, (page) => ({
                        ...page,
                        sectionTitle: event.target.value,
                      }));
                    }}
                    placeholder='Optional section heading'
                    className='h-9'
                  />
                </FormField>

                <FormField label='Section Description'>
                  <Textarea
                    value={activePage.sectionDescription ?? ''}
                    onChange={(event): void => {
                      updatePage(activePage.id, (page) => ({
                        ...page,
                        sectionDescription: event.target.value,
                      }));
                    }}
                    placeholder='Optional summary shared by this section'
                    className='min-h-[96px]'
                  />
                </FormField>

                <FormField label='Page Title'>
                  <Input
                    value={activePage.title ?? ''}
                    onChange={(event): void => {
                      updatePage(activePage.id, (page) => ({
                        ...page,
                        title: event.target.value,
                      }));
                    }}
                    placeholder='Optional page title'
                    className='h-9'
                  />
                </FormField>

                <FormField label='Page Description'>
                  <Textarea
                    value={activePage.description ?? ''}
                    onChange={(event): void => {
                      updatePage(activePage.id, (page) => ({
                        ...page,
                        description: event.target.value,
                      }));
                    }}
                    placeholder='Optional summary or instructions for this page'
                    className='min-h-[96px]'
                  />
                </FormField>
              </div>
            </div>
          ) : null}

          <div className='mb-3 mt-4 flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-3'
              onClick={(): void =>
                updateDocument([...(activePage?.blocks ?? []), createKangurLessonTextBlock()])
              }
              disabled={!activePage}
            >
              <Type className='mr-1 size-3.5' />
              Add text block
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-3'
              onClick={(): void =>
                updateDocument([...(activePage?.blocks ?? []), createKangurLessonSvgBlock()])
              }
              disabled={!activePage}
            >
              <Image className='mr-1 size-3.5' />
              Add SVG block
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-3'
              onClick={(): void =>
                updateDocument([...(activePage?.blocks ?? []), createKangurLessonImageBlock()])
              }
              disabled={!activePage}
            >
              <Image className='mr-1 size-3.5' />
              Add SVG image block
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-3'
              onClick={(): void =>
                updateDocument([...(activePage?.blocks ?? []), createKangurLessonActivityBlock()])
              }
              disabled={!activePage}
            >
              <Plus className='mr-1 size-3.5' />
              Add activity block
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-3'
              onClick={(): void =>
                updateDocument([...(activePage?.blocks ?? []), createKangurLessonGridBlock()])
              }
              disabled={!activePage}
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
                updateDocument([
                  ...(activePage?.blocks ?? []),
                  createKangurLessonGridBlockFromTemplate('hero-left'),
                ])
              }
              disabled={!activePage}
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
                updateDocument([
                  ...(activePage?.blocks ?? []),
                  createKangurLessonGridBlockFromTemplate('image-gallery'),
                ])
              }
              disabled={!activePage}
            >
              <Image className='mr-1 size-3.5' />
              Add SVG image gallery
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-3'
              onClick={(): void =>
                updateDocument([
                  ...(activePage?.blocks ?? []),
                  createKangurLessonGridBlockFromTemplate('image-mosaic'),
                ])
              }
              disabled={!activePage}
            >
              <Grid2x2 className='mr-1 size-3.5' />
              Add SVG image mosaic
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-3'
              onClick={(): void =>
                updateDocument([
                  ...(activePage?.blocks ?? []),
                  createKangurLessonGridBlockFromTemplate('svg-gallery'),
                ])
              }
              disabled={!activePage}
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
                updateDocument([
                  ...(activePage?.blocks ?? []),
                  createKangurLessonGridBlockFromTemplate('svg-mosaic'),
                ])
              }
              disabled={!activePage}
            >
              <Grid2x2 className='mr-1 size-3.5' />
              Add SVG mosaic
            </Button>
          </div>
          <div className='text-xs text-muted-foreground'>
            Build lesson pages from typed blocks. Mix text, SVG image references, interactive
            activities, and responsive grid layouts.
          </div>
        </div>

        {activePage?.blocks.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-border/70 bg-card/20 p-6 text-sm text-muted-foreground'>
            This page has no content yet. Add a text, SVG, SVG image, activity, or grid block.
          </div>
        ) : null}

        {activePage?.blocks.map((block, index) => (
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
                  disabled={index === activePage.blocks.length - 1}
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
                        const nextColumns = clamp(
                          parseNumberInput(event.target.value, block.columns),
                          1,
                          4
                        );
                        updateGridBlock(block.id, (currentBlock) => ({
                          ...currentBlock,
                          columns: nextColumns,
                          items: currentBlock.items.map((item: KangurLessonGridItem) => ({
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
                          rowHeight: clamp(
                            parseNumberInput(event.target.value, currentBlock.rowHeight),
                            120,
                            480
                          ),
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
                        items: [
                          ...currentBlock.items,
                          createKangurLessonGridItem(createKangurLessonTextBlock()),
                        ],
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
                        items: [
                          ...currentBlock.items,
                          createKangurLessonGridItem(createKangurLessonSvgBlock()),
                        ],
                      }));
                    }}
                  >
                    <Plus className='mr-1 size-3.5' />
                    Add grid SVG
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-8 px-3'
                    onClick={(): void => {
                      updateGridBlock(block.id, (currentBlock) => ({
                        ...currentBlock,
                        items: [
                          ...currentBlock.items,
                          createKangurLessonGridItem(createKangurLessonImageBlock()),
                        ],
                      }));
                    }}
                  >
                    <Plus className='mr-1 size-3.5' />
                    Add grid image
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
                          items: currentBlock.items.filter(
                            (candidate: KangurLessonGridItem) => candidate.id !== item.id
                          ),
                        }));
                      }}
                      onChange={(nextItem): void => {
                        updateGridBlock(block.id, (currentBlock) => ({
                          ...currentBlock,
                          items: currentBlock.items.map((candidate: KangurLessonGridItem) =>
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
                        if (
                          nextValue !== 'text' &&
                          nextValue !== 'svg' &&
                          nextValue !== 'image' &&
                          nextValue !== 'activity'
                        ) {
                          return;
                        }
                        updateRootBlock(
                          block.id,
                          convertKangurLessonRootBlockType(block, nextValue)
                        );
                      }}
                      options={ROOT_BLOCK_TYPE_OPTIONS.map((option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                      triggerClassName='h-9'
                    />
                  </FormField>
                </div>

                {block.type === 'activity' ? (
                  <ActivityEditorCard
                    block={block}
                    onChange={(nextBlock): void => {
                      updateRootBlock(block.id, nextBlock);
                    }}
                  />
                ) : (
                  <InlineEditorCard
                    block={block}
                    onChange={(nextBlock): void => {
                      updateRootBlock(block.id, nextBlock);
                    }}
                    heading='Block content'
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className='sticky top-4 hidden h-[calc(100vh-2rem)] flex-col gap-4 overflow-hidden rounded-2xl border border-border/60 bg-card/20 xl:flex'>
        <div className='flex items-center justify-between border-b border-border/60 bg-card/40 px-4 py-3 backdrop-blur-md'>
          <div className='text-sm font-semibold text-white'>Preview</div>
          <div className='text-xs text-muted-foreground'>Live preview (100% width)</div>
        </div>
        <div className='flex-1 overflow-y-auto p-4 scrollbar-thin'>
          <div className='mx-auto max-w-2xl overflow-hidden rounded-xl border border-border/40 bg-white shadow-sm'>
            <KangurLessonDocumentRenderer document={value} activePageId={activePageId} />
          </div>
        </div>
      </div>
    </div>
  );
}
