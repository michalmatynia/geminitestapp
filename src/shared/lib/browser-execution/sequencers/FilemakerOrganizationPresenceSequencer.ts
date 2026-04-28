/* eslint-disable max-lines, complexity, no-await-in-loop, @typescript-eslint/require-await, @typescript-eslint/strict-boolean-expressions */

import type { Page } from 'playwright';

import { FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS } from '../filemaker-organization-presence-runtime-constants';

export type FilemakerOrganizationPresenceStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export type FilemakerOrganizationPresenceStep = {
  completedAt: string | null;
  details: Array<{ label: string; value?: string | null }>;
  durationMs: number | null;
  key: string;
  label: string;
  message: string | null;
  startedAt: string | null;
  status: FilemakerOrganizationPresenceStepStatus;
  url: string | null;
  warning: string | null;
};

export type FilemakerOrganizationPresenceInputOrganization = {
  city?: string | null;
  id: string;
  krs?: string | null;
  name: string;
  postalCode?: string | null;
  street?: string | null;
  streetNumber?: string | null;
  taxId?: string | null;
  tradingName?: string | null;
};

export type FilemakerOrganizationPresenceScrapeInput = {
  maxPages?: number | null;
  maxSearchResults?: number | null;
  organization?: FilemakerOrganizationPresenceInputOrganization | null;
  seedWebsites?: string[] | null;
};

export type FilemakerOrganizationPresenceWebsite = {
  confidence: number;
  reason: string | null;
  sourceUrl: string | null;
  title: string | null;
  url: string;
};

export type FilemakerOrganizationPresenceSocialProfile = {
  confidence: number;
  platform: string;
  sourceUrl: string | null;
  title: string | null;
  url: string;
};

export type FilemakerOrganizationPresenceScrapePayload = {
  currentUrl: string | null;
  message: string;
  socialProfiles: FilemakerOrganizationPresenceSocialProfile[];
  status: 'completed' | 'failed';
  steps: FilemakerOrganizationPresenceStep[];
  visitedUrls: string[];
  warnings: string[];
  websites: FilemakerOrganizationPresenceWebsite[];
};

export type FilemakerOrganizationPresenceSequencerContext = {
  emit: (type: string, payload: unknown) => void;
  log?: (message: string, context?: unknown) => void;
  page: Page;
};

type LinkCandidate = {
  href: string;
  sourceUrl: string | null;
  text: string;
  title: string | null;
};

type ExtractedPageData = {
  canonicalUrl: string | null;
  description: string | null;
  links: LinkCandidate[];
  text: string;
  title: string | null;
};

const STEP_LABELS: Record<string, string> = {
  [FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.inputValidate]:
    'Validate organisation input',
  [FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.searchWeb]:
    'Search web for organisation',
  [FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.collectCandidates]:
    'Collect website candidates',
  [FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.probeWebsites]:
    'Probe organisation websites',
  [FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.extractSocialProfiles]:
    'Extract social profiles',
  [FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.finalize]:
    'Finalize website and social result',
};

const SEARCH_RESULT_LIMIT_DEFAULT = 8;
const MAX_SEARCH_RESULT_LIMIT = 16;
const MAX_PAGE_LIMIT = 12;
const SOCIAL_HOST_PATTERNS: Array<{ platform: string; pattern: RegExp }> = [
  { platform: 'facebook', pattern: /(^|\.)facebook\.com$/i },
  { platform: 'instagram', pattern: /(^|\.)instagram\.com$/i },
  { platform: 'linkedin', pattern: /(^|\.)linkedin\.com$/i },
  { platform: 'x', pattern: /(^|\.)x\.com$/i },
  { platform: 'twitter', pattern: /(^|\.)twitter\.com$/i },
  { platform: 'youtube', pattern: /(^|\.)youtube\.com$/i },
  { platform: 'tiktok', pattern: /(^|\.)tiktok\.com$/i },
  { platform: 'vimeo', pattern: /(^|\.)vimeo\.com$/i },
];

const SEARCH_HOSTS = new Set([
  'bing.com',
  'duckduckgo.com',
  'google.com',
  'google.pl',
  'microsoft.com',
  'yahoo.com',
]);

