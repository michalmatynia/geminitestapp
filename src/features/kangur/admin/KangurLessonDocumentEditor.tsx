'use client';

import {
  ArrowDown,
  ArrowUp,
  Copy,
  Grid2x2,
  GripVertical,
  Image as ImageIcon,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import {
  cloneKangurLessonGridItem,
  convertKangurLessonRootBlockType,
  createKangurLessonGridBlockFromTemplate,
  createKangurLessonGridItem,
  createKangurLessonImageBlock,
  createKangurLessonSvgBlock,
  createKangurLessonTextBlock,
  resolveKangurLessonDocumentPages,
} from '@/features/kangur/lesson-documents';
import { KANGUR_LESSON_COMPONENT_OPTIONS } from '@/features/kangur/settings';
import type {
  KangurLessonCalloutBlock,
  KangurLessonGridItem,
  KangurLessonQuizBlock,
} from '@/features/kangur/shared/contracts/kangur';
import { Badge, Button, FormField, Input, SelectSimple, Switch, Textarea } from '@/features/kangur/shared/ui';
import { cn } from '@/features/kangur/shared/utils';

import { ActivityEditorCard } from './components/ActivityEditorCard';
import { CalloutEditorCard } from './components/CalloutEditorCard';
import { GridItemEditor } from './components/GridItemEditor';
import { InlineEditorCard } from './components/InlineEditorCard';
import { KangurAdminWorkspaceSectionCard } from './components/KangurAdminWorkspaceSectionCard';
import { KangurLessonEmptyState } from './components/KangurLessonEmptyState';
import { KangurLessonPreviewPanel } from './components/KangurLessonPreviewPanel';
import { KangurLessonQuickInsert } from './components/KangurLessonQuickInsert';
import { QuizEditorCard } from './components/QuizEditorCard';
import {
  DOCUMENT_TEMPLATE_OPTIONS,
  GRID_TEMPLATE_OPTIONS,
  ROOT_BLOCK_TYPE_OPTIONS,
} from './constants';
import { validateKangurLessonPageDraft } from './content-creator-insights';
import { useLessonContentEditorContext } from './context/LessonContentEditorContext';
import { useBlockListDnd } from './hooks/useBlockListDnd';
import { useKangurLessonMutations } from './hooks/useKangurLessonMutations';
import { useKangurStarterRecipes } from './hooks/useKangurStarterRecipes';
import {
  clamp,
  clampGridColumnStart,
  insertAfterIndex,
  moveItem,
  parseNumberInput,
} from './utils';

export function KangurLessonDocumentEditor(): React.JSX.Element {
  const { lesson, document: value, onChange } = useLessonContentEditorContext();
  const pages = resolveKangurLessonDocumentPages(value);
  const [activePageId, setActivePageId] = useState<string | null>(pages[0]?.id ?? null);
  useEffect(() => {
    if (!pages.some((page) => page.id === activePageId)) {
      setActivePageId(pages[0]?.id ?? null);
    }
  }, [activePageId, pages]);
  const activePage = pages.find((page) => page.id === activePageId) ?? pages[0] ?? null;
  const activePageIndex = activePage ? pages.findIndex((page) => page.id === activePage.id) : -1;
  const {
    updatePage,
    updateDocument,
    updateRootBlock,
    removeRootBlock,
    moveRootBlock,
    handleBlockReorder,
    duplicateRootBlock,
    updateGridBlock,
    replaceWithDocumentTemplate,
    addBlankPage,
    addPageFromTemplate,
    duplicateActivePage,
    moveActivePage,
    deleteActivePage,
  } = useKangurLessonMutations(
    value,
    onChange,
    activePage,
    pages,
    activePageIndex,
    setActivePageId
  );

  const { dragState, getHandlers } = useBlockListDnd({ onReorder: handleBlockReorder });
  const pageDraftReviews = useMemo(
    () =>
      new Map(
        pages.map((page) => [
          page.id,
          validateKangurLessonPageDraft(page),
        ])
      ),
    [pages]
  );
  const activePageReview = activePage ? pageDraftReviews.get(activePage.id) ?? null : null;
  const activePageNarrationCoverage = activePageReview?.narrationCoverage ?? null;
  const componentLabel =
    lesson?.componentId
      ? (KANGUR_LESSON_COMPONENT_OPTIONS.find((option) => option.value === lesson.componentId)?.label ??
        lesson.componentId)
      : null;
  const starterRecipes = useKangurStarterRecipes(
    lesson,
    activePage,
    updateDocument,
    addPageFromTemplate
  );



  return (
    <div className='grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]'>
      <div className='space-y-4'>
        <KangurAdminWorkspaceSectionCard
          title='Document workspace'
          description='Structure lesson pages, guide authors with starter recipes, and manage the active page without leaving the main Kangur admin layout.'
          badge='Authoring surface'
        >
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
            {lesson ? (
              <div className='mb-4 rounded-2xl border border-primary/20 bg-primary/10 p-4'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div>
                    <div className='text-sm font-semibold text-foreground'>
                      Starter recipes for {componentLabel}
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      Suggested first moves for this lesson type.
                    </div>
                  </div>
                  <Badge variant='outline' className='border-primary/20 text-foreground'>
                    guided start
                  </Badge>
                </div>
                <div className='mt-3 grid gap-2 lg:grid-cols-3'>
                  {starterRecipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      type='button'
                      onClick={recipe.onClick}
                      aria-label={`Use ${recipe.label}`}
                      className='flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-background/70 px-3 py-3 text-left transition hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
                    >
                      <div className='rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary'>
                        <Sparkles className='size-4' />
                      </div>
                      <div className='min-w-0'>
                        <div className='text-sm font-semibold text-foreground'>{recipe.label}</div>
                        <div className='mt-1 text-xs leading-relaxed text-muted-foreground'>
                          {recipe.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className='mb-3 flex items-center justify-between gap-2'>
              <div>
                <div className='text-sm font-semibold text-foreground'>Lesson pages</div>
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
                const pageReview = pageDraftReviews.get(page.id);
                const pageStatusLabel = pageReview?.isEmpty
                  ? 'Blank page'
                  : pageReview && pageReview.issueCount > 0
                    ? `${pageReview.issueCount} issue${pageReview.issueCount === 1 ? '' : 's'}`
                    : 'Ready';
                const pageNarrationLabel =
                  pageReview?.narrationCoverage.summaryLabel ?? 'Waiting for content';
                return (
                  <button
                    key={page.id}
                    type='button'
                    onClick={(): void => setActivePageId(page.id)}
                    aria-pressed={isActive}
                    className={cn(
                      'rounded-2xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background',
                      isActive
                        ? 'border-primary/30 bg-primary/10 text-foreground shadow-sm'
                        : 'border-border/60 bg-background/60 text-muted-foreground hover:border-primary/20 hover:text-foreground'
                    )}
                  >
                    {sectionLabel ? (
                      <div className='text-[10px] font-semibold uppercase tracking-[0.14em] opacity-75'>
                        {sectionLabel}
                      </div>
                    ) : null}
                    <div className='text-sm font-semibold'>{pageLabel}</div>
                    <div className='mt-1 flex flex-wrap items-center gap-1.5'>
                      <div className='text-[11px] uppercase tracking-[0.14em] opacity-75'>
                        {page.blocks.length} blocks
                      </div>
                      <Badge
                        variant='outline'
                        className={cn(
                          'h-5 px-1.5 text-[10px] uppercase tracking-wide',
                          pageReview?.isEmpty
                            ? 'border-slate-500/40 text-slate-300'
                            : pageReview && pageReview.issueCount > 0
                              ? 'border-amber-400/40 text-amber-300'
                              : 'border-emerald-400/40 text-emerald-300'
                        )}
                      >
                        {pageStatusLabel}
                      </Badge>
                      <Badge
                        variant='outline'
                        className={cn(
                          'h-5 px-1.5 text-[10px] uppercase tracking-wide',
                          pageReview?.narrationCoverage.state === 'ready'
                            ? 'border-sky-400/40 text-sky-300'
                            : pageReview?.narrationCoverage.state === 'needs-review'
                              ? 'border-amber-400/40 text-amber-300'
                              : 'border-slate-500/40 text-slate-300'
                        )}
                      >
                        {pageNarrationLabel}
                      </Badge>
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
                <ImageIcon className='mr-1 size-3.5' />
                Add SVG image page
              </Button>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='h-8 px-3'
                onClick={(): void => addPageFromTemplate('svg-gallery-page')}
              >
                <ImageIcon className='mr-1 size-3.5' />
                Add SVG page
              </Button>
            </div>
          </div>
          {activePage ? (
            <div className='mt-4 rounded-2xl border border-border/60 bg-card/30 p-4'>
              <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
                <div>
                  <div className='text-sm font-semibold text-foreground'>Active page</div>
                  <div className='text-xs text-muted-foreground'>
                    Use page metadata to mirror lesson hubs, slides, and summaries.
                  </div>
                </div>
                {activePageReview ? (
                  <Badge
                    variant='outline'
                    className={cn(
                      'shrink-0 text-[10px] uppercase tracking-wide',
                      activePageReview.isEmpty
                        ? 'border-slate-500/40 text-slate-300'
                        : activePageReview.issueCount > 0
                          ? 'border-amber-400/40 text-amber-300'
                          : 'border-emerald-400/40 text-emerald-300'
                    )}
                  >
                    {activePageReview.isEmpty
                      ? 'Blank page'
                      : activePageReview.issueCount > 0
                        ? `${activePageReview.issueCount} issue${activePageReview.issueCount === 1 ? '' : 's'}`
                        : 'Ready'}
                  </Badge>
                ) : null}
                <div className='flex items-center gap-1'>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-8 px-2'
                    onClick={duplicateActivePage}
                    aria-label='Duplicate active page'
                    title={'Duplicate active page'}>
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
                    title={'Move active page up'}>
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
                    title={'Move active page down'}>
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
                    title={'Delete active page'}>
                    <Trash2 className='size-3.5' />
                  </Button>
                </div>
              </div>
              {activePageReview && activePageReview.issueCount > 0 ? (
                <div className='mb-3 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90'>
                  {activePageReview.warnings[0]}
                </div>
              ) : null}
              {activePageNarrationCoverage ? (
                <div
                  className={cn(
                    'mb-3 rounded-xl border px-3 py-2 text-xs',
                    activePageNarrationCoverage.state === 'ready'
                      ? 'border-sky-400/20 bg-sky-500/10 text-sky-100/90'
                      : activePageNarrationCoverage.state === 'needs-review'
                        ? 'border-amber-400/20 bg-amber-500/10 text-amber-100/90'
                        : 'border-border/60 bg-background/70 text-muted-foreground'
                  )}
                >
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='font-semibold uppercase tracking-[0.14em]'>
                      Narration on this page
                    </span>
                    <Badge
                      variant='outline'
                      className={cn(
                        'h-5 px-1.5 text-[10px] uppercase tracking-wide',
                        activePageNarrationCoverage.state === 'ready'
                          ? 'border-sky-400/40 text-sky-300'
                          : activePageNarrationCoverage.state === 'needs-review'
                            ? 'border-amber-400/40 text-amber-300'
                            : 'border-slate-500/40 text-slate-300'
                      )}
                    >
                      {activePageNarrationCoverage.summaryLabel}
                    </Badge>
                  </div>
                  <div className='mt-2 leading-relaxed'>{activePageNarrationCoverage.detail}</div>
                </div>
              ) : null}
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
                   aria-label='Optional stable section id' title='Optional stable section id'/>
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
                   aria-label='Optional section heading' title='Optional section heading'/>
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
                   aria-label='Optional summary shared by this section' title='Optional summary shared by this section'/>
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
                   aria-label='Optional page title' title='Optional page title'/>
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
                   aria-label='Optional summary or instructions for this page' title='Optional summary or instructions for this page'/>
                </FormField>
              </div>
            </div>
          ) : null}
          <KangurLessonQuickInsert activePage={activePage} updateDocument={updateDocument} />
          <div className='mt-3 text-xs text-muted-foreground'>
            Build lesson pages from typed blocks. Mix explanation, SVG references, interactive
            activities, and responsive layouts without switching tools.
          </div>
        </KangurAdminWorkspaceSectionCard>
        <KangurLessonEmptyState activePage={activePage} updateDocument={updateDocument} />
        {activePage?.blocks.map((block, index) => {
          const handlers = getHandlers(block.id);
          const isDragged = dragState.draggedBlockId === block.id;
          const isTarget = dragState.targetBlockId === block.id;
          return (
            <div
              key={block.id}
              className={cn(
                'relative rounded-[28px] border border-border/60 bg-card/50 p-4 transition-opacity',
                isDragged && 'opacity-40 ring-2 ring-indigo-300'
              )}
            >
              {isTarget && dragState.position === 'before' ? (
                <div className='absolute inset-x-0 -top-0.5 h-0.5 rounded-full bg-indigo-500' />
              ) : null}
              {isTarget && dragState.position === 'after' ? (
                <div className='absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-indigo-500' />
              ) : null}
              <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
                <div className='flex items-center gap-2'>
                  <div
                    {...handlers}
                    className='cursor-grab touch-none text-muted-foreground hover:text-white active:cursor-grabbing'
                    aria-label={`Drag block ${index + 1}`}
                  >
                    <GripVertical className='size-4' />
                  </div>
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
                    title={`Duplicate block ${index + 1}`}>
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
                    title={`Move block ${index + 1} up`}>
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
                    title={`Move block ${index + 1} down`}>
                    <ArrowDown className='size-3.5' />
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-8 px-2 text-rose-600'
                    onClick={(): void => removeRootBlock(block.id)}
                    aria-label={`Delete block ${index + 1}`}
                    title={`Delete block ${index + 1}`}>
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
                       aria-label='Columns' title='Columns'/>
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
                       aria-label='Gap' title='Gap'/>
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
                       aria-label='Row Height' title='Row Height'/>
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
              ) : block.type === 'callout' ? (
                <CalloutEditorCard
                  block={block}
                  onChange={(nextBlock: KangurLessonCalloutBlock): void => {
                    updateRootBlock(block.id, nextBlock);
                  }}
                />
              ) : block.type === 'quiz' ? (
                <QuizEditorCard
                  block={block}
                  onChange={(nextBlock: KangurLessonQuizBlock): void => {
                    updateRootBlock(block.id, nextBlock);
                  }}
                />
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
                        options={ROOT_BLOCK_TYPE_OPTIONS}
                        triggerClassName='h-9'
                       ariaLabel='Block Type' title='Block Type'/>
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
          );
        })}
      </div>
      <KangurLessonPreviewPanel document={value} activePageId={activePageId} />
    </div>
  );
}
