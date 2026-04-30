import 'server-only';
/* eslint-disable complexity, max-lines, max-lines-per-function, no-await-in-loop */

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

const authenticatePracuj = async (
  run: FilemakerJobApplicationApplyRun,
  connection: IntegrationConnectionRecord,
  credentials: PracujCredentials | null
): Promise<{
  close: () => Promise<void>;
  page: Page;
} | null> => {
  const repo = getMongoIntegrationRepository();
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
      missingStatus: credentials === null ? 'failed' : 'ok',
    },
  });
  const session = await openPlaywrightConnectionTestSession({
    connection,
    pushStep,
    runtime,
    runtimeActionKey: JOB_APPLICATION_APPLY_RUNTIME_KEY,
    viewport: { width: 1366, height: 900 },
    launchStep: {
      stepName: 'Launching Playwright',
      pendingDetail: 'Starting browser with Job Application Apply action settings.',
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
    await updateMongoFilemakerJobApplicationStatus(context.application.id, 'applied');
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
