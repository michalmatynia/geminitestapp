'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Grid2x2,
  GripVertical,
  Image,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Type,
} from 'lucide-react';

import {
  cloneKangurLessonGridItem,
  cloneKangurLessonPage,
  cloneKangurLessonRootBlock,
  convertKangurLessonRootBlockType,
  createKangurLessonDocumentFromTemplate,
  createKangurLessonActivityBlock,
  createKangurLessonCalloutBlock,
  createKangurLessonGridBlock,
  createKangurLessonGridBlockFromTemplate,
  createKangurLessonGridItem,
  createKangurLessonImageBlock,
  createKangurLessonPage,
  createKangurLessonQuizBlock,
  createKangurLessonSvgBlock,
  createKangurLessonTextBlock,
  reorderKangurLessonBlocks,
  resolveKangurLessonDocumentPages,
  updateKangurLessonDocumentPages,
  type KangurLessonDocumentTemplateId,
} from '@/features/kangur/lesson-documents';
import { KANGUR_LESSON_COMPONENT_OPTIONS } from '@/features/kangur/settings';
import { KangurLessonDocumentRenderer } from '@/features/kangur/ui/components/KangurLessonDocumentRenderer';
import type {
  KangurLessonComponentId,
  KangurLessonCalloutBlock,
  KangurLessonGridBlock,
  KangurLessonGridItem,
  KangurLessonPage,
  KangurLessonQuizBlock,
  KangurLessonRootBlock,
} from '@/shared/contracts/kangur';
import { Badge, Button, FormField, Input, SelectSimple, Switch, Textarea } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { ActivityEditorCard } from './components/ActivityEditorCard';
import { CalloutEditorCard } from './components/CalloutEditorCard';
import { GridItemEditor } from './components/GridItemEditor';
import { InlineEditorCard } from './components/InlineEditorCard';
import { KangurAdminWorkspaceSectionCard } from './components/KangurAdminWorkspaceSectionCard';
import { QuizEditorCard } from './components/QuizEditorCard';
import {
  DOCUMENT_TEMPLATE_OPTIONS,
  GRID_TEMPLATE_OPTIONS,
  ROOT_BLOCK_TYPE_OPTIONS,
} from './constants';
import { clamp, clampGridColumnStart, insertAfterIndex, moveItem, parseNumberInput } from './utils';
import { useLessonContentEditorContext } from './context/LessonContentEditorContext';
import { useBlockListDnd } from './hooks/useBlockListDnd';
import { validateKangurLessonPageDraft } from './content-creator-insights';

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

type StarterRecipe = {
  id: string;
  label: string;
  description: string;
  onClick: () => void;
};

const getLessonRecipeFamily = (
  componentId: KangurLessonComponentId | null | undefined
): 'time' | 'arithmetic' | 'geometry' | 'logic' => {
  if (componentId === 'clock' || componentId === 'calendar') {
    return 'time';
  }
  if (
    componentId === 'adding' ||
    componentId === 'subtracting' ||
    componentId === 'multiplication' ||
    componentId === 'division'
  ) {
    return 'arithmetic';
  }
  if (
    componentId === 'geometry_basics' ||
    componentId === 'geometry_shapes' ||
    componentId === 'geometry_symmetry' ||
    componentId === 'geometry_perimeter'
  ) {
    return 'geometry';
  }
  return 'logic';
};

