import 'server-only';

/* eslint-disable
   complexity,
   max-depth,
   max-lines,
   max-lines-per-function,
   no-await-in-loop,
   @typescript-eslint/no-unnecessary-condition,
   @typescript-eslint/strict-boolean-expressions
 */

import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import type { Locator, Page } from 'playwright';

import { decryptSecret, getMongoIntegrationRepository } from '@/features/integrations/server';
import {
  PRACUJ_ACCOUNT_CHECK_URL,
  PRACUJ_AUTH_ENTRY_URL,
  PRACUJ_AUTH_REQUIRED_DETAIL,
  acceptPracujCookies,
  readPracujAuthState,
  safePracujGoto,
  trySubmitPracujCredentials,
  waitForPracujManualLogin,
  type PracujCredentials,
} from '@/features/integrations/services/pracuj-browser-auth';
import {
  openPlaywrightConnectionTestSession,
  persistPlaywrightConnectionTestSession,
  resolvePlaywrightConnectionTestRuntime,
} from '@/features/playwright/server';
import { JOB_APPLICATION_APPLY_RUNTIME_KEY } from '@/shared/lib/browser-execution/job-application-apply-runtime-constants';
import { conflictError } from '@/shared/errors/app-error';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integration-storage';
import type { FilemakerJobListing } from '@/shared/contracts/filemaker';

import type {
  FilemakerJobApplication,
  FilemakerJobApplicationActiveArtifacts,
  FilemakerJobApplicationApplyRun,
  FilemakerJobApplicationApplyRunArtifacts,
  FilemakerJobApplicationApplyRunMode,
  FilemakerJobApplicationApplyRunStatus,
  FilemakerJobApplicationApplyRunStepStatus,
  FilemakerJobApplicationArtifactVersion,
  FilemakerJobApplicationCoverLetter,
  FilemakerJobApplicationEmail,
} from '../filemaker-job-application.types';
import { createFilemakerCvPdfExport } from './filemaker-cv-pdf';
import { getMongoFilemakerPersonById } from './filemaker-persons-repository';
import {
  appendMongoFilemakerJobApplicationApplyRunStep,
  createMongoFilemakerJobApplicationApplyRun,
  getLatestMongoFilemakerJobApplicationApplyRun,
  requireMongoFilemakerJobApplicationApplyRunById,
  updateMongoFilemakerJobApplicationApplyRun,
} from './filemaker-job-application-apply-run-repository';
import {
  requireMongoFilemakerJobApplicationById,
  updateMongoFilemakerJobApplicationStatus,
} from './filemaker-job-application-repository';
import { createFilemakerJobApplicationCoverLetterPdfExport } from './filemaker-job-application-pdf';
import { getSettingsFilemakerJobListingById } from './filemaker-organizations-repository';

type StartFilemakerJobApplicationApplyRunInput = {
  activeArtifacts?: Partial<FilemakerJobApplicationActiveArtifacts>;
  applicationId: string;
  force?: boolean;
  mode?: FilemakerJobApplicationApplyRunMode;
};

type PreparedApplyContext = {
  application: FilemakerJobApplication;
  artifactVersionIds: FilemakerJobApplicationApplyRunArtifacts;
  connection: IntegrationConnectionRecord | null;
  integrationSlug: string | null;
  jobListing: FilemakerJobListing | null;
  sourceUrl: string | null;
};

type PreparedApplyArtifacts = {
  applicationEmailText: string | null;
  coverLetterPath: string | null;
  coverLetterText: string | null;
  cvPath: string;
};

const ACTIVE_RUN_STATUSES = new Set<FilemakerJobApplicationApplyRunStatus>([
  'queued',
  'running',
]);

const JOB_APPLICATION_APPLY_RUN_ROOT = path.join(
  os.tmpdir(),
  'filemaker-job-application-runs'
);

const PRACUJ_ALLOWED_HOSTS = new Set(['pracuj.pl', 'www.pracuj.pl', 'login.pracuj.pl']);

const PRACUJ_APPLY_BUTTON_SELECTORS = [
  'a[data-test*="apply" i]',
  'button[data-test*="apply" i]',
  'a[href*="aplikuj" i]',
  'a:has-text("Aplikuj")',
  'button:has-text("Aplikuj")',
  'a:has-text("Apply")',
  'button:has-text("Apply")',
] as const;

const PRACUJ_FINAL_SUBMIT_SELECTORS = [
  'button:has-text("Wyślij aplikację")',
  'button:has-text("Wyślij")',
  'button:has-text("Aplikuj")',
  'button:has-text("Submit application")',
  'button:has-text("Submit")',
  'button[type="submit"]',
] as const;

const COVER_LETTER_TEXTAREA_SELECTORS = [
  'textarea[name*="cover" i]',
  'textarea[name*="letter" i]',
  'textarea[name*="message" i]',
  'textarea[name*="motivation" i]',
  'textarea',
] as const;

const SUBMITTED_TEXT_PATTERNS = [
  /aplikacja\s+(została\s+)?wysłana/i,
  /dziękujemy\s+za\s+aplikację/i,
  /application\s+(has\s+been\s+)?sent/i,
  /thank\s+you\s+for\s+your\s+application/i,
] as const;

