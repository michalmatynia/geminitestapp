import { describe, expect, it } from 'vitest';

import { createFixtureDriver } from '../../test-utils/fixture-driver';
import {
  getCleanRecords,
  getMapped,
  loadSemanticScripter,
  loadSemanticScripterFromJson,
  runSemanticScripter,
  upgradeToSemanticDefinition,
} from '../engine';

// ── Minimal valid definition ───────────────────────────────────────────────────

const MINIMAL_DEFINITION = {
  id: 'test-engine',
  version: 1,
  siteHost: 'example.com',
  entryUrl: 'https://example.com/products',
  outputKind: 'product' as const,
  steps: [
    {
      id: 'extract',
      kind: 'extractList' as const,
      itemSelector: '.item',
      fields: {
        title: { selector: '.title' },
        price: { selector: '.price' },
        url: { selector: 'a', attribute: 'href' },
      },
    },
  ],
  fieldMap: {
    bindings: {
      title: { path: 'title', required: true },
      price: { path: 'price' },
      sourceUrl: { path: 'url' },
    },
  },
};

const PRODUCT_PAGE_HTML = `
<html><body>
  <div class="item">
    <span class="title">Gadget Pro</span>
    <span class="price">49.99</span>
    <a href="/products/gadget-pro">Buy</a>
  </div>
  <div class="item">
    <span class="title">Gadget Lite</span>
    <span class="price">19.99</span>
    <a href="/products/gadget-lite">Buy</a>
  </div>
</body></html>
`;

const ARTICLE_DEFINITION = {
  ...MINIMAL_DEFINITION,
  id: 'test-articles',
  outputKind: 'article' as const,
  entryUrl: 'https://news.example.com/articles',
  steps: [
    {
      id: 'extract',
      kind: 'extractList' as const,
      itemSelector: 'article',
      fields: {
        url: { selector: 'a', attribute: 'href' },
        headline: { selector: 'h2' },
        body: { selector: 'p.body' },
        byline: { selector: '.author' },
      },
    },
  ],
  fieldMap: {
    bindings: {
      sourceUrl: { path: 'url', required: true },
      title: { path: 'headline' },
      bodyText: { path: 'body' },
      author: { path: 'byline' },
    },
  },
};

const ARTICLE_PAGE_HTML = `
<html><body>
  <article>
    <h2>AI Takes Over</h2>
    <a href="/articles/ai-takes-over">Read</a>
    <p class="body">${'word '.repeat(60).trim()}</p>
    <span class="author">Alice B</span>
  </article>
  <article>
    <h2>Short Blurb</h2>
    <a href="/articles/short-blurb">Read</a>
    <p class="body">Just ten words here only for test use.</p>
    <span class="author">Bob C</span>
  </article>
</body></html>
`;

const JOB_DEFINITION = {
  ...MINIMAL_DEFINITION,
  id: 'test-jobs',
  outputKind: 'job' as const,
  entryUrl: 'https://careers.example.com/jobs',
  steps: [
    {
      id: 'extract',
      kind: 'extractList' as const,
      itemSelector: '.job',
      fields: {
        url: { selector: 'a', attribute: 'href' },
        jobTitle: { selector: '.title' },
        employer: { selector: '.company' },
        city: { selector: '.location' },
      },
    },
  ],
  fieldMap: {
    bindings: {
      sourceUrl: { path: 'url', required: true },
      title: { path: 'jobTitle' },
      company: { path: 'employer' },
      location: { path: 'city' },
    },
  },
};

const JOB_PAGE_HTML = `
<html><body>
  <div class="job">
    <span class="title">Backend Engineer</span>
    <a href="/jobs/backend-eng">Details</a>
    <span class="company">BuildCo</span>
    <span class="location">Berlin</span>
  </div>
</body></html>
`;

// ── loadSemanticScripter ───────────────────────────────────────────────────────

describe('loadSemanticScripter', () => {
  it('successfully parses a valid definition object', () => {
    const result = loadSemanticScripter(MINIMAL_DEFINITION);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.definition.id).toBe('test-engine');
      expect(result.definition.outputKind).toBe('product');
    }
  });

  it('returns errors for an invalid definition', () => {
    const result = loadSemanticScripter({ id: '', version: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('defaults outputKind to product when omitted', () => {
    const { outputKind: _, ...noKind } = MINIMAL_DEFINITION;
    const result = loadSemanticScripter(noKind);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.definition.outputKind).toBe('product');
    }
  });
});

describe('loadSemanticScripterFromJson', () => {
  it('parses valid JSON string', () => {
    const result = loadSemanticScripterFromJson(JSON.stringify(MINIMAL_DEFINITION));
    expect(result.ok).toBe(true);
  });

  it('returns error for invalid JSON', () => {
    const result = loadSemanticScripterFromJson('{bad json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/Invalid JSON/);
    }
  });
});

// ── upgradeToSemanticDefinition ───────────────────────────────────────────────

describe('upgradeToSemanticDefinition', () => {
  it('adds outputKind:product to a legacy definition', () => {
    const legacy: Record<string, unknown> = { ...MINIMAL_DEFINITION };
    delete legacy.outputKind;
    const upgraded = upgradeToSemanticDefinition(legacy);
    expect(upgraded.outputKind).toBe('product');
    expect(upgraded.id).toBe('test-engine');
  });

  it('preserves an explicit outputKind when present', () => {
    const upgraded = upgradeToSemanticDefinition({ ...MINIMAL_DEFINITION, outputKind: 'article' });
    expect(upgraded.outputKind).toBe('article');
  });
});

// ── runSemanticScripter ───────────────────────────────────────────────────────

