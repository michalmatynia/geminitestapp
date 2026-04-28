import 'server-only';

import type { Browser, Page } from 'playwright';
import { z } from 'zod';

import {
  createPlaywrightVisionGuidedEvaluator,
  runPlaywrightVisionGuidedAutomation,
  type PlaywrightInjectionAttemptResult,
} from '@/features/playwright/server/ai-step-service';
import { runPlaywrightEngineTask } from '@/features/playwright/server/runtime';
import type { CompanyEmail, JobScanStep } from '@/shared/contracts/job-board';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

/**
 * Vision-guided email-finder. Iteratively screenshots the page, asks the AI
 * "do you see emails — if not, what should I click next?", and lets the
 * vision-guided injector generate Playwright code (clicks/scroll/navigate) to
 * traverse contact + about + social pages until emails surface.
 *
 * Enabled with `JOB_BOARD_USE_VISION_EMAIL_FINDER=true`.
 */

const emailVisionResponseSchema = z.object({
  pageType: z
    .enum(['homepage', 'contact', 'about', 'careers', 'social', 'other'])
    .nullable()
    .default(null),
  visibleEmails: z.array(z.string()).max(20).default([]),
  obfuscatedHints: z.array(z.string()).max(10).default([]),
  done: z.boolean().default(false),
  nextAction: z
    .object({
      kind: z.enum(['click_link', 'scroll', 'navigate', 'open_facebook', 'give_up']),
      target: z.string().nullable().default(null),
      reason: z.string().nullable().default(null),
    })
    .nullable()
    .default(null),
  reasoning: z.string().nullable().default(null),
});
type EmailVisionResponse = z.infer<typeof emailVisionResponseSchema>;

const SYSTEM_PROMPT = `You analyse a company website screenshot looking for the company's contact email address.

Return a JSON object matching the provided schema:

- pageType: classify the current page ("homepage" | "contact" | "about" | "careers" | "social" | "other").
- visibleEmails: every email address that is visible in plain text on the screenshot. Include those obfuscated with "[at]", "(at)", "&#64;" — decode them.
- obfuscatedHints: short snippets that look like they may contain emails but you can't read confidently (e.g. "kontakt @ firma . pl" rendered as image).
- done: true ONLY when at least one credible corporate email is in visibleEmails.
- nextAction (when not done): the most likely next step to surface an email. Choose:
  * "click_link" + the visible link text/label (e.g. "Kontakt", "Contact", "Skontaktuj się", "Impressum") that should reveal contact details.
  * "scroll" if the footer has not been reached yet.
  * "navigate" + a path (e.g. "/kontakt", "/about") if you are confident a known contact path exists.
  * "open_facebook" + the Facebook URL if you can see a Facebook icon/link and no other contact info is on the site.
  * "give_up" only when no contact-related affordance is present anywhere.
- reasoning: one short sentence explaining the decision.

Rules:
- Never invent an email. Only return what is literally visible.
- Prefer corporate/role mailboxes (kontakt@, info@, hr@, kariera@, biuro@) over personal (@gmail.com, @wp.pl).
- "noreply@" / "no-reply@" / "webmaster@" do not count — keep looking.`;

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

const NOISE_RE = /(@example\.|@domain\.|@localhost|@your-)/i;
const ROLE_PREFIX_RE = /^(kontakt|contact|info|biuro|hr|kariera|jobs|recruitment|rekrutacja)@/i;
const NOREPLY_PREFIX_RE = /^(noreply|no-reply|donotreply|webmaster|postmaster|admin)@/i;

const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}$/i;
const ENV_TRUE_VALUES = ['1', 'true', 'yes', 'on'];
const ENV_FALSE_VALUES = ['0', 'false', 'no', 'off'];
const VISION_EMAIL_FINDER_STEALTH_LAUNCH_ARGS = ['--disable-blink-features=AutomationControlled'];
const VISION_EMAIL_FINDER_DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
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
const VISION_EMAIL_FINDER_STEP_DEFINITIONS = [
  { key: 'validate_input', label: 'Validate vision email scrape input' },
  { key: 'browser_open', label: 'Open company website' },
  { key: 'cookie_consent', label: 'Handle cookie consent' },
  { key: 'scan_current_page', label: 'Scan current page for email evidence' },
  { key: 'vision_guided_navigation', label: 'Run vision-guided navigation' },
  { key: 'rank_company_emails', label: 'Rank company emails' },
] as const satisfies readonly { key: string; label: string }[];

export type VisionEmailFinderActionHistoryEntry = {
  iteration: number;
  url: string | null;
  resultUrl: string | null;
  pageType: string | null;
  visibleEmails: string[];
  obfuscatedHints: string[];
  nextActionKind: string | null;
  nextActionTarget: string | null;
  nextActionReason: string | null;
  evaluationReasoning: string | null;
  injectorReasoning: string | null;
  outcome: string;
  error: string | null;
  collectedCount: number;
  durationMs: number;
};