const KONTYNUUJ_APLIKOWANIE_SELECTORS = [
  'button:has-text("Kontynuuj aplikowanie")',
  'a:has-text("Kontynuuj aplikowanie")',
  'button:has-text("Continue applying")',
  'a:has-text("Continue applying")',
] as const;

const EXTERNAL_FORM_HEADING_PATTERNS = [
  /formularz\s+zgłoszeniowy/i,
  /kariera/i,
  /formularz\s+aplikacyjny/i,
] as const;

const EXTERNAL_FIRST_NAME_SELECTORS = [
  'input[name*="firstName" i]',
  'input[name*="first_name" i]',
  'input[name*="imie" i]',
  'input[name*="imię" i]',
  'input[placeholder*="Imię" i]',
  'input[aria-label*="Imię" i]',
  'input[aria-label*="imię" i]',
] as const;

const EXTERNAL_LAST_NAME_SELECTORS = [
  'input[name*="lastName" i]',
  'input[name*="last_name" i]',
  'input[name*="nazwisko" i]',
  'input[placeholder*="Nazwisko" i]',
  'input[aria-label*="Nazwisko" i]',
] as const;

const EXTERNAL_EMAIL_SELECTORS = [
  'input[type="email"]',
  'input[name*="email" i]',
  'input[placeholder*="E-mail" i]',
  'input[placeholder*="email" i]',
  'input[aria-label*="email" i]',
] as const;

const EXTERNAL_PHONE_SELECTORS = [
  'input[name*="phone" i]',
  'input[name*="telefon" i]',
  'input[name*="tel" i]',
  'input[type="tel"]',
  'input[placeholder*="telefon" i]',
  'input[placeholder*="phone" i]',
  'input[aria-label*="telefon" i]',
] as const;

const EXTERNAL_MESSAGE_SELECTORS = [
  'textarea[name*="message" i]',
  'textarea[name*="wiadomosc" i]',
  'textarea[name*="wiadomość" i]',
  'textarea[placeholder*="wiadomość" i]',
  'textarea[placeholder*="Miejsce na" i]',
  'textarea[aria-label*="wiadomość" i]',
  'textarea',
] as const;

const EXTERNAL_SALARY_SELECTORS = [
  'input[name*="salary" i]',
  'input[name*="wynagrodzenie" i]',
  'input[name*="oczekiwania" i]',
  'input[placeholder*="PLN" i]',
  'input[placeholder*="wynagrodzenie" i]',
  'input[aria-label*="wynagrodzenie" i]',
  'input[aria-label*="salary" i]',
] as const;

type ExternalCareerFormInput = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  cvPath: string;
  cooperationForm: 'uop' | 'b2b';
  salaryExpectation: number | null;
  messageText: string | null;
};

const pageBodyContains = async (page: Page, patterns: readonly RegExp[]): Promise<boolean> => {
  const bodyText = (await page.locator('body').first().textContent({ timeout: 3000 }).catch(() => null)) ?? '';
  return patterns.some((pattern) => pattern.test(bodyText));
};

const fillInputIfVisible = async (
  page: Page,
  selectors: readonly string[],
  value: string
): Promise<boolean> => {
  const input = await findVisibleLocator(page, selectors);
  if (input === null) return false;
  const current = await input.inputValue({ timeout: 1500 }).catch(() => '');
  if (current.trim().length > 0) return true;
  await input.fill(value);
  return true;
};

const selectCooperationFormOption = async (
  page: Page,
  value: 'uop' | 'b2b'
): Promise<boolean> => {
  const labelText = value === 'uop' ? /UoP|umowa\s+o\s+pracę|uop/i : /B2B|b2b/i;
  const radioSelectors = [
    `input[type="radio"][value*="${value}" i]`,
    `input[type="radio"][id*="${value}" i]`,
  ];

  for (const selector of radioSelectors) {
    const radios = page.locator(selector);
    const count = await radios.count().catch(() => 0);
    if (count > 0) {
      await radios.first().click({ force: true }).catch(() => undefined);
      return true;
    }
  }

  const labels = page.locator('label');
  const labelCount = await labels.count().catch(() => 0);
  for (let i = 0; i < labelCount; i++) {
    const label = labels.nth(i);
    const text = await label.textContent().catch(() => '');
    if (text && labelText.test(text)) {
      const forAttr = await label.getAttribute('for').catch(() => null);
      if (forAttr) {
        const radio = page.locator(`#${CSS.escape(forAttr)}`);
        if (await radio.isVisible({ timeout: 1000 }).catch(() => false)) {
          await radio.click({ force: true }).catch(() => undefined);
          return true;
        }
      }
      await label.click({ force: true }).catch(() => undefined);
      return true;
    }
  }
  return false;
};

