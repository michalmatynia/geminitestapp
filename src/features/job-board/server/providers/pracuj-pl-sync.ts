import 'server-only';

import { runPlaywrightEngineTask } from '@/features/playwright/server/runtime';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type PracujPageFetchResult = {
  ok: boolean;
  status: number;
  html: string;
  finalUrl: string;
  error?: string;
};

type PracujStructuredSnapshot = {
  url?: string | null;
  title?: string | null;
  canonical?: string | null;
  metaDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  headings?: string[];
  facts?: Array<{ label: string; value: string }>;
  sections?: Array<{ heading?: string | null; text: string }>;
  applyUrls?: string[];
  companyLinks?: string[];
  jsonLd?: string[];
  dataScripts?: string[];
  plainText?: string | null;
  cookieDismissed?: number | null;
};

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const PLAYWRIGHT_TIMEOUT_MS = 45_000;
const COOKIE_ACCEPT_SELECTORS = [
  '#onetrust-accept-btn-handler',
  '[data-testid*="accept"]',
  '[aria-label*="accept" i]',
  '[id*="cookie"] button',
  '[class*="cookie"] button',
  '[id*="consent"] button',
  '[class*="consent"] button',
];
const COOKIE_ACCEPT_TEXT_PATTERNS = [
  'accept all',
  'accept',
  'allow all',
  'allow',
  'agree',
  'i agree',
  'got it',
  'continue',
  'akceptuj',
  'zaakceptuj',
  'zgadzam',
  'rozumiem',
  'przejdz',
];
const SNAPSHOT_SCRIPT_ID = '__CODEX_PRACUJ_SNAPSHOT__';
const SNAPSHOT_SCRIPT_TYPE = 'application/pracuj+json';

