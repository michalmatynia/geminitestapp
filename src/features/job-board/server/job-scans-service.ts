import 'server-only';

import { randomUUID } from 'crypto';

import {
  isJobScanActiveStatus,
  isJobScanTerminalStatus,
  type Company,
  type CompanyInput,
  type JobListingInput,
  type JobScanCreateRequest,
  type JobScanEvaluation,
  type JobScanProvider,
  type JobScanRecord,
  type JobScanStep,
} from '@/shared/contracts/job-board';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { upsertCompany, upsertCompanyByMatch } from './companies-repository';
import { findCompanyEmails, isVisionEmailFinderEnabled } from './email-finding';
import { findCompanyWebsite } from './google-search';
import { upsertJobListing } from './job-listings-repository';
import {
  findFilemakerOrganisationMatch,
  promoteCompanyToOrganisation,
} from './organisation-promotion';

const isAutoPromoteEnabled = (): { nipOnly: boolean; nameToo: boolean } => {
  const value = process.env['JOB_BOARD_AUTO_PROMOTE_ON_NIP_MATCH']?.toLowerCase() ?? '';
  if (value === 'true' || value === 'nip') return { nipOnly: true, nameToo: false };
  if (value === 'name-too' || value === 'name') return { nipOnly: true, nameToo: true };
  return { nipOnly: false, nameToo: false };
};
import { evaluateJobPageWithAi } from './job-scan-ai-evaluator';
import {
  getJobScanById,
  listJobScans,
  upsertJobScan,
} from './job-scans-repository';
import {
  detectJobBoardProviderFromUrl,
  extractJobBoardStructuredSnapshot,
  fetchJobBoardPage,
  reduceJobBoardHtml,
  type JobBoardStructuredSnapshot,
} from './providers/job-board-sync';
import { getCompanyById } from './companies-repository';

const inferProviderFromUrl = (url: string): JobScanProvider => {
  const provider = detectJobBoardProviderFromUrl(url);
  if (provider !== null) return provider;
  throw new Error(
    'Unsupported job board URL. Supported job boards are pracuj.pl, justjoin.it, and nofluffjobs.com.'
  );
};

const stamp = (): string => new Date().toISOString();

import {
  buildSnapshotFallbackEvaluation,
  buildStep,
  mergeJobScanEvaluations,
} from './job-scans/snapshot-helpers';

type JobScanEmailFinderMode = 'vision_ai' | 'preselected_routes';