const fillExternalCareerForm = async (
  page: Page,
  input: ExternalCareerFormInput
): Promise<boolean> => {
  if (input.firstName !== null) {
    await fillInputIfVisible(page, EXTERNAL_FIRST_NAME_SELECTORS, input.firstName);
  }
  if (input.lastName !== null) {
    await fillInputIfVisible(page, EXTERNAL_LAST_NAME_SELECTORS, input.lastName);
  }
  if (input.email !== null) {
    await fillInputIfVisible(page, EXTERNAL_EMAIL_SELECTORS, input.email);
  }
  if (input.phone !== null) {
    await fillInputIfVisible(page, EXTERNAL_PHONE_SELECTORS, input.phone);
  }

  const fileInputs = page.locator('input[type="file"]');
  const fileInputCount = await fileInputs.count().catch(() => 0);
  if (fileInputCount > 0) {
    await fileInputs.nth(0).setInputFiles(input.cvPath).catch(() => undefined);
  }

  await selectCooperationFormOption(page, input.cooperationForm);

  if (input.salaryExpectation !== null) {
    await fillInputIfVisible(page, EXTERNAL_SALARY_SELECTORS, String(input.salaryExpectation));
  }

  if (input.messageText !== null) {
    const textarea = await findVisibleLocator(page, EXTERNAL_MESSAGE_SELECTORS);
    if (textarea !== null) {
      const current = await textarea.inputValue({ timeout: 1500 }).catch(() => '');
      if (current.trim().length === 0) {
        const truncated = input.messageText.slice(0, 500);
        await textarea.fill(truncated);
      }
    }
  }

  const consentCheckboxes = page.locator('input[type="checkbox"]');
  const checkboxCount = await consentCheckboxes.count().catch(() => 0);
  for (let i = 0; i < checkboxCount; i++) {
    const checkbox = consentCheckboxes.nth(i);
    const checked = await checkbox.isChecked({ timeout: 1000 }).catch(() => false);
    if (!checked) {
      await checkbox.click({ force: true }).catch(() => undefined);
    }
  }

  return true;
};

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const readRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const toCoverLetter = (value: unknown): FilemakerJobApplicationCoverLetter | null => {
  const payload = readRecord(value);
  const record = readRecord(payload?.['coverLetter']) ?? payload;
  if (record === null) return null;
  return {
    bodyMarkdown: normalizeText(record['bodyMarkdown']),
    subject: normalizeText(record['subject']),
  };
};

const toApplicationEmail = (value: unknown): FilemakerJobApplicationEmail | null => {
  const payload = readRecord(value);
  const record = readRecord(payload?.['applicationEmail']) ?? payload;
  if (record === null) return null;
  return {
    bodyMarkdown: normalizeText(record['bodyMarkdown']),
    bodyText: normalizeText(record['bodyText']),
    subject: normalizeText(record['subject']),
  };
};

const findArtifactVersion = (
  versions: FilemakerJobApplicationArtifactVersion[],
  versionId: string | null
): FilemakerJobApplicationArtifactVersion | null =>
  versionId === null
    ? null
    : versions.find(
        (version: FilemakerJobApplicationArtifactVersion): boolean => version.id === versionId
      ) ?? null;

const selectVersionId = (
  requested: string | null | undefined,
  active: string | null | undefined,
  versions: FilemakerJobApplicationArtifactVersion[]
): string | null => {
  const requestedId = normalizeText(requested);
  if (
    requestedId !== null &&
    versions.some((version: FilemakerJobApplicationArtifactVersion): boolean => version.id === requestedId)
  ) {
    return requestedId;
  }
  const activeId = normalizeText(active);
  if (
    activeId !== null &&
    versions.some((version: FilemakerJobApplicationArtifactVersion): boolean => version.id === activeId)
  ) {
    return activeId;
  }
  return normalizeText(versions[0]?.id);
};

const resolveArtifactVersionIds = (
  application: FilemakerJobApplication,
  requested?: Partial<FilemakerJobApplicationActiveArtifacts>
): FilemakerJobApplicationApplyRunArtifacts => {
  const versions = application.persistedArtifactVersions ?? application.artifactVersions ?? {
    applicationEmail: [],
    coverLetter: [],
    tailoredCv: [],
  };
  return {
    applicationEmailVersionId: selectVersionId(
      requested?.applicationEmailVersionId,
      application.activeArtifacts?.applicationEmailVersionId,
      versions.applicationEmail
    ),
    coverLetterVersionId: selectVersionId(
      requested?.coverLetterVersionId,
      application.activeArtifacts?.coverLetterVersionId,
      versions.coverLetter
    ),
    tailoredCvVersionId: selectVersionId(
      requested?.tailoredCvVersionId,
      application.activeArtifacts?.tailoredCvVersionId,
      versions.tailoredCv
    ),
  };
};

const getApplicationContextJobHref = (application: FilemakerJobApplication): string | null => {
  const context = readRecord(application.sourceApplicationContext);
  const jobContext = readRecord(context?.['jobContext']);
  const listing = readRecord(jobContext?.['listing']);
  return normalizeExternalUrl(listing?.['sourceUrl']);
};

const normalizeExternalUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
};