const PRACUJ_FETCH_SCRIPT = `
  export default async ({ page, input }) => {
    const cookieSelectors = ${JSON.stringify(COOKIE_ACCEPT_SELECTORS)};
    const cookiePatterns = ${JSON.stringify(COOKIE_ACCEPT_TEXT_PATTERNS)};
    const normalizeText = (value) =>
      typeof value === 'string' ? value.replace(/\\s+/g, ' ').trim() : '';
    const clipText = (value, max = 1200) => {
      const text = normalizeText(value);
      return text.length > max ? text.slice(0, Math.max(0, max - 3)) + '...' : text;
    };
    const unique = (items, max = 20) => {
      const out = [];
      const seen = new Set();
      for (const item of items) {
        const normalized = normalizeText(item);
        if (!normalized) continue;
        const key = normalized.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(normalized);
        if (out.length >= max) break;
      }
      return out;
    };
    const waitForPrimaryContent = async () => {
      try {
        await page.waitForSelector('main, article, [role="main"], h1', { timeout: 15000 });
      } catch {
        // best effort
      }
    };
    const dismissCookieConsent = async () => {
      try {
        const dismissed = await page.evaluate(
          ({ selectors, patterns }) => {
            const isVisible = (element) => {
              if (!(element instanceof HTMLElement)) return false;
              const style = window.getComputedStyle(element);
              if (style.display === 'none' || style.visibility === 'hidden') return false;
              const rect = element.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0;
            };
            const tryClick = (element) => {
              if (!isVisible(element)) return false;
              element.click();
              return true;
            };

            let count = 0;
            for (const selector of selectors) {
              const element = document.querySelector(selector);
              if (tryClick(element)) count += 1;
            }
            if (count > 0) return count;

            const controls = Array.from(
              document.querySelectorAll(
                'button, [role="button"], a, input[type="button"], input[type="submit"]'
              )
            );
            for (const control of controls) {
              const label = [control.textContent, control.getAttribute('aria-label'), control.getAttribute('value')]
                .filter((value) => typeof value === 'string' && value.trim().length > 0)
                .join(' ')
                .trim()
                .toLowerCase();
              if (!label) continue;
              if (patterns.some((pattern) => label.includes(String(pattern).toLowerCase()))) {
                if (tryClick(control)) {
                  count += 1;
                  break;
                }
              }
            }
            return count;
          },
          { selectors: cookieSelectors, patterns: cookiePatterns }
        );
        if (dismissed > 0) {
          await page.waitForTimeout(800);
        }
        return dismissed;
      } catch {
        return 0;
      }
    };
    const url = input.url;
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForPrimaryContent();
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch {
      // Networkidle is best-effort; pracuj.pl often keeps long-poll connections open.
    }
    const cookieDismissed = await dismissCookieConsent();
    const snapshot = await page.evaluate(() => {
      const normalizeText = (value) =>
        typeof value === 'string' ? value.replace(/\\s+/g, ' ').trim() : '';
      const clipText = (value, max = 1200) => {
        const text = normalizeText(value);
        return text.length > max ? text.slice(0, Math.max(0, max - 3)) + '...' : text;
      };
      const unique = (items, max = 20) => {
        const out = [];
        const seen = new Set();
        for (const item of items) {
          const normalized = normalizeText(item);
          if (!normalized) continue;
          const key = normalized.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(normalized);
          if (out.length >= max) break;
        }
        return out;
      };
      const isVisible = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      const metaValue = (selector, attribute = 'content') => {
        const element = document.querySelector(selector);
        const value = element ? element.getAttribute(attribute) : '';
        return normalizeText(value || '');
      };
      const root =
        document.querySelector('main, article, [role="main"]') ||
        document.querySelector('body');
      const facts = [];
      const factKeys = new Set();
      const addFact = (label, value) => {
        const normalizedLabel = normalizeText(label).replace(/:$/, '');
        const normalizedValue = clipText(value, 320);
        if (!normalizedLabel || !normalizedValue) return;
        if (normalizedLabel.length > 80 || normalizedValue.length > 320) return;
        const factKey = normalizedLabel.toLowerCase() + '::' + normalizedValue.toLowerCase();
        if (factKeys.has(factKey)) return;
        factKeys.add(factKey);
        facts.push({ label: normalizedLabel, value: normalizedValue });
      };

      for (const dl of Array.from((root || document).querySelectorAll('dl')).slice(0, 20)) {
        let lastTerm = '';
        for (const child of Array.from(dl.children)) {
          const tagName = child.tagName.toLowerCase();
          if (tagName === 'dt') {
            lastTerm = child.textContent || '';
          } else if (tagName === 'dd' && lastTerm) {
            addFact(lastTerm, child.textContent || '');
          }
        }
      }

      for (const item of Array.from((root || document).querySelectorAll('li, p')).slice(0, 160)) {
        if (!isVisible(item)) continue;
        const text = normalizeText(item.textContent || '');
        if (!text || text.length > 240) continue;
        const separatorIndex = text.indexOf(':');
        if (separatorIndex <= 0 || separatorIndex >= 80) continue;
        addFact(text.slice(0, separatorIndex), text.slice(separatorIndex + 1));
      }

      const sections = Array.from((root || document).querySelectorAll('section'))
        .slice(0, 18)
        .map((section) => {
          if (!isVisible(section)) return null;
          const heading = normalizeText(
            section.querySelector('h2, h3, h4, header')?.textContent || ''
          );
          const text = clipText(section.textContent || '', 1600);
          if (!text) return null;
          return {
            heading: heading || null,
            text,
          };
        })
        .filter(Boolean);

      const linkCandidates = Array.from(document.querySelectorAll('a[href]'));
      const applyUrls = unique(
        linkCandidates
          .map((link) => {
            const href = link.href || '';
            const label = normalizeText(link.textContent || '');
            return /(apply|aplik|application|oferta|ogloszenie|rekrut)/i.test(href + ' ' + label)
              ? href
              : '';
          })
          .filter(Boolean),
        12
      );
      const companyLinks = unique(
        linkCandidates
          .map((link) => {
            const href = link.href || '';
            const label = normalizeText(link.textContent || '');
            return /(o firmie|about|pracodaw|company|employer|organizacja|kariera|career)/i.test(
              href + ' ' + label
            )
              ? href
              : '';
          })
          .filter(Boolean),
        12
      );

      const jsonLd = unique(
        Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
          .map((element) => clipText(element.textContent || '', 4000))
          .filter(Boolean),
        6
      );
      const dataScripts = unique(
        Array.from(document.scripts)
          .map((script) => normalizeText(script.textContent || ''))
          .filter(
            (text) =>
              text.length > 0 &&
              /(job|offer|company|salary|technolog|benefit|responsibil|pracodaw|employer)/i.test(
                text
              )
          )
          .map((text) => clipText(text, 4000)),
        4
      );
      const plainText = clipText(root?.textContent || document.body?.textContent || '', 12000);

      return {
        url: window.location.href,
        title: normalizeText(document.title),
        canonical: metaValue('link[rel="canonical"]', 'href') || null,
        metaDescription: metaValue('meta[name="description"]') || null,
        ogTitle: metaValue('meta[property="og:title"]') || null,
        ogDescription: metaValue('meta[property="og:description"]') || null,
        headings: unique(
          Array.from(document.querySelectorAll('h1, h2, h3'))
            .filter(isVisible)
            .map((element) => element.textContent || ''),
          32
        ),
        facts: facts.slice(0, 40),
        sections,
        applyUrls,
        companyLinks,
        jsonLd,
        dataScripts,
        plainText: plainText || null,
      };
    });
    if (snapshot && typeof snapshot === 'object') {
      snapshot.cookieDismissed = cookieDismissed;
    }
    const html = await page.content();
    const snapshotScript =
      '<script type="${SNAPSHOT_SCRIPT_TYPE}" id="${SNAPSHOT_SCRIPT_ID}">' +
      JSON.stringify(snapshot).replace(/</g, '\\\\u003c') +
      '</script>';
    return { html: html + snapshotScript, finalUrl: page.url(), status: response ? response.status() : 0 };
  };
`;