const resolveEmailFinderModeFromUseVision = (
  useVision: boolean | null | undefined
): JobScanEmailFinderMode | null => {
  if (useVision === true) return 'vision_ai';
  if (useVision === false) return 'preselected_routes';
  return null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const resolveScanEmailFinderMode = (scan: JobScanRecord): JobScanEmailFinderMode | null => {
  const rawResult = asRecord(scan.rawResult);
  if (rawResult === null) return null;

  const mode = rawResult['emailFinderMode'];
  if (mode === 'vision_ai' || mode === 'preselected_routes') {
    return mode;
  }

  const useVisionEmailFinder = rawResult['useVisionEmailFinder'];
  if (typeof useVisionEmailFinder === 'boolean') {
    return resolveEmailFinderModeFromUseVision(useVisionEmailFinder);
  }
  
  return null;
};

const describeEmailFinderMode = (mode: JobScanEmailFinderMode | null): string => {
  if (mode === 'vision_ai') {
    return 'Using screenshot AI evaluation and AI injection for email discovery.';
  }
  if (mode === 'preselected_routes') {
    return 'Using preset contact/about/careers route crawling for email discovery.';
  }
  return 'Using the configured default email discovery route.';
};

/**
 * Creates a queued job scan from a source URL. Caller can run synchronizeJobScan() afterwards
 * (or rely on listJobScansWithSync() to drive it).
 */
const getRawResult = (emailFinderMode: JobScanEmailFinderMode | null): Record<string, unknown> | null => {
  if (emailFinderMode === null) return null;
  return {
    emailFinderMode,
    useVisionEmailFinder: emailFinderMode === 'vision_ai',
  };
};

export const createJobScan = async (input: JobScanCreateRequest & { createdBy?: string | null }): Promise<JobScanRecord> => {
  const provider = input.provider ?? inferProviderFromUrl(input.sourceUrl);
  const emailFinderMode = resolveEmailFinderModeFromUseVision(input.useVision ?? null);
  
  return await upsertJobScan({
    id: randomUUID(),
    provider,
    status: 'queued',
    sourceUrl: input.sourceUrl,
    engineRunId: null,
    evaluation: null,
    companyId: null,
    jobListingId: null,
    steps: [buildStep('queue', 'Queued', 'pending')],
    rawResult: getRawResult(emailFinderMode),
    error: null,
    createdBy: input.createdBy ?? null,
    completedAt: null,
  });
};

export type JobBoardJobOfferProbeResult = {
  error: string | null;
  evaluation: JobScanEvaluation;
  finalUrl: string;
  fetchStatus: number;
  ok: boolean;
  provider: JobScanProvider;
  runId: string | null;
  snapshot: JobBoardStructuredSnapshot | null;
  sourceSite: string;
  sourceUrl: string;
  steps: JobScanStep[];
};

export type JobBoardOfferProbeExtractionPath =
  | 'playwright_ai'
  | 'deterministic'
  | 'deterministic_then_playwright';

type JobBoardOfferProbeSingleExtractionPath = Exclude<
  JobBoardOfferProbeExtractionPath,
  'deterministic_then_playwright'
>;

type JobBoardOfferProbeInput = {
  extractionPath?: JobBoardOfferProbeExtractionPath | null;
  forcePlaywright?: boolean | null;
  headless?: boolean | null;
  humanizeMouse?: boolean | null;
  personaId?: string | null;
  provider?: JobScanProvider | null;
  sourceUrl: string;
  timeoutMs?: number | null;
};

const resolveJobBoardOfferProbeExtractionPath = (
  value: JobBoardOfferProbeExtractionPath | null | undefined
): JobBoardOfferProbeExtractionPath => {
  if (value === 'deterministic' || value === 'deterministic_then_playwright') return value;
  return 'playwright_ai';
};

const runJobBoardOfferProbe = async (
  input: JobBoardOfferProbeInput,
  extractionPath: JobBoardOfferProbeSingleExtractionPath
): Promise<JobBoardJobOfferProbeResult> => {
  const useDeterministicPath = extractionPath === 'deterministic';
  const steps: JobScanStep[] = [];
  const fetchStartedAt = stamp();
  const fetchResult = await fetchJobBoardPage(input.sourceUrl, {
    fallbackToFetch: useDeterministicPath,
    forcePlaywright: useDeterministicPath ? false : input.forcePlaywright ?? true,
    headless: input.headless ?? null,
    humanizeMouse: input.humanizeMouse ?? true,
    personaId: input.personaId ?? null,
    provider: input.provider ?? undefined,
    timeoutMs: input.timeoutMs ?? null,
  });
  const fetchCompletedAt = stamp();
  steps.push(
    buildStep('fetch', 'Fetch page', fetchResult.ok ? 'completed' : 'failed', {
      message: fetchResult.ok ? `HTTP ${fetchResult.status}` : fetchResult.error ?? `HTTP ${fetchResult.status}`,
      startedAt: fetchStartedAt,
      completedAt: fetchCompletedAt,
      durationMs: Date.parse(fetchCompletedAt) - Date.parse(fetchStartedAt),
    })
  );

  if (!fetchResult.ok || !fetchResult.html) {
    return {
      error: fetchResult.error ?? `Fetch failed with HTTP ${fetchResult.status}`,
      evaluation: null,
      finalUrl: fetchResult.finalUrl,
      fetchStatus: fetchResult.status,
      ok: false,
      provider: fetchResult.provider,
      runId: fetchResult.runId ?? null,
      snapshot: null,
      sourceSite: fetchResult.sourceSite,
      sourceUrl: input.sourceUrl,
      steps,
    };
  }

  const snapshot = extractJobBoardStructuredSnapshot(fetchResult.html, fetchResult.finalUrl);
  const evalStartedAt = stamp();
  if (useDeterministicPath) {
    const evalCompletedAt = stamp();
    const evaluation = buildSnapshotFallbackEvaluation(
      snapshot,
      fetchResult.finalUrl,
      evalCompletedAt
    );
    const evalOk = Boolean(evaluation) && Boolean(evaluation?.listing?.['title']);
    steps.push(
      buildStep('deterministic_extract', 'Deterministic extract', evalOk ? 'completed' : 'failed', {
        message:
          evaluation?.error ??
          (evalOk
            ? `confidence=${evaluation?.confidence ?? 'n/a'}`
            : 'Deterministic extractor did not find a job listing'),
        startedAt: evalStartedAt,
        completedAt: evalCompletedAt,
        durationMs: Date.parse(evalCompletedAt) - Date.parse(evalStartedAt),
      })
    );

    return {
      error: evalOk
        ? null
        : evaluation?.error ?? 'Deterministic extractor did not find a job listing',
      evaluation,
      finalUrl: fetchResult.finalUrl,
      fetchStatus: fetchResult.status,
      ok: evalOk,
      provider: fetchResult.provider,
      runId: fetchResult.runId ?? null,
      snapshot,
      sourceSite: fetchResult.sourceSite,
      sourceUrl: input.sourceUrl,
      steps,
    };
  }

  const reduced = reduceJobBoardHtml(fetchResult.html);
  const aiEvaluation = await evaluateJobPageWithAi({
    sourceUrl: fetchResult.finalUrl,
    pageContent: reduced,
  });
  const evalCompletedAt = stamp();
  const fallbackEvaluation = buildSnapshotFallbackEvaluation(
    snapshot,
    fetchResult.finalUrl,
    evalCompletedAt
  );
  const evaluation = mergeJobScanEvaluations(aiEvaluation, fallbackEvaluation);
  const evalOk = Boolean(evaluation) && !evaluation?.error && Boolean(evaluation?.listing?.['title']);
  steps.push(
    buildStep('ai_evaluate', 'AI extract', evalOk ? 'completed' : 'failed', {
      message: evaluation?.error ?? `confidence=${evaluation?.confidence ?? 'n/a'}`,
      startedAt: evalStartedAt,
      completedAt: evalCompletedAt,
      durationMs: Date.parse(evalCompletedAt) - Date.parse(evalStartedAt),
    })
  );

  return {
    error: evalOk ? null : evaluation?.error ?? 'AI did not extract a job listing',
    evaluation,
    finalUrl: fetchResult.finalUrl,
    fetchStatus: fetchResult.status,
    ok: evalOk,
    provider: fetchResult.provider,
    runId: fetchResult.runId ?? null,
    snapshot,
    sourceSite: fetchResult.sourceSite,
    sourceUrl: input.sourceUrl,
    steps,
  };
};

export const probeJobBoardOffer = async (
  input: JobBoardOfferProbeInput
): Promise<JobBoardJobOfferProbeResult> => {
  const extractionPath = resolveJobBoardOfferProbeExtractionPath(input.extractionPath);
  if (extractionPath !== 'deterministic_then_playwright') {
    return await runJobBoardOfferProbe(input, extractionPath);
  }

  const deterministicResult = await runJobBoardOfferProbe(input, 'deterministic');
  if (deterministicResult.ok) return deterministicResult;

  const playwrightResult = await runJobBoardOfferProbe(
    {
      ...input,
      forcePlaywright: true,
    },
    'playwright_ai'
  );
  return {
    ...playwrightResult,
    error: playwrightResult.ok ? null : playwrightResult.error ?? deterministicResult.error,
    runId: playwrightResult.runId ?? deterministicResult.runId,
    steps: [...deterministicResult.steps, ...playwrightResult.steps],
  };
};

export type PracujJobOfferProbeResult = JobBoardJobOfferProbeResult;

export const probePracujJobOffer = async (input: {
  forcePlaywright?: boolean | null;
  headless?: boolean | null;
  sourceUrl: string;
  timeoutMs?: number | null;
}): Promise<PracujJobOfferProbeResult> =>
  await probeJobBoardOffer({
    ...input,
    provider: 'pracuj_pl',
  });

const runJobBoardSync = async (scan: JobScanRecord): Promise<JobScanRecord> => {
  const steps: JobScanStep[] = [];

  const fetchStartedAt = stamp();
  const fetchResult = await fetchJobBoardPage(scan.sourceUrl, {
    provider: scan.provider,
  });
  const fetchCompletedAt = stamp();
  steps.push(
    buildStep('fetch', 'Fetch page', fetchResult.ok ? 'completed' : 'failed', {
      message: fetchResult.ok ? `HTTP ${fetchResult.status}` : fetchResult.error ?? `HTTP ${fetchResult.status}`,
      startedAt: fetchStartedAt,
      completedAt: fetchCompletedAt,
      durationMs: Date.parse(fetchCompletedAt) - Date.parse(fetchStartedAt),
    })
  );

  if (!fetchResult.ok || !fetchResult.html) {
    return await upsertJobScan({
      ...scan,
      status: 'failed',
      steps,
      error: fetchResult.error ?? `Fetch failed with HTTP ${fetchResult.status}`,
      completedAt: stamp(),
    });
  }

  const reduced = reduceJobBoardHtml(fetchResult.html);
  const snapshot = extractJobBoardStructuredSnapshot(fetchResult.html, fetchResult.finalUrl);
  const evalStartedAt = stamp();
  const aiEvaluation = await evaluateJobPageWithAi({
    sourceUrl: fetchResult.finalUrl,
    pageContent: reduced,
  });
  const evalCompletedAt = stamp();
  const evaluation = mergeJobScanEvaluations(
    aiEvaluation,
    buildSnapshotFallbackEvaluation(snapshot, fetchResult.finalUrl, evalCompletedAt)
  );
  const evalOk =
    evaluation !== null && !evaluation.error && Boolean(evaluation.listing?.['title']);
  steps.push(
    buildStep('ai_evaluate', 'AI extract', evalOk ? 'completed' : 'failed', {
      message: evaluation?.error ?? `confidence=${evaluation?.confidence ?? 'n/a'}`,
      startedAt: evalStartedAt,
      completedAt: evalCompletedAt,
      durationMs: Date.parse(evalCompletedAt) - Date.parse(evalStartedAt),
    })
  );

  if (!evalOk || !evaluation?.listing) {
    return await upsertJobScan({
      ...scan,
      status: evaluation?.error ? 'failed' : 'no_match',
      steps,
      evaluation,
      error: evaluation?.error ?? 'AI did not extract a job listing',
      completedAt: stamp(),
    });
  }

  let company: Company | null = null;
  try {
    const companyInput = buildCompanyInput(evaluation.company, fetchResult.finalUrl);
    company = await upsertCompanyByMatch(companyInput);
    steps.push(
      buildStep('company_upsert', 'Upsert company', 'completed', {
        message: `${company.name} (${company.id})`,
        completedAt: stamp(),
      })
    );
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'job-scans.service',
      action: 'upsertCompanyByMatch',
      scanId: scan.id,
    });
    steps.push(
      buildStep('company_upsert', 'Upsert company', 'failed', {
        message: error instanceof Error ? error.message : String(error),
        completedAt: stamp(),
      })
    );
    return await upsertJobScan({
      ...scan,
      status: 'failed',
      steps,
      evaluation,
      error: 'Failed to upsert company',
      completedAt: stamp(),
    });
  }

  try {
    const listingInput = buildListingInput(evaluation.listing, company.id, fetchResult.finalUrl);
    const listing = await upsertJobListing(listingInput);
    steps.push(
      buildStep('listing_upsert', 'Upsert job listing', 'completed', {
        message: `${listing.title} (${listing.id})`,
        completedAt: stamp(),
      })
    );

    const emailFinderMode = resolveScanEmailFinderMode(scan);
    steps.push(
      buildStep('email_finder_mode', 'Email finder route', 'completed', {
        message: describeEmailFinderMode(emailFinderMode),
        completedAt: stamp(),
      })
    );
    company = await enrichCompanyWithEmails({
      company,
      steps,
      forceVision:
        emailFinderMode !== null ? emailFinderMode === 'vision_ai' : null,
      runAutoPromote: true,
    });

    return await upsertJobScan({
      ...scan,
      status: 'completed',
      steps,
      evaluation,
      companyId: company.id,
      jobListingId: listing.id,
      error: null,
      completedAt: stamp(),
    });
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'job-scans.service',
      action: 'upsertJobListing',
      scanId: scan.id,
    });
    steps.push(
      buildStep('listing_upsert', 'Upsert job listing', 'failed', {
        message: error instanceof Error ? error.message : String(error),
        completedAt: stamp(),
      })
    );
    return await upsertJobScan({
      ...scan,
      status: 'failed',
      steps,
      evaluation,
      companyId: company.id,
      error: 'Failed to upsert job listing',
      completedAt: stamp(),
    });
  }
};