const deriveIntegrationSlugFromSourceUrl = (sourceUrl: string | null): string | null => {
  if (sourceUrl === null) return null;
  try {
    const host = new URL(sourceUrl).hostname.toLowerCase();
    if (host === 'pracuj.pl' || host.endsWith('.pracuj.pl')) return 'pracuj-pl';
    if (host === 'justjoin.it' || host.endsWith('.justjoin.it')) return 'justjoin-it';
    if (host === 'nofluffjobs.com' || host.endsWith('.nofluffjobs.com')) return 'nofluffjobs';
    return null;
  } catch {
    return null;
  }
};

const resolveSourceUrl = (
  application: FilemakerJobApplication,
  jobListing: FilemakerJobListing | null
): string | null =>
  normalizeExternalUrl(jobListing?.sourceUrl) ?? getApplicationContextJobHref(application);

const resolveConnection = async (
  application: FilemakerJobApplication
): Promise<IntegrationConnectionRecord | null> => {
  const connectionId = normalizeText(application.connectionId);
  if (connectionId === null) return null;
  return getMongoIntegrationRepository().getConnectionById(connectionId);
};

const loadPreparedContext = async (
  input: StartFilemakerJobApplicationApplyRunInput
): Promise<PreparedApplyContext> => {
  const application = await requireMongoFilemakerJobApplicationById(input.applicationId);
  if (application.status === 'applied' && input.force !== true) {
    throw conflictError('This application is already marked as applied.');
  }
  const jobListing = await getSettingsFilemakerJobListingById(application.jobListingId);
  const sourceUrl = resolveSourceUrl(application, jobListing);
  const artifactVersionIds = resolveArtifactVersionIds(application, input.activeArtifacts);
  const connection = await resolveConnection(application);
  const integrationSlug =
    normalizeText(application.integrationSlug) ?? deriveIntegrationSlugFromSourceUrl(sourceUrl);

  return {
    application,
    artifactVersionIds,
    connection,
    integrationSlug,
    jobListing,
    sourceUrl,
  };
};

const appendStep = (
  runId: string,
  label: string,
  status: FilemakerJobApplicationApplyRunStepStatus,
  detail: string
): void => {
  void appendMongoFilemakerJobApplicationApplyRunStep(runId, {
    id: randomUUID(),
    label,
    status,
    detail,
    createdAt: new Date().toISOString(),
  }).catch(() => undefined);
};

const completeRun = async (
  runId: string,
  status: FilemakerJobApplicationApplyRunStatus,
  input: {
    confirmationUrl?: string | null;
    error?: string | null;
  } = {}
): Promise<FilemakerJobApplicationApplyRun> =>
  updateMongoFilemakerJobApplicationApplyRun(runId, {
    completedAt: new Date().toISOString(),
    confirmationUrl: input.confirmationUrl ?? null,
    error: input.error ?? null,
    status,
  });

const ensureSupportedPracujContext = async (
  run: FilemakerJobApplicationApplyRun,
  context: PreparedApplyContext
): Promise<boolean> => {
  if (context.sourceUrl === null) {
    appendStep(run.id, 'Source URL', 'failed', 'The job listing does not have a source URL.');
    await completeRun(run.id, 'failed', { error: 'The job listing does not have a source URL.' });
    return false;
  }
  const sourceHost = new URL(context.sourceUrl).hostname.toLowerCase();
  if (!PRACUJ_ALLOWED_HOSTS.has(sourceHost) && !sourceHost.endsWith('.pracuj.pl')) {
    appendStep(
      run.id,
      'Source website',
      'failed',
      'Only Pracuj.pl application automation is implemented for this first pass.'
    );
    await completeRun(run.id, 'failed', {
      error: 'Only Pracuj.pl application automation is implemented for this first pass.',
    });
    return false;
  }
  if (context.integrationSlug !== 'pracuj-pl') {
    appendStep(
      run.id,
      'Integration',
      'failed',
      'The prepared application is not linked to the Pracuj.pl integration.'
    );
    await completeRun(run.id, 'failed', {
      error: 'The prepared application is not linked to the Pracuj.pl integration.',
    });
    return false;
  }
  if (context.connection === null) {
    appendStep(
      run.id,
      'Integration connection',
      'failed',
      'No reusable Pracuj.pl integration connection is linked to this application.'
    );
    await completeRun(run.id, 'auth_required', {
      error: 'No reusable Pracuj.pl integration connection is linked to this application.',
    });
    return false;
  }
  return true;
};

const resolvePracujCredentials = (
  connection: IntegrationConnectionRecord
): PracujCredentials | null => {
  const username = normalizeText(connection.username);
  const encryptedPassword = normalizeText(connection.password);
  if (username === null || encryptedPassword === null) return null;
  const password = decryptSecret(encryptedPassword).trim();
  return password.length > 0 ? { username, password } : null;
};