const LOW_VALUE_HOSTS = new Set([
  'archive.org',
  'maps.google.com',
  'schema.org',
  'support.google.com',
  'webcache.googleusercontent.com',
]);

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeLooseText = (value: unknown): string =>
  normalizeText(value)?.toLowerCase().replace(/\s+/g, ' ') ?? '';

const clampInt = (value: unknown, fallback: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
};

const normalizeUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname === '/' && url.search.length === 0) return `${url.origin}/`;
    return url.toString();
  } catch {
    return null;
  }
};

const hostWithoutWww = (value: string): string => value.replace(/^www\./i, '').toLowerCase();

const parseUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const isKnownHost = (host: string, hosts: Set<string>): boolean => {
  const normalized = hostWithoutWww(host);
  return Array.from(hosts).some((candidate) => normalized === candidate || normalized.endsWith(`.${candidate}`));
};

const detectSocialPlatform = (url: string): string | null => {
  const parsed = parseUrl(url);
  if (!parsed) return null;
  const host = hostWithoutWww(parsed.hostname);
  const match = SOCIAL_HOST_PATTERNS.find((entry) => entry.pattern.test(host));
  return match?.platform ?? null;
};

const isShareOrIntentUrl = (url: string): boolean => {
  const parsed = parseUrl(url);
  if (!parsed) return true;
  const path = parsed.pathname.toLowerCase();
  return (
    path.includes('/share') ||
    path.includes('/intent') ||
    path.includes('/sharer') ||
    path.includes('/plugins/') ||
    parsed.searchParams.has('share')
  );
};

const decodeSearchRedirect = (href: string): string => {
  try {
    const parsed = new URL(href);
    const redirected =
      parsed.searchParams.get('q') ??
      parsed.searchParams.get('u') ??
      parsed.searchParams.get('url') ??
      parsed.searchParams.get('target');
    return redirected ?? href;
  } catch {
    return href;
  }
};