const enrichCompanyWithEmails = async (input: {
  company: Company;
  steps: JobScanStep[];
  forceVision?: boolean | null;
  headless?: boolean | null;
  runAutoPromote?: boolean;
}): Promise<Company> => {
  const { steps } = input;
  let company = input.company;
  const runAutoPromote = input.runAutoPromote ?? true;

  let website = company.website?.trim() || null;
  let domain = company.domain?.trim() || null;

  if (!website && !domain) {
    const searchStartedAt = stamp();
    try {
      const found = await findCompanyWebsite({
        companyName: company.name,
        ...(company.city != null ? { city: company.city } : {}),
      });
      const searchCompletedAt = stamp();
      if (found.website || found.domain) {
        website = found.website ?? website;
        domain = found.domain ?? domain;
        steps.push(
          buildStep('search_website', 'Resolve company website (Google)', 'completed', {
            message: found.website ?? found.domain ?? 'no result',
            startedAt: searchStartedAt,
            completedAt: searchCompletedAt,
            durationMs: Date.parse(searchCompletedAt) - Date.parse(searchStartedAt),
          })
        );
        company = await upsertCompany({
          ...company,
          website: website ?? company.website,
          domain: domain ?? company.domain,
        });
      } else {
        steps.push(
          buildStep('search_website', 'Resolve company website (Google)', 'skipped', {
            message: found.error ?? 'No corporate website found.',
            startedAt: searchStartedAt,
            completedAt: searchCompletedAt,
          })
        );
      }
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'job-scans.service',
        action: 'findCompanyWebsite',
        companyId: company.id,
      });
      steps.push(
        buildStep('search_website', 'Resolve company website (Google)', 'failed', {
          message: error instanceof Error ? error.message : String(error),
          startedAt: searchStartedAt,
          completedAt: stamp(),
        })
      );
    }
  }

  if (!website && !domain) {
    steps.push(
      buildStep('find_emails', 'Find company emails', 'skipped', {
        message: 'No website or domain available.',
        completedAt: stamp(),
      })
    );
    return company;
  }

  const useVision = input.forceVision != null ? input.forceVision : isVisionEmailFinderEnabled();
  const emailStartedAt = stamp();
  try {
    const result = await findCompanyEmails({
      website,
      domain,
      companyName: company.name,
      headless: input.headless ?? null,
      strategy: useVision ? 'vision' : 'deterministic',
    });
    const emailCompletedAt = stamp();
    if ('steps' in result && Array.isArray(result.steps) && result.steps.length > 0) {
      steps.push(...result.steps);
    } else if (useVision) {
      const message =
        result.emails.length > 0
          ? `${result.emails.length} email(s) via vision loop in ${result.iterationsRun} iter`
          : ('error' in result && result.error) || `No emails found (vision loop, ${result.iterationsRun} iter)`;
      steps.push(
        buildStep(
          'vision_find_emails',
          'Find emails (vision-guided)',
          result.emails.length > 0 ? 'completed' : 'skipped',
          {
            message,
            startedAt: emailStartedAt,
            completedAt: emailCompletedAt,
            durationMs: Date.parse(emailCompletedAt) - Date.parse(emailStartedAt),
          }
        )
      );
    } else {
      steps.push(
        buildStep('find_emails', 'Find company emails', result.emails.length > 0 ? 'completed' : 'skipped', {
          message:
            result.emails.length > 0
              ? `${result.emails.length} email(s) across ${result.visitedUrls.length} URL(s)`
              : result.error ?? 'No emails found.',
          startedAt: emailStartedAt,
          completedAt: emailCompletedAt,
          durationMs: Date.parse(emailCompletedAt) - Date.parse(emailStartedAt),
        })
      );
    }
    if (result.emails.length > 0) {
      company = await upsertCompany({
        ...company,
        emails: result.emails,
        emailsSearchedAt: emailCompletedAt,
      });
    } else {
      company = await upsertCompany({
        ...company,
        emailsSearchedAt: emailCompletedAt,
      });
    }
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'job-scans.service',
      action: 'findCompanyEmails',
      companyId: company.id,
    });
    const failedLabel = useVision ? 'Find emails (vision-guided)' : 'Find company emails';
    const failedKey = useVision ? 'vision_find_emails' : 'find_emails';
    steps.push(
      buildStep(failedKey, failedLabel, 'failed', {
        message: error instanceof Error ? error.message : String(error),
        startedAt: emailStartedAt,
        completedAt: stamp(),
      })
    );
  }

  if (runAutoPromote && company.emails.length > 0) {
    company = await maybeAutoPromoteToOrganiser({ company, steps });
  }

  return company;
};