const sanitizeFilename = (filename: string): string => {
  const normalized = filename
    .replace(/[<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length > 0 ? normalized : 'application-artifact.pdf';
};

const resolveSelectedCoverLetter = (
  application: FilemakerJobApplication,
  artifactVersionIds: FilemakerJobApplicationApplyRunArtifacts
): FilemakerJobApplicationCoverLetter | null => {
  const version = findArtifactVersion(
    application.persistedArtifactVersions?.coverLetter ?? application.artifactVersions?.coverLetter ?? [],
    artifactVersionIds.coverLetterVersionId
  );
  return toCoverLetter(version?.payload) ?? application.coverLetter;
};

const resolveSelectedApplicationEmail = (
  application: FilemakerJobApplication,
  artifactVersionIds: FilemakerJobApplicationApplyRunArtifacts
): FilemakerJobApplicationEmail | null => {
  const version = findArtifactVersion(
    application.persistedArtifactVersions?.applicationEmail ??
      application.artifactVersions?.applicationEmail ??
      [],
    artifactVersionIds.applicationEmailVersionId
  );
  return toApplicationEmail(version?.payload) ?? application.applicationEmail;
};

const composeCoverLetterText = (coverLetter: FilemakerJobApplicationCoverLetter | null): string | null => {
  const subject = normalizeText(coverLetter?.subject);
  const body = normalizeText(coverLetter?.bodyMarkdown);
  const text = [subject, body].filter((value): value is string => value !== null).join('\n\n');
  return text.length > 0 ? text : null;
};

const composeApplicationEmailText = (
  applicationEmail: FilemakerJobApplicationEmail | null
): string | null => {
  const subject = normalizeText(applicationEmail?.subject);
  const body = normalizeText(applicationEmail?.bodyText ?? applicationEmail?.bodyMarkdown);
  const text = [subject, body].filter((value): value is string => value !== null).join('\n\n');
  return text.length > 0 ? text : null;
};

const writePreparedApplyArtifacts = async (
  runId: string,
  context: PreparedApplyContext
): Promise<PreparedApplyArtifacts> => {
  const versions = context.application.persistedArtifactVersions ?? context.application.artifactVersions;
  const tailoredCvVersion = findArtifactVersion(
    versions?.tailoredCv ?? [],
    context.artifactVersionIds.tailoredCvVersionId
  );
  const cvId = normalizeText(tailoredCvVersion?.linkedRecordId) ?? context.application.tailoredCvId;
  if (cvId === null) {
    throw new Error('A selected CV PDF could not be resolved for this application.');
  }

  const runDir = path.join(JOB_APPLICATION_APPLY_RUN_ROOT, runId);
  await fs.mkdir(runDir, { recursive: true });

  const cvExport = await createFilemakerCvPdfExport({ cvId });
  const cvPath = path.join(runDir, sanitizeFilename(cvExport.filename));
  await fs.writeFile(cvPath, cvExport.pdfBuffer);

  let coverLetterPath: string | null = null;
  const coverLetter = resolveSelectedCoverLetter(context.application, context.artifactVersionIds);
  const coverLetterText = composeCoverLetterText(coverLetter);
  if (coverLetter !== null || context.artifactVersionIds.coverLetterVersionId !== null) {
    const coverLetterExport = await createFilemakerJobApplicationCoverLetterPdfExport({
      applicationId: context.application.id,
      coverLetterVersionId: context.artifactVersionIds.coverLetterVersionId,
    });
    coverLetterPath = path.join(runDir, sanitizeFilename(coverLetterExport.filename));
    await fs.writeFile(coverLetterPath, coverLetterExport.pdfBuffer);
  }

  return {
    applicationEmailText: composeApplicationEmailText(
      resolveSelectedApplicationEmail(context.application, context.artifactVersionIds)
    ),
    coverLetterPath,
    coverLetterText,
    cvPath,
  };
};

const findVisibleLocator = async (
  page: Page,
  selectors: readonly string[]
): Promise<Locator | null> => {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible({ timeout: 1500 }).catch(() => false)) {
      return locator;
    }
  }
  return null;
};

const clickAndFollow = async (
  page: Page,
  locator: Locator
): Promise<Page> => {
  const context = page.context();
  const newPagePromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
  await Promise.allSettled([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15_000 }),
    locator.click(),
  ]);
  const newPage = await newPagePromise;
  const activePage = newPage ?? page;
  await activePage.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
  await activePage.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
  await acceptPracujCookies(activePage);
  return activePage;
};

const uploadPreparedFiles = async (
  page: Page,
  artifacts: PreparedApplyArtifacts
): Promise<{
  coverLetterUploaded: boolean;
  cvUploaded: boolean;
}> => {
  const fileInputs = page.locator('input[type="file"]');
  const inputCount = await fileInputs.count().catch(() => 0);
  let cvUploaded = false;
  let coverLetterUploaded = false;

  if (inputCount > 0) {
    await fileInputs.nth(0).setInputFiles(artifacts.cvPath);
    cvUploaded = true;
  }
  if (inputCount > 1 && artifacts.coverLetterPath !== null) {
    await fileInputs.nth(1).setInputFiles(artifacts.coverLetterPath);
    coverLetterUploaded = true;
  }

  return { coverLetterUploaded, cvUploaded };
};

const fillCoverLetterText = async (
  page: Page,
  coverLetterText: string | null
): Promise<boolean> => {
  if (coverLetterText === null) return false;
  const textarea = await findVisibleLocator(page, COVER_LETTER_TEXTAREA_SELECTORS);
  if (textarea === null) return false;
  const currentValue = await textarea.inputValue({ timeout: 1500 }).catch(() => '');
  if (currentValue.trim().length > 0) return false;
  await textarea.fill(coverLetterText);
  return true;
};