export function KangurLessonDocumentEditor(): React.JSX.Element {
  const { lesson, document: value, onChange } = useLessonContentEditorContext();
  const pages = resolveKangurLessonDocumentPages(value);
  const [activePageId, setActivePageId] = useState<string | null>(pages[0]?.id ?? null);
  const [insertQuery, setInsertQuery] = useState('');
  const [previewScope, setPreviewScope] = useState<'page' | 'lesson'>('page');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

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

  const handleBlockReorder = useCallback(
    (draggedId: string, targetId: string, position: 'before' | 'after'): void => {
      if (!activePage) return;
      updateDocument(reorderKangurLessonBlocks(activePage.blocks, draggedId, targetId, position));
    },
    [activePage, updateDocument]
  );

  const { dragState, getHandlers } = useBlockListDnd({ onReorder: handleBlockReorder });

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

  const quickInsertActions = useMemo(
    () => [
      {
        id: 'text',
        group: 'Writing & explanation',
        label: 'Add text block',
        description: 'Paragraphs, explanations, and learner instructions.',
        keywords: ['text', 'writing', 'paragraph', 'copy', 'intro'],
        Icon: Type,
        onClick: (): void =>
          updateDocument([...(activePage?.blocks ?? []), createKangurLessonTextBlock()]),
      },
      {
        id: 'callout',
        group: 'Writing & explanation',
        label: 'Add callout',
        description: 'Tips, hints, warnings, and highlighted teaching moments.',
        keywords: ['callout', 'tip', 'hint', 'warning'],
        Icon: Sparkles,
        onClick: (): void =>
          updateDocument([...(activePage?.blocks ?? []), createKangurLessonCalloutBlock()]),
      },
      {
        id: 'svg',
        group: 'Visuals & layouts',
        label: 'Add SVG block',
        description: 'Inline vector illustration with optional narration.',
        keywords: ['svg', 'vector', 'illustration', 'diagram'],
        Icon: Image,
        onClick: (): void =>
          updateDocument([...(activePage?.blocks ?? []), createKangurLessonSvgBlock()]),
      },
      {
        id: 'image',
        group: 'Visuals & layouts',
        label: 'Add SVG image block',
        description: 'Referenced SVG asset with title, caption, and alt text.',
        keywords: ['image', 'svg image', 'asset', 'media'],
        Icon: Image,
        onClick: (): void =>
          updateDocument([...(activePage?.blocks ?? []), createKangurLessonImageBlock()]),
      },
      {
        id: 'grid',
        group: 'Visuals & layouts',
        label: 'Add grid block',
        description: 'Flexible layout container with starter items.',
        keywords: ['grid', 'layout', 'columns'],
        Icon: Grid2x2,
        onClick: (): void =>
          updateDocument([...(activePage?.blocks ?? []), createKangurLessonGridBlock()]),
      },
      {
        id: 'hero-left',
        group: 'Visuals & layouts',
        label: 'Add hero layout',
        description: 'Headline + supporting visual in a ready-made layout.',
        keywords: ['hero', 'layout', 'featured'],
        Icon: Grid2x2,
        onClick: (): void =>
          updateDocument([
            ...(activePage?.blocks ?? []),
            createKangurLessonGridBlockFromTemplate('hero-left'),
          ]),
      },
      {
        id: 'image-gallery',
        group: 'Visuals & layouts',
        label: 'Add SVG image gallery',
        description: 'Referenced SVG images in a neat gallery layout.',
        keywords: ['gallery', 'images', 'svg image'],
        Icon: Image,
        onClick: (): void =>
          updateDocument([
            ...(activePage?.blocks ?? []),
            createKangurLessonGridBlockFromTemplate('image-gallery'),
          ]),
      },
      {
        id: 'image-mosaic',
        group: 'Visuals & layouts',
        label: 'Add SVG image mosaic',
        description: 'Dense image-led layout for richer explanation pages.',
        keywords: ['mosaic', 'images', 'svg image'],
        Icon: Grid2x2,
        onClick: (): void =>
          updateDocument([
            ...(activePage?.blocks ?? []),
            createKangurLessonGridBlockFromTemplate('image-mosaic'),
          ]),
      },
      {
        id: 'svg-gallery',
        group: 'Visuals & layouts',
        label: 'Add SVG gallery',
        description: 'Multiple inline SVG examples on one page.',
        keywords: ['gallery', 'svg', 'examples'],
        Icon: Image,
        onClick: (): void =>
          updateDocument([
            ...(activePage?.blocks ?? []),
            createKangurLessonGridBlockFromTemplate('svg-gallery'),
          ]),
      },
      {
        id: 'svg-mosaic',
        group: 'Visuals & layouts',
        label: 'Add SVG mosaic',
        description: 'Dense SVG showcase with featured tiles.',
        keywords: ['mosaic', 'svg', 'featured'],
        Icon: Grid2x2,
        onClick: (): void =>
          updateDocument([
            ...(activePage?.blocks ?? []),
            createKangurLessonGridBlockFromTemplate('svg-mosaic'),
          ]),
      },
      {
        id: 'activity',
        group: 'Practice & assessment',
        label: 'Add activity block',
        description: 'Interactive learner task such as clock or arithmetic practice.',
        keywords: ['activity', 'interactive', 'game', 'practice'],
        Icon: Plus,
        onClick: (): void =>
          updateDocument([...(activePage?.blocks ?? []), createKangurLessonActivityBlock()]),
      },
      {
        id: 'quiz',
        group: 'Practice & assessment',
        label: 'Add quiz',
        description: 'Quick comprehension check with choices and explanation.',
        keywords: ['quiz', 'assessment', 'choices', 'question'],
        Icon: Plus,
        onClick: (): void =>
          updateDocument([...(activePage?.blocks ?? []), createKangurLessonQuizBlock()]),
      },
    ],
    [activePage?.blocks, updateDocument]
  );

  const filteredQuickInsertActions = useMemo(() => {
    const normalizedQuery = insertQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return quickInsertActions;
    }

    return quickInsertActions.filter((action) =>
      [action.label, action.description, action.group, ...action.keywords]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [insertQuery, quickInsertActions]);

  const groupedQuickInsertActions = useMemo(() => {
    const groups = new Map<string, typeof filteredQuickInsertActions>();
    for (const action of filteredQuickInsertActions) {
      const existing = groups.get(action.group) ?? [];
      existing.push(action);
      groups.set(action.group, existing);
    }
    return Array.from(groups.entries());
  }, [filteredQuickInsertActions]);
  const previewActivePageId = previewScope === 'page' ? activePageId : null;
  const previewFrameClassName =
    previewDevice === 'mobile' ? 'max-w-[390px]' : 'max-w-2xl';
  const previewSummaryLabel =
    previewScope === 'page'
      ? `Current page preview on ${previewDevice === 'mobile' ? 'mobile' : 'desktop'}`
      : `Full lesson preview on ${previewDevice === 'mobile' ? 'mobile' : 'desktop'}`;
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
  const starterRecipes = useMemo<StarterRecipe[]>(() => {
    const family = getLessonRecipeFamily(lesson?.componentId);

    if (family === 'time') {
      return [
        {
          id: 'time-intro',
          label: 'Add guided intro page',
          description: 'Start with an explanation page that can hold text and one reference visual.',
          onClick: (): void => addPageFromTemplate('text-with-figure'),
        },
        {
          id: 'time-practice',
          label: 'Add practice activity',
          description: 'Create the interactive learner task for clock or calendar practice.',
          onClick: (): void =>
            updateDocument([...(activePage?.blocks ?? []), createKangurLessonActivityBlock()]),
        },
        {
          id: 'time-reference',
          label: 'Add reference illustration',
          description: 'Insert an SVG image block for a worked example or annotated reference.',
          onClick: (): void =>
            updateDocument([...(activePage?.blocks ?? []), createKangurLessonImageBlock()]),
        },
      ];
    }

    if (family === 'arithmetic') {
      return [
        {
          id: 'arithmetic-intro',
          label: 'Start with worked example',
          description: 'Use a text-and-figure page to explain the method before practice.',
          onClick: (): void => addPageFromTemplate('text-with-figure'),
        },
        {
          id: 'arithmetic-practice',
          label: 'Add practice activity',
          description: 'Drop in an interactive task for repeated learner practice.',
          onClick: (): void =>
            updateDocument([...(activePage?.blocks ?? []), createKangurLessonActivityBlock()]),
        },
        {
          id: 'arithmetic-check',
          label: 'Check with a quiz',
          description: 'Finish the page with a short comprehension check.',
          onClick: (): void =>
            updateDocument([...(activePage?.blocks ?? []), createKangurLessonQuizBlock()]),
        },
      ];
    }

    if (family === 'geometry') {
      return [
        {
          id: 'geometry-visual',
          label: 'Add visual explainer page',
          description: 'Open with a diagram-friendly page for definitions and examples.',
          onClick: (): void => addPageFromTemplate('svg-gallery-page'),
        },
        {
          id: 'geometry-diagram',
          label: 'Insert SVG diagram',
          description: 'Add an inline SVG block for a labelled shape or construction.',
          onClick: (): void =>
            updateDocument([...(activePage?.blocks ?? []), createKangurLessonSvgBlock()]),
        },
        {
          id: 'geometry-gallery',
          label: 'Build example gallery',
          description: 'Use a gallery layout to compare multiple shapes or worked examples.',
          onClick: (): void =>
            updateDocument([
              ...(activePage?.blocks ?? []),
              createKangurLessonGridBlockFromTemplate('svg-gallery'),
            ]),
        },
      ];
    }

    return [
      {
        id: 'logic-intro',
        label: 'Start with reasoning prompt',
        description: 'Introduce the pattern or rule with a compact explanation page.',
        onClick: (): void => addPageFromTemplate('article'),
      },
      {
        id: 'logic-hint',
        label: 'Add hint callout',
        description: 'Give learners a scaffold or clue without revealing the answer.',
        onClick: (): void =>
          updateDocument([...(activePage?.blocks ?? []), createKangurLessonCalloutBlock()]),
      },
      {
        id: 'logic-quiz',
        label: 'Add reasoning quiz',
        description: 'Check whether the learner can apply the rule in a new situation.',
        onClick: (): void =>
          updateDocument([...(activePage?.blocks ?? []), createKangurLessonQuizBlock()]),
      },
    ];
  }, [activePage?.blocks, addPageFromTemplate, lesson?.componentId, updateDocument]);

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
                      className='flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-background/70 px-3 py-3 text-left transition hover:border-primary/30 hover:bg-primary/5'
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
                    className={cn(
                      'rounded-2xl border px-3 py-2 text-left transition',
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

          <div className='mt-4 rounded-2xl border border-border/60 bg-card/30 p-4'>
            <div className='mb-3 flex flex-wrap items-start justify-between gap-3'>
              <div>
                <div className='text-sm font-semibold text-foreground'>Quick insert</div>
                <div className='text-xs text-muted-foreground'>
                  Add the next teaching block by intent instead of scanning one long toolbar.
                </div>
              </div>
              <div className='relative min-w-[240px] max-w-sm flex-1'>
                <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  value={insertQuery}
                  onChange={(event): void => setInsertQuery(event.target.value)}
                  placeholder='Search insert actions...'
                  className='h-9 pl-9'
                />
              </div>
            </div>
            <div className='space-y-4'>
              {groupedQuickInsertActions.length === 0 ? (
                <div className='rounded-2xl border border-dashed border-border/70 bg-card/20 p-4 text-sm text-muted-foreground'>
                  No insert actions match that search yet.
                </div>
              ) : (
                groupedQuickInsertActions.map(([group, actions]) => (
                  <div key={group} className='space-y-2'>
                    <div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'>
                      {group}
                    </div>
                    <div className='grid gap-2 lg:grid-cols-2'>
                      {actions.map((action) => (
                        <button
                          key={action.id}
                          type='button'
                          onClick={action.onClick}
                          disabled={!activePage}
                          className='flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-background/60 px-3 py-3 text-left transition hover:border-primary/25 hover:bg-primary/5 disabled:pointer-events-none disabled:opacity-50'
                        >
                          <div className='rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary'>
                            <action.Icon className='size-4' />
                          </div>
                          <div className='min-w-0'>
                            <div className='text-sm font-semibold text-foreground'>{action.label}</div>
                            <div className='mt-1 text-xs leading-relaxed text-muted-foreground'>
                              {action.description}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className='mt-3 text-xs text-muted-foreground'>
            Build lesson pages from typed blocks. Mix explanation, SVG references, interactive
            activities, and responsive layouts without switching tools.
          </div>
        </KangurAdminWorkspaceSectionCard>

        {activePage?.blocks.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-border/70 bg-card/20 p-6'>
            <div className='text-sm font-semibold text-foreground'>This page has no content yet.</div>
            <div className='mt-2 text-sm text-muted-foreground'>
              Start with a teaching explanation, a visual example, or a practice task.
            </div>
            <div className='mt-4 flex flex-wrap gap-2'>
              {quickInsertActions
                .filter((action) => ['text', 'svg', 'activity'].includes(action.id))
                .map((action) => (
                  <Button
                    key={action.id}
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-8 px-3'
                    onClick={action.onClick}
                    disabled={!activePage}
                  >
                    <action.Icon className='mr-1 size-3.5' />
                    {action.id === 'text'
                      ? 'Start with text'
                      : action.id === 'svg'
                        ? 'Start with SVG'
                        : 'Start with activity'}
                  </Button>
                ))}
            </div>
          </div>
        ) : null}

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
          );
        })}
      </div>

      <div className='sticky top-4 hidden h-[calc(100vh-2rem)] flex-col gap-4 overflow-hidden rounded-2xl border border-border/60 bg-card/35 shadow-sm xl:flex'>
        <div className='flex items-center justify-between border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-md'>
          <div>
            <div className='text-sm font-semibold text-foreground'>Preview</div>
            <div className='text-xs text-muted-foreground'>{previewSummaryLabel}</div>
          </div>
          <div className='flex flex-col items-end gap-2'>
            <div className='flex items-center gap-1 rounded-xl border border-border/60 bg-background/60 p-1'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className={cn(
                  'h-7 px-2 text-[11px]',
                  previewScope === 'page'
                    ? 'border-primary/30 bg-primary/10 text-foreground'
                    : 'text-muted-foreground'
                )}
                onClick={(): void => setPreviewScope('page')}
              >
                Current page
              </Button>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className={cn(
                  'h-7 px-2 text-[11px]',
                  previewScope === 'lesson'
                    ? 'border-primary/30 bg-primary/10 text-foreground'
                    : 'text-muted-foreground'
                )}
                onClick={(): void => setPreviewScope('lesson')}
              >
                Full lesson
              </Button>
            </div>
            <div className='flex items-center gap-1 rounded-xl border border-border/60 bg-background/60 p-1'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className={cn(
                  'h-7 px-2 text-[11px]',
                  previewDevice === 'desktop'
                    ? 'border-primary/30 bg-primary/10 text-foreground'
                    : 'text-muted-foreground'
                )}
                onClick={(): void => setPreviewDevice('desktop')}
              >
                Desktop
              </Button>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className={cn(
                  'h-7 px-2 text-[11px]',
                  previewDevice === 'mobile'
                    ? 'border-primary/30 bg-primary/10 text-foreground'
                    : 'text-muted-foreground'
                )}
                onClick={(): void => setPreviewDevice('mobile')}
              >
                Mobile
              </Button>
            </div>
          </div>
        </div>
        <div className='flex-1 overflow-y-auto p-4 scrollbar-thin'>
          <div
            className={cn(
              'mx-auto overflow-hidden rounded-xl border border-border/40 bg-white shadow-sm transition-[max-width] duration-200',
              previewFrameClassName
            )}
            data-testid='lesson-document-preview-frame'
          >
            <KangurLessonDocumentRenderer document={value} activePageId={previewActivePageId} />
          </div>
        </div>
      </div>
    </div>
  );
}