type VisionEmailFinderEngineRequestOptions = {
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

const defaultPendingVisionSteps = (): JobScanStep[] =>
  VISION_EMAIL_FINDER_STEP_DEFINITIONS.map((entry) => buildStep(entry.key, entry.label, 'pending'));

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

const skipPendingVisionSteps = (
  steps: JobScanStep[],
  message: string,
  excludeKeys: string[] = []
): void => {
  const excluded = new Set(excludeKeys);
  for (const step of steps) {
    if (excluded.has(step.key)) continue;
    if (step.status === 'pending' || step.status === 'running') {
      updateStep(steps, step.key, 'skipped', message);
    }
  }
};

const finalizeVisionRankingStep = (
  steps: JobScanStep[],
  emails: CompanyEmail[],
  emptyMessage: string
): void => {
  updateStep(
    steps,
    'rank_company_emails',
    emails.length > 0 ? 'completed' : 'skipped',
    emails.length > 0
      ? `Ranked ${emails.length} candidate email(s); primary=${emails[0]?.address}.`
      : emptyMessage
  );
};

const buildVisionFailureSteps = (input: {
  startUrl: string | null;
  failedKey: string;
  message: string;
  openedUrl?: string | null;
}): JobScanStep[] => {
  const steps = defaultPendingVisionSteps();
  if (!input.startUrl) {
    updateStep(steps, 'validate_input', 'failed', 'No website or domain available.');
    skipPendingVisionSteps(steps, 'Skipped because no start URL was available.', [
      'validate_input',
    ]);
    return steps;
  }

  updateStep(
    steps,
    'validate_input',
    'completed',
    `Prepared ${input.startUrl} for vision-guided email scraping.`
  );
  if (input.openedUrl) {
    updateStep(steps, 'browser_open', 'completed', `Opened ${input.openedUrl}.`);
  }
  updateStep(steps, input.failedKey, 'failed', input.message);
  skipPendingVisionSteps(
    steps,
    'Skipped because the vision email finder stopped before completing this stage.',
    ['validate_input', 'browser_open', input.failedKey]
  );
  return steps;
};

const clipVisionTelemetryValue = (value: string, max = 72): string =>
  value.length > max ? `${value.slice(0, Math.max(0, max - 3))}...` : value;

const formatVisionTelemetryUrl = (value: string | null): string => {
  if (!value) return 'unknown';
  try {
    const url = new URL(value);
    const path = `${url.pathname}${url.search}`;
    return clipVisionTelemetryValue(`${url.host}${path === '/' ? '' : path}`, 80);
  } catch {
    return clipVisionTelemetryValue(value, 80);
  }
};

const formatVisionActionHistoryEntry = (entry: VisionEmailFinderActionHistoryEntry): string => {
  const parts = [
    `#${entry.iteration}`,
    `[${entry.pageType ?? 'other'}]`,
    formatVisionTelemetryUrl(entry.url),
  ];
  if (entry.visibleEmails.length > 0) {
    parts.push(`emails=${clipVisionTelemetryValue(entry.visibleEmails.join(','), 80)}`);
  }
  if (entry.nextActionKind) {
    parts.push(
      `next=${entry.nextActionKind}${
        entry.nextActionTarget ? `:${clipVisionTelemetryValue(entry.nextActionTarget, 36)}` : ''
      }`
    );
  }
  if (entry.resultUrl && entry.resultUrl !== entry.url) {
    parts.push(`to=${formatVisionTelemetryUrl(entry.resultUrl)}`);
  }
  parts.push(`outcome=${entry.outcome}`);
  if (entry.error) {
    parts.push(`error=${clipVisionTelemetryValue(entry.error, 72)}`);
  }
  return parts.join(' ');
};

const buildVisionActionHistoryMessage = (
  entries: VisionEmailFinderActionHistoryEntry[],
  fallbackReasoning: string | null
): string =>
  entries.length > 0
    ? entries.map((entry) => formatVisionActionHistoryEntry(entry)).join(' | ')
    : fallbackReasoning ?? 'The vision-guided loop did not execute.';

const buildVisionEvidenceMessage = (entries: VisionEmailFinderActionHistoryEntry[]): string =>
  entries.length > 0
    ? entries
        .map((entry) =>
          `#${entry.iteration}=${
            entry.visibleEmails.length > 0
              ? clipVisionTelemetryValue(entry.visibleEmails.join(','), 60)
              : 'none'
          }`
        )
        .join(' | ')
    : 'No screenshot evaluation iterations were completed.';

const buildEngineTelemetrySteps = (input: {
  startUrl: string;
  finalUrl: string | null;
  iterationsRun: number;
  reasoning: string | null;
  errorsCount: number;
  emails: CompanyEmail[];
  actionHistory: VisionEmailFinderActionHistoryEntry[];
}): JobScanStep[] => {
  const steps = defaultPendingVisionSteps();
  const effectiveUrl = input.finalUrl || input.startUrl;

  updateStep(
    steps,
    'validate_input',
    'completed',
    `Prepared ${input.startUrl} for vision-guided email scraping.`
  );
  updateStep(steps, 'browser_open', 'completed', `Opened ${effectiveUrl}.`);
  updateStep(
    steps,
    'cookie_consent',
    'skipped',
    'The remote Playwright engine did not return dedicated cookie-consent telemetry.'
  );
  updateStep(
    steps,
    'scan_current_page',
    input.iterationsRun > 0 ? 'completed' : 'skipped',
    input.iterationsRun > 0
      ? `Analyzed ${input.iterationsRun} screenshot iteration(s) on ${effectiveUrl}. Evidence: ${buildVisionEvidenceMessage(input.actionHistory)}`
      : 'No screenshot evaluation iterations were completed.'
  );

  const navigationSummary = [
    buildVisionActionHistoryMessage(input.actionHistory, input.reasoning),
    input.reasoning ? `Final reasoning: ${clipVisionTelemetryValue(input.reasoning, 120)}` : null,
    input.errorsCount > 0 ? `Injector errors: ${input.errorsCount}.` : null,
  ]
    .filter((value): value is string => value !== null)
    .join(' ');

  updateStep(
    steps,
    'vision_guided_navigation',
    input.iterationsRun > 0 ? 'completed' : 'skipped',
    input.iterationsRun > 0 ? navigationSummary : 'The vision-guided loop did not execute.'
  );
  finalizeVisionRankingStep(
    steps,
    input.emails,
    'No credible company emails were collected by the vision-guided scraper.'
  );
  return steps;
};

const dismissCookieConsentLocally = async (page: Page): Promise<number> => {
  const dismissed = await page
    .evaluate(
      ({ selectors, patterns }) => {
        const isVisible = (element: Element | null): element is HTMLElement => {
          if (!(element instanceof HTMLElement)) return false;
          const style = window.getComputedStyle(element);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };

        const tryClick = (element: Element | null): boolean => {
          if (!isVisible(element)) return false;
          element.click();
          return true;
        };

        let count = 0;
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (tryClick(element)) {
            count += 1;
          }
        }

        if (count > 0) return count;

        const controls = Array.from(
          document.querySelectorAll('button, [role="button"], a, input[type="button"], input[type="submit"]')
        );
        for (const control of controls) {
          const label = [control.textContent, control.getAttribute('aria-label'), control.getAttribute('value')]
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
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
      { selectors: COOKIE_ACCEPT_SELECTORS, patterns: COOKIE_ACCEPT_TEXT_PATTERNS }
    )
    .catch(() => 0);

  if (dismissed > 0) {
    await page.waitForTimeout(800).catch(() => undefined);
  }
  return dismissed;
};

const parseBooleanFromEnv = (value: string | undefined): boolean | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (ENV_TRUE_VALUES.includes(normalized)) return true;
  if (ENV_FALSE_VALUES.includes(normalized)) return false;
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
    return null;
  } catch {
    return null;
  }
};

