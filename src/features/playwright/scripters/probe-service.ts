import 'server-only';

import type { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';

import { sanitizeHtmlForProbe } from './html-sanitizer';
import {
  createProbeSessionStore,
  type ProbeSessionHandle,
  type ProbeSessionStore,
} from './probe-session';
import { buildSelectorCandidates, type SelectorElementInfo } from './selector-candidates';

export type ProbeStartResult = {
  sessionId: string;
  url: string;
  finalUrl: string;
  title: string;
  sanitizedHtml: string;
  expiresAt: number;
};

export type ProbeMatchPreview = {
  outerHtmlSnippet: string;
  textSnippet: string;
  attributes: Record<string, string>;
};

export type ProbeEvaluateResult = {
  selector: string;
  matchCount: number;
  preview: ProbeMatchPreview[];
  candidates: ReturnType<typeof buildSelectorCandidates>;
};

type LivePageHandle = ProbeSessionHandle & {
  browser: Browser;
  context: BrowserContext;
  page: Page;
};

export type ProbeServiceOptions = {
  ttlMs?: number;
  maxSessions?: number;
  headless?: boolean;
  navigationTimeoutMs?: number;
  evaluateTimeoutMs?: number;
  store?: ProbeSessionStore<LivePageHandle>;
  launchPage?: (url: string, headless: boolean) => Promise<LivePageHandle>;
};

const SNIPPET_LIMIT = 240;
const MAX_PREVIEW_MATCHES = 6;

const truncate = (value: string, max: number): string =>
  value.length <= max ? value : `${value.slice(0, max - 1)}…`;

const collectInfoScript = (selector: string, maxPreview: number): string => `
  (() => {
    const els = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
    const matchCount = els.length;
    const slice = els.slice(0, ${maxPreview});
    const previewItem = (el) => {
      const attrs = {};
      for (const a of Array.from(el.attributes)) attrs[a.name] = a.value;
      return {
        outerHTML: (el.outerHTML || '').slice(0, 500),
        text: (el.textContent || '').trim().slice(0, 240),
        attrs,
      };
    };
    const preview = slice.map(previewItem);
    const first = els[0] || null;
    let info = null;
    if (first) {
      const attrs = {};
      for (const a of Array.from(first.attributes)) attrs[a.name] = a.value;
      const parent = first.parentElement;
      const sameTagSiblings = parent
        ? Array.from(parent.children).filter((c) => c.tagName === first.tagName)
        : [first];
      const indexAmongSiblings = sameTagSiblings.indexOf(first);
      info = {
        tagName: first.tagName.toLowerCase(),
        id: first.id || null,
        classNames: Array.from(first.classList || []),
        attributes: attrs,
        textContent: (first.textContent || '').trim().slice(0, 240),
        parentTagName: parent ? parent.tagName.toLowerCase() : null,
        indexAmongSiblings: indexAmongSiblings < 0 ? 0 : indexAmongSiblings,
        siblingsOfSameTag: sameTagSiblings.length,
      };
    }
    return { matchCount, preview, info };
  })();
`;

const launchPageDefault = async (url: string, headless: boolean): Promise<LivePageHandle> => {
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  } catch (error) {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
    throw error;
  }
  return {
    browser,
    context,
    page,
    async close() {
      await context.close().catch(() => undefined);
      await browser.close().catch(() => undefined);
    },
  };
};

export const createProbeService = (options: ProbeServiceOptions = {}) => {
  const ttlMs = options.ttlMs ?? 5 * 60 * 1000;
  const headless = options.headless ?? true;
  const launchPage = options.launchPage ?? launchPageDefault;
  const store =
    options.store ??
    createProbeSessionStore<LivePageHandle>({
      ttlMs,
      maxSessions: options.maxSessions ?? 4,
    });

  return {
    async start(url: string): Promise<ProbeStartResult> {
      if (!/^https?:\/\//i.test(url)) {
        throw new Error('Probe URL must use http(s)');
      }
      const handle = await launchPage(url, headless);
      const finalUrl = handle.page.url();
      const html = await handle.page.content();
      const title = await handle.page.title().catch(() => '');
      const record = store.create({ url, handle });
      return {
        sessionId: record.id,
        url,
        finalUrl,
        title,
        sanitizedHtml: sanitizeHtmlForProbe(html, { baseUrl: finalUrl, rebasePaths: true }),
        expiresAt: record.lastUsedAt + ttlMs,
      };
    },

    async evaluate(sessionId: string, selector: string): Promise<ProbeEvaluateResult> {
      const record = store.get(sessionId);
      if (!record) throw new Error('Probe session not found or expired');
      store.touch(sessionId);
      if (typeof selector !== 'string' || selector.trim().length === 0) {
        throw new Error('Selector is required');
      }
      const trimmed = selector.trim();
      type RawResult = {
        matchCount: number;
        preview: Array<{ outerHTML: string; text: string; attrs: Record<string, string> }>;
        info: SelectorElementInfo | null;
      };
      const raw = (await record.handle.page.evaluate(
        collectInfoScript(trimmed, MAX_PREVIEW_MATCHES)
      ));
      const candidates = raw.info ? buildSelectorCandidates(raw.info) : [];
      const preview: ProbeMatchPreview[] = raw.preview.map((item) => ({
        outerHtmlSnippet: truncate(item.outerHTML, SNIPPET_LIMIT),
        textSnippet: truncate(item.text, SNIPPET_LIMIT),
        attributes: item.attrs,
      }));
      return { selector: trimmed, matchCount: raw.matchCount, preview, candidates };
    },

    async close(sessionId: string): Promise<boolean> {
      return store.close(sessionId);
    },

    async sweep(): Promise<number> {
      return store.sweep();
    },

    listIds(): string[] {
      return store.ids();
    },
  };
};

export type ProbeService = ReturnType<typeof createProbeService>;

let cachedService: ProbeService | null = null;
export const getDefaultProbeService = (): ProbeService => {
  if (!cachedService) cachedService = createProbeService();
  return cachedService;
};

export const __resetProbeServiceForTests = (): void => {
  cachedService = null;
};