const maybeAutoPromoteToOrganiser = async (input: {
  company: Company;
  steps: JobScanStep[];
}): Promise<Company> => {
  const { steps } = input;
  const company = input.company;
  const auto = isAutoPromoteEnabled();
  if (!auto.nipOnly && !auto.nameToo) return company;
  if (!process.env['MONGODB_URI']) return company;

  const startedAt = stamp();
  try {
    const match = await findFilemakerOrganisationMatch({
      nip: company.nip,
      name: company.name,
    });
    if (!match) {
      steps.push(
        buildStep('auto_promote', 'Auto-promote to Organiser', 'skipped', {
          message: 'No unique Filemaker organisation match (skipping for safety).',
          startedAt,
          completedAt: stamp(),
        })
      );
      return company;
    }
    if (match.confidence === 'name' && !auto.nameToo) {
      steps.push(
        buildStep('auto_promote', 'Auto-promote to Organiser', 'skipped', {
          message: `Name-only match for "${match.organization.name}" (NIP-only mode — skip).`,
          startedAt,
          completedAt: stamp(),
        })
      );
      return company;
    }

    const result = await promoteCompanyToOrganisation({
      companyId: company.id,
      organizationId: match.organization.id,
      addresses: company.emails.map((e) => e.address),
      updatedBy: 'job-board:auto',
    });
    const promotedCount = result.promoted.length;
    const skippedCount = result.skipped.length;
    const completedAt = stamp();
    steps.push(
      buildStep(
        'auto_promote',
        'Auto-promote to Organiser',
        promotedCount > 0 ? 'completed' : 'skipped',
        {
          message:
            `Matched "${match.organization.name}" (${match.confidence}); ` +
            `${promotedCount} email link(s) written, ${skippedCount} skipped.`,
          startedAt,
          completedAt,
          durationMs: Date.parse(completedAt) - Date.parse(startedAt),
        }
      )
    );
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'job-scans.service',
      action: 'maybeAutoPromoteToOrganiser',
      companyId: company.id,
    });
    steps.push(
      buildStep('auto_promote', 'Auto-promote to Organiser', 'failed', {
        message: error instanceof Error ? error.message : String(error),
        startedAt,
        completedAt: stamp(),
      })
    );
  }

  return company;
};

