import 'server-only';
/* eslint-disable max-lines, max-lines-per-function, complexity, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition, no-nested-ternary */

import { runPlaywrightEngineTask } from '@/features/playwright/server/runtime';
import { JOB_BOARD_SCRAPE_RUNTIME_KEY } from '@/shared/lib/browser-execution/job-board-runtime-constants';
import {
  JOB_BOARD_SNAPSHOT_SCRIPT_ID,
  JOB_BOARD_SNAPSHOT_SCRIPT_TYPE,
} from '@/shared/lib/browser-execution/sequencers/JobBoardScrapeSequencer';
import {
  detectJobBoardProviderFromUrl,
  getJobBoardProviderConfig,
  getJobBoardProviderLabel,
  getJobBoardSourceSite,
  isJobBoardOfferUrl,
  resolveJobBoardProvider,
  type JobBoardProvider,
  type JobBoardProviderSelection,
} from '@/shared/lib/job-board/job-board-providers';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type { JobBoardProvider, JobBoardProviderSelection };

export type JobBoardPageFetchResult = {
  error?: string;
  finalUrl: string;
  html: string;
  ok: boolean;
  provider: JobBoardProvider;
  runId?: string | null;
  sourceSite: string;
  status: number;
};

export type JobBoardPageFetchOptions = {
  fallbackToFetch?: boolean | null;
  forcePlaywright?: boolean | null;
  headless?: boolean | null;
  humanizeMouse?: boolean | null;
  personaId?: string | null;
  provider?: JobBoardProviderSelection | null;
  timeoutMs?: number | null;
};

export type JobBoardCollectedOfferLink = {
  title: string;
  url: string;
};

export type JobBoardOfferUrlCollectionResult = {
  links: JobBoardCollectedOfferLink[];
  provider: JobBoardProvider;
  runId: string | null;
  sourceSite: string;
  sourceUrl: string;
  visitedUrls: string[];
  warnings: string[];
};

export type JobBoardOfferUrlCollectionOptions = {
  delayMs?: number | null;
  headless?: boolean | null;
  humanizeMouse?: boolean | null;
  maxOffers?: number | null;
  maxPages?: number | null;
  personaId?: string | null;
  provider?: JobBoardProviderSelection | null;
  sourceUrl: string;
  timeoutMs?: number | null;
};

type JobBoardStructuredSnapshot = {
  applyUrls?: string[];
  canonical?: string | null;
  companyLinks?: string[];
  dataScripts?: string[];
  facts?: Array<{ label: string; value: string }>;
  headings?: string[];
  jsonLd?: string[];
  metaDescription?: string | null;
  ogDescription?: string | null;
  ogTitle?: string | null;
  plainText?: string | null;
  provider?: string | null;
  sections?: Array<{ heading?: string | null; text: string }>;
  title?: string | null;
  url?: string | null;
};

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const PLAYWRIGHT_TIMEOUT_MS = 45_000;

const shouldUsePlaywright = (): boolean =>
  process.env['JOB_BOARD_USE_PLAYWRIGHT']?.toLowerCase() === 'true';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const readReturnValue = (value: unknown): Record<string, unknown> | null =>
  asRecord(asRecord(value)?.['returnValue']);

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? Array.from(
        new Set(value.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim()))
      ).filter(Boolean)
    : [];

const resolveProviderOrThrow = (
  sourceUrl: string,
  provider: JobBoardProviderSelection | null | undefined
): JobBoardProvider => {
  const resolved = resolveJobBoardProvider(sourceUrl, provider ?? 'auto');
  if (resolved !== null) return resolved;
  throw new Error('Supported job boards are pracuj.pl, justjoin.it, and nofluffjobs.com.');
};

