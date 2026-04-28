import 'server-only';

import type { CompanyEmail, JobScanStep } from '@/shared/contracts/job-board';
import { runPlaywrightEngineTask } from '@/features/playwright/server/runtime';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const CONTACT_PATHS = [
  '',
  '/kontakt',
  '/kontakt/',
  '/contact',
  '/contact/',
  '/contact-us',
  '/contact-us/',
  '/kontakt-pl',
  '/o-nas',
  '/about',
  '/about-us',
  '/kariera',
  '/careers',
  '/impressum',
];

const CONTACT_LINK_HINTS: Array<{ hint: string; priority: number }> = [
  { hint: 'kontakt', priority: 140 },
  { hint: 'contact', priority: 140 },
  { hint: 'get in touch', priority: 130 },
  { hint: 'about', priority: 110 },
  { hint: 'o nas', priority: 110 },
  { hint: 'o-nas', priority: 110 },
  { hint: 'impressum', priority: 105 },
  { hint: 'team', priority: 90 },
  { hint: 'company', priority: 80 },
  { hint: 'career', priority: 70 },
  { hint: 'careers', priority: 70 },
  { hint: 'kariera', priority: 70 },
  { hint: 'rekrutacja', priority: 70 },
  { hint: 'jobs', priority: 60 },
  { hint: 'privacy', priority: 45 },
  { hint: 'polityka prywatnosci', priority: 45 },
  { hint: 'polityka-prywatnosci', priority: 45 },
  { hint: 'rodo', priority: 40 },
];

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
  'godkänn',
  'acceptera',
  'tillåt',
];

const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}\b/g;
const MAILTO_REGEX = /href\s*=\s*(["'])mailto:([^"'#>]+)(?:#[^"'>]*)?\1/gi;
const ATTRIBUTE_EMAIL_REGEX = /(?:data-email|data-mail|content)\s*=\s*(["'])(.*?)\1/gi;
const BINARY_PATH_RE =
  /\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|pdf|zip|rar|7z|mp4|mov|avi|mp3|wav)(?:[/?#]|$)/i;

const NOISE_PATTERNS = [
  /@example\./i,
  /@domain\./i,
  /@localhost/i,
  /@.*\.png$/i,
  /@.*\.jpg$/i,
  /@.*\.svg$/i,
  /@sentry\.io$/i,
  /@wordpress\.com$/i,
  /@your-/i,
  /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i,
];

const PERSONAL_PROVIDERS = new Set([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'wp.pl',
  'onet.pl',
  'o2.pl',
  'interia.pl',
]);

const MAX_PAGES_TO_SCAN = 12;
const EARLY_STOP_EMAIL_COUNT = 5;

const EMAIL_FINDER_STEP_DEFINITIONS = [
  { key: 'validate_input', label: 'Validate company email scrape input' },
  { key: 'browser_open', label: 'Open company website' },
  { key: 'cookie_consent', label: 'Handle cookie consent' },
  { key: 'scan_current_page', label: 'Scan current page for email evidence' },
  { key: 'discover_contact_paths', label: 'Discover contact-related pages' },
  { key: 'crawl_contact_pages', label: 'Crawl candidate contact pages' },
  { key: 'http_crawl_fallback', label: 'Run HTTP crawl fallback' },
  { key: 'rank_company_emails', label: 'Rank company emails' },
] as const satisfies readonly { key: string; label: string }[];

export type EmailFinderResult = {
  emails: CompanyEmail[];
  visitedUrls: string[];
  durationMs: number;
  steps: JobScanStep[];
  error?: string;
};

type DiscoveredLink = {
  url: string;
  priority: number;
};

type EngineEmailFinderResult = EmailFinderResult & {
  finalUrl: string | null;
};

type EmailScraperEngineRequestOptions = {
  personaId?: string;
  settingsOverrides?: Record<string, unknown>;
  launchOptions?: Record<string, unknown>;
  contextOptions?: Record<string, unknown>;
};

const stamp = (): string => new Date().toISOString();

const buildStep = (
  key: string,
  label: string,
  status: JobScanStep['status'],
  partial: Partial<JobScanStep> = {}
): JobScanStep => ({
  key,
  label,
  status,
  message: partial.message ?? null,
  startedAt: partial.startedAt ?? null,
  completedAt: partial.completedAt ?? null,
  durationMs: partial.durationMs ?? null,
});

const defaultPendingSteps = (): JobScanStep[] =>
  EMAIL_FINDER_STEP_DEFINITIONS.map((entry) => buildStep(entry.key, entry.label, 'pending'));

const cloneStep = (step: JobScanStep): JobScanStep => ({
  ...step,
});

const hydrateStepSequence = (steps: JobScanStep[]): JobScanStep[] => {
  const hydrated = defaultPendingSteps();
  const knownKeys = new Set(hydrated.map((step) => step.key));
  const providedByKey = new Map(steps.map((step) => [step.key, step] as const));

  for (const step of hydrated) {
    const provided = providedByKey.get(step.key);
    if (!provided) continue;
    step.label = provided.label || step.label;
    step.status = provided.status;
    step.message = provided.message ?? null;
    step.startedAt = provided.startedAt ?? null;
    step.completedAt = provided.completedAt ?? null;
    step.durationMs = provided.durationMs ?? null;
  }

  for (const provided of steps) {
    if (!knownKeys.has(provided.key)) {
      hydrated.push(cloneStep(provided));
    }
  }

  return hydrated;
};

const updateStep = (
  steps: JobScanStep[],
  key: string,
  status: JobScanStep['status'],
  message: string | null
): void => {
  const step = steps.find((entry) => entry.key === key);
  if (!step) return;
  const now = stamp();
  if (step.startedAt === null) {
    step.startedAt = now;
  }
  step.status = status;
  step.message = message;
  if (status === 'completed' || status === 'failed' || status === 'skipped') {
    step.completedAt = now;
    step.durationMs =
      step.startedAt !== null ? Date.parse(step.completedAt) - Date.parse(step.startedAt) : null;
  }
};

const combineVisitedUrls = (...collections: string[][]): string[] => {
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const urls of collections) {
    for (const url of urls) {
      const normalized = normalizeScanUrl(url);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      merged.push(url);
    }
  }
  return merged;
};

const mergeCompanyEmails = (
  primary: CompanyEmail[],
  secondary: CompanyEmail[],
  domain: string | null
): CompanyEmail[] => {
  const sources = new Map<string, string | null>();
  for (const email of [...primary, ...secondary]) {
    const existing = sources.get(email.address);
    if (existing === undefined || existing === null) {
      sources.set(email.address, email.source ?? null);
    }
  }

  return rankEmails([...sources.keys()], domain).map((address, index) => ({
    address,
    source: sources.get(address) ?? null,
    isPrimary: index === 0,
  }));
};

const buildSyntheticPlaywrightSteps = (siteUrl: URL, reason: string | null): JobScanStep[] => {
  const steps = defaultPendingSteps();
  updateStep(
    steps,
    'validate_input',
    'completed',
    `Prepared ${siteUrl.toString()} for Playwright email scraping.`
  );
  updateStep(
    steps,
    'browser_open',
    'failed',
    reason
      ? `Playwright scraper failed before returning structured steps: ${reason}`
      : 'Playwright scraper failed before returning structured steps.'
  );
  updateStep(
    steps,
    'cookie_consent',
    'skipped',
    'Skipped because the Playwright scraper did not complete its browser pass.'
  );
  updateStep(
    steps,
    'scan_current_page',
    'skipped',
    'Skipped because the Playwright scraper did not complete its browser pass.'
  );
  updateStep(
    steps,
    'discover_contact_paths',
    'skipped',
    'Skipped because the Playwright scraper did not complete its browser pass.'
  );
  updateStep(
    steps,
    'crawl_contact_pages',
    'skipped',
    'Skipped because the Playwright scraper did not complete its browser pass.'
  );
  return steps;
};

const updateFinalRankingStep = (steps: JobScanStep[], emails: CompanyEmail[], usedHttpFallback: boolean): void => {
  updateStep(
    steps,
    'rank_company_emails',
    emails.length > 0 ? 'completed' : 'skipped',
    emails.length > 0
      ? `Ranked ${emails.length} candidate email(s); primary=${emails[0]?.address}.`
      : usedHttpFallback
        ? 'No credible company emails were collected by the Playwright scraper or HTTP crawl fallback.'
        : 'No credible company emails were collected by the Playwright scraper.'
  );
};

const finalizeUnreportedSteps = (
  steps: JobScanStep[],
  excludedKeys: string[],
  message: string
): void => {
  const excluded = new Set(excludedKeys);
  for (const step of steps) {
    if (excluded.has(step.key)) continue;
    if (step.status === 'pending' || step.status === 'running') {
      updateStep(steps, step.key, 'skipped', message);
    }
  }
};

const buildEmailFinderError = (input: {
  engineError?: string | null;
  fallbackError?: string | null;
}): string => {
  if (input.engineError && input.fallbackError) {
    return `Playwright scraper: ${input.engineError}; HTTP crawl fallback: ${input.fallbackError}`;
  }
  if (input.fallbackError) return input.fallbackError;
  if (input.engineError) return input.engineError;
  return 'No credible company emails were collected.';
};

const normalizeHostname = (value: string | null | undefined): string =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');

const normalizeWebsite = (website: string | null | undefined): URL | null => {
  if (!website) return null;
  try {
    const trimmed = website.trim();
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withScheme);
  } catch {
    return null;
  }
};

const normalizeScanUrl = (value: string): string => {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.toString();
  } catch {
    return value;
  }
};

