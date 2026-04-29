import 'server-only';
/* eslint-disable max-lines, max-lines-per-function, complexity, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition, no-nested-ternary */

import type { PlaywrightSettings } from '@/shared/contracts/playwright';
import type { PlaywrightActionExecutionSettings } from '@/shared/contracts/playwright-steps';
import { runPlaywrightEngineTask } from '@/features/playwright/server/runtime';
import { JOB_BOARD_SCRAPE_RUNTIME_KEY } from '@/shared/lib/browser-execution/job-board-runtime-constants';
import { resolveRuntimeActionExecutionSettings } from '@/shared/lib/browser-execution/runtime-action-resolver.server';
import { resolvePlaywrightBrowserLaunchOptions } from '@/shared/lib/playwright/browser-launch';
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
import type { LaunchOptions } from 'playwright';

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
  provider?: JobBoardProviderSelection;
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
  provider?: JobBoardProviderSelection;
  sourceUrl: string;
  timeoutMs?: number | null;
};

export type JobBoardStructuredSnapshot = {
  applyUrls?: string[];
  canonical?: string | null;
  companyLinks?: string[];
  companyProfile?: {
    facts?: Array<{ label: string; value: string }>;
    headings?: string[];
    plainText?: string | null;
    sections?: Array<{ heading?: string | null; text: string }>;
    title?: string | null;
    url?: string | null;
    websiteUrls?: string[];
  } | null;
  dataScripts?: string[];
  facts?: Array<{ label: string; value: string }>;
  headings?: string[];
  jsonLd?: string[];
  metaDescription?: string | null;
  ogDescription?: string | null;
  ogTitle?: string | null;
  pills?: string[];
  plainText?: string | null;
  provider?: string | null;
  sections?: Array<{ heading?: string | null; text: string }>;
  title?: string | null;
  url?: string | null;
};

type JobBoardRuntimeRequestCommon = {
  browserEngine: 'chromium';
  launchOptions?: LaunchOptions;
  personaId?: string;
  policyAllowedHosts: string[];
  preventNewPages: boolean;
  runtimeKey: typeof JOB_BOARD_SCRAPE_RUNTIME_KEY;
  settingsOverrides: Record<string, unknown>;
  startUrl: string;
  timeoutMs: number;
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
  provider: JobBoardProviderSelection = 'auto'
): JobBoardProvider => {
  const resolved = resolveJobBoardProvider(sourceUrl, provider);
  if (resolved !== null) return resolved;
  throw new Error('Supported job boards are pracuj.pl, justjoin.it, and nofluffjobs.com.');
};

const buildActionSettingsOverrides = (
  settings: PlaywrightActionExecutionSettings
): Partial<PlaywrightSettings> => {
  const entries = [
    ['identityProfile', settings.identityProfile],
    ['headless', settings.headless],
    ['emulateDevice', settings.emulateDevice],
    ['deviceName', settings.deviceName],
    ['slowMo', settings.slowMo],
    ['timeout', settings.timeout],
    ['navigationTimeout', settings.navigationTimeout],
    ['locale', settings.locale],
    ['timezoneId', settings.timezoneId],
    ['humanizeMouse', settings.humanizeMouse],
    ['mouseJitter', settings.mouseJitter],
    ['clickDelayMin', settings.clickDelayMin],
    ['clickDelayMax', settings.clickDelayMax],
    ['inputDelayMin', settings.inputDelayMin],
    ['inputDelayMax', settings.inputDelayMax],
    ['actionDelayMin', settings.actionDelayMin],
    ['actionDelayMax', settings.actionDelayMax],
    ['proxyEnabled', settings.proxyEnabled],
    ['proxyServer', settings.proxyServer],
    ['proxyUsername', settings.proxyUsername],
    ['proxyPassword', settings.proxyPassword],
    ['proxySessionAffinity', settings.proxySessionAffinity],
    ['proxySessionMode', settings.proxySessionMode],
    ['proxyProviderPreset', settings.proxyProviderPreset],
  ] satisfies Array<[keyof PlaywrightSettings, unknown]>;

  return Object.fromEntries(
    entries.filter(([, value]) => value !== null && value !== undefined)
  ) as Partial<PlaywrightSettings>;
};

