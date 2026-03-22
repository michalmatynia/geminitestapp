/**
 * @vitest-environment jsdom
 */
'use client';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/document-editor/public', () => ({
  DocumentWysiwygEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (nextValue: string) => void;
  }) => (
    <textarea
      data-testid='mock-wysiwyg-editor'
      value={value}
      onChange={(event): void => onChange(event.target.value)}
    />
  ),
}));

vi.mock('@/features/cms/public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/cms/public')>();
  return {
    ...actual,
    MediaLibraryPanel: ({
      open,
      onSelect,
    }: {
      open: boolean;
      onSelect: (filepaths: string[]) => void;
    }) =>
      open ? (
        <>
          <button type='button' onClick={(): void => onSelect(['/uploads/kangur/mock-image.svg'])}>
            Pick library SVG
          </button>
          <button type='button' onClick={(): void => onSelect(['/uploads/kangur/mock-image.png'])}>
            Pick library PNG
          </button>
        </>
      ) : null,
  };
});

import { KangurLessonDocumentEditor } from '@/features/kangur/admin/KangurLessonDocumentEditor';
import { LessonContentEditorProvider } from '@/features/kangur/admin/context/LessonContentEditorContext';
import type { KangurLesson, KangurLessonDocument } from '@/features/kangur/shared/contracts/kangur';

const arithmeticLesson: KangurLesson = {
  id: 'lesson-adding',
  componentId: 'adding',
  contentMode: 'document',
  subject: 'maths',
  ageGroup: 'ten_year_old',
  title: 'Dodawanie',
  description: 'Ćwicz dodawanie krok po kroku.',
  emoji: '➕',
  color: '#fff',
  activeBg: 'bg-emerald-500',
  sortOrder: 1000,
  enabled: true,
};

function renderEditor(
  value: KangurLessonDocument,
  onChange: (next: KangurLessonDocument) => void,
  lesson: KangurLesson | null = null
): ReturnType<typeof render> {
  return render(
    <LessonContentEditorProvider lesson={lesson} document={value} onChange={onChange}>
      <KangurLessonDocumentEditor />
    </LessonContentEditorProvider>
  );
}

function StatefulEditorHarness({
  value,
  onChange,
  lesson = null,
}: {
  value: KangurLessonDocument;
  onChange: (nextValue: KangurLessonDocument) => void;
  lesson?: KangurLesson | null;
}): React.JSX.Element {
  const [document, setDocument] = React.useState(value);

  const handleChange = React.useCallback(
    (nextValue: KangurLessonDocument): void => {
      setDocument(nextValue);
      onChange(nextValue);
    },
    [onChange]
  );

  return (
    <LessonContentEditorProvider lesson={lesson} document={document} onChange={handleChange}>
      <KangurLessonDocumentEditor />
    </LessonContentEditorProvider>
  );
}