const safeDecodeURIComponent = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const decodeEmailArtifacts = (value: string): string =>
  safeDecodeURIComponent(String(value || ''))
    .replace(/&#x40;|&#64;|&commat;/gi, '@')
    .replace(/&#x2e;|&#46;|&period;/gi, '.')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s*\[at\]\s*/gi, '@')
    .replace(/\s*\(at\)\s*/gi, '@')
    .replace(/\s*\[dot\]\s*/gi, '.')
    .replace(/\s*\(dot\)\s*/gi, '.');

const isNoise = (email: string): boolean => NOISE_PATTERNS.some((re) => re.test(email));

const extractEmailsFromText = (value: string): string[] => {
  const decoded = decodeEmailArtifacts(value);
  const variants = [
    decoded,
    decoded.replace(/\s*@\s*/g, '@').replace(/\s*\.\s*/g, '.'),
  ];
  const matches = new Set<string>();

  for (const variant of variants) {
    for (const email of variant.match(EMAIL_REGEX) ?? []) {
      const normalized = email.toLowerCase();
      if (!isNoise(normalized)) {
        matches.add(normalized);
      }
    }
  }

  return [...matches];
};

const stripHtmlToText = (html: string): string =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractMailtoEmails = (html: string): string[] => {
  const matches = new Set<string>();
  let match: RegExpExecArray | null = null;
  MAILTO_REGEX.lastIndex = 0;

  while ((match = MAILTO_REGEX.exec(html)) !== null) {
    const candidate = decodeEmailArtifacts(match[2] ?? '').split('?')[0] ?? '';
    for (const email of extractEmailsFromText(candidate)) {
      matches.add(email);
    }
  }

  return [...matches];
};

const extractAttributeEmails = (html: string): string[] => {
  const matches = new Set<string>();
  let match: RegExpExecArray | null = null;
  ATTRIBUTE_EMAIL_REGEX.lastIndex = 0;

  while ((match = ATTRIBUTE_EMAIL_REGEX.exec(html)) !== null) {
    for (const email of extractEmailsFromText(match[2] ?? '')) {
      matches.add(email);
    }
  }

  return [...matches];
};

const collectEmailsFromHtml = (html: string): string[] => {
  const matches = new Set<string>();
  const sources = [
    ...extractEmailsFromText(html),
    ...extractEmailsFromText(stripHtmlToText(html)),
    ...extractMailtoEmails(html),
    ...extractAttributeEmails(html),
  ];

  for (const email of sources) {
    matches.add(email);
  }

  return [...matches];
};

const isSameSiteUrl = (candidate: URL, siteUrl: URL): boolean => {
  const candidateHost = normalizeHostname(candidate.hostname);
  const siteHost = normalizeHostname(siteUrl.hostname);
  return (
    candidateHost === siteHost ||
    candidateHost.endsWith(`.${siteHost}`) ||
    siteHost.endsWith(`.${candidateHost}`)
  );
};

const scoreDiscoveredLink = (candidateUrl: URL, label: string): number => {
  if (BINARY_PATH_RE.test(candidateUrl.pathname)) {
    return 0;
  }

  const haystack = decodeEmailArtifacts(
    `${candidateUrl.pathname} ${candidateUrl.search} ${label}`
  ).toLowerCase();
  let priority = 0;

  for (const entry of CONTACT_LINK_HINTS) {
    if (haystack.includes(entry.hint)) {
      priority = Math.max(priority, entry.priority);
    }
  }

  if (
    priority === 0 &&
    (candidateUrl.pathname === '/' || candidateUrl.pathname === '')
  ) {
    return 20;
  }

  return priority;
};

const extractRelevantLinks = (
  html: string,
  pageUrl: URL,
  siteUrl: URL
): DiscoveredLink[] => {
  const discovered = new Map<string, number>();
  const anchorRegex = /<a\b([^>]*?)href\s*=\s*(["'])(.*?)\2([^>]*)>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null = null;

  while ((match = anchorRegex.exec(html)) !== null) {
    const rawHref = decodeEmailArtifacts(match[3] ?? '').trim();
    if (!rawHref || /^(mailto:|tel:|javascript:|#)/i.test(rawHref)) {
      continue;
    }

    let resolved: URL;
    try {
      resolved = new URL(rawHref, pageUrl);
    } catch {
      continue;
    }

    if (!/^https?:$/i.test(resolved.protocol) || !isSameSiteUrl(resolved, siteUrl)) {
      continue;
    }

    resolved.hash = '';
    if (BINARY_PATH_RE.test(resolved.pathname)) {
      continue;
    }

    const normalizedUrl = normalizeScanUrl(resolved.toString());
    const label = stripHtmlToText(
      `${match[1] ?? ''} ${match[4] ?? ''} ${match[5] ?? ''}`
    );
    const priority = scoreDiscoveredLink(resolved, label);
    if (priority <= 0) {
      continue;
    }

    const existing = discovered.get(normalizedUrl) ?? 0;
    if (priority > existing) {
      discovered.set(normalizedUrl, priority);
    }
  }

  return [...discovered.entries()]
    .map(([url, priority]) => ({ url, priority }))
    .sort((left, right) => right.priority - left.priority);
};

const rankEmails = (emails: string[], domain: string | null): string[] => {
  const seen = new Set<string>();
  const unique: string[] = [];
  const normalizedDomain = normalizeHostname(domain);

  for (const email of emails) {
    if (!seen.has(email)) {
      seen.add(email);
      unique.push(email);
    }
  }

  const score = (email: string): number => {
    const emailDomain = normalizeHostname(email.split('@')[1] ?? '');
    let value = 0;
    if (normalizedDomain && emailDomain === normalizedDomain) value += 100;
    if (normalizedDomain && emailDomain.endsWith(`.${normalizedDomain}`)) value += 80;
    if (PERSONAL_PROVIDERS.has(emailDomain)) value -= 30;
    if (
      /^(kontakt|contact|info|biuro|hr|kariera|jobs|recruitment|rekrutacja|hello|office|sales|support)@/i.test(
        email
      )
    ) {
      value += 40;
    }
    if (/^(noreply|no-reply|donotreply|webmaster|postmaster|admin)@/i.test(email)) value -= 60;
    return value;
  };

  return unique.sort((left, right) => score(right) - score(left)).slice(0, 10);
};

const hasHighConfidenceEmail = (emails: Iterable<string>, domain: string | null): boolean => {
  const normalizedDomain = normalizeHostname(domain);
  for (const email of emails) {
    const emailDomain = normalizeHostname(email.split('@')[1] ?? '');
    if (!emailDomain || PERSONAL_PROVIDERS.has(emailDomain)) {
      continue;
    }
    if (
      normalizedDomain &&
      (emailDomain === normalizedDomain || emailDomain.endsWith(`.${normalizedDomain}`))
    ) {
      return true;
    }
  }
  return false;
};

const fetchWithHttp = async (url: string): Promise<{ ok: boolean; html: string; finalUrl: string | null }> => {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return { ok: false, html: '', finalUrl: response.url || null };
    }
    const html = await response.text();
    return { ok: true, html, finalUrl: response.url || null };
  } catch {
    return { ok: false, html: '', finalUrl: null };
  }
};

const parseBooleanFromEnv = (value: string | undefined): boolean | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
};

const parseJsonObjectFromEnv = (value: string | undefined): Record<string, unknown> | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {}
  return null;
};

const resolveEmailScraperEngineRequestOptions = (
  headless: boolean | null | undefined
): EmailScraperEngineRequestOptions => {
  const options: EmailScraperEngineRequestOptions = {};
  const personaId = process.env['JOB_BOARD_EMAIL_SCRAPER_PERSONA_ID']?.trim();
  const antiBot = parseBooleanFromEnv(process.env['JOB_BOARD_EMAIL_SCRAPER_ANTIBOT']) === true;
  const envHeadless = parseBooleanFromEnv(process.env['JOB_BOARD_EMAIL_SCRAPER_HEADLESS']);
  const resolvedHeadless =
    typeof headless === 'boolean' ? headless : envHeadless ?? true;

  if (personaId) {
    options.personaId = personaId;
  }

  const baseSettingsOverrides: Record<string, unknown> = {
    headless: resolvedHeadless,
    ...(antiBot
      ? {
          identityProfile: 'search',
          humanizeMouse: true,
          slowMo: 80,
          clickDelayMin: 90,
          clickDelayMax: 280,
          inputDelayMin: 70,
          inputDelayMax: 210,
          actionDelayMin: 650,
          actionDelayMax: 1900,
        }
      : {}),
  };

  const settingsOverrides = parseJsonObjectFromEnv(
    process.env['JOB_BOARD_EMAIL_SCRAPER_SETTINGS_OVERRIDES']
  );
  const launchOptions = parseJsonObjectFromEnv(
    process.env['JOB_BOARD_EMAIL_SCRAPER_LAUNCH_OPTIONS']
  );
  const contextOptions = parseJsonObjectFromEnv(
    process.env['JOB_BOARD_EMAIL_SCRAPER_CONTEXT_OPTIONS']
  );

  options.settingsOverrides = {
    ...baseSettingsOverrides,
    ...(settingsOverrides ?? {}),
  };

  if (launchOptions) {
    options.launchOptions = launchOptions;
  } else if (antiBot) {
    options.launchOptions = {
      args: ['--disable-blink-features=AutomationControlled'],
    };
  }

  if (contextOptions) {
    options.contextOptions = contextOptions;
  } else if (antiBot) {
    options.contextOptions = {
      userAgent: USER_AGENT,
    };
  }

  return options;
};

const buildPlaywrightEmailFinderScript = (): string => String.raw`
export default async function run({ page, input, emit, log }) {
  const stamp = () => new Date().toISOString();
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const CONTACT_PATHS = ${JSON.stringify(CONTACT_PATHS)};
  const CONTACT_LINK_HINTS = ${JSON.stringify(CONTACT_LINK_HINTS)};
  const COOKIE_ACCEPT_SELECTORS = ${JSON.stringify(COOKIE_ACCEPT_SELECTORS)};
  const COOKIE_ACCEPT_TEXT_PATTERNS = ${JSON.stringify(COOKIE_ACCEPT_TEXT_PATTERNS)};
  const EMAIL_FINDER_STEP_DEFINITIONS = ${JSON.stringify(EMAIL_FINDER_STEP_DEFINITIONS)};
  const EMAIL_REGEX = /\\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,24}\\b/g;
  const MAILTO_REGEX = /href\\s*=\\s*(["'])mailto:([^"'#>]+)(?:#[^"'>]*)?\\1/gi;
  const ATTRIBUTE_EMAIL_REGEX = /(?:data-email|data-mail|content)\\s*=\\s*(["'])(.*?)\\1/gi;
  const BINARY_PATH_RE = /\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|pdf|zip|rar|7z|mp4|mov|avi|mp3|wav)(?:[/?#]|$)/i;
  const NOISE_PATTERNS = ${JSON.stringify(NOISE_PATTERNS.map((entry) => entry.source))}.map((source) => new RegExp(source, 'i'));
  const PERSONAL_PROVIDERS = new Set(${JSON.stringify([...PERSONAL_PROVIDERS])});
  const MAX_PAGES_TO_SCAN = Math.max(1, Number.parseInt(String(input?.maxPages ?? 12), 10) || 12);
  const MAX_EMAILS = Math.max(1, Number.parseInt(String(input?.maxEmails ?? 10), 10) || 10);

  const steps = EMAIL_FINDER_STEP_DEFINITIONS.map((entry) => ({
    key: entry.key,
    label: entry.label,
    status: 'pending',
    message: null,
    startedAt: null,
    completedAt: null,
    durationMs: null,
  }));

  const emitSteps = () => emit?.('steps', steps);
  const findStep = (key) => steps.find((entry) => entry.key === key) || null;
  const startStep = (key, message = null) => {
    const step = findStep(key);
    if (!step) return;
    if (!step.startedAt) {
      step.startedAt = stamp();
    }
    step.status = 'running';
    if (message !== null) {
      step.message = String(message);
    }
    emitSteps();
  };
  const finishStep = (key, status = 'completed', message = null) => {
    const step = findStep(key);
    if (!step) return;
    if (!step.startedAt) {
      step.startedAt = stamp();
    }
    step.status = status;
    if (message !== null) {
      step.message = String(message);
    }
    step.completedAt = stamp();
    step.durationMs =
      step.startedAt !== null ? Date.parse(step.completedAt) - Date.parse(step.startedAt) : null;
    emitSteps();
  };
  const skipStep = (key, message = null) => finishStep(key, 'skipped', message);
  const failStep = (key, message = null) => finishStep(key, 'failed', message);

  const normalizeWhitespace = (value) =>
    String(value || '')
      .replace(/\\s+/g, ' ')
      .trim();

  const normalizeHostname = (value) =>
    normalizeWhitespace(value)
      .toLowerCase()
      .replace(/^www\\./, '');

  const decodeSafe = (value) => {
    try {
      return decodeURIComponent(String(value || ''));
    } catch {
      return String(value || '');
    }
  };

  const decodeEmailArtifacts = (value) =>
    decodeSafe(value)
      .replace(/&#x40;|&#64;|&commat;/gi, '@')
      .replace(/&#x2e;|&#46;|&period;/gi, '.')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/\\s*\\[at\\]\\s*/gi, '@')
      .replace(/\\s*\\(at\\)\\s*/gi, '@')
      .replace(/\\s*\\[dot\\]\\s*/gi, '.')
      .replace(/\\s*\\(dot\\)\\s*/gi, '.');

  const isNoise = (email) => NOISE_PATTERNS.some((re) => re.test(email));

  const extractEmailsFromText = (value) => {
    const decoded = decodeEmailArtifacts(value);
    const variants = [
      decoded,
      decoded.replace(/\\s*@\\s*/g, '@').replace(/\\s*\\.\\s*/g, '.'),
    ];
    const matches = new Set();
    for (const variant of variants) {
      for (const email of variant.match(EMAIL_REGEX) || []) {
        const normalized = email.toLowerCase();
        if (!isNoise(normalized)) {
          matches.add(normalized);
        }
      }
    }
    return [...matches];
  };

  const stripHtmlToText = (html) =>
    String(html || '')
      .replace(/<script\\b[^>]*>[\\s\\S]*?<\\/script>/gi, ' ')
      .replace(/<style\\b[^>]*>[\\s\\S]*?<\\/style>/gi, ' ')
      .replace(/<noscript\\b[^>]*>[\\s\\S]*?<\\/noscript>/gi, ' ')
      .replace(/<svg\\b[^>]*>[\\s\\S]*?<\\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\\s+/g, ' ')
      .trim();

  const extractMailtoEmails = (html) => {
    const matches = new Set();
    let match = null;
    MAILTO_REGEX.lastIndex = 0;
    while ((match = MAILTO_REGEX.exec(String(html || ''))) !== null) {
      const candidate = decodeEmailArtifacts(match[2] || '').split('?')[0] || '';
      for (const email of extractEmailsFromText(candidate)) {
        matches.add(email);
      }
    }
    return [...matches];
  };

  const extractAttributeEmails = (html) => {
    const matches = new Set();
    let match = null;
    ATTRIBUTE_EMAIL_REGEX.lastIndex = 0;
    while ((match = ATTRIBUTE_EMAIL_REGEX.exec(String(html || ''))) !== null) {
      for (const email of extractEmailsFromText(match[2] || '')) {
        matches.add(email);
      }
    }
    return [...matches];
  };

  const collectEmailsFromHtmlAndText = (html, text) => {
    const matches = new Set();
    const sources = [
      ...extractEmailsFromText(html),
      ...extractEmailsFromText(text),
      ...extractEmailsFromText(stripHtmlToText(html)),
      ...extractMailtoEmails(html),
      ...extractAttributeEmails(html),
    ];
    for (const email of sources) {
      matches.add(email);
    }
    return [...matches];
  };

  const scoreEmail = (email, siteDomain) => {
    const emailDomain = normalizeHostname(String(email || '').split('@')[1] || '');
    let value = 0;
    if (siteDomain && emailDomain === siteDomain) value += 100;
    if (siteDomain && emailDomain.endsWith('.' + siteDomain)) value += 80;
    if (PERSONAL_PROVIDERS.has(emailDomain)) value -= 30;
    if (/^(kontakt|contact|info|biuro|hr|kariera|jobs|recruitment|rekrutacja|hello|office|sales|support)@/i.test(email)) {
      value += 40;
    }
    if (/^(noreply|no-reply|donotreply|webmaster|postmaster|admin)@/i.test(email)) {
      value -= 60;
    }
    return value;
  };

  const hasHighConfidenceEmail = (values, siteDomain) => {
    for (const email of values) {
      const emailDomain = normalizeHostname(String(email || '').split('@')[1] || '');
      if (!emailDomain || PERSONAL_PROVIDERS.has(emailDomain)) continue;
      if (siteDomain && (emailDomain === siteDomain || emailDomain.endsWith('.' + siteDomain))) {
        return true;
      }
    }
    return false;
  };

  const dismissCookieConsent = async (context = 'page') => {
    let dismissedCount = 0;

    const directClick = async (locator) => {
      await locator.scrollIntoViewIfNeeded().catch(() => undefined);
      try {
        await locator.click({ timeout: 2000 });
        return true;
      } catch {
        return locator
          .evaluate((element) => {
            if (element instanceof HTMLElement) {
              element.click();
              return true;
            }
            return false;
          })
          .catch(() => false);
      }
    };

    const tryVisibleCandidates = async (locator, selector) => {
      const count = await locator.count().catch(() => 0);
      const candidateCount = Math.min(count, 8);
      for (let index = 0; index < candidateCount; index += 1) {
        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible) continue;
        const clicked = await directClick(candidate);
        if (!clicked) continue;
        return String(selector) + '[' + String(index) + ']';
      }
      return null;
    };

    for (let attempt = 0; attempt < 2; attempt += 1) {
      let dismissedInAttempt = false;

      for (const selector of COOKIE_ACCEPT_SELECTORS) {
        const matched = await tryVisibleCandidates(page.locator(selector), selector);
        if (!matched) continue;
        dismissedCount += 1;
        dismissedInAttempt = true;
        log?.('job-board.email-scraper.cookie.dismissed', {
          context,
          attempt,
          selector: matched,
          currentUrl: page.url(),
        });
        await wait(700);
        break;
      }

      if (!dismissedInAttempt) {
        for (const pattern of COOKIE_ACCEPT_TEXT_PATTERNS) {
          const matched = await tryVisibleCandidates(
            page.getByRole('button', { name: new RegExp(pattern, 'i') }),
            'role=button:' + pattern
          );
          if (!matched) continue;
          dismissedCount += 1;
          dismissedInAttempt = true;
          log?.('job-board.email-scraper.cookie.dismissed', {
            context,
            attempt,
            selector: matched,
            currentUrl: page.url(),
          });
          await wait(700);
          break;
        }
      }

      if (!dismissedInAttempt) {
        break;
      }
    }

    return dismissedCount;
  };

  const scanCurrentDocument = async (siteDomain) => {
    const currentUrl = page.url();
    const html = await page.content().catch(() => '');
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const emails = collectEmailsFromHtmlAndText(html, bodyText);
    const links = await page
      .evaluate(
        ({ hints }) => {
          const normalizeWhitespace = (value) =>
            String(value || '')
              .replace(/\\s+/g, ' ')
              .trim();
          const normalizeHostname = (value) =>
            normalizeWhitespace(value)
              .toLowerCase()
              .replace(/^www\\./, '');
          const decodeSafe = (value) => {
            try {
              return decodeURIComponent(String(value || ''));
            } catch {
              return String(value || '');
            }
          };
          const decodeEmailArtifacts = (value) =>
            decodeSafe(value)
              .replace(/&#x40;|&#64;|&commat;/gi, '@')
              .replace(/&#x2e;|&#46;|&period;/gi, '.')
              .replace(/&nbsp;|&#160;/gi, ' ')
              .replace(/\\s*\\[at\\]\\s*/gi, '@')
              .replace(/\\s*\\(at\\)\\s*/gi, '@')
              .replace(/\\s*\\[dot\\]\\s*/gi, '.')
              .replace(/\\s*\\(dot\\)\\s*/gi, '.');
          const binaryRe = /\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|pdf|zip|rar|7z|mp4|mov|avi|mp3|wav)(?:[/?#]|$)/i;
          const current = new URL(window.location.href);
          const siteHost = normalizeHostname(current.hostname);
          const seen = new Map();

          for (const anchor of Array.from(document.querySelectorAll('a[href]'))) {
            const rawHref = decodeEmailArtifacts(anchor.getAttribute('href') || '').trim();
            if (!rawHref || /^(mailto:|tel:|javascript:|#)/i.test(rawHref)) {
              continue;
            }

            let resolved;
            try {
              resolved = new URL(rawHref, current.toString());
            } catch {
              continue;
            }

            const candidateHost = normalizeHostname(resolved.hostname);
            const sameSite =
              candidateHost === siteHost ||
              candidateHost.endsWith('.' + siteHost) ||
              siteHost.endsWith('.' + candidateHost);
            if (!sameSite || !/^https?:$/i.test(resolved.protocol) || binaryRe.test(resolved.pathname)) {
              continue;
            }

            resolved.hash = '';
            const label = normalizeWhitespace(
              [
                anchor.textContent,
                anchor.getAttribute('aria-label'),
                anchor.getAttribute('title'),
                anchor.className,
                anchor.getAttribute('data-testid'),
              ]
                .filter(Boolean)
                .join(' ')
            );
            const haystack = decodeEmailArtifacts(
              resolved.pathname + ' ' + resolved.search + ' ' + label
            ).toLowerCase();
            let priority = 0;
            for (const entry of hints) {
              if (haystack.includes(entry.hint)) {
                priority = Math.max(priority, entry.priority);
              }
            }
            if (
              priority === 0 &&
              (resolved.pathname === '/' || resolved.pathname === '')
            ) {
              priority = 20;
            }
            if (priority <= 0) {
              continue;
            }

            const absoluteUrl = resolved.toString();
            const existing = seen.get(absoluteUrl) || 0;
            if (priority > existing) {
              seen.set(absoluteUrl, priority);
            }
          }

          return Array.from(seen.entries())
            .map(([url, priority]) => ({ url, priority }))
            .sort((left, right) => right.priority - left.priority);
        },
        { hints: CONTACT_LINK_HINTS }
      )
      .catch(() => []);

    return {
      currentUrl,
      emails,
      links,
      sameDomainEmails: emails.filter((email) => {
        const emailDomain = normalizeHostname(String(email || '').split('@')[1] || '');
        return Boolean(siteDomain) && (emailDomain === siteDomain || emailDomain.endsWith('.' + siteDomain));
      }),
    };
  };

  const startUrl = typeof input?.startUrl === 'string' ? input.startUrl.trim() : '';
  const siteDomain =
    typeof input?.domain === 'string' && input.domain.trim().length > 0
      ? normalizeHostname(input.domain)
      : (() => {
          try {
            return normalizeHostname(new URL(startUrl).hostname);
          } catch {
            return '';
          }
        })();
  const collected = new Map();
  const visited = new Set();
  const visitedUrls = [];
  const queue = new Map();
  const schedulePage = (candidate, priority) => {
    const normalized = normalizeWhitespace(candidate);
    if (!normalized || visited.has(normalized)) {
      return;
    }
    const existing = queue.get(normalized);
    if (existing === undefined || priority > existing) {
      queue.set(normalized, priority);
    }
  };
  const recordEmails = (emails, sourceUrl) => {
    for (const email of Array.isArray(emails) ? emails : []) {
      if (!collected.has(email)) {
        collected.set(email, sourceUrl || null);
      }
    }
  };

  emitSteps();

  if (!startUrl) {
    failStep('validate_input', 'No website or domain available to scan.');
    skipStep('browser_open', 'Skipped because no start URL was provided.');
    skipStep('cookie_consent', 'Skipped because no start URL was provided.');
    skipStep('scan_current_page', 'Skipped because no start URL was provided.');
    skipStep('discover_contact_paths', 'Skipped because no start URL was provided.');
    skipStep('crawl_contact_pages', 'Skipped because no start URL was provided.');
    skipStep('rank_company_emails', 'Skipped because no start URL was provided.');
    return {
      emails: [],
      visitedUrls: [],
      durationMs: 0,
      steps,
      finalUrl: null,
      error: 'No website or domain available to scan.',
    };
  }

  const startedAt = Date.now();
  let cookieDismissals = 0;

  try {
    startStep(
      'validate_input',
      'Preparing browser scrape for ' +
        normalizeWhitespace(input?.companyName || 'company website') +
        ' in ' +
        (input?.headless === false ? 'headed' : 'headless') +
        ' mode.'
    );
    finishStep('validate_input', 'completed', 'Start URL: ' + startUrl);

    startStep('browser_open', 'Opening company website.');
    await page.goto(startUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
    finishStep('browser_open', 'completed', 'Opened ' + page.url());

    startStep('cookie_consent', 'Checking for cookie banners.');
    cookieDismissals += await dismissCookieConsent('homepage');
    finishStep(
      'cookie_consent',
      'completed',
      cookieDismissals > 0
        ? 'Dismissed ' + cookieDismissals + ' cookie consent surface(s).'
        : 'No blocking cookie banner detected.'
    );

    startStep('scan_current_page', 'Scanning the current page for emails and contact paths.');
    const homeScan = await scanCurrentDocument(siteDomain);
    recordEmails(homeScan.emails, homeScan.currentUrl);
    finishStep(
      'scan_current_page',
      'completed',
      'Homepage scan found ' +
        homeScan.emails.length +
        ' email(s) and ' +
        homeScan.links.length +
        ' candidate link(s).'
    );

    startStep('discover_contact_paths', 'Collecting same-site contact and about pages.');
    schedulePage(homeScan.currentUrl, 500);
    for (let index = 0; index < CONTACT_PATHS.length; index += 1) {
      const candidate = new URL(CONTACT_PATHS[index], homeScan.currentUrl).toString();
      schedulePage(candidate, 300 - index);
    }
    for (const link of homeScan.links) {
      schedulePage(link.url, 600 + Number(link.priority || 0));
    }
    queue.delete(normalizeWhitespace(homeScan.currentUrl));
    finishStep(
      'discover_contact_paths',
      'completed',
      'Queued ' + queue.size + ' contact-related page(s) after scanning the homepage.'
    );

    visited.add(normalizeWhitespace(homeScan.currentUrl));
    visitedUrls.push(homeScan.currentUrl);

    if (queue.size === 0) {
      skipStep('crawl_contact_pages', 'No additional same-site contact pages were discovered.');
    } else {
      startStep('crawl_contact_pages', 'Crawling discovered contact-related pages.');
      while (queue.size > 0 && visitedUrls.length < MAX_PAGES_TO_SCAN) {
        const nextEntry = Array.from(queue.entries()).sort((left, right) => right[1] - left[1])[0];
        if (!nextEntry) {
          break;
        }

        const nextUrl = nextEntry[0];
        queue.delete(nextUrl);
        if (visited.has(nextUrl)) {
          continue;
        }

        visited.add(nextUrl);
        visitedUrls.push(nextUrl);
        await page.goto(nextUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });
        await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
        cookieDismissals += await dismissCookieConsent('crawl');
        const pageScan = await scanCurrentDocument(siteDomain);
        recordEmails(pageScan.emails, pageScan.currentUrl);
        for (const link of pageScan.links) {
          schedulePage(link.url, 600 + Number(link.priority || 0));
        }

        log?.('job-board.email-scraper.page-scanned', {
          url: pageScan.currentUrl,
          pageEmailCount: pageScan.emails.length,
          discoveredLinkCount: pageScan.links.length,
          totalEmails: collected.size,
          queuedPages: queue.size,
          visitedPages: visitedUrls.length,
        });

        if (collected.size >= MAX_EMAILS && hasHighConfidenceEmail(collected.keys(), siteDomain)) {
          break;
        }
      }

      finishStep(
        'crawl_contact_pages',
        'completed',
        'Visited ' +
          visitedUrls.length +
          ' page(s), collected ' +
          collected.size +
          ' raw email(s), and dismissed ' +
          cookieDismissals +
          ' cookie surface(s).'
      );
    }

    startStep('rank_company_emails', 'Ranking collected company emails.');
    const rankedAddresses = [...new Set([...collected.keys()])]
      .sort((left, right) => scoreEmail(right, siteDomain) - scoreEmail(left, siteDomain))
      .slice(0, MAX_EMAILS);
    const ranked = rankedAddresses.map((address, index) => ({
      address,
      source: collected.get(address) || null,
      isPrimary: index === 0,
    }));
    finishStep(
      'rank_company_emails',
      ranked.length > 0 ? 'completed' : 'skipped',
      ranked.length > 0
        ? 'Ranked ' +
            ranked.length +
            ' candidate email(s); primary=' +
            ranked[0].address +
            '.'
        : 'No credible company emails were collected from the scanned pages.'
    );

    return {
      emails: ranked,
      visitedUrls,
      durationMs: Date.now() - startedAt,
      steps,
      finalUrl: page.url(),
      error: ranked.length > 0 ? undefined : 'No credible company emails were collected.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const pendingStep =
      [...steps]
        .reverse()
        .find((step) => step.status === 'pending') || null;
    const activeStep =
      steps.find((step) => step.status === 'running') ||
      pendingStep ||
      findStep('crawl_contact_pages') ||
      findStep('browser_open');
    if (activeStep) {
      failStep(activeStep.key, message);
    }
    for (const step of steps) {
      if (step.status === 'pending') {
        skipStep(step.key, 'Skipped because the scrape stopped early.');
      }
    }
    return {
      emails: [],
      visitedUrls,
      durationMs: Date.now() - startedAt,
      steps,
      finalUrl: page.url(),
      error: message,
    };
  }
}
`;

const parseStepStatus = (value: unknown): JobScanStep['status'] | null =>
  value === 'pending' ||
  value === 'running' ||
  value === 'completed' ||
  value === 'failed' ||
  value === 'skipped'
    ? value
    : null;

const parseJobStep = (value: unknown, index: number): JobScanStep | null => {
  if (!value || typeof value !== 'object') return null;
  const entry = value as Record<string, unknown>;
  const rawKey = entry['key'];
  const rawLabel = entry['label'];
  const rawMessage = entry['message'];
  const rawStartedAt = entry['startedAt'];
  const rawCompletedAt = entry['completedAt'];
  const rawDurationMs = entry['durationMs'];
  const key =
    typeof rawKey === 'string' && rawKey.trim() ? rawKey.trim() : `step-${index + 1}`;
  const label = typeof rawLabel === 'string' && rawLabel.trim() ? rawLabel.trim() : key;
  const status = parseStepStatus(entry['status']) ?? 'pending';
  return {
    key,
    label,
    status,
    message:
      typeof rawMessage === 'string' && rawMessage.trim().length > 0
        ? rawMessage.trim()
        : null,
    startedAt:
      typeof rawStartedAt === 'string' && rawStartedAt.trim().length > 0
        ? rawStartedAt.trim()
        : null,
    completedAt:
      typeof rawCompletedAt === 'string' && rawCompletedAt.trim().length > 0
        ? rawCompletedAt.trim()
        : null,
    durationMs:
      typeof rawDurationMs === 'number' && Number.isFinite(rawDurationMs)
        ? Math.max(0, Math.trunc(rawDurationMs))
        : null,
  };
};

const parseCompanyEmail = (value: unknown, index: number): CompanyEmail | null => {
  if (!value || typeof value !== 'object') return null;
  const entry = value as Record<string, unknown>;
  const rawAddress = entry['address'];
  const rawSource = entry['source'];
  const address =
    typeof rawAddress === 'string' && rawAddress.trim().length > 0
      ? rawAddress.trim().toLowerCase()
      : '';
  if (!address) return null;
  return {
    address,
    source:
      typeof rawSource === 'string' && rawSource.trim().length > 0 ? rawSource.trim() : null,
    isPrimary: entry['isPrimary'] === true || index === 0,
  };
};

const parseEngineEmailFinderResult = (value: unknown): EngineEmailFinderResult | null => {
  if (!value || typeof value !== 'object') return null;
  const entry = value as Record<string, unknown>;
  const rawEmails = entry['emails'];
  const rawSteps = entry['steps'];
  const rawVisitedUrls = entry['visitedUrls'];
  const rawDurationMs = entry['durationMs'];
  const rawError = entry['error'];
  const rawFinalUrl = entry['finalUrl'];
  const emails = Array.isArray(rawEmails)
    ? rawEmails
        .map((item, index) => parseCompanyEmail(item, index))
        .filter((item): item is CompanyEmail => item !== null)
    : [];
  const steps = Array.isArray(rawSteps)
    ? rawSteps
        .map((item, index) => parseJobStep(item, index))
        .filter((item): item is JobScanStep => item !== null)
    : [];
  const visitedUrls = Array.isArray(rawVisitedUrls)
    ? rawVisitedUrls.filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0
      )
    : [];

  return {
    emails,
    visitedUrls,
    durationMs:
      typeof rawDurationMs === 'number' && Number.isFinite(rawDurationMs)
        ? Math.max(0, Math.trunc(rawDurationMs))
        : 0,
    steps,
    error:
      typeof rawError === 'string' && rawError.trim().length > 0
        ? rawError.trim()
        : undefined,
    finalUrl:
      typeof rawFinalUrl === 'string' && rawFinalUrl.trim().length > 0
        ? rawFinalUrl.trim()
        : null,
  };
};