const pageHasSubmittedConfirmation = async (page: Page): Promise<boolean> => {
  const bodyText = (await page.locator('body').first().textContent({ timeout: 3000 }).catch(() => null)) ?? '';
  return SUBMITTED_TEXT_PATTERNS.some((pattern: RegExp): boolean => pattern.test(bodyText));
};

const PRACUJ_MANUAL_LOGIN_TIMEOUT_MS = 300_000;

const authenticatePracuj = async (
  run: FilemakerJobApplicationApplyRun,
  connection: IntegrationConnectionRecord,
  credentials: PracujCredentials | null
): Promise<{
  close: () => Promise<void>;
  page: Page;
} | null> => {
  const repo = getMongoIntegrationRepository();
  const isManualMode = connection.pracujAuthMode === 'manual';
  const pushStep = (
    step: string,
    status: FilemakerJobApplicationApplyRunStepStatus,
    detail: string
  ): void => appendStep(run.id, step, status, detail);

  const runtime = await resolvePlaywrightConnectionTestRuntime({
    connection,
    pushStep,
    settingsStep: {
      pendingDetail: 'Resolving browser runtime settings.',
      successDetail: 'Resolved browser runtime settings.',
      failureDetail: 'Failed to resolve Playwright settings.',
    },
    storedSession: {
      loadedDetail: 'Stored Pracuj.pl browser session loaded.',
      missingDetail: 'No stored Pracuj.pl browser session found.',
      missingStatus: isManualMode || credentials !== null ? 'ok' : 'failed',
    },
  });

  const session = await openPlaywrightConnectionTestSession({
    connection,
    pushStep,
    runtime,
    runtimeActionKey: JOB_APPLICATION_APPLY_RUNTIME_KEY,
    headless: isManualMode ? false : undefined,
    viewport: { width: 1366, height: 900 },
    launchStep: {
      stepName: 'Launching Playwright',
      pendingDetail: isManualMode
        ? 'Starting browser (manual login mode — browser window will open).'
        : 'Starting browser with Job Application Apply action settings.',
      successDetail: 'Browser started.',
    },
  });

  const { page } = session;
  try {
    appendStep(run.id, 'Session preflight', 'pending', 'Checking stored Pracuj.pl session.');
    await safePracujGoto(page, PRACUJ_ACCOUNT_CHECK_URL);
    const storedAuthState = await readPracujAuthState(page);
    if (storedAuthState.loggedIn) {
      appendStep(run.id, 'Session preflight', 'ok', 'Stored Pracuj.pl session is active.');
      return session;
    }

    appendStep(run.id, 'Session preflight', 'failed', 'Stored Pracuj.pl session is not active.');

    if (isManualMode) {
      const timeoutSec = Math.round(PRACUJ_MANUAL_LOGIN_TIMEOUT_MS / 1000);
      appendStep(
        run.id,
        'Authentication',
        'pending',
        `Manual login mode — complete login in the browser window within ${timeoutSec}s.`
      );
      await safePracujGoto(page, PRACUJ_AUTH_ENTRY_URL, 30_000);
      const success = await waitForPracujManualLogin(page, PRACUJ_MANUAL_LOGIN_TIMEOUT_MS);
      if (!success) {
        const timeoutDetail = `Manual Pracuj.pl login timed out after ${timeoutSec}s.`;
        appendStep(run.id, 'Authentication', 'failed', timeoutDetail);
        await completeRun(run.id, 'auth_required', { error: timeoutDetail });
        await session.close().catch(() => undefined);
        return null;
      }
      appendStep(run.id, 'Authentication', 'ok', 'Pracuj.pl account access verified.');
      await persistPlaywrightConnectionTestSession({
        connectionId: connection.id,
        page,
        repo,
        pushStep,
        pendingDetail: 'Saving Pracuj.pl browser session.',
        successDetail: 'Pracuj.pl browser session saved.',
        failureDetail: 'Failed to save Pracuj.pl browser session.',
        throwOnFailure: false,
      });
      return session;
    }

    if (credentials === null) {
      appendStep(run.id, 'Authentication', 'failed', PRACUJ_AUTH_REQUIRED_DETAIL);
      await completeRun(run.id, 'auth_required', { error: PRACUJ_AUTH_REQUIRED_DETAIL });
      await session.close().catch(() => undefined);
      return null;
    }

    appendStep(run.id, 'Authentication', 'pending', 'Logging into Pracuj.pl with connection credentials.');
    await safePracujGoto(page, PRACUJ_AUTH_ENTRY_URL, 45_000);
    await trySubmitPracujCredentials(
      page,
      credentials.username,
      credentials.password,
      pushStep
    );
    await safePracujGoto(page, PRACUJ_ACCOUNT_CHECK_URL);
    const finalAuthState = await readPracujAuthState(page);
    if (!finalAuthState.loggedIn) {
      appendStep(run.id, 'Authentication', 'failed', PRACUJ_AUTH_REQUIRED_DETAIL);
      await completeRun(run.id, 'auth_required', { error: PRACUJ_AUTH_REQUIRED_DETAIL });
      await session.close().catch(() => undefined);
      return null;
    }

    appendStep(run.id, 'Authentication', 'ok', 'Pracuj.pl account access verified.');
    await persistPlaywrightConnectionTestSession({
      connectionId: connection.id,
      page,
      repo,
      pushStep,
      pendingDetail: 'Saving Pracuj.pl browser session.',
      successDetail: 'Pracuj.pl browser session saved.',
      failureDetail: 'Failed to save Pracuj.pl browser session.',
      throwOnFailure: false,
    });
    return session;
  } catch (error) {
    await session.close().catch(() => undefined);
    throw error;
  }
};

