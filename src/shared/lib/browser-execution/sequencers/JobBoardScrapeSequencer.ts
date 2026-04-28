/* eslint-disable max-lines, max-lines-per-function, complexity, no-await-in-loop, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/require-await, @typescript-eslint/no-shadow, no-promise-executor-return, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/prefer-optional-chain */

import type { Frame, Locator, Page } from 'playwright';

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

export type JobBoardCompanyProfileSnapshot = {
  facts: Array<{ label: string; value: string }>;
  headings: string[];
  plainText: string | null;
  sections: Array<{ heading?: string | null; text: string }>;
  title: string | null;
  url: string;
  websiteUrls: string[];
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
  '[data-test*="accept" i]',
  '[data-testid*="accept" i]',
  '[data-cy*="accept" i]',
  'button:has-text("Akceptuj wszystkie")',
  '[role="button"]:has-text("Akceptuj wszystkie")',
  'button:has-text("Accept all")',
  '[role="button"]:has-text("Accept all")',
  '[aria-label*="accept" i]',
  '[aria-label*="akceptuj" i]',
  '[id*="cookie" i] button',
  '[class*="cookie" i] button',
  '[id*="consent" i] button',
  '[class*="consent" i] button',
] as const;

const COOKIE_ACCEPT_PATTERNS = [
  /akceptuj wszystkie/i,
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

const COOKIE_CONSENT_SURFACE_TEXT_HINTS = [
  'cenimy twoja prywatnosc',
  'lista partnerow cookies',
  'polityka cookies',
  'ustawienia plikow cookies',
  'cookie',
  'consent',
] as const;

const COOKIE_CONSENT_CLOSE_TEXT_HINTS = [
  'cenimy twoja prywatnosc',
  'akceptuj wszystkie',
] as const;

const PRACUJ_EMPLOYER_MODAL_SURFACE_TEXT_HINTS = [
  'pracuj dla przedsiebiorcow',
  'szukasz pracownika',
  'pracuj.pl dla firm',
  'dodaj ogloszenie w atrakcyjnej cenie',
] as const;

const PRACUJ_EMPLOYER_MODAL_CLOSE_SELECTORS = [
  'button:has-text("Zamknij")',
  '[role="button"]:has-text("Zamknij")',
  'button[aria-label*="zamknij" i]',
  '[role="button"][aria-label*="zamknij" i]',
  '[aria-label*="zamknij" i]',
  'button:has-text("Close")',
  '[role="button"]:has-text("Close")',
] as const;

const PRACUJ_EMPLOYER_MODAL_CLOSE_PATTERNS = [/zamknij/i, /close/i] as const;

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

const normalizeSearchText = (value: unknown): string =>
  normalizeText(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

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

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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
    let result: { clicked: boolean; label: string | null } = { clicked: false, label: null };
    let overlayResult: { clicked: boolean; label: string | null } = { clicked: false, label: null };
    for (let attempt = 0; attempt < 5 && !result.clicked; attempt += 1) {
      result = await this.acceptCookieConsentInScopes();
      if (!result.clicked) await this.wait(900);
    }
    if (result.clicked) {
      await this.context.page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
      await this.waitForCookieConsentToClose();
    }
    for (let attempt = 0; attempt < 3 && !overlayResult.clicked; attempt += 1) {
      overlayResult = await this.dismissKnownBlockingOverlayInScopes();
      if (!overlayResult.clicked) await this.wait(250);
    }
    this.completeStep(
      key,
      this.formatConsentStepMessage(result, overlayResult)
    );
  }

  private formatConsentStepMessage(
    consentResult: { clicked: boolean; label: string | null },
    overlayResult: { clicked: boolean; label: string | null }
  ): string {
    const messages: string[] = [];
    if (consentResult.clicked) {
      messages.push(
        `Accepted cookie consent${consentResult.label ? ` via ${consentResult.label}` : ''}`
      );
    }
    if (overlayResult.clicked) {
      messages.push(
        `dismissed blocking overlay${overlayResult.label ? ` via ${overlayResult.label}` : ''}`
      );
    }
    return messages.length > 0 ? `${messages.join('; ')}.` : 'No consent control found.';
  }

  private async acceptCookieConsentInScopes(): Promise<{ clicked: boolean; label: string | null }> {
    const pageResult = await this.acceptCookieConsentInScope(this.context.page, 'page');
    if (pageResult.clicked) return pageResult;

    for (const frame of this.context.page.frames()) {
      if (frame === this.context.page.mainFrame()) continue;
      const frameResult = await this.acceptCookieConsentInScope(frame, 'frame');
      if (frameResult.clicked) return frameResult;
    }

    return { clicked: false, label: null };
  }

  private async acceptCookieConsentInScope(
    scope: Page | Frame,
    scopeLabel: string
  ): Promise<{ clicked: boolean; label: string | null }> {
    for (const selector of COOKIE_ACCEPT_SELECTORS) {
      const locator = scope.locator(selector).first();
      if (await this.clickIfVisible(locator, 1_500)) {
        return { clicked: true, label: `${scopeLabel}:${selector}` };
      }
    }

    const roleResult = await this.clickCookieAcceptByRole(scope, scopeLabel);
    if (roleResult.clicked) return roleResult;

    const heuristicResult = await this.clickCookieAcceptByHeuristic(scope, scopeLabel);
    if (heuristicResult.clicked) return heuristicResult;

    return { clicked: false, label: null };
  }

  private async clickCookieAcceptByRole(
    scope: Page | Frame,
    scopeLabel: string
  ): Promise<{ clicked: boolean; label: string | null }> {
    for (const pattern of COOKIE_ACCEPT_PATTERNS) {
      const locator = scope.getByRole('button', { name: pattern }).first();
      if (await this.clickIfVisible(locator, 1_500)) {
        return { clicked: true, label: `${scopeLabel}:button:${String(pattern)}` };
      }
    }
    return { clicked: false, label: null };
  }

  private async clickCookieAcceptByHeuristic(
    scope: Page | Frame,
    scopeLabel: string
  ): Promise<{ clicked: boolean; label: string | null }> {
    const controls = scope.locator(
      'button, [role="button"], a, input[type="button"], input[type="submit"]'
    );
    const bestIndex = await controls
      .evaluateAll((elements, surfaceHintsInput) => {
        const normalize = (value: unknown): string =>
          (typeof value === 'string' ? value : '')
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        const surfaceHints = Array.isArray(surfaceHintsInput)
          ? surfaceHintsInput.map((hint) => normalize(hint))
          : [];
        const acceptHints = [
          'akceptuj wszystkie',
          'akceptuje wszystkie',
          'zaakceptuj wszystkie',
          'accept all',
          'allow all',
          'i agree',
          'zgadzam sie',
        ];
        const rejectHints = [
          'dostosuj',
          'ustawienia',
          'settings',
          'lista partnerow',
          'polityka',
          'privacy policy',
        ];
        const bodyText = normalize(document.body?.innerText ?? document.body?.textContent ?? '');
        const consentSurfaceVisible = surfaceHints.some((hint) => bodyText.includes(hint));
        let best = { index: -1, score: 0 };
        elements.forEach((element, index) => {
          if (!(element instanceof HTMLElement)) return;
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) {
            return;
          }
          const text = normalize(
            [
              element.innerText,
              element.textContent,
              element.getAttribute('aria-label'),
              element.getAttribute('title'),
              element.getAttribute('value'),
              element.id,
              element.className,
            ].join(' ')
          );
          if (!text || rejectHints.some((hint) => text.includes(hint))) return;
          let score = 0;
          if (acceptHints.some((hint) => text.includes(hint))) score += 10;
          if (text.includes('akceptuj')) score += 5;
          if (text.includes('accept')) score += 5;
          if (text.includes('allow')) score += 4;
          if (consentSurfaceVisible) score += 2;
          if (score > best.score) best = { index, score };
        });
        return best.index;
      }, [...COOKIE_CONSENT_SURFACE_TEXT_HINTS])
      .catch(() => -1);

    if (typeof bestIndex !== 'number' || bestIndex < 0) return { clicked: false, label: null };
    const locator = controls.nth(bestIndex);
    if (await this.clickIfVisible(locator, 2_000)) {
      return { clicked: true, label: `${scopeLabel}:heuristic_accept_control` };
    }
    return { clicked: false, label: null };
  }

  private async waitForCookieConsentToClose(): Promise<void> {
    await this.context.page
      .locator('body')
      .first()
      .waitFor({ state: 'visible', timeout: 2_000 })
      .catch(() => undefined);
    await this.context.page
      .waitForFunction(
        (patterns) => {
          const normalize = (value: unknown): string =>
            (typeof value === 'string' ? value : '')
              .normalize('NFKD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase();
          const bodyText = normalize(document.body?.innerText ?? document.body?.textContent ?? '');
          return !(Array.isArray(patterns) ? patterns : []).some((pattern) =>
            bodyText.includes(String(pattern))
          );
        },
        [...COOKIE_CONSENT_CLOSE_TEXT_HINTS],
        { timeout: 5_000 }
      )
      .catch(() => undefined);
  }

  private async dismissKnownBlockingOverlayInScopes(): Promise<{
    clicked: boolean;
    label: string | null;
  }> {
    const pageResult = await this.dismissKnownBlockingOverlayInScope(this.context.page, 'page');
    if (pageResult.clicked) return pageResult;

    for (const frame of this.context.page.frames()) {
      if (frame === this.context.page.mainFrame()) continue;
      const frameResult = await this.dismissKnownBlockingOverlayInScope(frame, 'frame');
      if (frameResult.clicked) return frameResult;
    }

    return { clicked: false, label: null };
  }

  private async dismissKnownBlockingOverlayInScope(
    scope: Page | Frame,
    scopeLabel: string
  ): Promise<{ clicked: boolean; label: string | null }> {
    if (!(await this.hasPracujEmployerModalSurface(scope))) {
      return { clicked: false, label: null };
    }

    for (const selector of PRACUJ_EMPLOYER_MODAL_CLOSE_SELECTORS) {
      const locator = scope.locator(selector).first();
      if (await this.clickIfVisible(locator, 1_500)) {
        return { clicked: true, label: `${scopeLabel}:${selector}` };
      }
    }

    for (const pattern of PRACUJ_EMPLOYER_MODAL_CLOSE_PATTERNS) {
      const locator = scope.getByRole('button', { name: pattern }).first();
      if (await this.clickIfVisible(locator, 1_500)) {
        return { clicked: true, label: `${scopeLabel}:button:${String(pattern)}` };
      }
    }

    return { clicked: false, label: null };
  }

  private async hasPracujEmployerModalSurface(scope: Page | Frame): Promise<boolean> {
    const bodyText = await scope
      .locator('body')
      .first()
      .textContent({ timeout: 1_000 })
      .catch(() => '');
    const normalized = normalizeSearchText(bodyText);
    return PRACUJ_EMPLOYER_MODAL_SURFACE_TEXT_HINTS.some((hint) =>
      normalized.includes(hint)
    );
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
    const offerUrl = this.context.page.url();
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
    const companyProfile = await this.extractLinkedCompanyProfile(provider, snapshot);
    const augmentedSnapshot =
      companyProfile !== null ? { ...snapshot, companyProfile } : snapshot;
    this.html = this.renderSnapshotHtml(augmentedSnapshot);
    this.finalUrl = offerUrl;
    this.completeStep(key, 'Offer snapshot extracted.', [
      { label: 'title', value: normalizeText((snapshot as { title?: unknown }).title) },
      { label: 'url', value: offerUrl },
      ...(companyProfile !== null ? [{ label: 'companyProfileUrl', value: companyProfile.url }] : []),
    ]);
  }

  private renderSnapshotHtml(snapshot: unknown): string {
    const json = JSON.stringify(snapshot).replace(/</g, '\\u003c');
    const record = snapshot !== null && typeof snapshot === 'object'
      ? (snapshot as { plainText?: unknown; companyProfile?: { plainText?: unknown } })
      : {};
    const offerText = normalizeText(record.plainText);
    const companyText = normalizeText(record.companyProfile?.plainText);
    const bodyText = [offerText, companyText].filter(Boolean).join('\n\n');
    return [
      '<!doctype html><html><head>',
      `<script id="${SNAPSHOT_SCRIPT_ID}" type="${SNAPSHOT_SCRIPT_TYPE}">${json}</script>`,
      '</head><body>',
      bodyText ? `<pre>${escapeHtml(bodyText)}</pre>` : '',
      '</body></html>',
    ].join('');
  }

  private async extractLinkedCompanyProfile(
    provider: JobBoardProvider,
    snapshot: unknown
  ): Promise<JobBoardCompanyProfileSnapshot | null> {
    if (provider !== 'pracuj_pl') return null;
    const companyUrl = await this.resolveCompanyProfileUrl(provider, snapshot);
    if (companyUrl === null) return null;

    try {
      await this.context.page.goto(companyUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      });
      this.visitedUrls.push(this.context.page.url());
      await this.context.page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
      await this.dismissKnownBlockingOverlayInScopes();
      await this.wait(500);
      return await this.extractCompanyProfileSnapshot(companyUrl);
    } catch (error) {
      this.warnings.push(
        `Could not extract Pracuj company profile ${companyUrl}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }

  private async resolveCompanyProfileUrl(
    provider: JobBoardProvider,
    snapshot: unknown
  ): Promise<string | null> {
    const record = snapshot !== null && typeof snapshot === 'object'
      ? (snapshot as { companyLinks?: unknown })
      : {};
    const snapshotLinks = Array.isArray(record.companyLinks) ? record.companyLinks : [];
    for (const link of snapshotLinks) {
      const normalized = this.normalizeProviderUrl(link, provider);
      if (normalized !== null) return normalized;
    }

    const selectorUrl = await this.context.page
      .locator(
        'a:has-text("O firmie"), a:has-text("O pracodawcy"), a:has-text("About the company"), [role="link"]:has-text("O firmie"), [role="link"]:has-text("About the company")'
      )
      .first()
      .getAttribute('href', { timeout: 1_000 })
      .catch(() => null);
    return this.normalizeProviderUrl(selectorUrl, provider);
  }

  private normalizeProviderUrl(value: unknown, provider: JobBoardProvider): string | null {
    const raw = normalizeText(value);
    if (!raw) return null;
    const config = getJobBoardProviderConfig(provider);
    try {
      const url = new URL(raw, this.sourceUrl || (this.safeCurrentUrl() ?? undefined));
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      const allowed = config.hostSuffixes.some(
        (suffix) => host === suffix || host.endsWith(`.${suffix}`)
      );
      if (!allowed) return null;
      url.hash = '';
      return url.toString();
    } catch {
      return null;
    }
  }

  private async extractCompanyProfileSnapshot(
    fallbackUrl: string
  ): Promise<JobBoardCompanyProfileSnapshot> {
    return await this.context.page.evaluate((input) => {
      const normalizeText = (value: unknown): string =>
        typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
      const clipText = (value: unknown, max = 4000): string => {
        const text = normalizeText(value);
        return text.length > max ? `${text.slice(0, Math.max(0, max - 3))}...` : text;
      };
      const isVisible = (element: Element): boolean => {
        if (!(element instanceof HTMLElement)) return false;
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      const unique = (items: unknown[], max = 20): string[] => {
        const out: string[] = [];
        const seen = new Set<string>();
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
      const root =
        document.querySelector('main, article, [role="main"]') ??
        document.querySelector('body');
      const facts: Array<{ label: string; value: string }> = [];
      const factKeys = new Set<string>();
      const addFact = (label: unknown, value: unknown): void => {
        const normalizedLabel = normalizeText(label).replace(/:$/, '');
        const normalizedValue = clipText(value, 320);
        if (!normalizedLabel || !normalizedValue) return;
        const key = `${normalizedLabel.toLowerCase()}::${normalizedValue.toLowerCase()}`;
        if (factKeys.has(key)) return;
        factKeys.add(key);
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
        .slice(0, 18)
        .map((section) => {
          if (!isVisible(section)) return null;
          const heading = normalizeText(
            section.querySelector('h1, h2, h3, h4, header')?.textContent ?? ''
          );
          const text = clipText(section.textContent ?? '', 1800);
          if (!text) return null;
          return { heading: heading || null, text };
        })
        .filter((section): section is { heading: string | null; text: string } => section !== null);

      const websiteUrls = unique(
        Array.from(document.querySelectorAll('a[href]'))
          .map((link) => {
            const anchor = link as HTMLAnchorElement;
            const label = normalizeText(anchor.textContent ?? '');
            const href = anchor.href || '';
            return /(strona|website|www|http|kontakt|contact)/i.test(`${label} ${href}`) ? href : '';
          })
          .filter(Boolean),
        10
      );

      return {
        facts: facts.slice(0, 40),
        headings: unique(
          Array.from(document.querySelectorAll('h1, h2, h3'))
            .filter(isVisible)
            .map((element) => element.textContent ?? ''),
          30
        ),
        plainText: clipText(root?.textContent ?? document.body?.textContent ?? '', 10_000) || null,
        sections,
        title: normalizeText(document.title) || null,
        url: window.location.href || input.fallbackUrl,
        websiteUrls,
      };
    }, { fallbackUrl });
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
    if (ms > 0) await this.wait(ms);
  }

  private async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async clickIfVisible(locator: Locator, timeout = 1_200): Promise<boolean> {
    try {
      if (!(await locator.isVisible({ timeout }))) return false;
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