const runPlaywrightCompanyEmailFinder = async (input: {
  startUrl: string;
  domain: string | null;
  companyName?: string | null;
  headless?: boolean | null;
}): Promise<EngineEmailFinderResult | null> => {
  try {
    const run = await runPlaywrightEngineTask({
      request: {
        script: buildPlaywrightEmailFinderScript(),
        startUrl: input.startUrl,
        input: {
          startUrl: input.startUrl,
          domain: input.domain,
          companyName: input.companyName ?? null,
          maxPages: MAX_PAGES_TO_SCAN,
          maxEmails: 10,
          headless: input.headless ?? null,
        },
        browserEngine: 'chromium',
        timeoutMs: 120_000,
        ...resolveEmailScraperEngineRequestOptions(input.headless),
      },
      instance: {
        kind: 'custom',
        family: 'scrape',
        label: 'Job board company email scraper',
        tags: ['job-board', 'email-finder', 'playwright'],
      },
    });

    if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'canceled') {
      return {
        emails: [],
        visitedUrls: [],
        durationMs: 0,
        steps: [],
        finalUrl: null,
        error: run.error ?? `Email scraper run status=${run.status}`,
      };
    }

    const returnValue =
      run.result && typeof run.result === 'object'
        ? (run.result as { returnValue?: unknown }).returnValue
        : null;

    const parsed = parseEngineEmailFinderResult(returnValue);
    if (parsed) {
      return parsed;
    }

    return {
      emails: [],
      visitedUrls: [],
      durationMs: 0,
      steps: [],
      finalUrl: null,
      error: 'Email scraper engine returned an invalid result shape.',
    };
  } catch (error) {
    return {
      emails: [],
      visitedUrls: [],
      durationMs: 0,
      steps: [],
      finalUrl: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const runHttpFallbackEmailFinder = async (input: {
  siteUrl: URL;
  domain: string | null;
  fallbackReason?: string | null;
}): Promise<EmailFinderResult> => {
  const startedAt = Date.now();
  const visitedUrls: string[] = [];
  const visited = new Set<string>();
  const queue = new Map<string, number>();
  const collected = new Map<string, string>();
  const steps = defaultPendingSteps();

  updateStep(
    steps,
    'validate_input',
    'completed',
    input.fallbackReason
      ? `Falling back to HTTP crawl because the Playwright scraper was unavailable: ${input.fallbackReason}`
      : `HTTP crawl fallback started for ${input.siteUrl.toString()}`
  );
  updateStep(steps, 'browser_open', 'skipped', 'Skipped because the fallback uses HTTP fetches.');
  updateStep(steps, 'cookie_consent', 'skipped', 'Skipped because the fallback does not execute browser overlays.');

  const schedulePage = (candidate: string, priority: number): void => {
    const normalized = normalizeScanUrl(candidate);
    if (visited.has(normalized)) return;
    const existingPriority = queue.get(normalized);
    if (existingPriority === undefined || priority > existingPriority) {
      queue.set(normalized, priority);
    }
  };

  schedulePage(input.siteUrl.toString(), 300);
  CONTACT_PATHS.forEach((path, index) => {
    schedulePage(new URL(path, input.siteUrl).toString(), 200 - index);
  });

  updateStep(
    steps,
    'discover_contact_paths',
    'completed',
    `Queued ${queue.size} candidate page(s) using fallback contact-path discovery.`
  );

  updateStep(steps, 'crawl_contact_pages', 'running', 'Crawling candidate pages over HTTP.');
  while (queue.size > 0 && visitedUrls.length < MAX_PAGES_TO_SCAN) {
    const nextEntry = [...queue.entries()].sort((left, right) => right[1] - left[1])[0];
    if (!nextEntry) break;

    const [nextUrl] = nextEntry;
    queue.delete(nextUrl);
    if (visited.has(nextUrl)) {
      continue;
    }

    visited.add(nextUrl);
    visitedUrls.push(nextUrl);

    try {
      const { ok, html, finalUrl } = await fetchWithHttp(nextUrl);
      const resolvedPageUrl = normalizeWebsite(finalUrl ?? nextUrl) ?? input.siteUrl;
      visited.add(normalizeScanUrl(resolvedPageUrl.toString()));
      if (!ok || !html) {
        continue;
      }

      for (const email of collectEmailsFromHtml(html)) {
        if (!collected.has(email)) {
          collected.set(email, resolvedPageUrl.toString());
        }
      }

      for (const link of extractRelevantLinks(html, resolvedPageUrl, input.siteUrl)) {
        schedulePage(link.url, 400 + link.priority);
      }

      if (
        collected.size >= EARLY_STOP_EMAIL_COUNT &&
        hasHighConfidenceEmail(collected.keys(), input.domain)
      ) {
        break;
      }
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'job-scans.email-finder',
        action: 'fetchPage',
        url: nextUrl,
      });
    }
  }

  updateStep(
    steps,
    'crawl_contact_pages',
    'completed',
    `Visited ${visitedUrls.length} page(s) and collected ${collected.size} raw email(s) in HTTP fallback mode.`
  );

  updateStep(steps, 'scan_current_page', 'completed', `Fallback scan collected ${collected.size} raw email(s).`);

  const ranked = rankEmails([...collected.keys()], input.domain);
  updateStep(
    steps,
    'rank_company_emails',
    ranked.length > 0 ? 'completed' : 'skipped',
    ranked.length > 0
      ? `Ranked ${ranked.length} candidate email(s); primary=${ranked[0]}.`
      : 'No credible company emails were collected by the HTTP fallback.'
  );

  const emails: CompanyEmail[] = ranked.map((address, index) => ({
    address,
    source: collected.get(address) ?? null,
    isPrimary: index === 0,
  }));

  return {
    emails,
    visitedUrls,
    durationMs: Date.now() - startedAt,
    steps,
    ...(emails.length === 0
      ? { error: 'No credible company emails were collected.' }
      : {}),
  };
};

