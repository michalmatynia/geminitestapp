/* eslint-disable max-lines, max-lines-per-function, complexity, no-await-in-loop, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/require-await, @typescript-eslint/no-shadow, no-promise-executor-return, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/prefer-optional-chain */

import type { Locator, Page } from 'playwright';

import { JOB_BOARD_SCRAPE_RUNTIME_STEPS } from '../job-board-runtime-constants';
import {
  detectJobBoardProviderFromUrl,
  getJobBoardProviderConfig,
  getJobBoardProviderLabel,
  getJobBoardSourceSite,
  isJobBoardOfferUrl,
  isJobBoardProvider,
  type JobBoardProvider,
  type JobBoardProviderSelection,
} from '@/shared/lib/job-board/job-board-providers';

export type JobBoardScrapeStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export type JobBoardScrapeStep = {
  completedAt: string | null;
  details: Array<{ label: string; value?: string | null }>;
  durationMs: number | null;
  key: string;
  label: string;
  message: string | null;
  startedAt: string | null;
  status: JobBoardScrapeStepStatus;
  url: string | null;
  warning: string | null;
};

export type JobBoardScrapeMode = 'collect_links' | 'fetch_offer';

export type JobBoardScrapeInput = {
  delayMs?: number | null;
  maxOffers?: number | null;
  maxPages?: number | null;
  mode?: JobBoardScrapeMode | null;
  provider?: JobBoardProviderSelection | null;
  sourceUrl?: string | null;
};

export type JobBoardCollectedOfferLink = {
  title: string;
  url: string;
};

export type JobBoardScrapePayload = {
  currentUrl: string | null;
  finalUrl: string | null;
  html: string | null;
  httpStatus: number | null;
  links: JobBoardCollectedOfferLink[];
  message: string;
  mode: JobBoardScrapeMode;
  provider: JobBoardProvider;
  sourceSite: string;
  sourceUrl: string;
  status: 'completed' | 'failed';
  steps: JobBoardScrapeStep[];
  visitedUrls: string[];
  warnings: string[];
};

export type JobBoardScrapeSequencerContext = {
  emit: (type: string, payload: unknown) => void;
  helpers?: unknown;
  log?: (message: string, context?: unknown) => void;
  page: Page;
};

type HumanizedHelpers = {
  actionPause?: () => Promise<unknown>;
  click?: (
    target: Locator,
    options?: {
      clickOptions?: Record<string, unknown>;
      delayMs?: number | null;
      pauseAfter?: boolean;
      pauseBefore?: boolean;
      scroll?: boolean;
    }
  ) => Promise<unknown>;
};

const SNAPSHOT_SCRIPT_ID = '__CODEX_JOB_BOARD_SNAPSHOT__';
const SNAPSHOT_SCRIPT_TYPE = 'application/job-board+json';

const STEP_LABELS: Record<string, string> = {
  [JOB_BOARD_SCRAPE_RUNTIME_STEPS.inputValidate]: 'Validate job board input',
  [JOB_BOARD_SCRAPE_RUNTIME_STEPS.openSource]: 'Open source URL',
  [JOB_BOARD_SCRAPE_RUNTIME_STEPS.acceptCookies]: 'Accept cookie consent',
  [JOB_BOARD_SCRAPE_RUNTIME_STEPS.collectOfferLinks]: 'Collect offer links',
  [JOB_BOARD_SCRAPE_RUNTIME_STEPS.waitOfferContent]: 'Wait for offer content',
  [JOB_BOARD_SCRAPE_RUNTIME_STEPS.extractOfferSnapshot]: 'Extract offer snapshot',
  [JOB_BOARD_SCRAPE_RUNTIME_STEPS.finalize]: 'Finalize scrape result',
};

const COOKIE_ACCEPT_SELECTORS = [
  '#onetrust-accept-btn-handler',
  '[data-testid*="accept" i]',
  '[aria-label*="accept" i]',
  '[id*="cookie" i] button',
  '[class*="cookie" i] button',
  '[id*="consent" i] button',
  '[class*="consent" i] button',
] as const;

