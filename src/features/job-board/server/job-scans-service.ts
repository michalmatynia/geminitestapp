import 'server-only';

import { randomUUID } from 'crypto';

import {
  isJobScanActiveStatus,
  isJobScanTerminalStatus,
  type Company,
  type CompanyInput,
  type JobListingInput,
  type JobScanCreateRequest,
  type JobScanProvider,
  type JobScanRecord,
  type JobScanStep,
} from '@/shared/contracts/job-board';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { upsertCompanyByMatch } from './companies-repository';
import { upsertJobListing } from './job-listings-repository';
import { evaluateJobPageWithAi } from './job-scan-ai-evaluator';
import {
  getJobScanById,
  listJobScans,
  upsertJobScan,
} from './job-scans-repository';
import { fetchPracujPage, reducePracujHtml } from './providers/pracuj-pl-sync';

const inferProviderFromUrl = (url: string): JobScanProvider => {
  if (/(?:^|\.)pracuj\.pl/i.test(url)) return 'pracuj_pl';
  return 'pracuj_pl';
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

/**
 * Creates a queued job scan from a source URL. Caller can run synchronizeJobScan() afterwards
 * (or rely on listJobScansWithSync() to drive it).
 */
export const createJobScan = async (input: JobScanCreateRequest & { createdBy?: string | null }): Promise<JobScanRecord> => {
  const provider = input.provider ?? inferProviderFromUrl(input.sourceUrl);
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
    rawResult: null,
    error: null,
    createdBy: input.createdBy ?? null,
    completedAt: null,
  });
};

const runPracujSync = async (scan: JobScanRecord): Promise<JobScanRecord> => {
  const steps: JobScanStep[] = [];

  const fetchStartedAt = stamp();
  const fetchResult = await fetchPracujPage(scan.sourceUrl);
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

  const reduced = reducePracujHtml(fetchResult.html);
  const evalStartedAt = stamp();
  const evaluation = await evaluateJobPageWithAi({
    sourceUrl: fetchResult.finalUrl,
    pageContent: reduced,
  });
  const evalCompletedAt = stamp();
  const evalOk = !!evaluation && !evaluation.error && !!evaluation.listing?.['title'];
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

const buildCompanyInput = (
  partial: Record<string, unknown> | null | undefined,
  sourceUrl: string
): CompanyInput => {
  const p = (partial ?? {}) as Partial<CompanyInput>;
  return {
    id: randomUUID(),
    name: (p.name && p.name.trim()) || 'Unknown company',
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

export const synchronizeJobScan = async (scan: JobScanRecord): Promise<JobScanRecord> => {
  if (isJobScanTerminalStatus(scan.status)) return scan;

  try {
    const running = await upsertJobScan({ ...scan, status: 'running' });
    if (running.provider === 'pracuj_pl') {
      return await runPracujSync(running);
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