describe('KangurLessonDocumentEditor', () => {
  it('adds an activity block to the lesson document', () => {
    const handleChange = vi.fn();

    renderEditor({ version: 1, blocks: [] }, handleChange);

    fireEvent.click(screen.getByRole('button', { name: /add activity block/i }));

    expect(handleChange).toHaveBeenCalledTimes(1);
    const nextDocument = handleChange.mock.calls[0]?.[0] as { blocks: Array<{ type: string }> };
    expect(nextDocument.blocks).toHaveLength(1);
    expect(nextDocument.blocks[0]?.type).toBe('activity');
  });

  it('adds an SVG image block to the lesson document', () => {
    const handleChange = vi.fn();

    renderEditor({ version: 1, blocks: [] }, handleChange);

    fireEvent.click(screen.getByRole('button', { name: /add svg image block/i }));

    expect(handleChange).toHaveBeenCalledTimes(1);
    const nextDocument = handleChange.mock.calls[0]?.[0] as { blocks: Array<{ type: string }> };
    expect(nextDocument.blocks).toHaveLength(1);
    expect(nextDocument.blocks[0]?.type).toBe('image');
  });

  it('adds an SVG block to the lesson document', () => {
    const handleChange = vi.fn();

    renderEditor({ version: 1, blocks: [] }, handleChange);

    fireEvent.click(screen.getByRole('button', { name: /add svg block/i }));

    expect(handleChange).toHaveBeenCalledTimes(1);
    const nextDocument = handleChange.mock.calls[0]?.[0] as { blocks: Array<{ type: string }> };
    expect(nextDocument.blocks).toHaveLength(1);
    expect(nextDocument.blocks[0]?.type).toBe('svg');
  });

  it('filters quick insert actions by search query', () => {
    const handleChange = vi.fn();

    renderEditor({ version: 1, blocks: [] }, handleChange);

    fireEvent.change(screen.getByPlaceholderText(/search insert actions/i), {
      target: { value: 'quiz' },
    });

    expect(screen.getByRole('button', { name: /add quiz/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add svg block/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add activity block/i })).not.toBeInTheDocument();
  });

  it('adds a new modular page from the SVG image gallery template', () => {
    const handleChange = vi.fn();

    renderEditor({ version: 1, blocks: [] }, handleChange);

    fireEvent.click(screen.getByRole('button', { name: /add svg image page/i }));

    const nextDocument = handleChange.mock.calls[0]?.[0] as {
      pages?: Array<{ blocks: Array<{ type: string }> }>;
      blocks: Array<{ type: string }>;
    };

    expect(nextDocument.pages).toHaveLength(2);
    expect(nextDocument.pages?.[1]?.blocks[0]?.type).toBe('text');
    expect(nextDocument.pages?.[1]?.blocks[1]?.type).toBe('grid');
    expect(nextDocument.blocks[0]?.type).toBe('text');
    expect(nextDocument.blocks[1]?.type).toBe('grid');
  });

  it('inserts a blank page after the active page and inherits its section metadata', async () => {
    const handleChange = vi.fn();

    render(
      <StatefulEditorHarness
        value={{
          version: 1,
          pages: [
            {
              id: 'page-1',
              sectionKey: 'numbers',
              sectionTitle: 'Numbers',
              sectionDescription: 'Count objects before solving tasks.',
              title: 'Counting intro',
              blocks: [
                {
                  id: 'text-1',
                  type: 'text',
                  html: '<p>Start here</p>',
                  align: 'left',
                },
              ],
            },
            {
              id: 'page-2',
              sectionKey: 'practice',
              sectionTitle: 'Practice',
              sectionDescription: 'Try the worksheet tasks.',
              title: 'Quiz',
              blocks: [
                {
                  id: 'text-2',
                  type: 'text',
                  html: '<p>Practice page</p>',
                  align: 'left',
                },
              ],
            },
          ],
          blocks: [
            {
              id: 'text-1',
              type: 'text',
              html: '<p>Start here</p>',
              align: 'left',
            },
            {
              id: 'text-2',
              type: 'text',
              html: '<p>Practice page</p>',
              align: 'left',
            },
          ],
        }}
        onChange={handleChange}
      />
    );

    await screen.findByTestId('mock-wysiwyg-editor');
    fireEvent.click(screen.getByRole('button', { name: /^new page$/i }));

    const nextDocument = handleChange.mock.calls.at(-1)?.[0] as {
      pages?: Array<{
        sectionKey?: string;
        sectionTitle?: string;
        sectionDescription?: string;
        title?: string;
        blocks: Array<{ type: string }>;
      }>;
    };

    expect(nextDocument.pages).toHaveLength(3);
    expect(nextDocument.pages?.[1]?.sectionKey).toBe('numbers');
    expect(nextDocument.pages?.[1]?.sectionTitle).toBe('Numbers');
    expect(nextDocument.pages?.[1]?.sectionDescription).toBe('Count objects before solving tasks.');
    expect(nextDocument.pages?.[1]?.title).toBe('');
    expect(nextDocument.pages?.[1]?.blocks).toHaveLength(0);
    expect(nextDocument.pages?.[2]?.sectionTitle).toBe('Practice');
  });

  it('inherits the active section when adding a templated page', async () => {
    const handleChange = vi.fn();

    render(
      <StatefulEditorHarness
        value={{
          version: 1,
          pages: [
            {
              id: 'page-1',
              sectionKey: 'shapes',
              sectionTitle: 'Shapes',
              sectionDescription: 'Learn names and examples.',
              title: 'Overview',
              blocks: [
                {
                  id: 'text-1',
                  type: 'text',
                  html: '<p>Overview</p>',
                  align: 'left',
                },
              ],
            },
          ],
          blocks: [
            {
              id: 'text-1',
              type: 'text',
              html: '<p>Overview</p>',
              align: 'left',
            },
          ],
        }}
        onChange={handleChange}
      />
    );

    await screen.findByTestId('mock-wysiwyg-editor');
    fireEvent.click(screen.getByRole('button', { name: /add svg image page/i }));

    const nextDocument = handleChange.mock.calls.at(-1)?.[0] as {
      pages?: Array<{
        sectionKey?: string;
        sectionTitle?: string;
        sectionDescription?: string;
        blocks: Array<{ type: string }>;
      }>;
    };

    expect(nextDocument.pages).toHaveLength(2);
    expect(nextDocument.pages?.[1]?.sectionKey).toBe('shapes');
    expect(nextDocument.pages?.[1]?.sectionTitle).toBe('Shapes');
    expect(nextDocument.pages?.[1]?.sectionDescription).toBe('Learn names and examples.');
    expect(nextDocument.pages?.[1]?.blocks[0]?.type).toBe('text');
    expect(nextDocument.pages?.[1]?.blocks[1]?.type).toBe('grid');
  });

  it('shows page-level narration review status in the page picker and active page panel', () => {
    render(
      <StatefulEditorHarness
        lesson={arithmeticLesson}
        onChange={vi.fn()}
        value={{
          version: 1,
          pages: [
            {
              id: 'page-1',
              title: 'Explainer',
              blocks: [
                {
                  id: 'svg-1',
                  type: 'svg',
                  title: '',
                  markup: '<svg viewBox="0 0 100 100"></svg>',
                  viewBox: '0 0 100 100',
                  align: 'center',
                  fit: 'contain',
                  maxWidth: 420,
                },
              ],
            },
          ],
          blocks: [
            {
              id: 'svg-1',
              type: 'svg',
              title: '',
              markup: '<svg viewBox="0 0 100 100"></svg>',
              viewBox: '0 0 100 100',
              align: 'center',
              fit: 'contain',
              maxWidth: 420,
            },
          ],
        }}
      />
    );

    expect(screen.getAllByText('1 narration issue').length).toBeGreaterThan(0);
    expect(screen.getByText('Narration on this page')).toBeInTheDocument();
    expect(
      screen.getByText('Add a spoken description for 1 visual block on this page.')
    ).toBeInTheDocument();
  });

  it('switches preview from the current page to the full lesson', () => {
    const handleChange = vi.fn();

    render(
      <StatefulEditorHarness
        value={{
          version: 1,
          pages: [
            {
              id: 'page-1',
              title: 'Intro page',
              blocks: [
                {
                  id: 'text-1',
                  type: 'text',
                  html: '<p>Only first page</p>',
                  align: 'left',
                },
              ],
            },
            {
              id: 'page-2',
              title: 'Second page',
              blocks: [
                {
                  id: 'text-2',
                  type: 'text',
                  html: '<p>Second page body</p>',
                  align: 'left',
                },
              ],
            },
          ],
          blocks: [
            {
              id: 'text-1',
              type: 'text',
              html: '<p>Only first page</p>',
              align: 'left',
            },
            {
              id: 'text-2',
              type: 'text',
              html: '<p>Second page body</p>',
              align: 'left',
            },
          ],
        }}
        onChange={handleChange}
      />
    );

    expect(screen.getByText('Only first page')).toBeInTheDocument();
    expect(screen.queryByText('Second page body')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /full lesson/i }));

    expect(screen.getByText('Second page body')).toBeInTheDocument();
  });

  it('shows page health badges and previews the active page issue summary', () => {
    const handleChange = vi.fn();

    render(
      <StatefulEditorHarness
        value={{
          version: 1,
          pages: [
            {
              id: 'page-ready',
              title: 'Ready page',
              blocks: [
                {
                  id: 'text-1',
                  type: 'text',
                  html: '<p>Visible explanation</p>',
                  align: 'left',
                },
              ],
            },
            {
              id: 'page-empty',
              title: 'Needs content',
              blocks: [],
            },
          ],
          blocks: [
            {
              id: 'text-1',
              type: 'text',
              html: '<p>Visible explanation</p>',
              align: 'left',
            },
          ],
        }}
        onChange={handleChange}
      />
    );

    expect(screen.getAllByText('Ready').length).toBeGreaterThan(0);
    expect(screen.getByText('Needs content')).toBeInTheDocument();
    expect(screen.getAllByText('Blank page').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /needs content/i }));

    expect(screen.getAllByText('This page has no blocks yet.').length).toBeGreaterThan(0);
  });

  it('shows lesson-type starter recipes and applies the recommended action', () => {
    const handleChange = vi.fn();

    render(
      <StatefulEditorHarness
        lesson={arithmeticLesson}
        value={{ version: 1, blocks: [] }}
        onChange={handleChange}
      />
    );

    expect(screen.getByText('Starter recipes for Adding Lesson')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start with worked example/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add practice activity/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check with a quiz/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /add practice activity/i }));

    const nextDocument = handleChange.mock.calls.at(-1)?.[0] as {
      blocks?: Array<{ type: string }>;
    };

    expect(nextDocument.blocks?.[0]?.type).toBe('activity');
  });

  it('applies an SVG media-library selection to an image block source', () => {
    const handleChange = vi.fn();

    render(
      <StatefulEditorHarness
        value={{
          version: 1,
          blocks: [
            {
              id: 'image-1',
              type: 'image',
              title: 'Photo',
              src: '',
              align: 'center',
              fit: 'contain',
              maxWidth: 360,
            },
          ],
        }}
        onChange={handleChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /choose from library/i }));
    fireEvent.click(screen.getByRole('button', { name: /pick library svg/i }));

    const nextDocument = handleChange.mock.calls.at(-1)?.[0] as {
      blocks: Array<{ type: string; src?: string }>;
    };

    expect(nextDocument.blocks[0]?.type).toBe('image');
    expect(nextDocument.blocks[0]?.src).toBe('/uploads/kangur/mock-image.svg');
  });

  it('ignores a non-SVG media-library selection for an image block source', () => {
    const handleChange = vi.fn();

    render(
      <StatefulEditorHarness
        value={{
          version: 1,
          blocks: [
            {
              id: 'image-1',
              type: 'image',
              title: 'Photo',
              src: '',
              align: 'center',
              fit: 'contain',
              maxWidth: 360,
            },
          ],
        }}
        onChange={handleChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /choose from library/i }));
    fireEvent.click(screen.getByRole('button', { name: /pick library png/i }));

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('adds a grid block with starter items', () => {
    const handleChange = vi.fn();

    renderEditor({ version: 1, blocks: [] }, handleChange);

    fireEvent.click(screen.getByRole('button', { name: /add grid block/i }));

    const nextDocument = handleChange.mock.calls[0]?.[0] as {
      blocks: Array<{ type: string; items?: unknown[] }>;
    };

    expect(nextDocument.blocks[0]?.type).toBe('grid');
    expect(nextDocument.blocks[0]?.items).toHaveLength(2);
  });

  it('adds a hero layout grid preset', () => {
    const handleChange = vi.fn();

    renderEditor({ version: 1, blocks: [] }, handleChange);

    fireEvent.click(screen.getByRole('button', { name: /add hero layout/i }));

    const nextDocument = handleChange.mock.calls[0]?.[0] as {
      blocks: Array<{
        type: string;
        columns?: number;
        items?: Array<{ colSpan: number; block: { type: string } }>;
      }>;
    };

    expect(nextDocument.blocks[0]?.type).toBe('grid');
    expect(nextDocument.blocks[0]?.columns).toBe(3);
    expect(nextDocument.blocks[0]?.items?.[0]?.colSpan).toBe(2);
    expect(nextDocument.blocks[0]?.items?.[0]?.block.type).toBe('text');
    expect(nextDocument.blocks[0]?.items?.[1]?.block.type).toBe('svg');
  });

  it('adds an SVG gallery layout preset', () => {
    const handleChange = vi.fn();

    renderEditor({ version: 1, blocks: [] }, handleChange);

    fireEvent.click(screen.getByRole('button', { name: /add svg gallery/i }));

    const nextDocument = handleChange.mock.calls[0]?.[0] as {
      blocks: Array<{
        type: string;
        columns?: number;
        items?: Array<{ block: { type: string } }>;
      }>;
    };

    expect(nextDocument.blocks[0]?.type).toBe('grid');
    expect(nextDocument.blocks[0]?.columns).toBe(2);
    expect(nextDocument.blocks[0]?.items).toHaveLength(4);
    expect(nextDocument.blocks[0]?.items?.every((item) => item.block.type === 'svg')).toBe(true);
  });

  it('adds an SVG mosaic layout preset', () => {
    const handleChange = vi.fn();

    renderEditor({ version: 1, blocks: [] }, handleChange);

    fireEvent.click(screen.getByRole('button', { name: /add svg mosaic/i }));

    const nextDocument = handleChange.mock.calls[0]?.[0] as {
      blocks: Array<{
        type: string;
        columns?: number;
        rowHeight?: number;
        denseFill?: boolean;
        items?: Array<{
          colSpan: number;
          rowSpan: number;
          columnStart: number | null;
          rowStart: number | null;
          block: { type: string };
        }>;
      }>;
    };

    expect(nextDocument.blocks[0]?.type).toBe('grid');
    expect(nextDocument.blocks[0]?.columns).toBe(3);
    expect(nextDocument.blocks[0]?.rowHeight).toBe(180);
    expect(nextDocument.blocks[0]?.denseFill).toBe(true);
    expect(nextDocument.blocks[0]?.items?.[0]?.colSpan).toBe(2);
    expect(nextDocument.blocks[0]?.items?.[0]?.rowSpan).toBe(2);
    expect(nextDocument.blocks[0]?.items?.[0]?.columnStart).toBe(1);
    expect(nextDocument.blocks[0]?.items?.[0]?.rowStart).toBe(1);
    expect(nextDocument.blocks[0]?.items?.every((item) => item.block.type === 'svg')).toBe(true);
  });

  it('duplicates a root SVG block', () => {
    const handleChange = vi.fn();

    renderEditor(
      {
        version: 1,
        blocks: [
          {
            id: 'svg-1',
            type: 'svg',
            title: 'Shape A',
            markup: '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>',
            viewBox: '0 0 10 10',
            align: 'center',
            fit: 'contain',
            maxWidth: 320,
          },
        ],
      },
      handleChange
    );

    fireEvent.click(screen.getByRole('button', { name: /duplicate block 1/i }));

    const nextDocument = handleChange.mock.calls[0]?.[0] as {
      blocks: Array<{ id: string; type: string; title?: string }>;
    };

    expect(nextDocument.blocks).toHaveLength(2);
    expect(nextDocument.blocks[0]?.type).toBe('svg');
    expect(nextDocument.blocks[1]?.type).toBe('svg');
    expect(nextDocument.blocks[1]?.title).toBe('Shape A');
    expect(nextDocument.blocks[1]?.id).not.toBe(nextDocument.blocks[0]?.id);
  });

  it('duplicates a grid item inside an existing grid block', () => {
    const handleChange = vi.fn();

    renderEditor(
      {
        version: 1,
        blocks: [
          {
            id: 'grid-1',
            type: 'grid',
            columns: 2,
            gap: 16,
            rowHeight: 220,
            denseFill: false,
            stackOnMobile: true,
            items: [
              {
                id: 'item-1',
                colSpan: 1,
                rowSpan: 1,
                columnStart: null,
                rowStart: null,
                block: {
                  id: 'svg-1',
                  type: 'svg',
                  title: 'Shape A',
                  markup: '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>',
                  viewBox: '0 0 10 10',
                  align: 'center',
                  fit: 'contain',
                  maxWidth: 320,
                },
              },
              {
                id: 'item-2',
                colSpan: 1,
                rowSpan: 1,
                columnStart: null,
                rowStart: null,
                block: {
                  id: 'svg-2',
                  type: 'svg',
                  title: 'Shape B',
                  markup:
                    '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" /></svg>',
                  viewBox: '0 0 10 10',
                  align: 'center',
                  fit: 'contain',
                  maxWidth: 320,
                },
              },
            ],
          },
        ],
      },
      handleChange
    );

    fireEvent.click(screen.getByRole('button', { name: /duplicate grid item 1/i }));

    const nextDocument = handleChange.mock.calls[0]?.[0] as {
      blocks: Array<{
        type: string;
        items?: Array<{ id: string; block: { id: string; title?: string } }>;
      }>;
    };

    expect(nextDocument.blocks[0]?.type).toBe('grid');
    expect(nextDocument.blocks[0]?.items).toHaveLength(3);
    expect(nextDocument.blocks[0]?.items?.[1]?.block.title).toBe('Shape A');
    expect(nextDocument.blocks[0]?.items?.[1]?.id).not.toBe('item-1');
    expect(nextDocument.blocks[0]?.items?.[1]?.block.id).not.toBe('svg-1');
  });

  it('updates explicit grid placement for an item', () => {
    const handleChange = vi.fn();
    const initialValue = {
      version: 1,
      blocks: [
        {
          id: 'grid-1',
          type: 'grid' as const,
          columns: 3,
          gap: 16,
          rowHeight: 220,
          denseFill: false,
          stackOnMobile: true,
          items: [
            {
              id: 'item-1',
              colSpan: 1,
              rowSpan: 1,
              columnStart: null,
              rowStart: null,
              block: {
                id: 'svg-1',
                type: 'svg' as const,
                title: 'Shape A',
                markup: '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>',
                viewBox: '0 0 10 10',
                align: 'center' as const,
                fit: 'contain' as const,
                maxWidth: 320,
              },
            },
          ],
        },
      ],
    };

    render(<StatefulEditorHarness value={initialValue} onChange={handleChange} />);

    fireEvent.change(screen.getByLabelText(/column start/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/row start/i), { target: { value: '3' } });

    const firstUpdate = handleChange.mock.calls[0]?.[0] as {
      blocks: Array<{ items?: Array<{ columnStart: number | null }> }>;
    };
    const secondUpdate = handleChange.mock.calls[1]?.[0] as {
      blocks: Array<{ items?: Array<{ columnStart: number | null; rowStart: number | null }> }>;
    };

    expect(firstUpdate.blocks[0]?.items?.[0]?.columnStart).toBe(2);
    expect(secondUpdate.blocks[0]?.items?.[0]?.columnStart).toBe(2);
    expect(secondUpdate.blocks[0]?.items?.[0]?.rowStart).toBe(3);
  });

  it('re-clamps explicit column starts when the span grows', () => {
    const handleChange = vi.fn();

    render(
      <StatefulEditorHarness
        value={{
          version: 1,
          blocks: [
            {
              id: 'grid-1',
              type: 'grid',
              columns: 3,
              gap: 16,
              rowHeight: 220,
              denseFill: false,
              stackOnMobile: true,
              items: [
                {
                  id: 'item-1',
                  colSpan: 1,
                  rowSpan: 1,
                  columnStart: 3,
                  rowStart: null,
                  block: {
                    id: 'svg-1',
                    type: 'svg',
                    title: 'Shape A',
                    markup: '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>',
                    viewBox: '0 0 10 10',
                    align: 'center',
                    fit: 'contain',
                    maxWidth: 320,
                  },
                },
              ],
            },
          ],
        }}
        onChange={handleChange}
      />
    );

    fireEvent.change(screen.getByLabelText(/column span/i), { target: { value: '2' } });

    const nextDocument = handleChange.mock.calls[0]?.[0] as {
      blocks: Array<{ items?: Array<{ colSpan: number; columnStart: number | null }> }>;
    };

    expect(nextDocument.blocks[0]?.items?.[0]?.colSpan).toBe(2);
    expect(nextDocument.blocks[0]?.items?.[0]?.columnStart).toBe(2);
  });

  it('replaces the document with a starter page template', () => {
    const handleChange = vi.fn();

    renderEditor(
      {
        version: 1,
        blocks: [
          {
            id: 'svg-1',
            type: 'svg',
            title: 'Shape A',
            markup: '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>',
            viewBox: '0 0 10 10',
            align: 'center',
            fit: 'contain',
            maxWidth: 320,
          },
        ],
      },
      handleChange
    );

    fireEvent.click(screen.getByRole('button', { name: /svg gallery page/i }));

    const nextDocument = handleChange.mock.calls[0]?.[0] as {
      blocks: Array<{
        type: string;
        items?: Array<{ block: { type: string } }>;
      }>;
    };

    expect(nextDocument.blocks).toHaveLength(2);
    expect(nextDocument.blocks[0]?.type).toBe('text');
    expect(nextDocument.blocks[1]?.type).toBe('grid');
    expect(nextDocument.blocks[1]?.items).toHaveLength(4);
    expect(nextDocument.blocks[1]?.items?.every((item) => item.block.type === 'svg')).toBe(true);
  });

  it('replaces the document with the SVG mosaic page template', () => {
    const handleChange = vi.fn();

    renderEditor(
      {
        version: 1,
        blocks: [
          {
            id: 'text-1',
            type: 'text',
            html: '<p>Starter</p>',
            align: 'left',
          },
        ],
      },
      handleChange
    );

    fireEvent.click(screen.getByRole('button', { name: /svg mosaic page/i }));

    const nextDocument = handleChange.mock.calls[0]?.[0] as {
      blocks: Array<{
        type: string;
        denseFill?: boolean;
        items?: Array<{
          columnStart: number | null;
          rowStart: number | null;
          block: { type: string };
        }>;
      }>;
    };

    expect(nextDocument.blocks).toHaveLength(2);
    expect(nextDocument.blocks[0]?.type).toBe('text');
    expect(nextDocument.blocks[1]?.type).toBe('grid');
    expect(nextDocument.blocks[1]?.denseFill).toBe(true);
    expect(nextDocument.blocks[1]?.items?.[0]?.columnStart).toBe(1);
    expect(nextDocument.blocks[1]?.items?.[0]?.rowStart).toBe(1);
    expect(nextDocument.blocks[1]?.items?.every((item) => item.block.type === 'svg')).toBe(true);
  });
});