const createRuntimeRequestCommon = (input: {
  headless?: boolean | null;
  humanizeMouse?: boolean | null;
  personaId?: string | null;
  provider: JobBoardProvider;
  sourceUrl: string;
  timeoutMs: number;
}): {
  browserEngine: 'chromium';
  launchOptions: { headless: boolean };
  personaId?: string;
  policyAllowedHosts: string[];
  preventNewPages: boolean;
  runtimeKey: typeof JOB_BOARD_SCRAPE_RUNTIME_KEY;
  settingsOverrides: Record<string, unknown>;
  startUrl: string;
  timeoutMs: number;
} => {
  const config = getJobBoardProviderConfig(input.provider);
  return {
    browserEngine: 'chromium',
    launchOptions: { headless: input.headless ?? true },
    ...(input.personaId?.trim() ? { personaId: input.personaId.trim() } : {}),
    policyAllowedHosts: [...config.hostSuffixes],
    preventNewPages: true,
    runtimeKey: JOB_BOARD_SCRAPE_RUNTIME_KEY,
    settingsOverrides: {
      identityProfile: 'search',
      humanizeMouse: input.humanizeMouse ?? true,
    },
    startUrl: input.sourceUrl,
    timeoutMs: input.timeoutMs,
  };
};

const fetchJobBoardPageWithPlaywright = async (
  sourceUrl: string,
  options: Pick<
    JobBoardPageFetchOptions,
    'headless' | 'humanizeMouse' | 'personaId' | 'provider' | 'timeoutMs'
  > = {}
): Promise<JobBoardPageFetchResult> => {
  const provider = resolveProviderOrThrow(sourceUrl, options.provider);
  const sourceSite = getJobBoardSourceSite(provider);
  try {
    const run = await runPlaywrightEngineTask({
      request: {
        ...createRuntimeRequestCommon({
          headless: options.headless,
          humanizeMouse: options.humanizeMouse,
          personaId: options.personaId,
          provider,
          sourceUrl,
          timeoutMs: options.timeoutMs ?? PLAYWRIGHT_TIMEOUT_MS,
        }),
        actionId: 'job_board_offer_fetch',
        actionName: 'Job board offer fetch',
        input: {
          mode: 'fetch_offer',
          provider,
          sourceUrl,
        },
      },
      instance: {
        kind: 'custom',
        family: 'scrape',
        label: `${getJobBoardProviderLabel(provider)} job offer fetch`,
        tags: ['job-board', provider, 'offer'],
      },
    });

    if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'canceled') {
      return {
        ok: false,
        status: 0,
        html: '',
        finalUrl: sourceUrl,
        error: run.error ?? `Playwright run status=${run.status}`,
        runId: run.runId,
        provider,
        sourceSite,
      };
    }

    const payload = readReturnValue(run.result);
    const html = typeof payload?.['html'] === 'string' ? payload['html'] : '';
    const finalUrl = typeof payload?.['finalUrl'] === 'string' ? payload['finalUrl'] : sourceUrl;
    const status = typeof payload?.['httpStatus'] === 'number' ? payload['httpStatus'] : html ? 200 : 0;

    if (!html) {
      return {
        ok: false,
        status,
        html: '',
        finalUrl,
        error: 'Playwright run completed without HTML output',
        runId: run.runId,
        provider,
        sourceSite,
      };
    }
    return { ok: true, status, html, finalUrl, runId: run.runId, provider, sourceSite };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'job-scans.job-board',
      action: 'fetchJobBoardPageWithPlaywright',
      sourceUrl,
      provider,
    });
    return {
      ok: false,
      status: 0,
      html: '',
      finalUrl: sourceUrl,
      error: error instanceof Error ? error.message : String(error),
      runId: null,
      provider,
      sourceSite,
    };
  }
};

export const fetchJobBoardPage = async (
  sourceUrl: string,
  options: JobBoardPageFetchOptions = {}
): Promise<JobBoardPageFetchResult> => {
  const provider = resolveProviderOrThrow(sourceUrl, options.provider);
  const sourceSite = getJobBoardSourceSite(provider);
  if (options.forcePlaywright === true || shouldUsePlaywright()) {
    const playwrightResult = await fetchJobBoardPageWithPlaywright(sourceUrl, {
      ...options,
      provider,
    });
    if (playwrightResult.ok) return playwrightResult;
    if (options.fallbackToFetch === false) return playwrightResult;
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
      runId: null,
      provider,
      sourceSite,
    };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'job-scans.job-board',
      action: 'fetchJobBoardPage',
      sourceUrl,
      provider,
    });
    return {
      ok: false,
      status: 0,
      html: '',
      finalUrl: sourceUrl,
      error: error instanceof Error ? error.message : String(error),
      runId: null,
      provider,
      sourceSite,
    };
  }
};