const resolveVisionEmailFinderEngineRequestOptions = (
  headlessOverride?: boolean | null
): VisionEmailFinderEngineRequestOptions => {
  const options: VisionEmailFinderEngineRequestOptions = {};
  const personaId = process.env['JOB_BOARD_VISION_EMAIL_FINDER_PERSONA_ID']?.trim();
  const antiBot = parseBooleanFromEnv(process.env['JOB_BOARD_VISION_EMAIL_FINDER_ANTIBOT']) === true;

  if (personaId) {
    options.personaId = personaId;
  }

  const mergedSettingsOverrides: Record<string, unknown> = antiBot
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
    : {};

  const settingsOverrides = parseJsonObjectFromEnv(
    process.env['JOB_BOARD_VISION_EMAIL_FINDER_SETTINGS_OVERRIDES']
  );
  const launchOptions = parseJsonObjectFromEnv(
    process.env['JOB_BOARD_VISION_EMAIL_FINDER_LAUNCH_OPTIONS']
  );
  const contextOptions = parseJsonObjectFromEnv(
    process.env['JOB_BOARD_VISION_EMAIL_FINDER_CONTEXT_OPTIONS']
  );

  const antiBotHeadless = parseBooleanFromEnv(
    process.env['JOB_BOARD_VISION_EMAIL_FINDER_HEADLESS']
  );
  const resolvedHeadless = headlessOverride ?? antiBotHeadless ?? (antiBot ? true : undefined);
  const finalSettingsOverrides: Record<string, unknown> = resolvedHeadless === undefined
    ? mergedSettingsOverrides
    : { ...mergedSettingsOverrides, headless: resolvedHeadless };

  if (Object.keys(finalSettingsOverrides).length > 0 || settingsOverrides) {
    options.settingsOverrides = {
      ...finalSettingsOverrides,
      ...(settingsOverrides ?? {}),
    };
  }

  if (launchOptions !== null) {
    options.launchOptions = launchOptions;
  } else if (antiBot) {
    options.launchOptions = {
      args: VISION_EMAIL_FINDER_STEALTH_LAUNCH_ARGS,
    };
  }

  if (contextOptions !== null) {
    options.contextOptions = contextOptions;
  } else if (antiBot) {
    options.contextOptions = {
      userAgent: VISION_EMAIL_FINDER_DEFAULT_USER_AGENT,
    };
  }

  return options;
};

const isPlausibleEmail = (email: string): boolean => {
  if (!EMAIL_PATTERN.test(email)) return false;
  if (NOISE_RE.test(email)) return false;
  if (NOREPLY_PREFIX_RE.test(email)) return false;
  return true;
};

const rankEmails = (emails: Iterable<string>, domain: string | null): string[] => {
  const unique = Array.from(new Set([...emails].map((e) => e.toLowerCase())));
  const score = (email: string): number => {
    const emailDomain = email.split('@')[1] ?? '';
    let value = 0;
    if (domain && emailDomain === domain) value += 100;
    if (domain && emailDomain.endsWith(`.${domain}`)) value += 80;
    if (PERSONAL_PROVIDERS.has(emailDomain)) value -= 30;
    if (ROLE_PREFIX_RE.test(email)) value += 40;
    return value;
  };
  return unique.sort((a, b) => score(b) - score(a)).slice(0, 10);
};

