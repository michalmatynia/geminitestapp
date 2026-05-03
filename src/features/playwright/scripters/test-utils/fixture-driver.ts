import { Window } from 'happy-dom';

import type {
  ExtractFieldSpec,
  ExtractedFieldValue,
  PageDriver,
} from '../page-driver';

export type FixtureDriverPage = {
  url: string;
  html: string;
};

export type FixtureDriverOptions = {
  pages: FixtureDriverPage[];
  initialUrl?: string;
  onClickResolveHref?: boolean;
};

const findPage = (pages: FixtureDriverPage[], url: string): FixtureDriverPage | null => {
  const exact = pages.find((p) => p.url === url);
  if (exact) return exact;
  try {
    const target = new URL(url);
    return (
      pages.find((p) => {
        try {
          const candidate = new URL(p.url);
          return candidate.href === target.href;
        } catch {
          return false;
        }
      }) ?? null
    );
  } catch {
    return null;
  }
};

const readField = (root: Element, spec: ExtractFieldSpec): ExtractedFieldValue => {
  const scope = spec.selector ? Array.from(root.querySelectorAll(spec.selector)) : [root];
  const targets = spec.many ? scope : scope.slice(0, 1);
  if (targets.length === 0) return null;
  const values = targets
    .map((el) => {
      if (spec.attribute) return el.getAttribute(spec.attribute);
      if (spec.html) return (el as { innerHTML?: string }).innerHTML ?? null;
      if (spec.text !== false) return ((el.textContent ?? '')).trim();
      return null;
    })
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
  if (spec.many) return values;
  return values.length > 0 ? (values[0] ?? null) : null;
};

export const createFixtureDriver = (options: FixtureDriverOptions): PageDriver => {
  let activeUrl = options.initialUrl ?? options.pages[0]?.url ?? 'about:blank';
  const window = new Window();
  const document = window.document;

  const loadPage = (page: FixtureDriverPage | null): void => {
    if (!page) {
      document.documentElement.innerHTML = '<head></head><body></body>';
      activeUrl = 'about:blank';
      return;
    }
    document.documentElement.innerHTML = page.html;
    activeUrl = page.url;
  };

  loadPage(findPage(options.pages, activeUrl));

  return {
    async goto(url) {
      loadPage(findPage(options.pages, url));
    },
    async currentUrl() {
      return activeUrl;
    },
    async waitFor() {
      return;
    },
    async tryClick(selectors) {
      for (const selector of selectors) {
        const element = document.querySelector(selector) as Element | null;
        if (!element) continue;
        if (options.onClickResolveHref) {
          const href = element.getAttribute('href');
          if (href) {
            const resolved = (() => {
              try {
                return new URL(href, activeUrl).toString();
              } catch {
                return href;
              }
            })();
            const next = findPage(options.pages, resolved);
            if (next) loadPage(next);
          }
        }
        return selector;
      }
      return null;
    },
    async extractJsonLd() {
      const scripts = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      );
      const out: unknown[] = [];
      for (const script of scripts) {
        const text = ((script.textContent ?? '')).trim();
        if (!text) continue;
        try {
          out.push(JSON.parse(text));
        } catch {
          // skip malformed
        }
      }
      return out;
    },
    async extractList(itemSelector, fields) {
      const items = Array.from(document.querySelectorAll(itemSelector));
      return items.map((item) => {
        const row: Record<string, ExtractedFieldValue> = {};
        for (const [key, spec] of Object.entries(fields)) {
          row[key] = readField(item as Element, spec);
        }
        return row;
      });
    },
    async scrollToBottom() {
      return;
    },
  };
};
