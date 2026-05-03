import { describe, expect, it } from 'vitest';

import {
  createEmailBlock,
  type EmailBlock,
  type EmailColumnsBlock,
  type EmailHeadingBlock,
  type EmailRowBlock,
  type EmailSectionBlock,
  type EmailTextBlock,
} from '../block-model';
import { compileBlocksToHtml, compileBlocksToPlainText } from '../compile-blocks';

const escape = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('compileBlocksToHtml', () => {
  it('produces an empty string for no blocks', () => {
    expect(compileBlocksToHtml([])).toBe('');
  });

  it('wraps a flat heading + text in the outer 600px table', () => {
    const heading = createEmailBlock('heading', { text: 'Welcome', level: 1 });
    const text = createEmailBlock('text', { html: '<p>Hello</p>' });
    const html = compileBlocksToHtml([heading, text]);
    expect(html).toMatch(/<!doctype html>/i);
    expect(html).toContain('width="600"');
    expect(html).toContain('Welcome');
    expect(html).toContain('<p>Hello</p>');
  });

  it('renders a section containing a row of leaves with one outer wrapper, no double-wrapped tables', () => {
    const heading = createEmailBlock('heading', {
      id: 'h1',
      text: 'Welcome',
    }) as EmailHeadingBlock;
    const text = createEmailBlock('text', { id: 't1', html: '<p>Body</p>' }) as EmailTextBlock;
    const row = createEmailBlock('row', { id: 'r1', children: [heading, text] }) as EmailRowBlock;
    const section = createEmailBlock('section', {
      id: 's1',
      background: '#ffffff',
      paddingY: 24,
      paddingX: 24,
      children: [row],
    }) as EmailSectionBlock;

    const html = compileBlocksToHtml([section]);
    // Section padding present.
    expect(html).toMatch(/padding:24px 24px;/);
    // No `<table><table>` invalid nesting.
    expect(html).not.toMatch(/<table[^>]*>\s*<table/i);
    // Heading and text both rendered.
    expect(html).toContain('Welcome');
    expect(html).toContain('<p>Body</p>');
  });

  it('renders a Columns block with N cells, each containing the column row content', () => {
    const leftHeading = createEmailBlock('heading', {
      id: 'lh',
      text: 'Left',
    }) as EmailHeadingBlock;
    const rightHeading = createEmailBlock('heading', {
      id: 'rh',
      text: 'Right',
    }) as EmailHeadingBlock;
    const leftRow = createEmailBlock('row', { id: 'rL', children: [leftHeading] }) as EmailRowBlock;
    const rightRow = createEmailBlock('row', {
      id: 'rR',
      children: [rightHeading],
    }) as EmailRowBlock;
    const columns = createEmailBlock('columns', {
      id: 'c1',
      gap: 16,
      children: [leftRow, rightRow],
    }) as EmailColumnsBlock;
    const section = createEmailBlock('section', {
      id: 's1',
      children: [columns],
    }) as EmailSectionBlock;

    const html = compileBlocksToHtml([section]);
    // Two cells with width=50%.
    const cellMatches = html.match(/width="50%"/g) ?? [];
    expect(cellMatches.length).toBe(2);
    // Both column headings rendered.
    expect(html).toContain('Left');
    expect(html).toContain('Right');
    // Half-gap padding rendered.
    expect(html).toMatch(new RegExp(escape('padding:0 8px;')));
  });
});

describe('compileBlocksToPlainText', () => {
  it('walks nested blocks depth-first', () => {
    const text = createEmailBlock('text', { html: '<p>Hello world</p>' }) as EmailTextBlock;
    const heading = createEmailBlock('heading', { text: 'Title' }) as EmailHeadingBlock;
    const row = createEmailBlock('row', { children: [heading, text] }) as EmailRowBlock;
    const section = createEmailBlock('section', { children: [row] }) as EmailSectionBlock;
    const tree: EmailBlock[] = [section];

    const plain = compileBlocksToPlainText(tree);
    expect(plain).toContain('Title');
    expect(plain).toContain('Hello world');
  });
});