const shouldUsePlaywright = (): boolean =>
  process.env['JOB_BOARD_USE_PLAYWRIGHT']?.toLowerCase() === 'true';

const fetchPracujPageWithPlaywright = async (
  sourceUrl: string
): Promise<PracujPageFetchResult> => {
  try {
    const run = await runPlaywrightEngineTask({
      request: {
        script: PRACUJ_FETCH_SCRIPT,
        startUrl: sourceUrl,
        input: { url: sourceUrl },
        timeoutMs: PLAYWRIGHT_TIMEOUT_MS,
        browserEngine: 'chromium',
      },
      instance: {
        kind: 'custom',
        family: 'scrape',
        label: 'Pracuj.pl job offer fetch',
        tags: ['job-board', 'pracuj-pl'],
      },
    });

    if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'canceled') {
      return {
        ok: false,
        status: 0,
        html: '',
        finalUrl: sourceUrl,
        error: run.error ?? `Playwright run status=${run.status}`,
      };
    }

    const result = (run.result ?? {}) as { returnValue?: { html?: string; finalUrl?: string; status?: number } };
    const ret = result.returnValue ?? {};
    const html = typeof ret.html === 'string' ? ret.html : '';
    const finalUrl = typeof ret.finalUrl === 'string' ? ret.finalUrl : sourceUrl;
    const status = typeof ret.status === 'number' ? ret.status : html ? 200 : 0;

    if (!html) {
      return {
        ok: false,
        status,
        html: '',
        finalUrl,
        error: 'Playwright run completed without HTML output',
      };
    }
    return { ok: true, status, html, finalUrl };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'job-scans.pracuj-pl',
      action: 'fetchPracujPageWithPlaywright',
      sourceUrl,
    });
    return {
      ok: false,
      status: 0,
      html: '',
      finalUrl: sourceUrl,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Fetches a pracuj.pl job offer page.
 *
 * Uses the Playwright engine when `JOB_BOARD_USE_PLAYWRIGHT=true` (recommended for production —
 * pracuj.pl serves a JS-rendered shell). Falls back to plain `fetch` otherwise so local development
 * still works without the Playwright runtime configured.
 */
export const fetchPracujPage = async (sourceUrl: string): Promise<PracujPageFetchResult> => {
  if (shouldUsePlaywright()) {
    const playwrightResult = await fetchPracujPageWithPlaywright(sourceUrl);
    if (playwrightResult.ok) return playwrightResult;
    // Fall through to plain fetch on Playwright failure so the scan still produces something.
  }
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.5',
      },
      redirect: 'follow',
    });
    const html = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      html,
      finalUrl: response.url || sourceUrl,
    };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'job-scans.pracuj-pl',
      action: 'fetchPracujPage',
      sourceUrl,
    });
    return {
      ok: false,
      status: 0,
      html: '',
      finalUrl: sourceUrl,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Reduces raw Pracuj.pl HTML into a denser structured-text payload for AI extraction.
 * Prefers scraper-produced snapshot data when present, then falls back to normalized page text.
 */
const normalizeText = (value: string): string =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, '\'')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code: string) => {
      const parsed = Number.parseInt(code, 10);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => {
      const parsed = Number.parseInt(code, 16);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : '';
    })
    .replace(/\s+/g, ' ')
    .trim();

const clipText = (value: string, max = 4000): string =>
  value.length > max ? `${value.slice(0, Math.max(0, max - 3))}...` : value;

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseSnapshot = (html: string): PracujStructuredSnapshot | null => {
  const pattern = new RegExp(
    `<script[^>]+type=["']${escapeRegex(SNAPSHOT_SCRIPT_TYPE)}["'][^>]+id=["']${escapeRegex(SNAPSHOT_SCRIPT_ID)}["'][^>]*>([\\s\\S]*?)<\\/script>`,
    'i'
  );
  const match = html.match(pattern);
  if (!match?.[1]) return null;
  try {
    const parsed = JSON.parse(match[1]) as PracujStructuredSnapshot;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const stripSnapshot = (html: string): string =>
  html.replace(
    new RegExp(
      `<script[^>]+type=["']${escapeRegex(SNAPSHOT_SCRIPT_TYPE)}["'][^>]+id=["']${escapeRegex(SNAPSHOT_SCRIPT_ID)}["'][^>]*>[\\s\\S]*?<\\/script>`,
      'i'
    ),
    ' '
  );

const htmlToDenseText = (html: string): string =>
  normalizeText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\/(p|div|section|article|main|header|footer|li|ul|ol|h1|h2|h3|h4|h5|h6|dd|dt|tr|td|th|table|br)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\n+/g, '\n')
  );

