/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/document-editor', () => ({
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

import { KangurLessonDocumentEditor } from '@/features/kangur/admin/KangurLessonDocumentEditor';
import type { KangurLessonDocument } from '@/shared/contracts/kangur';

function StatefulEditorHarness({
  value,
  onChange,
}: {
  value: KangurLessonDocument;
  onChange: (nextValue: KangurLessonDocument) => void;
}): React.JSX.Element {
  const [document, setDocument] = React.useState(value);

  return (
    <KangurLessonDocumentEditor
      value={document}
      onChange={(nextValue): void => {
        setDocument(nextValue);
        onChange(nextValue);
      }}
    />
  );
}

describe('KangurLessonDocumentEditor', () => {
  it('adds an SVG block to the lesson document', () => {
    const handleChange = vi.fn();

    render(
      <KangurLessonDocumentEditor
        value={{ version: 1, blocks: [] }}
        onChange={handleChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /add svg block/i }));

    expect(handleChange).toHaveBeenCalledTimes(1);
    const nextDocument = handleChange.mock.calls[0]?.[0] as { blocks: Array<{ type: string }> };
    expect(nextDocument.blocks).toHaveLength(1);
    expect(nextDocument.blocks[0]?.type).toBe('svg');
  });

  it('adds a grid block with starter items', () => {
    const handleChange = vi.fn();

    render(
      <KangurLessonDocumentEditor
        value={{ version: 1, blocks: [] }}
        onChange={handleChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /add grid block/i }));

    const nextDocument = handleChange.mock.calls[0]?.[0] as {
      blocks: Array<{ type: string; items?: unknown[] }>;
    };

    expect(nextDocument.blocks[0]?.type).toBe('grid');
    expect(nextDocument.blocks[0]?.items).toHaveLength(2);
  });

  it('adds a hero layout grid preset', () => {
    const handleChange = vi.fn();

    render(
      <KangurLessonDocumentEditor
        value={{ version: 1, blocks: [] }}
        onChange={handleChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /add hero layout/i }));

    const nextDocument = handleChange.mock.calls[0]?.[0] as {
      blocks: Array<{ type: string; columns?: number; items?: Array<{ colSpan: number; block: { type: string } }> }>;
    };

    expect(nextDocument.blocks[0]?.type).toBe('grid');
    expect(nextDocument.blocks[0]?.columns).toBe(3);
    expect(nextDocument.blocks[0]?.items?.[0]?.colSpan).toBe(2);
    expect(nextDocument.blocks[0]?.items?.[0]?.block.type).toBe('text');
    expect(nextDocument.blocks[0]?.items?.[1]?.block.type).toBe('svg');
  });

  it('adds an SVG gallery layout preset', () => {
    const handleChange = vi.fn();

    render(
      <KangurLessonDocumentEditor
        value={{ version: 1, blocks: [] }}
        onChange={handleChange}
      />
    );

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

    render(
      <KangurLessonDocumentEditor
        value={{ version: 1, blocks: [] }}
        onChange={handleChange}
      />
    );

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

    render(
      <KangurLessonDocumentEditor
        value={{
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
        }}
        onChange={handleChange}
      />
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

    render(
      <KangurLessonDocumentEditor
        value={{
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
                    markup: '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" /></svg>',
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

    render(
      <StatefulEditorHarness value={initialValue} onChange={handleChange} />
    );

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

    render(
      <KangurLessonDocumentEditor
        value={{
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
        }}
        onChange={handleChange}
      />
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

    render(
      <KangurLessonDocumentEditor
        value={{
          version: 1,
          blocks: [
            {
              id: 'text-1',
              type: 'text',
              html: '<p>Starter</p>',
              align: 'left',
            },
          ],
        }}
        onChange={handleChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /svg mosaic page/i }));

    const nextDocument = handleChange.mock.calls[0]?.[0] as {
      blocks: Array<{
        type: string;
        denseFill?: boolean;
        items?: Array<{ columnStart: number | null; rowStart: number | null; block: { type: string } }>;
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