const runPracujApplySequence = async (
  run: FilemakerJobApplicationApplyRun,
  context: PreparedApplyContext
): Promise<void> => {
  if (context.connection === null || context.sourceUrl === null) return;

  const artifacts = await writePreparedApplyArtifacts(run.id, context);
  appendStep(run.id, 'Application artifacts', 'ok', 'Prepared selected CV and cover letter files.');
  const session = await authenticatePracuj(
    run,
    context.connection,
    resolvePracujCredentials(context.connection)
  );
  if (session === null) return;

  let activePage = session.page;
  try {
    appendStep(run.id, 'Open job offer', 'pending', 'Opening the source job offer.');
    await safePracujGoto(activePage, context.sourceUrl, 45_000);
    appendStep(run.id, 'Open job offer', 'ok', `Opened ${activePage.url()}.`);

    const applyButton = await findVisibleLocator(activePage, PRACUJ_APPLY_BUTTON_SELECTORS);
    if (applyButton === null) {
      appendStep(run.id, 'Apply form', 'failed', 'Could not find a visible Pracuj.pl apply button.');
      await completeRun(run.id, 'failed', {
        error: 'Could not find a visible Pracuj.pl apply button.',
      });
      return;
    }

    appendStep(run.id, 'Apply form', 'pending', 'Opening the Pracuj.pl application form.');
    activePage = await clickAndFollow(activePage, applyButton);
    appendStep(run.id, 'Apply form', 'ok', `Application form opened at ${activePage.url()}.`);

    const kontinuujButton = await findVisibleLocator(activePage, KONTYNUUJ_APLIKOWANIE_SELECTORS);
    if (kontinuujButton !== null) {
      appendStep(
        run.id,
        'External form redirect',
        'pending',
        'Employer redirecting to an external application form. Clicking "Kontynuuj aplikowanie".'
      );
      activePage = await clickAndFollow(activePage, kontinuujButton);
      appendStep(
        run.id,
        'External form redirect',
        'ok',
        `Followed to external employer form at ${activePage.url()}.`
      );

      const isExternalForm = await pageBodyContains(activePage, EXTERNAL_FORM_HEADING_PATTERNS);
      if (isExternalForm) {
        const person = context.application.personId
          ? await getMongoFilemakerPersonById(context.application.personId).catch(() => null)
          : null;
        const email = normalizeText(context.connection?.username) ?? null;
        const phone = person?.phoneNumbers?.[0] ?? null;
        const salaryExpectation =
          typeof context.connection?.pracujSalaryExpectation === 'number'
            ? context.connection.pracujSalaryExpectation
            : null;
        const cooperationForm: 'uop' | 'b2b' =
          context.connection?.pracujCooperationForm === 'b2b' ? 'b2b' : 'uop';

        appendStep(run.id, 'Fill external form', 'pending', 'Filling the external employer application form.');
        await fillExternalCareerForm(activePage, {
          firstName: person?.firstName ?? null,
          lastName: person?.lastName ?? null,
          email,
          phone,
          cvPath: artifacts.cvPath,
          cooperationForm,
          salaryExpectation,
          messageText: artifacts.applicationEmailText,
        });
        appendStep(run.id, 'Fill external form', 'ok', 'External employer form fields populated.');

        if (run.mode === 'review') {
          await completeRun(run.id, 'awaiting_review', {
            confirmationUrl: activePage.url(),
            error: null,
          });
          appendStep(run.id, 'Review', 'ok', 'External employer form is prepared for manual review.');
          return;
        }

        const externalSubmitButton = await findVisibleLocator(activePage, PRACUJ_FINAL_SUBMIT_SELECTORS);
        if (externalSubmitButton === null) {
          appendStep(run.id, 'Submit application', 'failed', 'No submit button found on the external employer form.');
          await completeRun(run.id, 'awaiting_review', {
            confirmationUrl: activePage.url(),
            error: 'No submit button found on the external employer form. Review manually.',
          });
          return;
        }

        appendStep(run.id, 'Submit application', 'pending', 'Submitting the external employer form.');
        activePage = await clickAndFollow(activePage, externalSubmitButton);
        const submitted = await pageHasSubmittedConfirmation(activePage);
        if (!submitted) {
          appendStep(
            run.id,
            'Submit application',
            'failed',
            'Submit click completed, but no confirmation was detected on the external form.'
          );
          await completeRun(run.id, 'awaiting_review', {
            confirmationUrl: activePage.url(),
            error: 'No application confirmation detected after submitting external form.',
          });
          return;
        }

        appendStep(run.id, 'Submit application', 'ok', 'External employer form submitted and confirmation received.');
        await completeRun(run.id, 'submitted', { confirmationUrl: activePage.url() });
        await updateMongoFilemakerJobApplicationStatus(context.application.id, 'applied', {
          id: randomUUID(),
          appliedAt: new Date().toISOString(),
          method: 'apply_script',
          personId: context.application.personId,
          personName: context.application.personName,
          toStatus: 'applied',
        });
        return;
      }
    }

    appendStep(run.id, 'Upload documents', 'pending', 'Uploading the selected CV and cover letter.');
    const uploadResult = await uploadPreparedFiles(activePage, artifacts);
    const coverLetterFilled = await fillCoverLetterText(activePage, artifacts.coverLetterText);
    if (!uploadResult.cvUploaded) {
      appendStep(run.id, 'Upload documents', 'failed', 'No file upload field was found for the CV.');
      await completeRun(run.id, 'failed', { error: 'No file upload field was found for the CV.' });
      return;
    }
    appendStep(
      run.id,
      'Upload documents',
      'ok',
      [
        'CV uploaded.',
        uploadResult.coverLetterUploaded ? 'Cover letter uploaded.' : null,
        coverLetterFilled ? 'Cover letter text pasted.' : null,
      ]
        .filter((part): part is string => part !== null)
        .join(' ')
    );

    if (run.mode === 'review') {
      await completeRun(run.id, 'awaiting_review', {
        confirmationUrl: activePage.url(),
        error: null,
      });
      appendStep(run.id, 'Review', 'ok', 'Application form is prepared for manual review.');
      return;
    }

    const finalSubmitButton = await findVisibleLocator(activePage, PRACUJ_FINAL_SUBMIT_SELECTORS);
    if (finalSubmitButton === null) {
      appendStep(run.id, 'Submit application', 'failed', 'No final submit button was found.');
      await completeRun(run.id, 'awaiting_review', {
        confirmationUrl: activePage.url(),
        error: 'No final submit button was found. Review the prepared form manually.',
      });
      return;
    }

    appendStep(run.id, 'Submit application', 'pending', 'Submitting the application.');
    activePage = await clickAndFollow(activePage, finalSubmitButton);
    const submitted = await pageHasSubmittedConfirmation(activePage);
    if (!submitted) {
      appendStep(
        run.id,
        'Submit application',
        'failed',
        'The submit click completed, but no application confirmation was detected.'
      );
      await completeRun(run.id, 'awaiting_review', {
        confirmationUrl: activePage.url(),
        error: 'No application confirmation was detected after submit.',
      });
      return;
    }

    appendStep(run.id, 'Submit application', 'ok', 'Application submission confirmed.');
    await completeRun(run.id, 'submitted', { confirmationUrl: activePage.url() });
    await updateMongoFilemakerJobApplicationStatus(context.application.id, 'applied', {
      appliedAt: new Date().toISOString(),
      method: 'apply_script',
      personId: context.application.personId,
      personName: context.application.personName,
    });
  } finally {
    await session.close().catch(() => undefined);
  }
};