describe('runSemanticScripter — product', () => {
  it('extracts product records and returns SemanticRunResult', async () => {
    const loaded = loadSemanticScripter(MINIMAL_DEFINITION);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const driver = createFixtureDriver({
      initialUrl: 'https://example.com/products',
      pages: [{ url: 'https://example.com/products', html: PRODUCT_PAGE_HTML }],
    });

    const result = await runSemanticScripter(loaded.definition, driver);
    expect(result.scripterId).toBe('test-engine');
    expect(result.outputKind).toBe('product');
    expect(result.records).toHaveLength(2);
    expect(result.summary.total).toBe(2);

    const titles = result.records.map((r) => r.mapped.title);
    expect(titles).toContain('Gadget Pro');
    expect(titles).toContain('Gadget Lite');
  });

  it('evaluates price as a number', async () => {
    const loaded = loadSemanticScripter(MINIMAL_DEFINITION);
    if (!loaded.ok) return;

    const driver = createFixtureDriver({
      initialUrl: 'https://example.com/products',
      pages: [{ url: 'https://example.com/products', html: PRODUCT_PAGE_HTML }],
    });

    const result = await runSemanticScripter(loaded.definition, driver);
    const gadgetPro = result.records.find((r) => r.mapped.title === 'Gadget Pro');
    expect(gadgetPro?.mapped.price).toBe(49.99);
  });

  it('resolves sourceUrl from relative path', async () => {
    const loaded = loadSemanticScripter(MINIMAL_DEFINITION);
    if (!loaded.ok) return;

    const driver = createFixtureDriver({
      initialUrl: 'https://example.com/products',
      pages: [{ url: 'https://example.com/products', html: PRODUCT_PAGE_HTML }],
    });

    const result = await runSemanticScripter(loaded.definition, driver);
    expect(result.records[0]?.raw['url']).toBe('/products/gadget-pro');
  });
});

describe('runSemanticScripter — article', () => {
  it('extracts article records with bodyText', async () => {
    const loaded = loadSemanticScripter(ARTICLE_DEFINITION);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const driver = createFixtureDriver({
      initialUrl: 'https://news.example.com/articles',
      pages: [{ url: 'https://news.example.com/articles', html: ARTICLE_PAGE_HTML }],
    });

    const result = await runSemanticScripter(loaded.definition, driver);
    expect(result.outputKind).toBe('article');
    expect(result.records).toHaveLength(2);

    const longArticle = result.records.find((r) => r.mapped.title === 'AI Takes Over');
    expect(longArticle?.mapped.author).toBe('Alice B');
    expect(longArticle?.mapped.bodyText).toBeTruthy();
  });
});

describe('runSemanticScripter — job', () => {
  it('extracts job records', async () => {
    const loaded = loadSemanticScripter(JOB_DEFINITION);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const driver = createFixtureDriver({
      initialUrl: 'https://careers.example.com/jobs',
      pages: [{ url: 'https://careers.example.com/jobs', html: JOB_PAGE_HTML }],
    });

    const result = await runSemanticScripter(loaded.definition, driver);
    expect(result.outputKind).toBe('job');
    expect(result.records).toHaveLength(1);
    expect(result.records[0]?.mapped.company).toBe('BuildCo');
    expect(result.records[0]?.mapped.location).toBe('Berlin');
  });
});

// ── Utility helpers ───────────────────────────────────────────────────────────

describe('getCleanRecords', () => {
  it('filters out records with error issues', async () => {
    const loaded = loadSemanticScripter(MINIMAL_DEFINITION);
    if (!loaded.ok) return;

    const driver = createFixtureDriver({
      initialUrl: 'https://example.com/products',
      pages: [{ url: 'https://example.com/products', html: PRODUCT_PAGE_HTML }],
    });

    const result = await runSemanticScripter(loaded.definition, driver);
    // No required fields missing, so all records should be clean
    const clean = getCleanRecords(result);
    expect(clean).toHaveLength(result.records.length);
  });
});

describe('getMapped', () => {
  it('extracts mapped records from a run result', async () => {
    const loaded = loadSemanticScripter(MINIMAL_DEFINITION);
    if (!loaded.ok) return;

    const driver = createFixtureDriver({
      initialUrl: 'https://example.com/products',
      pages: [{ url: 'https://example.com/products', html: PRODUCT_PAGE_HTML }],
    });

    const result = await runSemanticScripter(loaded.definition, driver);
    const mapped = getMapped(result);
    expect(mapped).toHaveLength(2);
    expect(mapped[0]).toHaveProperty('title');
    expect(mapped[0]).toHaveProperty('raw');
  });
});

// ── Summary ───────────────────────────────────────────────────────────────────

describe('run summary', () => {
  it('counts total, clean, withErrors correctly', async () => {
    // Use a required field that will be missing for one record to create an error
    const defWithRequired = {
      ...MINIMAL_DEFINITION,
      fieldMap: {
        bindings: {
          title: { path: 'title', required: true },
          // sourceUrl required but missing from one item
          sourceUrl: { path: 'missingField', required: true },
        },
      },
    };

    const loaded = loadSemanticScripter(defWithRequired);
    if (!loaded.ok) return;

    const driver = createFixtureDriver({
      initialUrl: 'https://example.com/products',
      pages: [{ url: 'https://example.com/products', html: PRODUCT_PAGE_HTML }],
    });

    const result = await runSemanticScripter(loaded.definition, driver);
    expect(result.summary.total).toBe(2);
    expect(result.summary.withErrors).toBe(2);
    expect(result.summary.clean).toBe(0);
  });
});