const buildCompanyInput = (
  partial: Record<string, unknown> | null | undefined,
  sourceUrl: string
): CompanyInput => {
  const p = (partial ?? {}) as Partial<CompanyInput>;
  return {
    id: randomUUID(),
    name: (p.name?.trim()) || 'Unknown company',
    nip: p.nip ?? null,
    domain: p.domain ?? null,
    website: p.website ?? null,
    logoUrl: p.logoUrl ?? null,
    industry: p.industry ?? null,
    size: p.size ?? null,
    description: p.description ?? null,
    addressLine: p.addressLine ?? null,
    city: p.city ?? null,
    postalCode: p.postalCode ?? null,
    country: p.country ?? null,
    sourceUrl,
  };
};

const buildListingInput = (
  partial: Record<string, unknown>,
  companyId: string,
  sourceUrl: string
): JobListingInput => {
  const p = partial as Partial<JobListingInput>;
  return {
    id: randomUUID(),
    companyId,
    title: (p.title && String(p.title).trim()) || 'Untitled position',
    description: p.description ?? null,
    contractType: p.contractType ?? 'unknown',
    workMode: p.workMode ?? 'unknown',
    experienceLevel: p.experienceLevel ?? 'unknown',
    city: p.city ?? null,
    region: p.region ?? null,
    country: p.country ?? null,
    salary: p.salary ?? null,
    requirements: p.requirements ?? [],
    responsibilities: p.responsibilities ?? [],
    benefits: p.benefits ?? [],
    technologies: p.technologies ?? [],
    applyUrl: p.applyUrl ?? null,
    sourceUrl,
    postedAt: p.postedAt ?? null,
    expiresAt: p.expiresAt ?? null,
  };
};

