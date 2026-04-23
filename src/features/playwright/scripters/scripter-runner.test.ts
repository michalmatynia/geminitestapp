import { describe, expect, it } from 'vitest';

import type { ExtractFieldSpec, ExtractedFieldValue, PageDriver } from './page-driver';
import { runScripter } from './scripter-runner';
import type { ScripterDefinition } from './types';

type FakePage = {
  url: string;
  jsonLd?: unknown[];
  list?: Array<Record<string, ExtractedFieldValue>>;
  consentSelector?: string;
};

type FakeDriverOptions = {
  pages: FakePage[];
  onGoto?: (url: string) => void;
};

const createFakeDriver = (opts: FakeDriverOptions): {
  driver: PageDriver;
  calls: string[];
  currentPage: () => FakePage;
} => {
  let index = 0;
  const calls: string[] = [];
  const driver: PageDriver = {
    async goto(url) {
      calls.push(`goto:${url}`);
      opts.onGoto?.(url);
      const found = opts.pages.findIndex((p) => p.url === url);
      if (found >= 0) index = found;
    },
    async currentUrl() {
      return opts.pages[index]!.url;
    },
    async waitFor() {
      calls.push('waitFor');
    },
    async tryClick(selectors: string[]) {
      const page = opts.pages[index]!;
      for (const sel of selectors) {
        if (page.consentSelector === sel) {
          calls.push(`click:${sel}`);
          return sel;
        }
      }
      return null;
    },
    async extractJsonLd() {
      calls.push('jsonLd');
      return opts.pages[index]!.jsonLd ?? [];
    },
    async extractList(itemSelector: string, _fields: Record<string, ExtractFieldSpec>) {
      calls.push(`list:${itemSelector}`);
      return opts.pages[index]!.list ?? [];
    },
    async scrollToBottom() {
      calls.push('scroll');
    },
  };
  return { driver, calls, currentPage: () => opts.pages[index]! };
};

const minimalDef = (
  steps: ScripterDefinition['steps'],
  entryUrl = 'https://shop.example/products'
): ScripterDefinition => ({
  id: 'test',
  version: 1,
  siteHost: 'shop.example',
  entryUrl,
  steps,
  fieldMap: { bindings: { title: { path: 'name' } } },
});

describe('runScripter', () => {
  it('executes goto + extractJsonLd and collects records', async () => {
    const { driver } = createFakeDriver({
      pages: [
        {
          url: 'https://shop.example/products',
          jsonLd: [
            { '@type': 'Product', name: 'Widget', offers: { price: '19.99' } },
            { '@type': 'Organization', name: 'ShopCo' },
          ],
        },
      ],
    });
    const def = minimalDef([
      { id: 'open', kind: 'goto', url: 'https://shop.example/products' },
      { id: 'jsonld', kind: 'extractJsonLd', filterType: 'Product' },
    ]);
    const result = await runScripter(def, driver);
    expect(result.records).toHaveLength(1);
    expect(result.records[0]!['name']).toBe('Widget');
    expect(result.errors).toEqual([]);
    expect(result.visitedUrls).toEqual(['https://shop.example/products']);
  });

  it('extracts list rows and reruns them across paginate iterations', async () => {
    const { driver, calls } = createFakeDriver({
      pages: [
        {
          url: 'https://shop.example/products?page=1',
          list: [{ title: 'A' }, { title: 'B' }],
        },
        {
          url: 'https://shop.example/products?page=2',
          list: [{ title: 'C' }],
        },
      ],
    });
    const def = minimalDef(
      [
        { id: 'open', kind: 'goto', url: 'https://shop.example/products?page=1' },
        {
          id: 'list',
          kind: 'extractList',
          itemSelector: '.product',
          fields: { title: { selector: 'h2' } },
        },
        { id: 'next', kind: 'paginate', strategy: 'queryParam', queryParam: 'page', maxPages: 1 },
      ],
      'https://shop.example/products?page=1'
    );
    const result = await runScripter(def, driver);
    expect(result.records.map((r) => r['title'])).toEqual(['A', 'B', 'C']);
    expect(calls.filter((c) => c.startsWith('list:'))).toHaveLength(2);
    expect(result.telemetry.some((t) => t.iteration === 1)).toBe(true);
  });

  it('stops paginating when nextLink cannot be clicked', async () => {
    const { driver } = createFakeDriver({
      pages: [
        { url: 'https://shop.example/x', list: [{ title: 'A' }], consentSelector: undefined },
      ],
    });
    const def = minimalDef([
      { id: 'open', kind: 'goto', url: 'https://shop.example/x' },
      {
        id: 'list',
        kind: 'extractList',
        itemSelector: '.product',
        fields: { title: {} },
      },
      {
        id: 'next',
        kind: 'paginate',
        strategy: 'nextLink',
        nextSelector: 'a.next',
        maxPages: 5,
      },
    ]);
    const result = await runScripter(def, driver);
    expect(result.records).toHaveLength(1);
    expect(result.errors).toEqual([]);
  });

  it('reports errors from extraction steps without crashing', async () => {
    const failing: PageDriver = {
      async goto() {},
      async currentUrl() {
        return 'https://x';
      },
      async waitFor() {},
      async tryClick() {
        return null;
      },
      async extractJsonLd() {
        throw new Error('jsonld blew up');
      },
      async extractList() {
        return [];
      },
      async scrollToBottom() {},
    };
    const def = minimalDef([
      { id: 'open', kind: 'goto', url: 'https://x' },
      { id: 'jsonld', kind: 'extractJsonLd' },
    ]);
    const result = await runScripter(def, failing);
    expect(result.records).toEqual([]);
    expect(result.errors).toEqual([{ stepId: 'jsonld', message: 'jsonld blew up' }]);
  });

  it('honors abort signals', async () => {
    const { driver } = createFakeDriver({
      pages: [{ url: 'https://x' }],
    });
    const controller = new AbortController();
    controller.abort();
    const def = minimalDef([{ id: 'open', kind: 'goto', url: 'https://x' }]);
    const result = await runScripter(def, driver, { signal: controller.signal });
    expect(result.errors).toEqual([{ stepId: 'open', message: 'Scripter run aborted' }]);
  });
});