export const findCompanyEmails = async (input: {
  website: string | null | undefined;
  domain: string | null | undefined;
  companyName?: string | null;
  headless?: boolean | null;
}): Promise<EmailFinderResult> => {
  const startedAt = Date.now();
  const siteUrl = normalizeWebsite(input.website ?? input.domain);
  if (!siteUrl) {
    const steps = defaultPendingSteps();
    updateStep(steps, 'validate_input', 'failed', 'No website or domain available to scan.');
    for (const step of steps) {
      if (step.status === 'pending') {
        updateStep(steps, step.key, 'skipped', 'Skipped because no start URL was available.');
      }
    }
    return {
      emails: [],
      visitedUrls: [],
      durationMs: 0,
      steps,
      error: 'No website or domain available to scan.',
    };
  }

  const normalizedDomain = normalizeHostname(input.domain ?? siteUrl.hostname);
  const engineResult = await runPlaywrightCompanyEmailFinder({
    startUrl: siteUrl.toString(),
    domain: normalizedDomain || null,
    companyName: input.companyName ?? null,
    headless: input.headless ?? null,
  });

  const steps =
    engineResult?.steps.length
      ? hydrateStepSequence(engineResult.steps)
      : buildSyntheticPlaywrightSteps(siteUrl, engineResult?.error ?? null);
  finalizeUnreportedSteps(
    steps,
    ['http_crawl_fallback', 'rank_company_emails'],
    'No final status was returned for this step by the Playwright scraper.'
  );

  const engineEmails = engineResult?.emails ?? [];
  const engineVisitedUrls = engineResult?.visitedUrls ?? [];

  if (engineResult && engineResult.error === undefined && engineEmails.length > 0) {
    updateStep(
      steps,
      'http_crawl_fallback',
      'skipped',
      `Skipped because the Playwright scraper found ${engineEmails.length} candidate email(s).`
    );
    updateFinalRankingStep(steps, engineEmails, false);
    return {
      ...engineResult,
      visitedUrls: combineVisitedUrls([siteUrl.toString()], engineVisitedUrls),
      durationMs: Date.now() - startedAt,
      steps,
    };
  }

  updateStep(
    steps,
    'http_crawl_fallback',
    'running',
    engineResult?.error
      ? `Running HTTP crawl fallback because the Playwright scraper failed: ${engineResult.error}`
      : 'Running HTTP crawl fallback because the Playwright scraper did not find a credible company email.'
  );

  const fallbackResult = await runHttpFallbackEmailFinder({
    siteUrl,
    domain: normalizedDomain || null,
    fallbackReason: engineResult?.error ?? null,
  });

  const mergedEmails = mergeCompanyEmails(engineEmails, fallbackResult.emails, normalizedDomain || null);
  const visitedUrls = combineVisitedUrls(engineVisitedUrls, fallbackResult.visitedUrls);

  updateStep(
    steps,
    'http_crawl_fallback',
    'completed',
    fallbackResult.emails.length > 0
      ? `HTTP crawl visited ${fallbackResult.visitedUrls.length} page(s) and found ${fallbackResult.emails.length} ranked email(s); primary=${fallbackResult.emails[0]?.address}.`
      : `HTTP crawl visited ${fallbackResult.visitedUrls.length} page(s) but found no credible company emails.`
  );
  updateFinalRankingStep(steps, mergedEmails, true);

  return {
    emails: mergedEmails,
    visitedUrls,
    durationMs: Date.now() - startedAt,
    steps,
    ...(mergedEmails.length === 0
      ? {
          error: buildEmailFinderError({
            engineError: engineResult?.error ?? null,
            fallbackError: fallbackResult.error ?? null,
          }),
        }
      : {}),
  };
};
