import { describe, expect, it } from 'vitest';

import type { BlockInstance, Page } from '@/shared/contracts/cms';

import {
  buildCmsPageCanonicalText,
  buildCmsPageSemanticText,
  extractBlockTexts,
  extractCmsPageTextContent,
  hasMeaningfulTextContent,
} from '../cms-text-extractor';

const makeBlock = (
  type: string,
  settings: Record<string, unknown>,
  blocks?: BlockInstance[]
): BlockInstance => ({
  id: `block-${Math.random().toString(36).slice(2, 8)}`,
  type,
  settings,
  blocks,
});

const makePage = (overrides: Partial<Page> = {}): Page => ({
  id: 'page-1',
  name: 'Test Page',
  status: 'published',
  themeId: null,
  showMenu: true,
  components: [],
  slugs: [{ id: 'slug-1', slug: 'test-page', isDefault: true, createdAt: '', updatedAt: '' }],
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

describe('extractBlockTexts', () => {
  it('extracts headingText from Heading blocks', () => {
    const block = makeBlock('Heading', { headingText: 'Welcome to Kangur' });
    expect(extractBlockTexts(block)).toEqual(['Welcome to Kangur']);
  });

  it('extracts textContent from Text blocks', () => {
    const block = makeBlock('Text', { textContent: 'Learn math with fun!' });
    expect(extractBlockTexts(block)).toEqual(['Learn math with fun!']);
  });

  it('extracts textContent from TextElement blocks', () => {
    const block = makeBlock('TextElement', { textContent: 'Element text', fontSize: 16 });
    expect(extractBlockTexts(block)).toEqual(['Element text']);
  });

  it('extracts text from TextAtom blocks', () => {
    const block = makeBlock('TextAtom', { text: 'Atom text', alignment: 'left' });
    expect(extractBlockTexts(block)).toEqual(['Atom text']);
  });

  it('extracts buttonLabel from Button blocks', () => {
    const block = makeBlock('Button', { buttonLabel: 'Start Learning', buttonLink: '/start' });
    expect(extractBlockTexts(block)).toEqual(['Start Learning']);
  });

  it('extracts inputPlaceholder from Input blocks', () => {
    const block = makeBlock('Input', { inputPlaceholder: 'Type your answer' });
    expect(extractBlockTexts(block)).toEqual(['Type your answer']);
  });

  it('skips empty string values', () => {
    const block = makeBlock('Text', { textContent: '' });
    expect(extractBlockTexts(block)).toEqual([]);
  });

  it('skips whitespace-only values', () => {
    const block = makeBlock('Text', { textContent: '   ' });
    expect(extractBlockTexts(block)).toEqual([]);
  });

  it('ignores non-text settings keys', () => {
    const block = makeBlock('Heading', {
      headingText: 'Title',
      headingSize: 'medium',
      textColor: '#000',
      fontSize: 24,
    });
    expect(extractBlockTexts(block)).toEqual(['Title']);
  });

  it('returns empty array for layout-only blocks', () => {
    const block = makeBlock('Block', { colorScheme: 'none', blockGap: 0 });
    expect(extractBlockTexts(block)).toEqual([]);
  });

  it('recursively extracts text from nested blocks', () => {
    const block = makeBlock('Block', {}, [
      makeBlock('Heading', { headingText: 'Section Title' }),
      makeBlock('Text', { textContent: 'Section body text.' }),
    ]);
    expect(extractBlockTexts(block)).toEqual(['Section Title', 'Section body text.']);
  });

  it('handles deeply nested blocks', () => {
    const block = makeBlock('Block', {}, [
      makeBlock('Block', {}, [
        makeBlock('Block', {}, [makeBlock('Heading', { headingText: 'Deep heading' })]),
      ]),
    ]);
    expect(extractBlockTexts(block)).toEqual(['Deep heading']);
  });

  it('returns empty array for unknown block types', () => {
    const block = makeBlock('CustomWidget', { someField: 'value' });
    expect(extractBlockTexts(block)).toEqual([]);
  });
});

describe('extractCmsPageTextContent', () => {
  it('extracts text from page components sorted by order', () => {
    const page = makePage({
      seoTitle: 'Kangur Test',
      seoDescription: 'Math learning platform',
      components: [
        {
          type: 'section',
          order: 2,
          content: {
            zone: 'template',
            settings: {},
            blocks: [makeBlock('Text', { textContent: 'Second section' })],
            sectionId: 'sec-2',
            parentSectionId: null,
          },
        },
        {
          type: 'hero',
          order: 1,
          content: {
            zone: 'header',
            settings: {},
            blocks: [makeBlock('Heading', { headingText: 'Welcome' })],
            sectionId: 'sec-1',
            parentSectionId: null,
          },
        },
      ],
    });

    const result = extractCmsPageTextContent(page);

    expect(result.pageId).toBe('page-1');
    expect(result.pageName).toBe('Test Page');
    expect(result.seoTitle).toBe('Kangur Test');
    expect(result.seoDescription).toBe('Math learning platform');
    expect(result.slug).toBe('test-page');
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].texts).toEqual(['Welcome']);
    expect(result.sections[1].texts).toEqual(['Second section']);
  });

  it('skips components with no text content', () => {
    const page = makePage({
      components: [
        {
          type: 'spacer',
          order: 1,
          content: {
            zone: 'template',
            settings: {},
            blocks: [makeBlock('Block', { blockGap: 40 })],
            sectionId: 'spacer-1',
            parentSectionId: null,
          },
        },
      ],
    });

    const result = extractCmsPageTextContent(page);
    expect(result.sections).toHaveLength(0);
  });

  it('handles pages with no components', () => {
    const page = makePage({ components: [] });
    const result = extractCmsPageTextContent(page);
    expect(result.sections).toHaveLength(0);
  });

  it('handles pages with no slugs', () => {
    const page = makePage({ slugs: [] });
    const result = extractCmsPageTextContent(page);
    expect(result.slug).toBeNull();
  });
});