const normaliseStartUrl = (input: string | null | undefined): string | null => {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const toEngineInput = (input: {
  website: string | null | undefined;
  domain: string | null | undefined;
  companyName: string;
  maxIterations?: number;
  timeoutMs?: number;
}): {
  companyName: string;
  domain: string | null;
  maxIterations: number;
  timeoutMs: number;
} => ({
  companyName: input.companyName,
  domain: (input.domain ?? '').trim() || null,
  maxIterations: input.maxIterations ?? 5,
  timeoutMs: input.timeoutMs ?? 90_000,
});

const buildVisionEmailFinderEngineScript = (): string => {
  return `
const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}/i;
const EMAIL_SYSTEM_PROMPT = ${JSON.stringify(SYSTEM_PROMPT)};
const NOISE_RE = /(@example\\.|@domain\\.|@localhost|@your-)/i;
const PERSONAL_PROVIDERS = new Set(['gmail.com','yahoo.com','outlook.com','hotmail.com','wp.pl','onet.pl','o2.pl','interia.pl']);
const ROLE_PREFIX_RE = /^(kontakt|contact|info|biuro|hr|kariera|jobs|recruitment|rekrutacja)@/i;
const NOREPLY_PREFIX_RE = /^(noreply|no-reply|donotreply|webmaster|postmaster|admin)@/i;

const toTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');
const toSafeUrl = (value) => (typeof value === 'string' ? value.trim() : '');
const toEmail = (value) => {
  if (typeof value !== 'string') return '';
  return toTrimmedString(value).toLowerCase();
};
const isPlausibleEmail = (email) => {
  if (!EMAIL_PATTERN.test(email)) return false;
  if (NOISE_RE.test(email)) return false;
  if (NOREPLY_PREFIX_RE.test(email)) return false;
  return true;
};
const hasStr = (value) => typeof value === 'string' && value.trim().length > 0;
const asArray = (value) => Array.isArray(value) ? value : [];
const mapPageUrl = () => {
  try { return toSafeUrl(page.url()); } catch { return null; }
};

const parseJsonObject = (value) => {
  if (!hasStr(value)) return null;
  if (value && typeof value === 'object') return value;
  const text = String(value).trim();
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1));
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {}
  }
  const fenced = text.match(/\\{[\\s\\S]*\\}/);
  if (!fenced) return null;
  try {
    const parsed = JSON.parse(fenced[0]);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};
const isCorporateMatch = (email) => {
  if (!targetDomain) return false;
  const candidateDomain = email.split('@')[1] || '';
  return candidateDomain === targetDomain || candidateDomain.endsWith('.' + targetDomain);
};

const rankEmails = (emails, domain) => {
  const unique = [...new Set((emails || []).map((email) => String(email).toLowerCase()))];
  const score = (email) => {
    const emailDomain = (email.split('@')[1] || '');
    let value = 0;
    if (domain && emailDomain === domain) value += 100;
    if (domain && emailDomain.endsWith('.' + domain)) value += 80;
    if (PERSONAL_PROVIDERS.has(emailDomain)) value -= 30;
    if (ROLE_PREFIX_RE.test(email)) value += 40;
    if (NOREPLY_PREFIX_RE.test(email)) value -= 60;
    return value;
  };
  return unique.sort((a, b) => score(b) - score(a)).slice(0, 10);
};

const targetDomain = hasStr(input.domain) ? input.domain.trim().toLowerCase().replace(/^www\\./, '') : '';
const maxIterations = Number.isFinite(Number(input.maxIterations)) && Number(input.maxIterations) > 0
  ? Math.trunc(Number(input.maxIterations))
  : 5;
const timeoutMs = Number.isFinite(Number(input.timeoutMs)) && Number(input.timeoutMs) > 0
  ? Math.trunc(Number(input.timeoutMs))
  : 90000;
const goal = 'Find at least one corporate contact email for ' + toTrimmedString(input.companyName || 'the company') + ' by checking Kontakt, Contact, About, Impressum, Footer, Facebook. Stop when a credible role-based or corporate email is visible.';

const startAt = Date.now();
let iterationsRun = 0;
let lastReasoning = null;
let done = false;
const collected = new Map();
const seenCodes = new Set();
let lastUrl = toSafeUrl(input.startUrl || '');
let executionErrors = 0;
const maxConsecutiveErrors = 2;
const actionHistory = [];
const getReasoning = (parsed, fallback) => parsed && typeof parsed.reasoning === 'string'
  ? parsed.reasoning.trim() || fallback
  : fallback;

while (iterationsRun < maxIterations && Date.now() - startAt < timeoutMs && !done) {
  iterationsRun++;
  const startIterationAt = Date.now();
  const screenshot = await page.screenshot({ type: 'png' }).catch(() => null);
  const screenshotBase64 = screenshot ? screenshot.toString('base64') : '';
  let parsed = null;
  try {
    const evalResult = await helpers.aiEvaluate({
      inputSource: 'screenshot',
      data: screenshotBase64,
      systemPrompt: EMAIL_SYSTEM_PROMPT,
    });
    parsed = parseJsonObject(evalResult.output);
  } catch {
    parsed = null;
  }

  lastUrl = mapPageUrl();
  const visibleEmails = asArray(parsed?.visibleEmails).map(toEmail).filter(isPlausibleEmail);
  const obfuscatedHints = asArray(parsed?.obfuscatedHints)
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .map((value) => String(value).trim());
  for (const email of visibleEmails) {
    if (!collected.has(email)) {
      collected.set(email, lastUrl);
    }
  }
  if (parsed?.reasoning) {
    lastReasoning = String(parsed.reasoning).trim();
  }
  const historyEntry = {
    iteration: iterationsRun,
    url: lastUrl || null,
    resultUrl: null,
    pageType: parsed && parsed.pageType ? String(parsed.pageType) : null,
    visibleEmails: visibleEmails.slice(0, 5),
    obfuscatedHints: obfuscatedHints.slice(0, 5),
    nextActionKind: parsed && parsed.nextAction && hasStr(parsed.nextAction.kind) ? String(parsed.nextAction.kind) : null,
    nextActionTarget: parsed && parsed.nextAction && hasStr(parsed.nextAction.target) ? String(parsed.nextAction.target) : null,
    nextActionReason: parsed && parsed.nextAction && hasStr(parsed.nextAction.reason) ? String(parsed.nextAction.reason) : null,
    evaluationReasoning: parsed && hasStr(parsed.reasoning) ? String(parsed.reasoning).trim() : null,
    injectorReasoning: null,
    outcome: 'evaluated',
    error: null,
    collectedCount: collected.size,
    durationMs: 0,
  };
  const recordHistory = (patch = {}) => {
    const finalized = {
      ...historyEntry,
      ...patch,
      resultUrl: Object.prototype.hasOwnProperty.call(patch, 'resultUrl') ? patch.resultUrl : mapPageUrl(),
      durationMs: Object.prototype.hasOwnProperty.call(patch, 'durationMs')
        ? patch.durationMs
        : Date.now() - startIterationAt,
    };
    actionHistory.push(finalized);
    return finalized;
  };

  const hasCorporateHit = Array.from(collected.keys()).some((email) => isCorporateMatch(email));
  const shouldGiveUp = parsed && parsed.nextAction && parsed.nextAction.kind === 'give_up';
  if (parsed && parsed.done && collected.size > 0) {
    done = true;
    recordHistory({ outcome: 'done_visible_email', injectorReasoning: lastReasoning });
    break;
  }
  if (hasCorporateHit) {
    done = true;
    lastReasoning = (lastReasoning || 'Corporate match found for target domain.') ;
    recordHistory({ outcome: 'done_corporate_match', injectorReasoning: lastReasoning });
    break;
  }
  if (shouldGiveUp) {
    done = false;
    lastReasoning = lastReasoning || 'AI suggested giving up.';
    recordHistory({ outcome: 'give_up', injectorReasoning: lastReasoning });
    break;
  }

  if (iterationsRun >= maxIterations) {
    recordHistory({ outcome: 'max_iterations_reached', injectorReasoning: lastReasoning });
    break;
  }
  const context = [
    'Current URL: ' + (mapPageUrl() || 'unknown'),
    'Iteration ' + iterationsRun + '/' + maxIterations,
    'Already collected: ' + (collected.size === 0 ? 'none' : Array.from(collected.keys()).join(', ')),
    'Page type: ' + (parsed && parsed.pageType ? String(parsed.pageType) : 'unknown'),
    'AI visible emails: ' + (visibleEmails.length > 0 ? visibleEmails.join(', ') : '(none)'),
    'Obfuscated hints: ' + (obfuscatedHints.length > 0 ? obfuscatedHints.join(' | ') : '(none)'),
  ];
  if (parsed && parsed.nextAction && hasStr(parsed.nextAction.kind)) {
    const target = hasStr(parsed.nextAction.target) ? ' -> ' + String(parsed.nextAction.target) : '';
    const reason = hasStr(parsed.nextAction.reason) ? ' (' + String(parsed.nextAction.reason) + ')' : '';
    context.push('Suggested next: ' + String(parsed.nextAction.kind) + target + reason);
  }
  if (collected.size > 0) {
    context.push('Collected: ' + Array.from(collected.keys()).join(', '));
  }
  const contextText = context.join('\\n');

  let inject;
  try {
    inject = await helpers.aiInject({
      goal,
      context: {
        iteration: iterationsRun,
        maxIterations,
        url: mapPageUrl() || '',
        dom: await page.content().catch(() => ''),
        screenshotBase64,
        freshEvaluation: contextText,
        priorExecutionError: executionErrors > 0 ? lastReasoning : null,
        priorInjectorReasoning: lastReasoning,
      },
    });
  } catch (error) {
    lastReasoning =
      'Code injection failed to initialize on iteration ' + iterationsRun + ': ' + String(error && error.message ? error.message : error || 'unknown');
    recordHistory({ outcome: 'inject_init_failed', injectorReasoning: lastReasoning, error: lastReasoning });
    break;
  }

  if (!inject) {
    lastReasoning = 'AI injector returned no result.';
    recordHistory({ outcome: 'inject_missing', injectorReasoning: lastReasoning, error: lastReasoning });
    break;
  }

  lastReasoning = getReasoning(parsed, inject.reasoning || null) || lastReasoning;
  historyEntry.injectorReasoning = inject.reasoning ? String(inject.reasoning).trim() || null : lastReasoning;
  if (inject.done) {
    done = true;
    recordHistory({ outcome: 'inject_done', injectorReasoning: lastReasoning });
    break;
  }

  const code = typeof inject.code === 'string' ? inject.code.trim() : '';
  if (!code) {
    lastReasoning = 'AI injector returned empty code.';
    recordHistory({ outcome: 'empty_code', injectorReasoning: lastReasoning, error: lastReasoning });
    break;
  }
  if (seenCodes.has(code)) {
    lastReasoning = 'Duplicate injector code detected — stopping loop.';
    recordHistory({ outcome: 'duplicate_code', injectorReasoning: lastReasoning, error: lastReasoning });
    break;
  }
  seenCodes.add(code);

  let executionOutcome = 'executed';
  let executionError = null;
  try {
    await helpers.aiInjectExecute(code);
    executionErrors = 0;
  } catch (error) {
    executionOutcome = 'execute_failed';
    executionError = String(error && error.message ? error.message : error || 'unknown');
    executionErrors += 1;
    lastReasoning =
      'AI injector execution failed on iteration ' +
      iterationsRun +
      ': ' +
      executionError;
  }

  const pageSettledWait = Date.now() - startIterationAt;
  if (pageSettledWait < 200) {
    await page.waitForTimeout(500).catch(() => undefined);
  } else {
    await page.waitForTimeout(250).catch(() => undefined);
  }
  lastUrl = mapPageUrl();
  recordHistory({
    injectorReasoning: lastReasoning,
    outcome: executionOutcome,
    error: executionError,
    resultUrl: lastUrl,
  });
  if (executionOutcome === 'execute_failed' && executionErrors >= maxConsecutiveErrors) {
    break;
  }
}

const ranked = rankEmails(Array.from(collected.keys()), targetDomain);
const emails = ranked.map((address, index) => ({
  address,
  source: collected.get(address) || null,
  isPrimary: index === 0,
}));

return {
  emails,
  iterationsRun,
  durationMs: Date.now() - startAt,
  finalUrl: mapPageUrl(),
  reasoning: lastReasoning,
  done,
  errorsCount: executionErrors,
  actionHistory,
};
  `;
};

type VisionEmailFinderEngineResult = {
  emails: Array<{ address: string; source?: string | null; isPrimary?: boolean }>;
  iterationsRun: number;
  durationMs: number;
  finalUrl: string | null;
  reasoning?: string | null;
  done?: boolean;
  errorsCount?: number;
  error?: string;
  steps?: JobScanStep[];
  actionHistory?: VisionEmailFinderActionHistoryEntry[];
};

const parseActionHistoryEntry = (
  value: unknown,
  index: number
): VisionEmailFinderActionHistoryEntry | null => {
  if (!value || typeof value !== 'object') return null;
  const e = value as Record<string, unknown>;
  const readStr = (key: string): string | null => {
    const v = e[key];
    return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
  };
  const readNum = (key: string, fallback: number, min = 0): number => {
    const v = e[key];
    return typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.trunc(v)) : fallback;
  };
  const readStrArray = (key: string, lower: boolean): string[] => {
    const v = e[key];
    if (!Array.isArray(v)) return [];
    return v
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => (lower ? item.trim().toLowerCase() : item.trim()));
  };
  return {
    iteration: readNum('iteration', index + 1, 1),
    url: readStr('url'),
    resultUrl: readStr('resultUrl'),
    pageType: readStr('pageType'),
    visibleEmails: readStrArray('visibleEmails', true),
    obfuscatedHints: readStrArray('obfuscatedHints', false),
    nextActionKind: readStr('nextActionKind'),
    nextActionTarget: readStr('nextActionTarget'),
    nextActionReason: readStr('nextActionReason'),
    evaluationReasoning: readStr('evaluationReasoning'),
    injectorReasoning: readStr('injectorReasoning'),
    outcome: readStr('outcome') ?? 'unknown',
    error: readStr('error'),
    collectedCount: readNum('collectedCount', 0),
    durationMs: readNum('durationMs', 0),
  };
};

