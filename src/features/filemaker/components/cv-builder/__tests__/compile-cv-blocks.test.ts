import { describe, expect, it } from 'vitest';

import {
  createCvBlock,
  type CvBlock,
  type CvProfileHeaderBlock,
  type CvSectionBlock,
  type CvStackBlock,
  type CvSummaryBlock,
} from '../cv-block-model';
import { compileCvBlocksToHtml, compileCvBlocksToPlainText } from '../compile-cv-blocks';

describe('compileCvBlocksToHtml', () => {
  it('renders an A4 CV document with profile content', () => {
    const header = createCvBlock('profileHeader', {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+48 123 456 789',
    }) as CvProfileHeaderBlock;
    const summary = createCvBlock('summary', {
      text: 'Computing pioneer.',
    }) as CvSummaryBlock;
    const stack = createCvBlock('stack', { children: [header, summary] }) as CvStackBlock;
    const section = createCvBlock('section', {
      label: 'Profile',
      children: [stack],
    }) as CvSectionBlock;

    const html = compileCvBlocksToHtml([section]);

    expect(html).toMatch(/<!doctype html>/i);
    expect(html).toContain('@page{size:A4');
    expect(html).toContain('Ada Lovelace');
    expect(html).toContain('ada@example.com');
    expect(html).toContain('Computing pioneer.');
  });

  it('escapes plain-text block fields', () => {
    const block = createCvBlock('summary', {
      text: '<script>alert("x")</script>',
    });
    const html = compileCvBlocksToHtml([block]);

    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert');
  });
});

describe('compileCvBlocksToPlainText', () => {
  it('walks nested blocks depth-first', () => {
    const header = createCvBlock('profileHeader', {
      name: 'Ada Lovelace',
      headline: 'Mathematician',
    }) as CvProfileHeaderBlock;
    const summary = createCvBlock('summary', {
      text: 'Computing pioneer.',
    }) as CvSummaryBlock;
    const tree: CvBlock[] = [
      createCvBlock('section', {
        label: 'Profile',
        children: [createCvBlock('stack', { children: [header, summary] })],
      }) as CvSectionBlock,
    ];

    const plain = compileCvBlocksToPlainText(tree);
    expect(plain).toContain('Profile');
    expect(plain).toContain('Ada Lovelace');
    expect(plain).toContain('Computing pioneer.');
  });
});
