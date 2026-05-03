// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { computeSelectorForElement } from './iframe-selector';

const renderInDoc = (html: string): Document => {
  const doc = document.implementation.createHTMLDocument('test');
  doc.body.innerHTML = html;
  return doc;
};

describe('computeSelectorForElement', () => {
  it('prefers stable test attributes immediately', () => {
    const doc = renderInDoc('<button data-testid="submit">x</button>');
    const el = doc.querySelector('button')!;
    expect(computeSelectorForElement(el)).toBe('[data-testid="submit"]');
  });

  it('falls back to id when stable', () => {
    const doc = renderInDoc('<div id="root"><span>x</span></div>');
    const el = doc.querySelector('#root')!;
    expect(computeSelectorForElement(el)).toBe('#root');
  });

  it('builds a uniquely-matching selector and uses ancestor classes when needed', () => {
    const doc = renderInDoc(
      '<main><article class="card"><h1>x</h1></article><article class="card"><h1>y</h1></article></main>'
    );
    const el = doc.querySelectorAll('h1')[1]!;
    const selector = computeSelectorForElement(el);
    expect(doc.querySelectorAll(selector).length).toBe(1);
    expect(selector).toMatch(/article\.card/);
  });

  it('uses nth-of-type when classes are missing and siblings collide', () => {
    const doc = renderInDoc('<ul><li>a</li><li>b</li><li>c</li></ul>');
    const el = doc.querySelectorAll('li')[1]!;
    const selector = computeSelectorForElement(el);
    expect(selector).toMatch(/li:nth-of-type\(2\)/);
    expect(doc.querySelectorAll(selector).length).toBe(1);
  });

  it('ignores utility-style class names like sc-xyz', () => {
    const doc = renderInDoc('<section><div class="sc-abc product-tile">x</div></section>');
    const el = doc.querySelector('.product-tile')!;
    const selector = computeSelectorForElement(el);
    expect(selector).not.toMatch(/sc-abc/);
    expect(selector).toMatch(/product-tile/);
  });
});
