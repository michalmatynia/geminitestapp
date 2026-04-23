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

const serializeField = (spec: ExtractFieldSpec): string => JSON.stringify(spec);

export const createPlaywrightPageDriver = (page: Page): PageDriver => ({
  async goto(url, options?: GotoOptions) {
    await page.goto(url, {
      waitUntil: options?.waitUntil ?? 'domcontentloaded',
      timeout: DEFAULT_TIMEOUT_MS,
    });
  },

  async currentUrl() {
    return page.url();
  },

  async waitFor(options: WaitForOptions) {
    const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (options.state === 'networkidle') {
      await page.waitForLoadState('networkidle', { timeout });
      return;
    }
    if (options.selector) {
      await page.waitForSelector(options.selector, {
        state: options.state === 'hidden' ? 'hidden' : options.state === 'attached' ? 'attached' : 'visible',
        timeout,
      });
    }
  },

  async tryClick(selectors: string[]) {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      try {
        const count = await locator.count();
        if (count === 0) continue;
        await locator.click({ timeout: 2_000 });
        return selector;
      } catch {
        continue;
      }
    }
    return null;
  },

  async extractJsonLd() {
    return page.evaluate<unknown[]>(() => {
      const scripts = Array.from(
        document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')
      );
      const out: unknown[] = [];
      for (const script of scripts) {
        const text = script.textContent?.trim();
        if (!text) continue;
        try {
          out.push(JSON.parse(text));
        } catch {
          // skip malformed
        }
      }
      return out;
    });
  },

  async extractList(itemSelector, fields) {
    const serialized: Array<[string, string]> = Object.entries(fields).map(([key, spec]) => [
      key,
      serializeField(spec),
    ]);
    return page.evaluate<
      Array<Record<string, ExtractedFieldValue>>,
      { itemSelector: string; fields: Array<[string, string]> }
    >(
      ({ itemSelector: sel, fields: fieldEntries }) => {
        const parsed = fieldEntries.map(([key, json]) => [key, JSON.parse(json) as ExtractFieldSpec] as const);
        const items = Array.from(document.querySelectorAll(sel));
        const readField = (root: Element, spec: ExtractFieldSpec): ExtractedFieldValue => {
          const scope = spec.selector ? Array.from(root.querySelectorAll(spec.selector)) : [root];
          const targets = spec.many ? scope : scope.slice(0, 1);
          if (targets.length === 0) return null;
          const values = targets
            .map((el) => {
              if (spec.attribute) return el.getAttribute(spec.attribute);
              if (spec.html) return el.innerHTML;
              if (spec.text !== false) return (el.textContent ?? '').trim();
              return null;
            })
            .filter((v): v is string => typeof v === 'string' && v.length > 0);
          if (spec.many) return values;
          return values.length > 0 ? (values[0] ?? null) : null;
        };
        return items.map((item) => {
          const row: Record<string, ExtractedFieldValue> = {};
          for (const [key, spec] of parsed) {
            row[key] = readField(item, spec);
          }
          return row;
        });
      },
      { itemSelector, fields: serialized }
    );
  },

  async scrollToBottom() {
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          window.scrollTo(0, document.body.scrollHeight);
          window.setTimeout(resolve, 250);
        })
    );
  },
});