const COOKIE_ACCEPT_PATTERNS = [
  /accept all/i,
  /accept/i,
  /allow all/i,
  /allow/i,
  /agree/i,
  /i agree/i,
  /got it/i,
  /continue/i,
  /akceptuj/i,
  /zaakceptuj/i,
  /zgadzam/i,
  /rozumiem/i,
  /przejd[zź]/i,
] as const;

const clampInt = (value: unknown, fallback: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
};

const clampDelay = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 750;
  return Math.min(Math.floor(parsed), 10_000);
};

const normalizeText = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

const normalizeUrl = (value: unknown): string | null => {
  const raw = normalizeText(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    return url.toString();
  } catch {
    return null;
  }
};

const readProvider = (
  sourceUrl: string,
  provider: JobBoardProviderSelection | null | undefined
): JobBoardProvider | null => {
  if (provider && provider !== 'auto' && isJobBoardProvider(provider)) return provider;
  return detectJobBoardProviderFromUrl(sourceUrl);
};

const createStep = (key: string): JobBoardScrapeStep => ({
  completedAt: null,
  details: [],
  durationMs: null,
  key,
  label: STEP_LABELS[key] ?? key,
  message: null,
  startedAt: null,
  status: 'pending',
  url: null,
  warning: null,
});

const now = (): string => new Date().toISOString();

const readHelpers = (helpers: unknown): HumanizedHelpers => {
  if (helpers === null || typeof helpers !== 'object') return {};
  const record = helpers as HumanizedHelpers;
  return {
    ...(typeof record.actionPause === 'function' ? { actionPause: record.actionPause } : {}),
    ...(typeof record.click === 'function' ? { click: record.click } : {}),
  };
};

const toProviderPayload = (provider: JobBoardProvider): {
  hostSuffixes: string[];
  id: JobBoardProvider;
} => {
  const config = getJobBoardProviderConfig(provider);
  return {
    id: config.id,
    hostSuffixes: [...config.hostSuffixes],
  };
};

export class JobBoardScrapeSequencer {
  private readonly context: JobBoardScrapeSequencerContext;
  private readonly input: JobBoardScrapeInput;
  private readonly steps: JobBoardScrapeStep[];
  private links: JobBoardCollectedOfferLink[] = [];
  private visitedUrls: string[] = [];
  private warnings: string[] = [];
  private html: string | null = null;
  private finalUrl: string | null = null;
  private httpStatus: number | null = null;
  private provider: JobBoardProvider | null = null;
  private sourceUrl = '';
  private mode: JobBoardScrapeMode = 'collect_links';

  constructor(context: JobBoardScrapeSequencerContext, input: JobBoardScrapeInput) {
    this.context = context;
    this.input = input;
    this.steps = [
      createStep(JOB_BOARD_SCRAPE_RUNTIME_STEPS.inputValidate),
      createStep(JOB_BOARD_SCRAPE_RUNTIME_STEPS.openSource),
      createStep(JOB_BOARD_SCRAPE_RUNTIME_STEPS.acceptCookies),
      createStep(JOB_BOARD_SCRAPE_RUNTIME_STEPS.collectOfferLinks),
      createStep(JOB_BOARD_SCRAPE_RUNTIME_STEPS.waitOfferContent),
      createStep(JOB_BOARD_SCRAPE_RUNTIME_STEPS.extractOfferSnapshot),
      createStep(JOB_BOARD_SCRAPE_RUNTIME_STEPS.finalize),
    ];
  }