const normalizeCollectedLinks = (value: unknown): JobBoardCollectedOfferLink[] => {
  if (!Array.isArray(value)) return [];
  const byUrl = new Map<string, JobBoardCollectedOfferLink>();
  value.forEach((entry: unknown): void => {
    const record = asRecord(entry);
    const rawUrl = typeof record?.['url'] === 'string' ? record['url'].trim() : '';
    if (!rawUrl) return;
    try {
      const url = new URL(rawUrl);
      url.hash = '';
      const title = typeof record?.['title'] === 'string' ? record['title'].trim() : '';
      byUrl.set(url.toString(), { title, url: url.toString() });
    } catch {
      // Ignore malformed links from the page snapshot.
    }
  });
  return Array.from(byUrl.values());
};

export const collectJobBoardOfferUrls = async (
  options: JobBoardOfferUrlCollectionOptions
): Promise<JobBoardOfferUrlCollectionResult> => {
  const provider = resolveProviderOrThrow(options.sourceUrl, options.provider);
  const sourceSite = getJobBoardSourceSite(provider);
  const timeoutMs = options.timeoutMs ?? Math.max(PLAYWRIGHT_TIMEOUT_MS, 180_000);
  try {
    const run = await runPlaywrightEngineTask({
      request: {
        ...createRuntimeRequestCommon({
          headless: options.headless,
          humanizeMouse: options.humanizeMouse,
          personaId: options.personaId,
          provider,
          sourceUrl: options.sourceUrl,
          timeoutMs,
        }),
        actionId: 'job_board_offer_link_collect',
        actionName: 'Job board offer link collection',
        input: {
          delayMs: options.delayMs ?? 750,
          maxOffers: options.maxOffers ?? 50,
          maxPages: options.maxPages ?? 2,
          mode: 'collect_links',
          provider,
          sourceUrl: options.sourceUrl,
        },
      },
      instance: {
        kind: 'custom',
        family: 'scrape',
        label: `${getJobBoardProviderLabel(provider)} offer link collection`,
        tags: ['job-board', provider, 'category'],
      },
    });

    if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'canceled') {
      return {
        links: [],
        runId: run.runId,
        sourceUrl: options.sourceUrl,
        provider,
        sourceSite,
        visitedUrls: [],
        warnings: [run.error ?? `Playwright run status=${run.status}`],
      };
    }

    const payload = readReturnValue(run.result);
    return {
      links: normalizeCollectedLinks(payload?.['links']),
      runId: run.runId,
      sourceUrl: options.sourceUrl,
      provider,
      sourceSite,
      visitedUrls: normalizeStringArray(payload?.['visitedUrls']),
      warnings: [...normalizeStringArray(payload?.['warnings']), ...normalizeStringArray(run.logs)],
    };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'job-scans.job-board',
      action: 'collectJobBoardOfferUrls',
      sourceUrl: options.sourceUrl,
      provider,
    });
    return {
      links: [],
      runId: null,
      sourceUrl: options.sourceUrl,
      provider,
      sourceSite,
      visitedUrls: [],
      warnings: [error instanceof Error ? error.message : String(error)],
    };
  }
};

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

const SNAPSHOT_SCRIPT_MARKERS = [
  { id: JOB_BOARD_SNAPSHOT_SCRIPT_ID, type: JOB_BOARD_SNAPSHOT_SCRIPT_TYPE },
  { id: '__CODEX_PRACUJ_SNAPSHOT__', type: 'application/pracuj+json' },
] as const;

