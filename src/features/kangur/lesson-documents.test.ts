import { describe, expect, it } from 'vitest';

import {
  convertKangurLessonInlineBlockType,
  createKangurLessonDocumentFromTemplate,
  createDefaultKangurLessonDocument,
  createKangurLessonGridBlock,
  createKangurLessonGridBlockFromTemplate,
  createKangurLessonSvgBlock,
  createStarterKangurLessonDocument,
  createKangurLessonTextBlock,
  hasKangurLessonDocumentContent,
  normalizeKangurLessonDocument,
  normalizeKangurLessonDocumentStore,
  resolveStarterKangurLessonDocumentTemplate,
} from '@/features/kangur/lesson-documents';

describe('kangur lesson documents', () => {
  it('creates a default lesson document with starter text', () => {
    const document = createDefaultKangurLessonDocument();

    expect(document.version).toBe(1);
    expect(document.blocks).toHaveLength(1);
    expect(document.blocks[0]?.type).toBe('text');
  });

  it('sanitizes text and svg blocks during normalization', () => {
    const document = normalizeKangurLessonDocument({
      blocks: [
        {
          id: 'text-1',
          type: 'text',
          html: '<p>Hello</p><script>alert("x")</script>',
          ttsText: '  Hello there.  ',
          align: 'center',
        },
        {
          id: 'svg-1',
          type: 'svg',
          title: 'Unsafe SVG',
          ttsDescription: '  Diagram of a square.  ',
          markup:
            '<svg viewBox="0 0 10 10" onload="alert(1)"><script>alert(1)</script><circle cx="5" cy="5" r="4" /></svg>',
          viewBox: '0 0 10 10',
          align: 'right',
          fit: 'contain',
          maxWidth: 300,
        },
      ],
    });

    const textBlock = document.blocks[0];
    const svgBlock = document.blocks[1];

    expect(textBlock?.type).toBe('text');
    expect(textBlock?.type === 'text' ? textBlock.html : '').not.toContain('<script');
    expect(textBlock?.type === 'text' ? textBlock.ttsText : '').toBe('Hello there.');
    expect(svgBlock?.type).toBe('svg');
    expect(svgBlock?.type === 'svg' ? svgBlock.markup : '').not.toContain('<script');
    expect(svgBlock?.type === 'svg' ? svgBlock.markup : '').not.toContain('onload=');
    expect(svgBlock?.type === 'svg' ? svgBlock.ttsDescription : '').toBe('Diagram of a square.');
  });

  it('normalizes stored lesson documents as a keyed map', () => {
    const store = normalizeKangurLessonDocumentStore({
      lessonA: {
        blocks: [createKangurLessonTextBlock()],
      },
      lessonB: {
        blocks: [createKangurLessonSvgBlock(), createKangurLessonGridBlock()],
      },
    });

    expect(Object.keys(store)).toEqual(['lessonA', 'lessonB']);
    expect(store.lessonB?.blocks).toHaveLength(2);
    expect(store.lessonB?.blocks[1]?.type === 'grid' ? store.lessonB.blocks[1].rowHeight : null).toBe(220);
    expect(store.lessonB?.blocks[1]?.type === 'grid' ? store.lessonB.blocks[1].denseFill : null).toBe(false);
  });

  it('clamps explicit column starts so placed items still fit their column span', () => {
    const document = normalizeKangurLessonDocument({
      blocks: [
        {
          id: 'grid-1',
          type: 'grid',
          columns: 3,
          gap: 16,
          rowHeight: 220,
          denseFill: true,
          stackOnMobile: true,
          items: [
            {
              id: 'item-1',
              colSpan: 2,
              rowSpan: 1,
              columnStart: 3,
              rowStart: 1,
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
    });

    expect(document.blocks[0]?.type === 'grid' ? document.blocks[0].items[0]?.columnStart : null).toBe(2);
  });

  it('converts inline blocks between text and svg without changing the block id', () => {
    const textBlock = {
      id: 'lesson-text-1',
      type: 'text' as const,
      html: '<p>Triangle example</p>',
      ttsText: 'Triangle narration',
      align: 'right' as const,
    };
    const svgBlock = convertKangurLessonInlineBlockType(textBlock, 'svg');

    expect(svgBlock.id).toBe('lesson-text-1');
    expect(svgBlock.type).toBe('svg');
    expect(svgBlock.align).toBe('right');
    expect(svgBlock.title).toBe('Triangle example');
    expect(svgBlock.ttsDescription).toBe('Triangle narration');

    const convertedBackToText = convertKangurLessonInlineBlockType(svgBlock, 'text');
    expect(convertedBackToText.id).toBe('lesson-text-1');
    expect(convertedBackToText.type).toBe('text');
    expect(convertedBackToText.align).toBe('right');
    expect(convertedBackToText.html).toContain('Triangle example');
    expect(convertedBackToText.ttsText).toBe('Triangle narration');
  });

  it('detects whether a document has meaningful content', () => {
    expect(
      hasKangurLessonDocumentContent({
        version: 1,
        blocks: [{ id: 'text-empty', type: 'text', html: '<p> </p>', align: 'left' }],
      })
    ).toBe(false);

    expect(
      hasKangurLessonDocumentContent({
        version: 1,
        blocks: [{ id: 'svg-1', type: 'svg', title: '', markup: '<circle cx="5" cy="5" r="5" />', viewBox: '0 0 10 10', align: 'center', fit: 'contain', maxWidth: 320 }],
      })
    ).toBe(true);
  });

  it('builds template-based grid layouts for common lesson distributions', () => {
    const threeColumn = createKangurLessonGridBlockFromTemplate('three-column');
    const heroLeft = createKangurLessonGridBlockFromTemplate('hero-left');
    const heroRight = createKangurLessonGridBlockFromTemplate('hero-right');
    const svgDuo = createKangurLessonGridBlockFromTemplate('svg-duo');
    const svgTrio = createKangurLessonGridBlockFromTemplate('svg-trio');
    const svgGallery = createKangurLessonGridBlockFromTemplate('svg-gallery');
    const svgMosaic = createKangurLessonGridBlockFromTemplate('svg-mosaic');

    expect(threeColumn.columns).toBe(3);
    expect(threeColumn.items).toHaveLength(3);

    expect(heroLeft.columns).toBe(3);
    expect(heroLeft.items).toHaveLength(2);
    expect(heroLeft.items[0]?.colSpan).toBe(2);
    expect(heroLeft.items[0]?.block.type).toBe('text');
    expect(heroLeft.items[1]?.block.type).toBe('svg');

    expect(heroRight.items[0]?.block.type).toBe('svg');
    expect(heroRight.items[1]?.colSpan).toBe(2);

    expect(svgDuo.columns).toBe(2);
    expect(svgDuo.items).toHaveLength(2);
    expect(svgDuo.items.every((item) => item.block.type === 'svg')).toBe(true);

    expect(svgTrio.columns).toBe(3);
    expect(svgTrio.items).toHaveLength(3);
    expect(svgTrio.items.every((item) => item.block.type === 'svg')).toBe(true);

    expect(svgGallery.columns).toBe(2);
    expect(svgGallery.items).toHaveLength(4);
    expect(svgGallery.items.every((item) => item.block.type === 'svg')).toBe(true);

    expect(svgMosaic.columns).toBe(3);
    expect(svgMosaic.rowHeight).toBe(180);
    expect(svgMosaic.denseFill).toBe(true);
    expect(svgMosaic.items).toHaveLength(4);
    expect(svgMosaic.items[0]?.colSpan).toBe(2);
    expect(svgMosaic.items[0]?.rowSpan).toBe(2);
    expect(svgMosaic.items[0]?.columnStart).toBe(1);
    expect(svgMosaic.items[0]?.rowStart).toBe(1);
    expect(svgMosaic.items[1]?.columnStart).toBe(3);
    expect(svgMosaic.items[1]?.rowStart).toBe(1);
    expect(svgMosaic.items.every((item) => item.block.type === 'svg')).toBe(true);
  });

  it('builds document page templates and starter templates by lesson component', () => {
    const article = createKangurLessonDocumentFromTemplate('article');
    const textWithFigure = createKangurLessonDocumentFromTemplate('text-with-figure');
    const svgGalleryPage = createKangurLessonDocumentFromTemplate('svg-gallery-page');
    const svgMosaicPage = createKangurLessonDocumentFromTemplate('svg-mosaic-page');

    expect(article.blocks).toHaveLength(1);
    expect(article.blocks[0]?.type).toBe('text');

    expect(textWithFigure.blocks).toHaveLength(2);
    expect(textWithFigure.blocks[0]?.type).toBe('text');
    expect(textWithFigure.blocks[1]?.type).toBe('grid');

    expect(svgGalleryPage.blocks).toHaveLength(2);
    expect(svgGalleryPage.blocks[1]?.type).toBe('grid');
    expect(
      svgGalleryPage.blocks[1]?.type === 'grid'
        ? svgGalleryPage.blocks[1].items.every((item) => item.block.type === 'svg')
        : false
    ).toBe(true);

    expect(svgMosaicPage.blocks).toHaveLength(2);
    expect(svgMosaicPage.blocks[1]?.type).toBe('grid');
    expect(svgMosaicPage.blocks[1]?.type === 'grid' ? svgMosaicPage.blocks[1].denseFill : false).toBe(true);
    expect(svgMosaicPage.blocks[1]?.type === 'grid' ? svgMosaicPage.blocks[1].items[0]?.columnStart : null).toBe(1);

    expect(resolveStarterKangurLessonDocumentTemplate('geometry_shapes')).toBe('svg-mosaic-page');
    expect(resolveStarterKangurLessonDocumentTemplate('logical_patterns')).toBe('article');
    expect(resolveStarterKangurLessonDocumentTemplate('clock')).toBe('text-with-figure');

    const geometryStarter = createStarterKangurLessonDocument('geometry_shapes');
    expect(geometryStarter.blocks[1]?.type).toBe('grid');
    expect(geometryStarter.blocks[1]?.type === 'grid' ? geometryStarter.blocks[1].denseFill : false).toBe(true);
  });
});
