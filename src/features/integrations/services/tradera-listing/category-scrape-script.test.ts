import { beforeEach, describe, expect, it } from 'vitest';

import { extractTraderaCategoryPageChildren } from './category-scrape-script';

const setRectTop = (element: Element | null, top: number): void => {
  if (!element) return;
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: 0,
      y: top,
      top,
      left: 0,
      right: 200,
      bottom: top + 24,
      width: 200,
      height: 24,
      toJSON: () => ({}),
    }),
  });
};

describe('extractTraderaCategoryPageChildren', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('collects visual-band child categories even when filter controls appear earlier in DOM order', () => {
    document.body.innerHTML = `
      <main>
        <h1 id="heading">Pins & needles</h1>
        <div id="filters">All filters</div>
        <div id="subcategory-strip">
          <a id="other-pins" href="https://www.tradera.com/en/category/292904">Other pins & needles</a>
          <a id="sports-pins" href="https://www.tradera.com/en/category/292903">Sports</a>
          <a id="self-link" href="https://www.tradera.com/en/category/2929">Pins & needles</a>
        </div>
      </main>
    `;

    setRectTop(document.querySelector('#heading'), 100);
    setRectTop(document.querySelector('#filters'), 320);
    setRectTop(document.querySelector('#other-pins'), 180);
    setRectTop(document.querySelector('#sports-pins'), 210);
    setRectTop(document.querySelector('#self-link'), 190);

    const result = extractTraderaCategoryPageChildren({
      currentCategory: {
        id: '2929',
        name: 'Pins & needles',
        ancestorIds: ['49'],
      },
      stopTexts: ['all filters', 'newest'],
      blockedUrlHints: ['/login', '/captcha'],
      blockedTextHints: ['log in', 'captcha'],
    });

    expect(result).toEqual({
      blocked: false,
      children: [
        {
          id: '292904',
          name: 'Other pins & needles',
          parentId: '2929',
          url: 'https://www.tradera.com/en/category/292904',
        },
        {
          id: '292903',
          name: 'Sports',
          parentId: '2929',
          url: 'https://www.tradera.com/en/category/292903',
        },
      ],
    });
  });

  it('finds subcategory chips below a fuzzy heading and after the current-category marker', () => {
    document.body.innerHTML = `
      <main>
        <h1 id="heading">Pins &amp; Needles — Collectibles</h1>
        <p id="intro">Collector intro text</p>
        <div id="breadcrumb">
          <a id="parent-link" href="https://www.tradera.com/en/category/49">Collectibles</a>
          <span>/</span>
        </div>
        <div id="current-label">Pins &amp; needles</div>
        <div id="subcategory-strip">
          <a id="other-pins" href="https://www.tradera.com/en/category/292904">Other pins &amp; needles</a>
          <a id="sports-pins" href="https://www.tradera.com/en/category/292903">Sports</a>
        </div>
        <button id="filters">All filters</button>
      </main>
    `;

    setRectTop(document.querySelector('#heading'), 100);
    setRectTop(document.querySelector('#intro'), 150);
    setRectTop(document.querySelector('#breadcrumb'), 210);
    setRectTop(document.querySelector('#parent-link'), 210);
    setRectTop(document.querySelector('#current-label'), 245);
    setRectTop(document.querySelector('#other-pins'), 290);
    setRectTop(document.querySelector('#sports-pins'), 320);
    setRectTop(document.querySelector('#filters'), 380);

    const result = extractTraderaCategoryPageChildren({
      currentCategory: {
        id: '2929',
        name: 'Pins & needles',
        ancestorIds: ['49'],
      },
      stopTexts: ['all filters', 'newest'],
      blockedUrlHints: ['/login', '/captcha'],
      blockedTextHints: ['log in', 'captcha'],
    });

    expect(result).toEqual({
      blocked: false,
      children: [
        {
          id: '292904',
          name: 'Other pins & needles',
          parentId: '2929',
          url: 'https://www.tradera.com/en/category/292904',
        },
        {
          id: '292903',
          name: 'Sports',
          parentId: '2929',
          url: 'https://www.tradera.com/en/category/292903',
        },
      ],
    });
  });
});