const parseSnapshot = (html: string): JobBoardStructuredSnapshot | null => {
  for (const marker of SNAPSHOT_SCRIPT_MARKERS) {
    const pattern = new RegExp(
      `<script[^>]+type=["']${escapeRegex(marker.type)}["'][^>]+id=["']${escapeRegex(marker.id)}["'][^>]*>([\\s\\S]*?)<\\/script>`,
      'i'
    );
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    try {
      const parsed = JSON.parse(match[1]) as JobBoardStructuredSnapshot;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
};

const stripSnapshot = (html: string): string => {
  let stripped = html;
  SNAPSHOT_SCRIPT_MARKERS.forEach((marker) => {
    stripped = stripped.replace(
      new RegExp(
        `<script[^>]+type=["']${escapeRegex(marker.type)}["'][^>]+id=["']${escapeRegex(marker.id)}["'][^>]*>[\\s\\S]*?<\\/script>`,
        'i'
      ),
      ' '
    );
  });
  return stripped;
};

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

const buildSnapshotSection = (snapshot: JobBoardStructuredSnapshot): string => {
  const provider = typeof snapshot.provider === 'string' ? snapshot.provider : 'unknown';
  const lines: string[] = [`[job_board_snapshot provider="${provider}"]`];

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

  const headings = (snapshot.headings ?? []).map((item) => normalizeText(item)).filter(Boolean);
  if (headings.length > 0) {
    lines.push('headings:');
    headings.slice(0, 24).forEach((item) => lines.push(`- ${item}`));
  }

  const facts = (snapshot.facts ?? [])
    .map((item) => ({
      label: normalizeText(item.label),
      value: normalizeText(item.value),
    }))
    .filter((item) => item.label && item.value);
  if (facts.length > 0) {
    lines.push('facts:');
    facts.slice(0, 36).forEach((item) => lines.push(`- ${item.label}: ${item.value}`));
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
    sections.slice(0, 14).forEach((item, index) => {
      lines.push(`- section_${index + 1}_heading: ${item.heading ?? 'unknown'}`);
      lines.push(`  section_${index + 1}_text: ${clipText(item.text, 1200)}`);
    });
  }

  const jsonLd = (snapshot.jsonLd ?? []).map((item) => normalizeText(item)).filter(Boolean);
  if (jsonLd.length > 0) {
    lines.push('json_ld:');
    jsonLd.slice(0, 6).forEach((item) => lines.push(`- ${clipText(item, 1400)}`));
  }

  const dataScripts = (snapshot.dataScripts ?? [])
    .map((item) => normalizeText(item))
    .filter(Boolean);
  if (dataScripts.length > 0) {
    lines.push('structured_scripts:');
    dataScripts.slice(0, 4).forEach((item) => lines.push(`- ${clipText(item, 1400)}`));
  }

  if (snapshot.plainText) {
    lines.push(`plain_text: ${clipText(normalizeText(snapshot.plainText), 3400)}`);
  }

  lines.push('[/job_board_snapshot]');
  return lines.join('\n');
};

export const reduceJobBoardHtml = (html: string): string => {
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

const slugifyExternalId = (value: string): string | null => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug.length > 0 ? slug.slice(0, 180) : null;
};

export const extractJobBoardExternalIdFromUrl = (
  url: string,
  provider?: JobBoardProvider | null
): string | null => {
  const resolvedProvider = provider ?? detectJobBoardProviderFromUrl(url);
  try {
    const parsed = new URL(url);
    if (resolvedProvider === 'pracuj_pl') {
      const match = url.match(/(?:oferta|offer)[^\d]*(\d{5,})/i) ?? url.match(/(\d{5,})(?:[/?#]|$)/);
      return match?.[1] ?? null;
    }
    if (resolvedProvider === 'justjoin_it') {
      const match = parsed.pathname.match(/\/job-offer\/([^/?#]+)/i);
      return match?.[1] ? slugifyExternalId(match[1]) : null;
    }
    if (resolvedProvider === 'nofluffjobs') {
      const match = parsed.pathname.match(/\/(?:pl\/)?job\/(.+)$/i);
      return match?.[1] ? slugifyExternalId(match[1]) : null;
    }
    return slugifyExternalId(`${parsed.hostname}${parsed.pathname}`);
  } catch {
    return null;
  }
};

export { detectJobBoardProviderFromUrl, getJobBoardSourceSite, isJobBoardOfferUrl };
