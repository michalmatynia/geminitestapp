import { describe, expect, it } from 'vitest';

import { buildSelectorCandidates, type SelectorElementInfo } from './selector-candidates';

const baseInfo = (overrides: Partial<SelectorElementInfo> = {}): SelectorElementInfo => ({
  tagName: 'div',
  id: null,
  classNames: [],
  attributes: {},
  textContent: null,
  parentTagName: null,
  indexAmongSiblings: 0,
  siblingsOfSameTag: 1,
  ...overrides,
});

describe('buildSelectorCandidates', () => {
  it('prefers data-testid', () => {
    const result = buildSelectorCandidates(
      baseInfo({ tagName: 'button', attributes: { 'data-testid': 'submit' } })
    );
    expect(result[0]).toEqual({
      selector: '[data-testid="submit"]',
      rationale: 'Stable test attribute "data-testid"',
      stability: 'high',
    });
  });

  it('emits id-based selector for stable ids', () => {
    const result = buildSelectorCandidates(baseInfo({ id: 'product-card-1' }));
    expect(result.some((c) => c.selector === '#product-card-1')).toBe(true);
  });

  it('skips ids that look unsafe', () => {
    const result = buildSelectorCandidates(baseInfo({ id: '123 with spaces' }));
    expect(result.some((c) => c.selector.startsWith('#'))).toBe(false);
  });

  it('drops utility-class noise (sc-, css-, numeric)', () => {
    const result = buildSelectorCandidates(
      baseInfo({
        classNames: ['css-1abc', 'sc-xyz', 'product-tile'],
      })
    );
    expect(result.some((c) => c.selector === 'div.product-tile')).toBe(true);
    expect(result.some((c) => c.selector.includes('css-1abc'))).toBe(false);
  });

  it('uses nth-of-type when siblings collide', () => {
    const result = buildSelectorCandidates(
      baseInfo({ parentTagName: 'ul', tagName: 'li', siblingsOfSameTag: 4, indexAmongSiblings: 2 })
    );
    expect(result.some((c) => c.selector === 'ul > li:nth-of-type(3)')).toBe(true);
  });

  it('uses direct child selector when unique', () => {
    const result = buildSelectorCandidates(
      baseInfo({ parentTagName: 'main', tagName: 'h1', siblingsOfSameTag: 1 })
    );
    expect(result.some((c) => c.selector === 'main > h1')).toBe(true);
  });

  it('includes role and aria-label candidates', () => {
    const result = buildSelectorCandidates(
      baseInfo({
        tagName: 'button',
        attributes: { role: 'button', 'aria-label': 'Add to cart' },
      })
    );
    expect(result.some((c) => c.selector === 'button[role="button"]')).toBe(true);
    expect(result.some((c) => c.selector === 'button[aria-label="Add to cart"]')).toBe(true);
  });

  it('falls back to tag-only as last resort', () => {
    const result = buildSelectorCandidates(baseInfo({ tagName: 'span' }));
    expect(result).toEqual([{ selector: 'span', rationale: 'Tag only', stability: 'low' }]);
  });

  it('deduplicates identical selectors', () => {
    const result = buildSelectorCandidates(
      baseInfo({
        tagName: 'a',
        attributes: { 'data-testid': 'link' },
        classNames: ['link'],
      })
    );
    const selectors = result.map((c) => c.selector);
    expect(new Set(selectors).size).toBe(selectors.length);
  });
});