const tokenizeOrganization = (
  organization: FilemakerOrganizationPresenceInputOrganization
): string[] => {
  const source = [
    organization.name,
    organization.tradingName,
    organization.city,
    organization.taxId,
    organization.krs,
  ]
    .map((value) => normalizeLooseText(value))
    .join(' ');
  const tokens = source
    .replace(/sp\.?\s*z\s*o\.?\s*o\.?/g, ' ')
    .replace(/\b(spolka|zoo|inc|ltd|llc|gmbh|s\.a\.|sa|fundacja|stowarzyszenie)\b/g, ' ')
    .split(/[^a-z0-9ąćęłńóśźż]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
  return Array.from(new Set(tokens));
};

const scoreCandidate = (
  candidate: Pick<LinkCandidate, 'href' | 'text' | 'title'>,
  organization: FilemakerOrganizationPresenceInputOrganization,
  tokens: string[]
): { confidence: number; reason: string } => {
  const parsed = parseUrl(candidate.href);
  const haystack = normalizeLooseText(
    `${candidate.href} ${candidate.text} ${candidate.title ?? ''}`
  );
  let score = 20;
  const matchedTokens = tokens.filter((token) => haystack.includes(token));
  score += matchedTokens.length * 15;
  if (organization.taxId && haystack.includes(organization.taxId.replace(/\D/g, ''))) score += 25;
  if (organization.krs && haystack.includes(organization.krs.replace(/\D/g, ''))) score += 25;
  if (parsed && tokens.some((token) => parsed.hostname.toLowerCase().includes(token))) score += 20;
  if (detectSocialPlatform(candidate.href)) score -= 15;
  if (parsed && isKnownHost(parsed.hostname, SEARCH_HOSTS)) score -= 50;
  if (parsed && isKnownHost(parsed.hostname, LOW_VALUE_HOSTS)) score -= 40;
  return {
    confidence: Math.max(0, Math.min(100, score)),
    reason:
      matchedTokens.length > 0
        ? `Matched organisation tokens: ${matchedTokens.slice(0, 4).join(', ')}.`
        : 'Candidate collected from organisation search results.',
  };
};

const uniqueCandidates = <T extends { url: string }>(candidates: T[]): T[] => {
  const byUrl = new Map<string, T>();
  for (const candidate of candidates) {
    if (!byUrl.has(candidate.url)) byUrl.set(candidate.url, candidate);
  }
  return Array.from(byUrl.values());
};

export class FilemakerOrganizationPresenceSequencer {
  private readonly emit: (type: string, payload: unknown) => void;
  private readonly input: FilemakerOrganizationPresenceScrapeInput;
  private readonly log: (message: string, context?: unknown) => void;
  private readonly page: Page;
  private readonly steps: FilemakerOrganizationPresenceStep[] = [];
  private readonly visitedUrls: string[] = [];
  private readonly warnings: string[] = [];
  private organization: FilemakerOrganizationPresenceInputOrganization | null = null;
  private organizationTokens: string[] = [];
  private rawCandidates: LinkCandidate[] = [];
  private websites: FilemakerOrganizationPresenceWebsite[] = [];
  private socialProfiles: FilemakerOrganizationPresenceSocialProfile[] = [];

  constructor(
    context: FilemakerOrganizationPresenceSequencerContext,
    input: FilemakerOrganizationPresenceScrapeInput
  ) {
    this.page = context.page;
    this.emit = context.emit;
    this.log = context.log ?? (() => undefined);
    this.input = input;
  }

  async scan(): Promise<void> {
    try {
      await this.runStep(
        FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.inputValidate,
        () => this.validateInput()
      );
      await this.runStep(
        FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.searchWeb,
        () => this.searchWeb()
      );
      await this.runStep(
        FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.collectCandidates,
        () => this.collectCandidates()
      );
      await this.runStep(
        FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.probeWebsites,
        () => this.probeWebsites()
      );
      await this.runStep(
        FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.extractSocialProfiles,
        () => this.extractSocialProfiles()
      );
      await this.runStep(
        FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.finalize,
        async () => undefined
      );
      this.emitResult('completed', 'Organisation website and social scrape completed.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.warnings.push(message);
      this.emitResult('failed', message);
      throw error;
    }
  }

  private async validateInput(): Promise<void> {
    const organization = this.input.organization;
    if (!organization || normalizeText(organization.id) === null || normalizeText(organization.name) === null) {
      throw new Error('Organisation id and name are required.');
    }
    this.organization = organization;
    this.organizationTokens = tokenizeOrganization(organization);
    this.updateCurrentStep({
      details: [
        { label: 'Organisation', value: organization.name },
        { label: 'Tokens', value: this.organizationTokens.join(', ') || null },
      ],
      message: 'Organisation input validated.',
    });
  }

  private async searchWeb(): Promise<void> {
    const organization = this.requireOrganization();
    const seedLinks = this.normalizeSeedWebsites().map((url) => ({
      href: url,
      sourceUrl: null,
      text: organization.name,
      title: organization.name,
    }));
    this.rawCandidates.push(...seedLinks);
    if (seedLinks.length > 0) {
      this.updateCurrentStep({
        details: [{ label: 'Seed websites', value: String(seedLinks.length) }],
        message: 'Using linked organisation websites as discovery seeds.',
      });
      return;
    }

    const query = [
      organization.name,
      organization.tradingName,
      organization.city,
      organization.taxId,
    ]
      .map((value) => normalizeText(value))
      .filter((value): value is string => value !== null)
      .join(' ');
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
    await this.goto(searchUrl);
    const extracted = await this.extractPageData();
    this.rawCandidates.push(...extracted.links.slice(0, this.maxSearchResults()));
    this.updateCurrentStep({
      details: [{ label: 'Search links', value: String(extracted.links.length) }],
      message: 'Collected search result candidates.',
      url: searchUrl,
    });
  }

  private async collectCandidates(): Promise<void> {
    const organization = this.requireOrganization();
    const websiteCandidates: FilemakerOrganizationPresenceWebsite[] = [];
    const socialProfiles: FilemakerOrganizationPresenceSocialProfile[] = [];
    for (const candidate of this.rawCandidates) {
      const normalizedUrl = normalizeUrl(decodeSearchRedirect(candidate.href));
      if (!normalizedUrl) continue;
      const parsed = parseUrl(normalizedUrl);
      if (!parsed || isKnownHost(parsed.hostname, SEARCH_HOSTS) || isKnownHost(parsed.hostname, LOW_VALUE_HOSTS)) {
        continue;
      }
      const platform = detectSocialPlatform(normalizedUrl);
      const score = scoreCandidate(
        { ...candidate, href: normalizedUrl },
        organization,
        this.organizationTokens
      );
      if (platform) {
        if (!isShareOrIntentUrl(normalizedUrl)) {
          socialProfiles.push({
            confidence: Math.max(50, score.confidence),
            platform,
            sourceUrl: candidate.sourceUrl,
            title: normalizeText(candidate.title) ?? normalizeText(candidate.text),
            url: normalizedUrl,
          });
        }
        continue;
      }
      if (score.confidence >= 35 || this.normalizeSeedWebsites().includes(normalizedUrl)) {
        websiteCandidates.push({
          confidence: score.confidence,
          reason: score.reason,
          sourceUrl: candidate.sourceUrl,
          title: normalizeText(candidate.title) ?? normalizeText(candidate.text),
          url: normalizedUrl,
        });
      }
    }
    this.websites = uniqueCandidates(websiteCandidates)
      .sort((left, right) => right.confidence - left.confidence)
      .slice(0, this.maxSearchResults());
    this.socialProfiles = uniqueCandidates(socialProfiles)
      .sort((left, right) => right.confidence - left.confidence)
      .slice(0, this.maxSearchResults());
    this.updateCurrentStep({
      details: [
        { label: 'Website candidates', value: String(this.websites.length) },
        { label: 'Social profiles', value: String(this.socialProfiles.length) },
      ],
      message: 'Candidate lists normalized.',
    });
  }

  private async probeWebsites(): Promise<void> {
    const maxPages = this.maxPages();
    const probed: FilemakerOrganizationPresenceWebsite[] = [];
    const queued = [...this.websites];
    while (queued.length > 0 && this.visitedUrls.length < maxPages) {
      const candidate = queued.shift();
      if (!candidate) continue;
      try {
        await this.goto(candidate.url);
        const currentUrl = this.page.url();
        const extracted = await this.extractPageData();
        const canonicalUrl = extracted.canonicalUrl ? normalizeUrl(extracted.canonicalUrl) : null;
        probed.push({
          ...candidate,
          sourceUrl: candidate.sourceUrl ?? currentUrl,
          title: extracted.title ?? candidate.title,
          url: canonicalUrl ?? currentUrl,
        });
        const socialLinks = extracted.links.filter((link) => detectSocialPlatform(link.href) !== null);
        this.rawCandidates.push(...socialLinks);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.warnings.push(`Failed to probe ${candidate.url}: ${message}`);
        this.log('organisation website probe failed', { error: message, url: candidate.url });
      }
    }
    this.websites = uniqueCandidates([...probed, ...this.websites]).slice(0, this.maxSearchResults());
    this.updateCurrentStep({
      details: [
        { label: 'Visited pages', value: String(this.visitedUrls.length) },
        { label: 'Confirmed websites', value: String(probed.length) },
      ],
      message: 'Website candidates probed.',
    });
  }

  private async extractSocialProfiles(): Promise<void> {
    const collected = [...this.socialProfiles];
    for (const candidate of this.rawCandidates) {
      const normalizedUrl = normalizeUrl(decodeSearchRedirect(candidate.href));
      if (!normalizedUrl || isShareOrIntentUrl(normalizedUrl)) continue;
      const platform = detectSocialPlatform(normalizedUrl);
      if (!platform) continue;
      collected.push({
        confidence: 80,
        platform,
        sourceUrl: candidate.sourceUrl,
        title: normalizeText(candidate.title) ?? normalizeText(candidate.text),
        url: normalizedUrl,
      });
    }
    this.socialProfiles = uniqueCandidates(collected)
      .sort((left, right) => right.confidence - left.confidence)
      .slice(0, this.maxSearchResults());
    this.updateCurrentStep({
      details: [{ label: 'Social profiles', value: String(this.socialProfiles.length) }],
      message: 'Social profile URLs extracted.',
    });
  }

  private async goto(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await this.page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
    const currentUrl = this.page.url();
    if (!this.visitedUrls.includes(currentUrl)) this.visitedUrls.push(currentUrl);
  }

  private async extractPageData(): Promise<ExtractedPageData> {
    const sourceUrl = this.page.url();
    return await this.page.evaluate((currentUrl) => {
      const readMeta = (selector: string): string | null =>
        document.querySelector(selector)?.getAttribute('content')?.trim() || null;
      const links = Array.from(document.querySelectorAll('a'))
        .map((anchor) => ({
          href: anchor.href || anchor.getAttribute('href') || '',
          sourceUrl: currentUrl,
          text: anchor.textContent || '',
          title: anchor.getAttribute('title') || null,
        }))
        .filter((link) => link.href.length > 0);
      return {
        canonicalUrl: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null,
        description:
          readMeta('meta[name="description"]') ?? readMeta('meta[property="og:description"]'),
        links,
        text: document.body.innerText || '',
        title: document.title || readMeta('meta[property="og:title"]'),
      };
    }, sourceUrl);
  }

  private normalizeSeedWebsites(): string[] {
    const raw = Array.isArray(this.input.seedWebsites) ? this.input.seedWebsites : [];
    return Array.from(
      new Set(
        raw
          .map((value) => normalizeUrl(value))
          .filter((value): value is string => value !== null)
      )
    );
  }

  private requireOrganization(): FilemakerOrganizationPresenceInputOrganization {
    if (!this.organization) throw new Error('Organisation input has not been validated.');
    return this.organization;
  }

  private maxPages(): number {
    return clampInt(this.input.maxPages, 6, MAX_PAGE_LIMIT);
  }

  private maxSearchResults(): number {
    return clampInt(this.input.maxSearchResults, SEARCH_RESULT_LIMIT_DEFAULT, MAX_SEARCH_RESULT_LIMIT);
  }

  private runStep(stepKey: string, operation: () => Promise<void>): Promise<void> {
    const step = this.upsertStep(stepKey, 'running');
    const startedAt = step.startedAt ?? new Date().toISOString();
    return operation()
      .then(() => {
        const completedAt = new Date().toISOString();
        this.upsertStep(stepKey, 'completed', {
          completedAt,
          durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
          startedAt,
        });
      })
      .catch((error: unknown) => {
        const completedAt = new Date().toISOString();
        this.upsertStep(stepKey, 'failed', {
          completedAt,
          durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
          message: error instanceof Error ? error.message : String(error),
          startedAt,
        });
        throw error;
      });
  }

  private upsertStep(
    key: string,
    status: FilemakerOrganizationPresenceStepStatus,
    patch: Partial<FilemakerOrganizationPresenceStep> = {}
  ): FilemakerOrganizationPresenceStep {
    const existingIndex = this.steps.findIndex((step) => step.key === key);
    const existing = existingIndex >= 0 ? this.steps[existingIndex] : null;
    const step: FilemakerOrganizationPresenceStep = {
      completedAt: null,
      details: [],
      durationMs: null,
      key,
      label: STEP_LABELS[key] ?? key,
      message: null,
      startedAt: status === 'running' ? new Date().toISOString() : null,
      url: null,
      warning: null,
      ...existing,
      ...patch,
      status,
    };
    if (existingIndex >= 0) {
      this.steps[existingIndex] = step;
    } else {
      this.steps.push(step);
    }
    this.emit('progress', { steps: this.steps });
    return step;
  }

  private updateCurrentStep(patch: Partial<FilemakerOrganizationPresenceStep>): void {
    const runningStep = [...this.steps].reverse().find((step) => step.status === 'running');
    if (!runningStep) return;
    this.upsertStep(runningStep.key, 'running', patch);
  }

  private emitResult(
    status: FilemakerOrganizationPresenceScrapePayload['status'],
    message: string
  ): void {
    this.emit('result', {
      currentUrl: this.page.url(),
      message,
      socialProfiles: this.socialProfiles,
      status,
      steps: this.steps,
      visitedUrls: this.visitedUrls,
      warnings: this.warnings,
      websites: this.websites,
    } satisfies FilemakerOrganizationPresenceScrapePayload);
  }
}