export type RefreshCompanyEmailsResult = {
  company: Company;
  steps: JobScanStep[];
  usedVision: boolean;
};

export const refreshCompanyEmails = async (input: {
  companyId: string;
  useVision?: boolean | null;
  headless?: boolean | null;
  autoPromote?: boolean;
}): Promise<RefreshCompanyEmailsResult> => {
  const companyId = input.companyId.trim();
  if (!companyId) {
    throw new Error('companyId is required');
  }

  const existing = await getCompanyById(companyId);
  if (!existing) {
    throw new Error(`Company ${companyId} not found`);
  }

  const steps: JobScanStep[] = [];
  const forceVision =
    input.useVision != null ? input.useVision : isVisionEmailFinderEnabled();
  const company = await enrichCompanyWithEmails({
    company: existing,
    steps,
    forceVision,
    headless: input.headless ?? null,
    runAutoPromote: input.autoPromote ?? false,
  });

  return {
    company,
    steps,
    usedVision: forceVision,
  };
};

export const synchronizeJobScan = async (scan: JobScanRecord): Promise<JobScanRecord> => {
  if (isJobScanTerminalStatus(scan.status)) return scan;

  try {
    const running = await upsertJobScan({ ...scan, status: 'running' });
    if (
      running.provider === 'pracuj_pl' ||
      running.provider === 'justjoin_it' ||
      running.provider === 'nofluffjobs'
    ) {
      return await runJobBoardSync(running);
    }
    return running;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'job-scans.service',
      action: 'synchronizeJobScan.catch',
      scanId: scan.id,
    });
    return scan;
  }
};

export const synchronizeJobScans = async (scans: JobScanRecord[]): Promise<JobScanRecord[]> => {
  if (scans.length === 0) return scans;
  return await Promise.all(
    scans.map(async (scan) => (isJobScanActiveStatus(scan.status) ? await synchronizeJobScan(scan) : scan))
  );
};

export const listJobScansWithSync = async (input: { limit?: number | null } = {}): Promise<JobScanRecord[]> =>
  await synchronizeJobScans(await listJobScans({ limit: input.limit }));

export const getJobScanByIdWithSync = async (id: string): Promise<JobScanRecord | null> => {
  const scan = await getJobScanById(id);
  if (!scan) return null;
  return isJobScanActiveStatus(scan.status) ? await synchronizeJobScan(scan) : scan;
};