  async scan(): Promise<void> {
    try {
      await this.validateInput();
      await this.openSource();
      await this.acceptCookies();
      if (this.mode === 'collect_links') {
        await this.collectOfferLinks();
        this.skipStep(JOB_BOARD_SCRAPE_RUNTIME_STEPS.waitOfferContent, 'Collection mode.');
        this.skipStep(JOB_BOARD_SCRAPE_RUNTIME_STEPS.extractOfferSnapshot, 'Collection mode.');
      } else {
        this.skipStep(JOB_BOARD_SCRAPE_RUNTIME_STEPS.collectOfferLinks, 'Offer fetch mode.');
        await this.waitOfferContent();
        await this.extractOfferSnapshot();
      }
      await this.finalize('completed');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.warnings.push(message);
      this.context.log?.('Job board scrape failed', { message });
      await this.finalize('failed', message);
      throw error;
    }
  }

  private startStep(key: string): JobBoardScrapeStep {
    const step = this.steps.find((entry) => entry.key === key) ?? createStep(key);
    if (!this.steps.includes(step)) this.steps.push(step);
    step.status = 'running';
    step.startedAt = now();
    step.url = this.safeCurrentUrl();
    return step;
  }

  private completeStep(
    key: string,
    message: string | null = null,
    details: JobBoardScrapeStep['details'] = []
  ): void {
    const step = this.steps.find((entry) => entry.key === key);
    if (!step) return;
    const completedAt = now();
    step.status = 'completed';
    step.completedAt = completedAt;
    step.message = message;
    step.details = details;
    step.url = this.safeCurrentUrl();
    step.durationMs = step.startedAt ? Date.parse(completedAt) - Date.parse(step.startedAt) : null;
  }

  private failStep(key: string, message: string): void {
    const step = this.steps.find((entry) => entry.key === key);
    if (!step) return;
    const completedAt = now();
    step.status = 'failed';
    step.completedAt = completedAt;
    step.message = message;
    step.warning = message;
    step.url = this.safeCurrentUrl();
    step.durationMs = step.startedAt ? Date.parse(completedAt) - Date.parse(step.startedAt) : null;
  }

  private skipStep(key: string, message: string): void {
    const step = this.steps.find((entry) => entry.key === key);
    if (!step || step.status !== 'pending') return;
    step.status = 'skipped';
    step.message = message;
    step.completedAt = now();
    step.url = this.safeCurrentUrl();
  }

  private safeCurrentUrl(): string | null {
    try {
      return this.context.page.url();
    } catch {
      return null;
    }
  }