type JobBoardActionRuntimeSettings = {
  browserPreference: PlaywrightActionExecutionSettings['browserPreference'];
  settingsOverrides: Partial<PlaywrightSettings>;
};

const resolveJobBoardActionRuntimeSettings = async (): Promise<JobBoardActionRuntimeSettings> => {
  try {
    const settings = await resolveRuntimeActionExecutionSettings(JOB_BOARD_SCRAPE_RUNTIME_KEY);
    return {
      browserPreference: settings.browserPreference,
      settingsOverrides: buildActionSettingsOverrides(settings),
    };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'job-scans.job-board',
      action: 'resolveJobBoardActionRuntimeSettings',
      runtimeKey: JOB_BOARD_SCRAPE_RUNTIME_KEY,
    });
    return { browserPreference: null, settingsOverrides: {} };
  }
};

const buildJobBoardLaunchOptions = (input: {
  browserPreference: PlaywrightActionExecutionSettings['browserPreference'];
  headless: boolean | null | undefined;
}): LaunchOptions | undefined => {
  const browserLaunchOptions =
    input.browserPreference !== null
      ? resolvePlaywrightBrowserLaunchOptions(input.browserPreference)
      : {};
  const launchOptions: LaunchOptions = {
    ...browserLaunchOptions,
    ...(typeof input.headless === 'boolean' ? { headless: input.headless } : {}),
  };
  return Object.keys(launchOptions).length > 0 ? launchOptions : undefined;
};