const parseEngineResult = (value: unknown): VisionEmailFinderEngineResult | null => {
  if (!value || typeof value !== 'object') return null;
  const unknownValue = value as {
    emails?: unknown;
    iterationsRun?: unknown;
    durationMs?: unknown;
    finalUrl?: unknown;
    reasoning?: unknown;
    done?: unknown;
    errorsCount?: unknown;
    error?: unknown;
    actionHistory?: unknown;
  };
  if (!Array.isArray(unknownValue.emails)) return null;
  const emails = unknownValue.emails
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const rawAddress = (item as { address?: unknown }).address;
      if (typeof rawAddress !== 'string') return null;
      const address = rawAddress.trim().toLowerCase();
      const source = typeof (item as { source?: unknown }).source === 'string'
        ? String((item as { source?: unknown }).source)
        : null;
      const isPrimary = typeof (item as { isPrimary?: unknown }).isPrimary === 'boolean'
        ? Boolean((item as { isPrimary?: unknown }).isPrimary)
        : false;
      return { address, source, isPrimary };
    })
    .filter((item): item is { address: string; source: string | null; isPrimary: boolean } => item !== null);
  const actionHistory = Array.isArray(unknownValue.actionHistory)
    ? unknownValue.actionHistory
        .map((item, index) => parseActionHistoryEntry(item, index))
        .filter((item): item is VisionEmailFinderActionHistoryEntry => item !== null)
    : [];

  return {
    emails,
    iterationsRun:
      typeof unknownValue.iterationsRun === 'number' && Number.isFinite(unknownValue.iterationsRun)
        ? Math.max(1, Math.trunc(unknownValue.iterationsRun))
        : 0,
    durationMs:
      typeof unknownValue.durationMs === 'number' && Number.isFinite(unknownValue.durationMs)
        ? Math.max(0, Math.trunc(unknownValue.durationMs))
        : 0,
    finalUrl: typeof unknownValue.finalUrl === 'string' ? unknownValue.finalUrl : null,
    reasoning:
      typeof unknownValue.reasoning === 'string' && unknownValue.reasoning.trim().length > 0
        ? unknownValue.reasoning.trim()
        : null,
    done: unknownValue.done === true,
    errorsCount:
      typeof unknownValue.errorsCount === 'number' && Number.isFinite(unknownValue.errorsCount)
        ? Math.max(0, Math.trunc(unknownValue.errorsCount))
        : 0,
    actionHistory,
  };
};