  private async validateInput(): Promise<void> {
    const key = JOB_BOARD_SCRAPE_RUNTIME_STEPS.inputValidate;
    this.startStep(key);
    try {
      const sourceUrl = normalizeUrl(this.input.sourceUrl);
      if (sourceUrl === null) throw new Error('A supported job board URL is required.');
      const provider = readProvider(sourceUrl, this.input.provider ?? 'auto');
      if (provider === null) {
        throw new Error('Supported job boards are pracuj.pl, justjoin.it, and nofluffjobs.com.');
      }
      const mode = this.input.mode === 'fetch_offer' ? 'fetch_offer' : 'collect_links';
      this.sourceUrl = sourceUrl;
      this.provider = provider;
      this.mode = mode;
      this.completeStep(key, `${getJobBoardProviderLabel(provider)} ${mode}`, [
        { label: 'provider', value: provider },
        { label: 'sourceUrl', value: sourceUrl },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.failStep(key, message);
      throw error;
    }
  }

  private async openSource(): Promise<void> {
    const key = JOB_BOARD_SCRAPE_RUNTIME_STEPS.openSource;
    this.startStep(key);
    try {
      const response = await this.context.page.goto(this.sourceUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      });
      this.httpStatus = response?.status() ?? 0;
      this.visitedUrls.push(this.context.page.url());
      await this.context.page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
      await this.pause();
      this.completeStep(key, `HTTP ${this.httpStatus || 'n/a'}`, [
        { label: 'url', value: this.context.page.url() },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.failStep(key, message);
      throw error;
    }
  }

  private async acceptCookies(): Promise<void> {
    const key = JOB_BOARD_SCRAPE_RUNTIME_STEPS.acceptCookies;
    this.startStep(key);
    let clicked = 0;
    for (const selector of COOKIE_ACCEPT_SELECTORS) {
      const locator = this.context.page.locator(selector).first();
      if (await this.clickIfVisible(locator)) {
        clicked += 1;
        break;
      }
    }
    if (clicked === 0) {
      const controls = this.context.page.locator(
        'button, [role="button"], a, input[type="button"], input[type="submit"]'
      );
      const count = Math.min(await controls.count().catch(() => 0), 80);
      for (let index = 0; index < count; index += 1) {
        const control = controls.nth(index);
        const label = normalizeText(
          [
            await control.textContent().catch(() => ''),
            await control.getAttribute('aria-label').catch(() => ''),
            await control.getAttribute('value').catch(() => ''),
          ].join(' ')
        );
        if (!label || !COOKIE_ACCEPT_PATTERNS.some((pattern) => pattern.test(label))) continue;
        if (await this.clickIfVisible(control)) {
          clicked += 1;
          break;
        }
      }
    }
    if (clicked > 0) {
      await this.context.page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
    }
    this.completeStep(key, clicked > 0 ? `Clicked ${clicked} consent control.` : 'No consent control found.');
  }

  private async collectOfferLinks(): Promise<void> {
    const key = JOB_BOARD_SCRAPE_RUNTIME_STEPS.collectOfferLinks;
    this.startStep(key);
    const maxPages = clampInt(this.input.maxPages, 2, 20);
    const maxOffers = clampInt(this.input.maxOffers, 50, 250);
    const delayMs = clampDelay(this.input.delayMs);
    const provider = this.requireProvider();
    const linkMap = new Map<string, JobBoardCollectedOfferLink>();

    for (let pageIndex = 0; pageIndex < maxPages && linkMap.size < maxOffers; pageIndex += 1) {
      const links = await this.extractLinksFromCurrentPage(provider);
      links.forEach((link) => {
        if (!linkMap.has(link.url)) linkMap.set(link.url, link);
      });
      const nextUrl = await this.findNextPageUrl(provider);
      if (nextUrl !== null && !this.visitedUrls.includes(nextUrl) && pageIndex + 1 < maxPages) {
        await this.context.page.goto(nextUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await this.context.page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => undefined);
        this.visitedUrls.push(this.context.page.url());
        await this.pause(delayMs);
      } else {
        await this.context.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => undefined);
        await this.pause(delayMs);
      }
    }

    if (linkMap.size === 0 && isJobBoardOfferUrl(this.sourceUrl, provider)) {
      linkMap.set(this.sourceUrl, { title: '', url: this.sourceUrl });
    }

    this.links = Array.from(linkMap.values()).slice(0, maxOffers);
    this.completeStep(key, `${this.links.length} offer link(s) collected.`, [
      { label: 'visited', value: String(this.visitedUrls.length) },
      { label: 'maxOffers', value: String(maxOffers) },
    ]);
  }

  private async waitOfferContent(): Promise<void> {
    const key = JOB_BOARD_SCRAPE_RUNTIME_STEPS.waitOfferContent;
    this.startStep(key);
    await this.context.page
      .waitForSelector('main, article, [role="main"], h1, [data-testid*="offer" i]', {
        timeout: 18_000,
      })
      .catch(() => undefined);
    await this.context.page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
    this.completeStep(key, 'Offer page content is ready.');
  }

  private async extractOfferSnapshot(): Promise<void> {
    const key = JOB_BOARD_SCRAPE_RUNTIME_STEPS.extractOfferSnapshot;
    this.startStep(key);
    const provider = this.requireProvider();
    const snapshot = await this.context.page.evaluate(
      ({ providerId, snapshotScriptId, snapshotScriptType }) => {
        const normalizeText = (value: unknown): string =>
          typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
        const clipText = (value: unknown, max = 1200): string => {
          const text = normalizeText(value);
          return text.length > max ? `${text.slice(0, Math.max(0, max - 3))}...` : text;
        };
        const unique = (items: unknown[], max = 20): string[] => {
          const out: string[] = [];
          const seen = new Set<string>();
          for (const item of items) {
            const normalized = normalizeText(item);
            if (!normalized) continue;
            const keyValue = normalized.toLowerCase();
            if (seen.has(keyValue)) continue;
            seen.add(keyValue);
            out.push(normalized);
            if (out.length >= max) break;
          }
          return out;
        };
        const isVisible = (element: Element): boolean => {
          if (!(element instanceof HTMLElement)) return false;
          const style = window.getComputedStyle(element);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };
        const metaValue = (selector: string, attribute = 'content'): string => {
          const element = document.querySelector(selector);
          return normalizeText(element?.getAttribute(attribute) ?? '');
        };
        const root =
          document.querySelector('main, article, [role="main"]') ??
          document.querySelector('body');
        const facts: Array<{ label: string; value: string }> = [];
        const factKeys = new Set<string>();
        const addFact = (label: unknown, value: unknown): void => {
          const normalizedLabel = normalizeText(label).replace(/:$/, '');
          const normalizedValue = clipText(value, 320);
          if (!normalizedLabel || !normalizedValue) return;
          if (normalizedLabel.length > 80 || normalizedValue.length > 320) return;
          const factKey = `${normalizedLabel.toLowerCase()}::${normalizedValue.toLowerCase()}`;
          if (factKeys.has(factKey)) return;
          factKeys.add(factKey);
          facts.push({ label: normalizedLabel, value: normalizedValue });
        };

        for (const dl of Array.from((root ?? document).querySelectorAll('dl')).slice(0, 20)) {
          let lastTerm = '';
          for (const child of Array.from(dl.children)) {
            const tagName = child.tagName.toLowerCase();
            if (tagName === 'dt') {
              lastTerm = child.textContent ?? '';
            } else if (tagName === 'dd' && lastTerm) {
              addFact(lastTerm, child.textContent ?? '');
            }
          }
        }

        for (const item of Array.from((root ?? document).querySelectorAll('li, p, div')).slice(0, 260)) {
          if (!isVisible(item)) continue;
          const text = normalizeText(item.textContent ?? '');
          if (!text || text.length > 260) continue;
          const separatorIndex = text.indexOf(':');
          if (separatorIndex <= 0 || separatorIndex >= 80) continue;
          addFact(text.slice(0, separatorIndex), text.slice(separatorIndex + 1));
        }

        const sections = Array.from((root ?? document).querySelectorAll('section, article'))
          .slice(0, 22)
          .map((section) => {
            if (!isVisible(section)) return null;
            const heading = normalizeText(
              section.querySelector('h2, h3, h4, header')?.textContent ?? ''
            );
            const text = clipText(section.textContent ?? '', 1600);
            if (!text) return null;
            return { heading: heading || null, text };
          })
          .filter(Boolean);

        const linkCandidates = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
        const applyUrls = unique(
          linkCandidates
            .map((link) => {
              const href = link.href || '';
              const label = normalizeText(link.textContent ?? '');
              return /(apply|aplik|application|oferta|ogloszenie|rekrut|formularz)/i.test(
                `${href} ${label}`
              )
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
              const label = normalizeText(link.textContent ?? '');
              return /(o firmie|about|pracodaw|company|employer|organizacja|kariera|career)/i.test(
                `${href} ${label}`
              )
                ? href
                : '';
            })
            .filter(Boolean),
          12
        );

        const jsonLd = unique(
          Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
            .map((element) => clipText(element.textContent ?? '', 4000))
            .filter(Boolean),
          8
        );
        const dataScripts = unique(
          Array.from(document.scripts)
            .map((script) => normalizeText(script.textContent ?? ''))
            .filter(
              (text) =>
                text.length > 0 &&
                /(job|offer|company|salary|technolog|benefit|responsibil|pracodaw|employer|nofluff|justjoin)/i.test(
                  text
                )
            )
            .map((text) => clipText(text, 4000)),
          5
        );
        const plainText = clipText(root?.textContent ?? document.body?.textContent ?? '', 14_000);
        const snapshot = {
          url: window.location.href,
          provider: providerId,
          title: normalizeText(document.title),
          canonical: metaValue('link[rel="canonical"]', 'href') || null,
          metaDescription: metaValue('meta[name="description"]') || null,
          ogTitle: metaValue('meta[property="og:title"]') || null,
          ogDescription: metaValue('meta[property="og:description"]') || null,
          headings: unique(
            Array.from(document.querySelectorAll('h1, h2, h3'))
              .filter(isVisible)
              .map((element) => element.textContent ?? ''),
            36
          ),
          facts: facts.slice(0, 48),
          sections,
          applyUrls,
          companyLinks,
          jsonLd,
          dataScripts,
          plainText: plainText || null,
        };
        const existing = document.getElementById(snapshotScriptId);
        if (existing) existing.remove();
        const script = document.createElement('script');
        script.id = snapshotScriptId;
        script.type = snapshotScriptType;
        script.textContent = JSON.stringify(snapshot);
        document.documentElement.appendChild(script);
        return snapshot;
      },
      {
        providerId: provider,
        snapshotScriptId: SNAPSHOT_SCRIPT_ID,
        snapshotScriptType: SNAPSHOT_SCRIPT_TYPE,
      }
    );
    this.html = await this.context.page.content();
    this.finalUrl = this.context.page.url();
    this.completeStep(key, 'Offer snapshot extracted.', [
      { label: 'title', value: normalizeText((snapshot as { title?: unknown }).title) },
      { label: 'url', value: this.finalUrl },
    ]);
  }

  private async finalize(status: 'completed' | 'failed', message?: string): Promise<void> {
    const key = JOB_BOARD_SCRAPE_RUNTIME_STEPS.finalize;
    if (this.steps.find((step) => step.key === key)?.status === 'pending') {
      this.startStep(key);
    }
    const provider = this.requireProvider();
    if (status === 'completed') {
      this.completeStep(key, message ?? 'Job board scrape completed.');
    } else {
      this.failStep(key, message ?? 'Job board scrape failed.');
    }
    const payload: JobBoardScrapePayload = {
      currentUrl: this.safeCurrentUrl(),
      finalUrl: this.finalUrl ?? this.safeCurrentUrl(),
      html: this.html,
      httpStatus: this.httpStatus,
      links: this.links,
      message: message ?? (status === 'completed' ? 'Job board scrape completed.' : 'Job board scrape failed.'),
      mode: this.mode,
      provider,
      sourceSite: getJobBoardSourceSite(provider),
      sourceUrl: this.sourceUrl,
      status,
      steps: this.steps,
      visitedUrls: Array.from(new Set(this.visitedUrls)),
      warnings: this.warnings,
    };
    this.context.emit('result', payload);
  }

  private requireProvider(): JobBoardProvider {
    if (this.provider === null) throw new Error('Job board provider was not resolved.');
    return this.provider;
  }

  private async pause(delayMs?: number): Promise<void> {
    const helpers = readHelpers(this.context.helpers);
    if (typeof helpers.actionPause === 'function') {
      await helpers.actionPause().catch(() => undefined);
      return;
    }
    const ms = delayMs ?? clampDelay(this.input.delayMs);
    if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async clickIfVisible(locator: Locator): Promise<boolean> {
    try {
      if (!(await locator.isVisible({ timeout: 1_200 }))) return false;
      const helpers = readHelpers(this.context.helpers);
      if (typeof helpers.click === 'function') {
        await helpers.click(locator, { clickOptions: { timeout: 2_000 } });
      } else {
        await locator.click({ timeout: 2_000 });
      }
      await this.pause();
      return true;
    } catch {
      return false;
    }
  }

  private async extractLinksFromCurrentPage(
    provider: JobBoardProvider
  ): Promise<JobBoardCollectedOfferLink[]> {
    return await this.context.page.evaluate(({ providerPayload, sourceUrl }) => {
      const clean = (value: unknown): string =>
        typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
      const hostMatches = (host: string, suffix: string): boolean =>
        host === suffix || host.endsWith(`.${suffix}`);
      const toUrl = (value: unknown, base: string): string | null => {
        try {
          const url = new URL(String(value || ''), base);
          if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
          const host = url.hostname.toLowerCase().replace(/^www\./, '');
          if (!providerPayload.hostSuffixes.some((suffix) => hostMatches(host, suffix))) return null;
          url.hash = '';
          return url.toString();
        } catch {
          return null;
        }
      };
      const hasOfferShape = (urlValue: string): boolean => {
        try {
          const url = new URL(urlValue);
          const path = url.pathname.toLowerCase();
          if (providerPayload.id === 'pracuj_pl') {
            return path.includes('/praca/') && /(?:oferta|offer|\d{5,})/i.test(urlValue);
          }
          if (providerPayload.id === 'justjoin_it') {
            return path.includes('/job-offer/');
          }
          if (providerPayload.id === 'nofluffjobs') {
            return /\/(?:pl\/)?job\//i.test(path);
          }
          return false;
        } catch {
          return false;
        }
      };
      const links = new Map<string, string>();
      const anchors = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
      anchors.forEach((anchor) => {
        const normalized = toUrl(anchor.href || anchor.getAttribute('href'), window.location.href || sourceUrl);
        if (!normalized || !hasOfferShape(normalized)) return;
        const card = anchor.closest('article, li, [data-testid], [class*="offer"], [class*="job"]');
        const title =
          clean(anchor.textContent) ||
          clean(card?.querySelector('h1, h2, h3, [data-testid*="title" i]')?.textContent) ||
          clean(card?.textContent).slice(0, 160);
        if (!links.has(normalized)) links.set(normalized, title);
      });
      return Array.from(links.entries()).map(([url, title]) => ({ title, url }));
    }, { providerPayload: toProviderPayload(provider), sourceUrl: this.sourceUrl });
  }

  private async findNextPageUrl(provider: JobBoardProvider): Promise<string | null> {
    const nextUrl = await this.context.page.evaluate(({ providerPayload }) => {
      const hostMatches = (host: string, suffix: string): boolean =>
        host === suffix || host.endsWith(`.${suffix}`);
      const normalize = (value: unknown): string | null => {
        try {
          const url = new URL(String(value || ''), window.location.href);
          if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
          const host = url.hostname.toLowerCase().replace(/^www\./, '');
          if (!providerPayload.hostSuffixes.some((suffix) => hostMatches(host, suffix))) return null;
          url.hash = '';
          return url.toString();
        } catch {
          return null;
        }
      };
      const rel = document.querySelector('a[rel="next"]');
      const relUrl = normalize(rel?.getAttribute('href'));
      if (relUrl) return relUrl;
      const labels = /nast[eę]pna|dalej|next|więcej|more/i;
      const anchors = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
      const next = anchors.find((anchor) =>
        labels.test(`${anchor.textContent || ''} ${anchor.getAttribute('aria-label') || ''}`)
      );
      return normalize(next?.getAttribute('href'));
    }, { providerPayload: toProviderPayload(provider) });
    return normalizeUrl(nextUrl);
  }
}

export const JOB_BOARD_SNAPSHOT_SCRIPT_ID = SNAPSHOT_SCRIPT_ID;
export const JOB_BOARD_SNAPSHOT_SCRIPT_TYPE = SNAPSHOT_SCRIPT_TYPE;