const createRuntimeRequestCommon = async (input: {
  headless?: boolean | null;
  humanizeMouse?: boolean | null;
  personaId?: string | null;
  provider: JobBoardProvider;
  sourceUrl: string;
  timeoutMs: number;
}): Promise<JobBoardRuntimeRequestCommon> => {
  const config = getJobBoardProviderConfig(input.provider);
  const actionRuntimeSettings = await resolveJobBoardActionRuntimeSettings();
  const actionSettingsOverrides = actionRuntimeSettings.settingsOverrides;
  const effectiveHeadless =
    typeof input.headless === 'boolean' ? input.headless : actionSettingsOverrides.headless;
  const launchOptions = buildJobBoardLaunchOptions({
    browserPreference: actionRuntimeSettings.browserPreference,
    headless: effectiveHeadless,
  });
  const settingsOverrides: Record<string, unknown> = {
    ...actionSettingsOverrides,
    identityProfile: actionSettingsOverrides.identityProfile ?? 'search',
    humanizeMouse: input.humanizeMouse ?? actionSettingsOverrides.humanizeMouse ?? true,
  };
  if (typeof effectiveHeadless === 'boolean') {
    settingsOverrides.headless = effectiveHeadless;
  }

  return {
    browserEngine: 'chromium',
    ...(launchOptions !== undefined ? { launchOptions } : {}),
    ...(input.personaId?.trim() ? { personaId: input.personaId.trim() } : {}),
    policyAllowedHosts: [...config.hostSuffixes],
    preventNewPages: true,
    runtimeKey: JOB_BOARD_SCRAPE_RUNTIME_KEY,
    settingsOverrides,
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
        ...(await createRuntimeRequestCommon({
          headless: options.headless,
          humanizeMouse: options.humanizeMouse,
          personaId: options.personaId,
          provider,
          sourceUrl,
          timeoutMs: options.timeoutMs ?? PLAYWRIGHT_TIMEOUT_MS,
        })),
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
  if (options.forcePlaywright === true || (options.forcePlaywright !== false && shouldUsePlaywright())) {
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
        ...(await createRuntimeRequestCommon({
          headless: options.headless,
          humanizeMouse: options.humanizeMouse,
          personaId: options.personaId,
          provider,
          sourceUrl: options.sourceUrl,
          timeoutMs,
        })),
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
  const scripts = Array.from(html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi));
  for (const marker of SNAPSHOT_SCRIPT_MARKERS) {
    for (const match of scripts) {
      const attributes = match[1] ?? '';
      const body = match[2] ?? '';
      const hasType = new RegExp(
        `\\btype=["']${escapeRegex(marker.type)}["']`,
        'i'
      ).test(attributes);
      const hasId = new RegExp(`\\bid=["']${escapeRegex(marker.id)}["']`, 'i').test(
        attributes
      );
      if (!hasType || !hasId || body.trim().length === 0) continue;
      try {
        const parsed = JSON.parse(body) as JobBoardStructuredSnapshot;
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch {
        return null;
      }
    }
  }
  return null;
};

const stripSnapshot = (html: string): string => {
  return html.replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, (full, attributes: string) => {
    const isSnapshotScript = SNAPSHOT_SCRIPT_MARKERS.some((marker) => {
      const hasType = new RegExp(
        `\\btype=["']${escapeRegex(marker.type)}["']`,
        'i'
      ).test(attributes);
      const hasId = new RegExp(`\\bid=["']${escapeRegex(marker.id)}["']`, 'i').test(
        attributes
      );
      return hasType && hasId;
    });
    return isSnapshotScript ? ' ' : full;
  });
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

const readHtmlAttribute = (attributes: string, name: string): string | null => {
  const match = new RegExp(
    `\\b${escapeRegex(name)}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i'
  ).exec(attributes);
  const value = match?.[2] ?? match?.[3] ?? match?.[4] ?? '';
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
};

const readMetaContent = (html: string, names: readonly string[]): string | null => {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const match of html.matchAll(/<meta\b([^>]*)>/gi)) {
    const attributes = match[1] ?? '';
    const key = (
      readHtmlAttribute(attributes, 'property') ??
      readHtmlAttribute(attributes, 'name') ??
      ''
    ).toLowerCase();
    if (!wanted.has(key)) continue;
    const content = readHtmlAttribute(attributes, 'content');
    if (content !== null) return content;
  }
  return null;
};

const readLinkHref = (html: string, rel: string): string | null => {
  for (const match of html.matchAll(/<link\b([^>]*)>/gi)) {
    const attributes = match[1] ?? '';
    if ((readHtmlAttribute(attributes, 'rel') ?? '').toLowerCase() !== rel) continue;
    const href = readHtmlAttribute(attributes, 'href');
    if (href !== null) return href;
  }
  return null;
};

const readFirstTagText = (html: string, tagName: string): string | null => {
  const match = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i').exec(html);
  const text = match ? htmlToDenseText(match[1] ?? '') : '';
  return text.length > 0 ? text : null;
};

const readHeadingTexts = (html: string): string[] =>
  normalizeStringArray(
    Array.from(html.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi)).map((match) =>
      htmlToDenseText(match[1] ?? '')
    )
  ).slice(0, 24);

const collectJsonLdRecords = (value: unknown): Record<string, unknown>[] => {
  const records: Record<string, unknown>[] = [];
  const visit = (entry: unknown): void => {
    if (Array.isArray(entry)) {
      entry.forEach(visit);
      return;
    }
    const record = asRecord(entry);
    if (record === null) return;
    records.push(record);
    visit(record['@graph']);
  };
  visit(value);
  return records;
};

const readJsonLdScripts = (html: string): string[] =>
  Array.from(html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))
    .filter((match) => /type=["']application\/ld\+json["']/i.test(match[1] ?? ''))
    .map((match) => normalizeText(match[2] ?? ''))
    .filter(Boolean)
    .slice(0, 8);

const jsonLdTypeMatches = (record: Record<string, unknown>, expectedType: string): boolean => {
  const rawType = record['@type'];
  const values = Array.isArray(rawType) ? rawType : [rawType];
  return values.some(
    (value) => typeof value === 'string' && value.toLowerCase() === expectedType.toLowerCase()
  );
};

const readFirstJsonLdString = (...values: unknown[]): string | null => {
  for (const value of values) {
    const candidates = Array.isArray(value) ? value : [value];
    for (const candidate of candidates) {
      if (typeof candidate !== 'string') continue;
      const normalized = normalizeText(candidate);
      if (normalized.length > 0) return normalized;
    }
  }
  return null;
};

const readJsonLdAddressLine = (address: Record<string, unknown> | null): string | null => {
  if (address === null) return null;
  const streetAddress = readFirstJsonLdString(
    address['streetAddress'],
    address['addressLine'],
    address['name']
  );
  const postalCode = readFirstJsonLdString(address['postalCode']);
  const locality = readFirstJsonLdString(address['addressLocality']);
  const region = readFirstJsonLdString(address['addressRegion']);
  const country = readFirstJsonLdString(address['addressCountry']);
  return readFirstJsonLdString(
    [streetAddress, [postalCode, locality].filter(Boolean).join(' '), region, country]
      .filter(Boolean)
      .join(', ')
  );
};

const jsonLdAddressFacts = (
  address: Record<string, unknown> | null,
  labelPrefix = ''
): Array<{ label: string; value: string }> => {
  if (address === null) return [];
  const addressLine = readJsonLdAddressLine(address);
  const streetAddress = readFirstJsonLdString(address['streetAddress']);
  const postalCode = readFirstJsonLdString(address['postalCode']);
  const locality = readFirstJsonLdString(address['addressLocality']);
  const region = readFirstJsonLdString(address['addressRegion']);
  const country = readFirstJsonLdString(address['addressCountry']);
  return [
    ...(addressLine ? [{ label: `${labelPrefix}Address`, value: addressLine }] : []),
    ...(streetAddress ? [{ label: `${labelPrefix}Street address`, value: streetAddress }] : []),
    ...(postalCode ? [{ label: `${labelPrefix}Postal code`, value: postalCode }] : []),
    ...(locality ? [{ label: `${labelPrefix}City`, value: locality }] : []),
    ...(region ? [{ label: `${labelPrefix}Region`, value: region }] : []),
    ...(country ? [{ label: `${labelPrefix}Country`, value: country }] : []),
  ];
};

const isDeterministicOfferUrl = (value: string, provider: JobBoardProvider): boolean => {
  if (!isJobBoardOfferUrl(value, provider)) return false;
  if (provider !== 'pracuj_pl') return true;
  try {
    return /,oferta,/i.test(new URL(value).pathname);
  } catch {
    return false;
  }
};

const normalizeOfferUrl = (
  value: string | null,
  baseUrl: string,
  provider: JobBoardProvider
): string | null => {
  if (value === null) return null;
  try {
    const url = new URL(value, baseUrl);
    url.hash = '';
    return isDeterministicOfferUrl(url.toString(), provider) ? url.toString() : null;
  } catch {
    return null;
  }
};

const collectOfferLinksFromHtml = (
  html: string,
  baseUrl: string,
  provider: JobBoardProvider
): JobBoardCollectedOfferLink[] => {
  const anchorLinks = Array.from(html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)).flatMap(
    (match) => {
      const url = normalizeOfferUrl(readHtmlAttribute(match[1] ?? '', 'href'), baseUrl, provider);
      if (url === null) return [];
      return [{ title: clipText(htmlToDenseText(match[2] ?? ''), 180), url }];
    }
  );
  const jsonLdLinks = readJsonLdScripts(html).flatMap((script) => {
    try {
      return collectJsonLdRecords(JSON.parse(script)).flatMap((record) => {
        if (!jsonLdTypeMatches(record, 'JobPosting')) return [];
        const url = normalizeOfferUrl(readFirstJsonLdString(record['url']), baseUrl, provider);
        if (url === null) return [];
        return [{ title: readFirstJsonLdString(record['title']) ?? '', url }];
      });
    } catch {
      return [];
    }
  });
  const directUrl = normalizeOfferUrl(baseUrl, baseUrl, provider);
  return normalizeCollectedLinks([
    ...(directUrl !== null ? [{ title: '', url: directUrl }] : []),
    ...anchorLinks,
    ...jsonLdLinks,
  ]);
};

const buildPlainHtmlStructuredSnapshot = (
  html: string,
  fallbackUrl: string | null
): JobBoardStructuredSnapshot | null => {
  const rawHtml = stripSnapshot(html);
  const title = readFirstTagText(rawHtml, 'title');
  const canonical = readLinkHref(rawHtml, 'canonical');
  const ogTitle = readMetaContent(rawHtml, ['og:title']);
  const metaDescription = readMetaContent(rawHtml, ['description']);
  const ogDescription = readMetaContent(rawHtml, ['og:description']);
  const headings = readHeadingTexts(rawHtml);
  const jsonLd = readJsonLdScripts(rawHtml);
  const records = jsonLd.flatMap((script) => {
    try {
      return collectJsonLdRecords(JSON.parse(script));
    } catch {
      return [];
    }
  });
  const jobPosting = records.find((record) => jsonLdTypeMatches(record, 'JobPosting')) ?? null;
  const hiringOrganization = asRecord(jobPosting?.['hiringOrganization']);
  const rawJobLocation = jobPosting?.['jobLocation'];
  const jobLocation = Array.isArray(rawJobLocation)
    ? asRecord(rawJobLocation[0])
    : asRecord(rawJobLocation);
  const jobAddress = asRecord(jobLocation?.['address']);
  const companyAddress = asRecord(hiringOrganization?.['address']);
  const companyName = readFirstJsonLdString(hiringOrganization?.['name']);
  const companyUrl = readFirstJsonLdString(
    hiringOrganization?.['sameAs'],
    hiringOrganization?.['url']
  );
  const companyDescription = readFirstJsonLdString(hiringOrganization?.['description']);
  const companyIndustry = readFirstJsonLdString(hiringOrganization?.['industry']);
  const companySize = readFirstJsonLdString(
    hiringOrganization?.['numberOfEmployees'],
    hiringOrganization?.['employee']
  );
  const datePosted = readFirstJsonLdString(jobPosting?.['datePosted']);
  const validThrough = readFirstJsonLdString(jobPosting?.['validThrough']);
  const location = readFirstJsonLdString(
    jobAddress?.['addressLocality'],
    jobAddress?.['addressRegion'],
    jobLocation?.['name']
  );
  const listingTitle = readFirstJsonLdString(jobPosting?.['title'], headings[0], ogTitle, title);
  const description = readFirstJsonLdString(jobPosting?.['description'], ogDescription, metaDescription);
  const denseText = clipText(htmlToDenseText(rawHtml), 12_000);
  if (!listingTitle && !companyName && !description && !denseText) return null;

  return {
    applyUrls: normalizeStringArray([readFirstJsonLdString(jobPosting?.['url'], fallbackUrl)]),
    canonical,
    companyLinks: normalizeStringArray([companyUrl]),
    companyProfile:
      companyName || companyUrl || companyAddress !== null
        ? {
            facts: [
              ...(companyName ? [{ label: 'Company', value: companyName }] : []),
              ...(companyIndustry ? [{ label: 'Industry', value: companyIndustry }] : []),
              ...(companySize ? [{ label: 'Company size', value: companySize }] : []),
              ...jsonLdAddressFacts(companyAddress, 'Company '),
            ],
            headings: companyName ? [companyName] : [],
            plainText: companyDescription,
            sections: [],
            title: companyName,
            url: companyUrl,
            websiteUrls: normalizeStringArray([companyUrl]),
          }
        : null,
    facts: [
      ...(companyName ? [{ label: 'Company', value: companyName }] : []),
      ...(location ? [{ label: 'Location', value: location }] : []),
      ...jsonLdAddressFacts(jobAddress),
      ...(datePosted ? [{ label: 'Posted at', value: datePosted }] : []),
      ...(validThrough ? [{ label: 'Expires at', value: validThrough }] : []),
    ],
    headings: normalizeStringArray([listingTitle, ...headings]),
    jsonLd,
    metaDescription,
    ogDescription,
    ogTitle,
    plainText: denseText,
    provider: null,
    sections: description ? [{ heading: 'Description', text: htmlToDenseText(description) }] : [],
    title,
    url: fallbackUrl,
  };
};

export const extractJobBoardStructuredSnapshot = (
  html: string,
  fallbackUrl: string | null = null
): JobBoardStructuredSnapshot | null =>
  parseSnapshot(html) ?? buildPlainHtmlStructuredSnapshot(html, fallbackUrl);

export const collectJobBoardOfferUrlsDeterministically = async (
  options: JobBoardOfferUrlCollectionOptions
): Promise<JobBoardOfferUrlCollectionResult> => {
  const provider = resolveProviderOrThrow(options.sourceUrl, options.provider);
  const sourceSite = getJobBoardSourceSite(provider);
  const page = await fetchJobBoardPage(options.sourceUrl, {
    forcePlaywright: false,
    provider,
    timeoutMs: options.timeoutMs ?? null,
  });
  if (!page.ok || page.html.trim().length === 0) {
    return {
      links: [],
      runId: page.runId ?? null,
      sourceUrl: options.sourceUrl,
      provider,
      sourceSite,
      visitedUrls: page.finalUrl ? [page.finalUrl] : [],
      warnings: [page.error ?? `HTTP ${page.status}`],
    };
  }
  return {
    links: collectOfferLinksFromHtml(page.html, page.finalUrl, page.provider).slice(
      0,
      options.maxOffers ?? 50
    ),
    runId: page.runId ?? null,
    sourceUrl: options.sourceUrl,
    provider: page.provider,
    sourceSite: page.sourceSite,
    visitedUrls: [page.finalUrl],
    warnings: [],
  };
};

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

  const pills = (snapshot.pills ?? []).map((item) => normalizeText(item)).filter(Boolean);
  if (pills.length > 0) {
    lines.push('pills:');
    pills.slice(0, 36).forEach((item) => lines.push(`- ${item}`));
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

  const companyProfile = snapshot.companyProfile;
  if (companyProfile) {
    lines.push('company_profile:');
    if (companyProfile.url) lines.push(`company_profile_url: ${normalizeText(companyProfile.url)}`);
    if (companyProfile.title) {
      lines.push(`company_profile_title: ${clipText(normalizeText(companyProfile.title), 500)}`);
    }
    const profileHeadings = (companyProfile.headings ?? [])
      .map((item) => normalizeText(item))
      .filter(Boolean);
    if (profileHeadings.length > 0) {
      lines.push('company_profile_headings:');
      profileHeadings.slice(0, 20).forEach((item) => lines.push(`- ${item}`));
    }
    const profileFacts = (companyProfile.facts ?? [])
      .map((item) => ({
        label: normalizeText(item.label),
        value: normalizeText(item.value),
      }))
      .filter((item) => item.label && item.value);
    if (profileFacts.length > 0) {
      lines.push('company_profile_facts:');
      profileFacts.slice(0, 30).forEach((item) => lines.push(`- ${item.label}: ${item.value}`));
    }
    const profileSections = (companyProfile.sections ?? [])
      .map((item) => ({
        heading: item.heading ? normalizeText(item.heading) : null,
        text: normalizeText(item.text),
      }))
      .filter((item) => item.text);
    if (profileSections.length > 0) {
      lines.push('company_profile_sections:');
      profileSections.slice(0, 10).forEach((item, index) => {
        lines.push(`- profile_section_${index + 1}_heading: ${item.heading ?? 'unknown'}`);
        lines.push(`  profile_section_${index + 1}_text: ${clipText(item.text, 1400)}`);
      });
    }
    const websiteUrls = (companyProfile.websiteUrls ?? [])
      .map((item) => normalizeText(item))
      .filter(Boolean);
    if (websiteUrls.length > 0) {
      lines.push('company_profile_website_urls:');
      websiteUrls.slice(0, 8).forEach((item) => lines.push(`- ${item}`));
    }
    if (companyProfile.plainText) {
      lines.push(`company_profile_plain_text: ${clipText(normalizeText(companyProfile.plainText), 5000)}`);
    }
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

export { extractJobBoardExternalIdFromUrl } from './sync/external-id';
export { detectJobBoardProviderFromUrl, getJobBoardSourceSite, isJobBoardOfferUrl };