describe('hasMeaningfulTextContent', () => {
  it('returns true when text exceeds threshold', () => {
    const content = extractCmsPageTextContent(
      makePage({
        seoTitle: 'A title that is long enough to be meaningful',
        components: [],
      })
    );
    expect(hasMeaningfulTextContent(content)).toBe(true);
  });

  it('returns false for pages with minimal text', () => {
    const content = extractCmsPageTextContent(
      makePage({
        name: 'X',
        seoTitle: undefined,
        seoDescription: undefined,
        components: [],
      })
    );
    expect(hasMeaningfulTextContent(content)).toBe(false);
  });
});

describe('buildCmsPageSemanticText', () => {
  it('joins page name, SEO, slug, and section texts', () => {
    const content = extractCmsPageTextContent(
      makePage({
        name: 'About Us',
        seoTitle: 'About Kangur',
        seoDescription: 'Learn about our mission',
        components: [
          {
            type: 'section',
            order: 1,
            content: {
              zone: 'template',
              settings: {},
              blocks: [makeBlock('Text', { textContent: 'We teach math.' })],
              sectionId: 'sec-1',
              parentSectionId: null,
            },
          },
        ],
      })
    );

    const result = buildCmsPageSemanticText(content);
    expect(result).toContain('About Us');
    expect(result).toContain('About Kangur');
    expect(result).toContain('Learn about our mission');
    expect(result).toContain('test-page');
    expect(result).toContain('We teach math.');
  });

  it('deduplicates page name and SEO title when identical', () => {
    const content = extractCmsPageTextContent(
      makePage({
        name: 'Home',
        seoTitle: 'Home',
      })
    );

    const result = buildCmsPageSemanticText(content);
    const occurrences = result.split('Home').length - 1;
    expect(occurrences).toBe(1);
  });

  it('caps output at 2000 characters', () => {
    const longText = 'A'.repeat(3000);
    const content = extractCmsPageTextContent(
      makePage({
        seoDescription: longText,
      })
    );

    const result = buildCmsPageSemanticText(content);
    expect(result.length).toBeLessThanOrEqual(2000);
  });
});

describe('buildCmsPageCanonicalText', () => {
  it('combines SEO and section texts with newlines', () => {
    const content = extractCmsPageTextContent(
      makePage({
        seoTitle: 'Page Title',
        seoDescription: 'Page description',
        components: [
          {
            type: 'section',
            order: 1,
            content: {
              zone: 'template',
              settings: {},
              blocks: [
                makeBlock('Heading', { headingText: 'Section 1' }),
                makeBlock('Text', { textContent: 'Body text' }),
              ],
              sectionId: 'sec-1',
              parentSectionId: null,
            },
          },
        ],
      })
    );

    const result = buildCmsPageCanonicalText(content);
    expect(result).toBe('Page Title\nPage description\nSection 1 Body text');
  });
});