const findCompanyEmailsWithVisionLoopViaEngine = async (input: {
  website: string | null | undefined;
  domain: string | null | undefined;
  companyName: string;
  headless?: boolean | null;
  maxIterations?: number;
  timeoutMs?: number;
}): Promise<VisionEmailFinderResult> => {
  const start = Date.now();
  const startUrl = normaliseStartUrl(input.website ?? input.domain);
  if (!startUrl) {
    return {
      emails: [],
      iterationsRun: 0,
      durationMs: Date.now() - start,
      finalUrl: null,
      reasoning: null,
      actionHistory: [],
      steps: buildVisionFailureSteps({
        startUrl: null,
        failedKey: 'validate_input',
        message: 'No website or domain available.',
      }),
      error: 'No website or domain available.',
    };
  }

  const engineInput = toEngineInput(input);
  try {
    const run = await runPlaywrightEngineTask({
      request: {
        script: buildVisionEmailFinderEngineScript(),
        startUrl,
        input: engineInput,
        browserEngine: 'chromium',
        ...resolveVisionEmailFinderEngineRequestOptions(input.headless),
        timeoutMs: Math.max((engineInput.timeoutMs || 90_000) + 15_000, 120_000),
      },
      instance: {
        kind: 'custom',
        family: 'scrape',
        label: 'Job board vision email finder',
        tags: ['job-board', 'vision-email-finder'],
      },
    });

    if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'canceled') {
      const errorMessage = run.error ?? `Vision email finder run status=${run.status}`;
      return {
        emails: [],
        iterationsRun: 0,
        durationMs: Date.now() - start,
        finalUrl: null,
        reasoning: null,
        actionHistory: [],
        steps: buildVisionFailureSteps({
          startUrl,
          failedKey: 'browser_open',
          message: errorMessage,
        }),
        error: errorMessage,
      };
    }

    const returnValue = (run.result && typeof run.result === 'object'
      ? (run.result as { returnValue?: unknown }).returnValue
      : null);
    const parsed = parseEngineResult(returnValue);
    if (!parsed) {
      const errorMessage = 'Vision engine script returned an invalid result shape.';
      return {
        emails: [],
        iterationsRun: 0,
        durationMs: Date.now() - start,
        finalUrl: null,
        reasoning: null,
        actionHistory: [],
        steps: buildVisionFailureSteps({
          startUrl,
          failedKey: 'scan_current_page',
          message: errorMessage,
          openedUrl: startUrl,
        }),
        error: errorMessage,
      };
    }

    const emails = parsed.emails.map((item, index) => ({
      address: item.address,
      source: item.source ?? null,
      isPrimary: item.isPrimary ?? index === 0,
    }));
    return {
      emails,
      iterationsRun: parsed.iterationsRun,
      durationMs: parsed.durationMs || Date.now() - start,
      finalUrl: parsed.finalUrl || null,
      reasoning: parsed.reasoning || null,
      actionHistory: parsed.actionHistory ?? [],
      steps: buildEngineTelemetrySteps({
        startUrl,
        finalUrl: parsed.finalUrl || null,
        iterationsRun: parsed.iterationsRun,
        reasoning: parsed.reasoning || null,
        errorsCount: parsed.errorsCount ?? 0,
        emails,
        actionHistory: parsed.actionHistory ?? [],
      }),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      emails: [],
      iterationsRun: 0,
      durationMs: Date.now() - start,
      finalUrl: null,
      reasoning: null,
      actionHistory: [],
      steps: buildVisionFailureSteps({
        startUrl,
        failedKey: 'browser_open',
        message: errorMessage,
      }),
      error: errorMessage,
    };
  }
};