const buildSnapshotSection = (snapshot: PracujStructuredSnapshot): string => {
  const lines: string[] = ['[pracuj_snapshot]'];

  if (snapshot.url) lines.push(`url: ${normalizeText(snapshot.url)}`);
  if (snapshot.title) lines.push(`title: ${normalizeText(snapshot.title)}`);
  if (snapshot.canonical) lines.push(`canonical: ${normalizeText(snapshot.canonical)}`);
  if (snapshot.metaDescription) {
    lines.push(`meta_description: ${clipText(normalizeText(snapshot.metaDescription), 500)}`);
  }
  if (snapshot.ogTitle) lines.push(`og_title: ${clipText(normalizeText(snapshot.ogTitle), 500)}`);
  if (snapshot.ogDescription) {
    lines.push(`og_description: ${clipText(normalizeText(snapshot.ogDescription), 500)}`);
  }
  if (typeof snapshot.cookieDismissed === 'number') {
    lines.push(`cookie_dismissed_controls: ${snapshot.cookieDismissed}`);
  }

  const headings = (snapshot.headings ?? []).map((item) => normalizeText(item)).filter(Boolean);
  if (headings.length > 0) {
    lines.push('headings:');
    headings.slice(0, 20).forEach((item) => lines.push(`- ${item}`));
  }

  const facts = (snapshot.facts ?? [])
    .map((item) => ({
      label: normalizeText(item.label),
      value: normalizeText(item.value),
    }))
    .filter((item) => item.label && item.value);
  if (facts.length > 0) {
    lines.push('facts:');
    facts.slice(0, 30).forEach((item) => lines.push(`- ${item.label}: ${item.value}`));
  }

  const applyUrls = (snapshot.applyUrls ?? []).map((item) => normalizeText(item)).filter(Boolean);
  if (applyUrls.length > 0) {
    lines.push('apply_urls:');
    applyUrls.slice(0, 10).forEach((item) => lines.push(`- ${item}`));
  }

  const companyLinks = (snapshot.companyLinks ?? [])
    .map((item) => normalizeText(item))
    .filter(Boolean);
  if (companyLinks.length > 0) {
    lines.push('company_links:');
    companyLinks.slice(0, 10).forEach((item) => lines.push(`- ${item}`));
  }

  const sections = (snapshot.sections ?? [])
    .map((item) => ({
      heading: item.heading ? normalizeText(item.heading) : null,
      text: normalizeText(item.text),
    }))
    .filter((item) => item.text);
  if (sections.length > 0) {
    lines.push('sections:');
    sections.slice(0, 12).forEach((item, index) => {
      lines.push(`- section_${index + 1}_heading: ${item.heading ?? 'unknown'}`);
      lines.push(`  section_${index + 1}_text: ${clipText(item.text, 1200)}`);
    });
  }

  const jsonLd = (snapshot.jsonLd ?? []).map((item) => normalizeText(item)).filter(Boolean);
  if (jsonLd.length > 0) {
    lines.push('json_ld:');
    jsonLd.slice(0, 4).forEach((item) => lines.push(`- ${clipText(item, 1400)}`));
  }

  const dataScripts = (snapshot.dataScripts ?? [])
    .map((item) => normalizeText(item))
    .filter(Boolean);
  if (dataScripts.length > 0) {
    lines.push('structured_scripts:');
    dataScripts.slice(0, 3).forEach((item) => lines.push(`- ${clipText(item, 1400)}`));
  }

  if (snapshot.plainText) {
    lines.push(`plain_text: ${clipText(normalizeText(snapshot.plainText), 3000)}`);
  }

  lines.push('[/pracuj_snapshot]');
  return lines.join('\n');
};

export const reducePracujHtml = (html: string): string => {
  const snapshot = parseSnapshot(html);
  const rawHtml = stripSnapshot(html);
  const denseText = clipText(htmlToDenseText(rawHtml), 30_000);
  const parts: string[] = [];

  if (snapshot) {
    parts.push(buildSnapshotSection(snapshot));
  }
  if (denseText) {
    parts.push(`[page_text]\n${denseText}\n[/page_text]`);
  }

  return parts.join('\n\n').trim();
};
