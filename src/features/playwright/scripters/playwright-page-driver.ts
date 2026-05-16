import 'server-only';

import type { Page } from 'playwright';

import type {
  ExtractFieldSpec,
  ExtractedFieldValue,
  GotoOptions,
  PageDriver,
  WaitForOptions,
} from './page-driver';

const DEFAULT_TIMEOUT_MS = 15_000;
const EXTRACT_JSON_LD_FUNCTION_SOURCE = String.raw`() => {
  const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  const out = [];
  for (const script of scripts) {
    const text = script.text.trim();
    if (text.length === 0) continue;
    try {
      out.push(JSON.parse(text));
    } catch {
      // skip malformed
    }
  }
  return out;
}`;
const EXTRACT_LIST_FUNCTION_SOURCE = String.raw`({ itemSelector: sel, fields: fieldEntries }) => {
  const parsed = fieldEntries.map(([key, json]) => [key, JSON.parse(json)]);
  const items = Array.from(document.querySelectorAll(sel));
  const readField = (root, spec) => {
    const scope = spec.selector ? Array.from(root.querySelectorAll(spec.selector)) : [root];
    const targets = spec.many ? scope : scope.slice(0, 1);
    if (targets.length === 0) return null;
    const values = targets
      .map((el) => {
        if (spec.attribute) return el.getAttribute(spec.attribute);
        if (spec.html) return el.innerHTML;
        if (spec.text !== false) return (el.textContent || '').trim();
        return null;
      })
      .filter((value) => typeof value === 'string' && value.length > 0);
    if (spec.many) return values;
    return values.length > 0 ? values[0] || null : null;
  };
  return items.map((item) => {
    const row = {};
    for (const [key, spec] of parsed) {
      row[key] = readField(item, spec);
    }
    return row;
  });
}`;
const SCROLL_TO_BOTTOM_FUNCTION_SOURCE = String.raw`() =>
  new Promise((resolve) => {
    window.scrollTo(0, document.body.scrollHeight);
    setTimeout(resolve, 250);
  })`;

const serializeField = (spec: ExtractFieldSpec): string => JSON.stringify(spec);
const buildPageExpression = (source: string, arg?: unknown): string =>
  arg === undefined ? `(${source})()` : `(${source})(${JSON.stringify(arg)})`;

const resolveWaitForSelectorState = (
  state: WaitForOptions['state']
): 'attached' | 'hidden' | 'visible' => {
  if (state === 'hidden') return 'hidden';
  if (state === 'attached') return 'attached';
  return 'visible';
};

const createGoto =
  (page: Page): PageDriver['goto'] =>
  async (url: string, options?: GotoOptions): Promise<void> => {
    await page.goto(url, {
      waitUntil: options?.waitUntil ?? 'domcontentloaded',
      timeout: DEFAULT_TIMEOUT_MS,
    });
  };

const createCurrentUrl =
  (page: Page): PageDriver['currentUrl'] =>
  () =>
    Promise.resolve(page.url());

const createWaitFor =
  (page: Page): PageDriver['waitFor'] =>
  async (options: WaitForOptions): Promise<void> => {
    const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (options.state === 'networkidle') {
      await page.waitForLoadState('networkidle', { timeout });
      return;
    }
    if (typeof options.selector === 'string' && options.selector.length > 0) {
      await page.waitForSelector(options.selector, {
        state: resolveWaitForSelectorState(options.state),
        timeout,
      });
    }
  };

const createTryClick =
  (page: Page): PageDriver['tryClick'] =>
  async (selectors: string[]): Promise<string | null> =>
    await selectors.reduce<Promise<string | null>>(async (previous, selector) => {
      const clicked = await previous;
      if (clicked !== null) return clicked;
      const locator = page.locator(selector).first();
      try {
        const count = await locator.count();
        if (count === 0) return null;
        await locator.click({ timeout: 2_000 });
        return selector;
      } catch {
        return null;
      }
    }, Promise.resolve(null));

const createExtractJsonLd =
  (page: Page): PageDriver['extractJsonLd'] =>
  async (): Promise<unknown[]> =>
    await page.evaluate<unknown[]>(buildPageExpression(EXTRACT_JSON_LD_FUNCTION_SOURCE));

const createExtractList =
  (page: Page): PageDriver['extractList'] =>
  async (
    itemSelector: string,
    fields: Record<string, ExtractFieldSpec>
  ): Promise<Array<Record<string, ExtractedFieldValue>>> => {
    const serialized: Array<[string, string]> = Object.entries(fields).map(([key, spec]) => [
      key,
      serializeField(spec),
    ]);
    return page.evaluate<Array<Record<string, ExtractedFieldValue>>>(
      buildPageExpression(EXTRACT_LIST_FUNCTION_SOURCE, { itemSelector, fields: serialized })
    );
  };

const createScrollToBottom =
  (page: Page): PageDriver['scrollToBottom'] =>
  async (): Promise<void> => {
    await page.evaluate<void>(buildPageExpression(SCROLL_TO_BOTTOM_FUNCTION_SOURCE));
  };

export const createPlaywrightPageDriver = (page: Page): PageDriver => ({
  goto: createGoto(page),
  currentUrl: createCurrentUrl(page),
  waitFor: createWaitFor(page),
  tryClick: createTryClick(page),
  extractJsonLd: createExtractJsonLd(page),
  extractList: createExtractList(page),
  scrollToBottom: createScrollToBottom(page),
});