export const findCompanyEmailsWithVisionLoop = async (input: {
  website: string | null | undefined;
  domain: string | null | undefined;
  companyName: string;
  headless?: boolean | null;
  maxIterations?: number;
  timeoutMs?: number;
}): Promise<VisionEmailFinderResult> => {
  const engineResult = await findCompanyEmailsWithVisionLoopViaEngine(input);
  if (engineResult.error === undefined) {
    return engineResult;
  }

  const localResult = await findCompanyEmailsWithVisionLoopWithLocalBrowser({
    website: input.website,
    domain: input.domain,
    companyName: input.companyName,
    headless: input.headless,
    maxIterations: input.maxIterations,
    timeoutMs: input.timeoutMs,
  });

  const fallbackMessage = `Local Playwright fallback engaged after engine failure: ${engineResult.error}`;
  const validateStep = localResult.steps.find((step) => step.key === 'validate_input');
  if (validateStep) {
    validateStep.message = validateStep.message
      ? `${validateStep.message} ${fallbackMessage}`
      : fallbackMessage;
  }

  if (localResult.error === undefined) {
    return localResult;
  }

  return {
    ...localResult,
    error:
      localResult.error && engineResult.error
        ? `${engineResult.error}; fallback failed: ${localResult.error}`
        : localResult.error,
  };
};