const executeApplyRun = async (
  run: FilemakerJobApplicationApplyRun,
  context: PreparedApplyContext
): Promise<void> => {
  await updateMongoFilemakerJobApplicationApplyRun(run.id, {
    startedAt: new Date().toISOString(),
    status: 'running',
  });
  appendStep(run.id, 'Run started', 'ok', 'Application browser automation started.');

  try {
    const canRun = await ensureSupportedPracujContext(run, context);
    if (!canRun) return;
    await runPracujApplySequence(run, context);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Application automation failed.';
    appendStep(run.id, 'Run failed', 'failed', message);
    await completeRun(run.id, 'failed', { error: message });
  }
};

export const startFilemakerJobApplicationApplyRun = async (
  input: StartFilemakerJobApplicationApplyRunInput
): Promise<FilemakerJobApplicationApplyRun> => {
  const latestRun = await getLatestMongoFilemakerJobApplicationApplyRun(input.applicationId);
  if (latestRun !== null && ACTIVE_RUN_STATUSES.has(latestRun.status)) {
    return latestRun;
  }

  const context = await loadPreparedContext(input);
  const run = await createMongoFilemakerJobApplicationApplyRun({
    id: randomUUID(),
    applicationId: context.application.id,
    artifactVersionIds: context.artifactVersionIds,
    connectionId: context.application.connectionId,
    integrationId: context.application.integrationId,
    integrationSlug: context.integrationSlug,
    jobListingId: context.application.jobListingId,
    mode: input.mode ?? 'submit',
    organizationId: context.application.organizationId,
    personId: context.application.personId,
    sourceUrl: context.sourceUrl,
  });

  void executeApplyRun(run, context).catch(() => undefined);
  return requireMongoFilemakerJobApplicationApplyRunById(run.id);
};