const findCompanyEmailsWithVisionLoopWithLocalBrowser = async (input: {
  website: string | null | undefined;
  domain: string | null | undefined;
  companyName: string;
  headless?: boolean | null;
  maxIterations?: number;
  timeoutMs?: number;
}): Promise<VisionEmailFinderResult> => {
  const start = Date.now();
  const startUrl = normaliseStartUrl(input.website ?? input.domain);
  const steps = defaultPendingVisionSteps();
  if (!startUrl) {
    return {
      emails: [],
      iterationsRun: 0,
      durationMs: Date.now() - start,
      finalUrl: null,
      reasoning: null,
      actionHistory: [],
      steps: buildVisionFailureSteps({
        startUrl: null,
        failedKey: 'validate_input',
        message: 'No website or domain available.',
      }),
      error: 'No website or domain available.',
    };
  }

  updateStep(
    steps,
    'validate_input',
    'completed',
    `Prepared ${startUrl} for vision-guided email scraping.`
  );

  let chromium: typeof import('playwright').chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch (error) {
    const errorMessage = `playwright import failed: ${error instanceof Error ? error.message : String(error)}`;
    return {
      emails: [],
      iterationsRun: 0,
      durationMs: Date.now() - start,
      finalUrl: null,
      reasoning: null,
      actionHistory: [],
      steps: buildVisionFailureSteps({
        startUrl,
        failedKey: 'browser_open',
        message: errorMessage,
      }),
      error: errorMessage,
    };
  }

  let browser: Browser | null = null;
  let page: Page | null = null;
  const collected = new Map<string, string>(); // address -> source URL
  let lastReasoning: string | null = null;

  try {
    updateStep(
      steps,
      'browser_open',
      'running',
      `Launching local Playwright browser (${input.headless ?? true ? 'headless' : 'headed'}).`
    );
    browser = await chromium.launch({ headless: input.headless ?? true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'pl-PL',
    });
    page = await context.newPage();

    await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    try {
      await page.waitForLoadState('networkidle', { timeout: 8_000 });
    } catch {
      // best effort
    }
    updateStep(steps, 'browser_open', 'completed', `Opened ${page.url()}.`);

    const cookieDismissals = await dismissCookieConsentLocally(page);
    updateStep(
      steps,
      'cookie_consent',
      cookieDismissals > 0 ? 'completed' : 'skipped',
      cookieDismissals > 0
        ? `Dismissed ${cookieDismissals} cookie-consent control(s).`
        : 'No dismissible cookie-consent control detected.'
    );
    updateStep(
      steps,
      'scan_current_page',
      'running',
      'Capturing screenshots and evaluating visible email evidence.'
    );
    updateStep(
      steps,
      'vision_guided_navigation',
      'running',
      `Starting local vision-guided navigation with max ${input.maxIterations ?? 5} iterations.`
    );

    const evaluator = createPlaywrightVisionGuidedEvaluator<EmailVisionResponse>({
      schema: emailVisionResponseSchema,
      systemPrompt: SYSTEM_PROMPT,
      isDone: (parsed, capture) => {
        if (parsed === null) return false;
        const sourceUrl = capture.url ?? page?.url() ?? startUrl;
        for (const raw of parsed.visibleEmails) {
          const lowered = raw.trim().toLowerCase();
          if (isPlausibleEmail(lowered) && !collected.has(lowered)) {
            collected.set(lowered, sourceUrl);
          }
        }
        if (parsed.reasoning) lastReasoning = parsed.reasoning;
        if (parsed.nextAction?.kind === 'give_up') return true;
        if (parsed.done && collected.size > 0) return true;
        // Hard stop when we have something with a strong corporate signal.
        const target = (input.domain ?? '').toLowerCase().replace(/^www\./, '');
        for (const email of collected.keys()) {
          const emailDomain = email.split('@')[1] ?? '';
          if (target && (emailDomain === target || emailDomain.endsWith(`.${target}`))) {
            return true;
          }
        }
        return false;
      },
      buildContext: (parsed, capture) => {
        const lines: string[] = [
          `Current URL: ${capture.url ?? page?.url() ?? startUrl}`,
          `Iteration ${capture.iteration}/${capture.maxIterations}`,
          `Already collected: ${collected.size === 0 ? 'none' : [...collected.keys()].join(', ')}`,
        ];
        if (parsed) {
          lines.push(`Page type: ${parsed.pageType ?? 'unknown'}`);
          if (parsed.visibleEmails.length > 0) {
            lines.push(`AI-detected emails: ${parsed.visibleEmails.join(', ')}`);
          }
          if (parsed.obfuscatedHints.length > 0) {
            lines.push(`Obfuscated hints: ${parsed.obfuscatedHints.join(' | ')}`);
          }
          if (parsed.nextAction) {
            lines.push(
              `Suggested next: ${parsed.nextAction.kind}${ 
                parsed.nextAction.target ? ` → ${parsed.nextAction.target}` : '' 
                }${parsed.nextAction.reason ? ` (${parsed.nextAction.reason})` : ''}`
            );
          }
        }
        return lines.join('\\n');
      },
      getReasoning: (parsed) => parsed?.reasoning ?? null,
    });

    const goal = `Find at least one corporate contact email for "${input.companyName}". Visit Kontakt / Contact / About / Impressum / Footer / Facebook page links as needed. Decode obfuscated addresses. Stop as soon as a credible role-based or corporate email is in view.`;

    const automation: PlaywrightInjectionAttemptResult = await runPlaywrightVisionGuidedAutomation({
      page,
      goal,
      evaluate: evaluator,
      maxIterations: input.maxIterations ?? 5,
      timeoutMs: input.timeoutMs ?? 90_000,
      maxConsecutiveErrors: 2,
    });

    const ranked = rankEmails(
      collected.keys(),
      (input.domain ?? '').toLowerCase().replace(/^www\./, '') || null
    );
    const emails: CompanyEmail[] = ranked.map((address, idx) => ({
      address,
      source: collected.get(address) ?? null,
      isPrimary: idx === 0,
    }));

    updateStep(
      steps,
      'scan_current_page',
      automation.iterationsRun > 0 ? 'completed' : 'skipped',
      automation.iterationsRun > 0
        ? `Evaluated ${automation.iterationsRun} screenshot iteration(s) and collected ${collected.size} raw email(s).`
        : 'The local vision loop did not complete any screenshot evaluation iterations.'
    );
    updateStep(
      steps,
      'vision_guided_navigation',
      automation.iterationsRun > 0 ? 'completed' : 'skipped',
      automation.iterationsRun > 0
        ? [
            `Ran ${automation.iterationsRun} local vision-guided iteration(s).`,
            lastReasoning ?? automation.lastReasoning ?? null,
          ]
            .filter((value): value is string => value !== null && value.trim().length > 0)
            .join(' ')
        : 'The local vision-guided loop did not execute.'
    );
    finalizeVisionRankingStep(
      steps,
      emails,
      `No credible company emails were collected after ${automation.iterationsRun} local vision iteration(s).`
    );

    return {
      emails,
      iterationsRun: automation.iterationsRun,
      durationMs: Date.now() - start,
      finalUrl: page.url(),
      reasoning: lastReasoning ?? automation.lastReasoning ?? null,
      actionHistory: [],
      steps,
      error:
        automation.iterationsRun > 0 && emails.length === 0
          ? 'No emails found in vision loop.'
          : undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const failedStep =
      steps.find((step) => step.status === 'running')?.key ??
      (page ? 'vision_guided_navigation' : 'browser_open');
    updateStep(steps, failedStep, 'failed', errorMessage);
    skipPendingVisionSteps(
      steps,
      'Skipped because the local vision email finder failed before reaching this stage.',
      [failedStep]
    );
    void ErrorSystem.captureException(error, {
      service: 'job-scans.vision-email-finder',
      action: 'findCompanyEmailsWithVisionLoopWithLocalBrowser',
      website: input.website ?? null,
    });
    return {
      emails: [],
      iterationsRun: 0,
      durationMs: Date.now() - start,
      finalUrl: page ? page.url() : null,
      reasoning: lastReasoning,
      actionHistory: [],
      steps,
      error: errorMessage,
    };
  } finally {
    try {
      await page?.context().close();
    } catch {
      // ignore
    }
    try {
      await browser?.close();
    } catch {
      // ignore
    }
  }
};

export type VisionEmailFinderResult = {
  emails: CompanyEmail[];
  iterationsRun: number;
  durationMs: number;
  finalUrl: string | null;
  reasoning: string | null;
  actionHistory: VisionEmailFinderActionHistoryEntry[];
  steps: JobScanStep[];
  error?: string;
};

export const isVisionEmailFinderEnabled = (): boolean =>
  process.env['JOB_BOARD_USE_VISION_EMAIL_FINDER']?.toLowerCase() === 'true';
