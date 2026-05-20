import type { SemanticExtractedRecord, SemanticJobRecord, SemanticMappedRecord } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const normalizeUrl = (value: string | null | undefined, baseUrl: string): string | null => {
  if (!value?.trim()) return null;
  try {
    const parsed = new URL(value.trim(), baseUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase();
    return parsed.toString();
  } catch {
    return null;
  }
};

const firstText = (keys: string[], raw: Record<string, unknown>): string | null => {
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return null;
};

// ── Field resolution — semantic fields first, raw fallbacks second ────────────

const resolveSourceUrl = (mapped: SemanticMappedRecord, raw: Record<string, unknown>, baseUrl: string): string | null =>
  normalizeUrl(
    mapped.sourceUrl ??
      firstText(['sourceUrl', 'url', 'href', 'jobUrl', 'link', 'offerUrl'], raw),
    baseUrl
  );

const resolveApplyUrl = (mapped: SemanticMappedRecord, raw: Record<string, unknown>, resolvedUrl: string): string | null =>
  normalizeUrl(
    mapped.applyUrl ??
      firstText(['applyUrl', 'applicationUrl', 'apply', 'applyLink'], raw),
    resolvedUrl
  );

const resolveTitle = (mapped: SemanticMappedRecord, raw: Record<string, unknown>, fallback: string): string =>
  mapped.title ?? firstText(['title', 'jobTitle', 'position', 'role', 'headline'], raw) ?? fallback;

const resolveDescription = (mapped: SemanticMappedRecord, raw: Record<string, unknown>): string | null =>
  mapped.description ?? firstText(['description', 'jobDescription', 'summary', 'overview', 'body'], raw);

const resolveRequirements = (mapped: SemanticMappedRecord, raw: Record<string, unknown>): string | null =>
  mapped.requirements ?? firstText(['requirements', 'qualifications', 'skills', 'experience', 'mustHave'], raw);

const resolveCompany = (mapped: SemanticMappedRecord, raw: Record<string, unknown>): string | null =>
  mapped.company ?? firstText(['company', 'employer', 'organization', 'companyName', 'hiringOrganization'], raw);

const resolveLocation = (mapped: SemanticMappedRecord, raw: Record<string, unknown>): string | null =>
  mapped.location ?? firstText(['location', 'jobLocation', 'city', 'address', 'workLocation'], raw);

const resolveSalary = (mapped: SemanticMappedRecord, raw: Record<string, unknown>): string | null =>
  mapped.salary ?? firstText(['salary', 'compensation', 'salaryRange', 'baseSalary', 'pay'], raw);

const resolveJobType = (mapped: SemanticMappedRecord, raw: Record<string, unknown>): string | null =>
  mapped.jobType ?? firstText(['jobType', 'employmentType', 'type', 'contractType', 'workType'], raw);

const resolvePostedAt = (mapped: SemanticMappedRecord, raw: Record<string, unknown>): string | null =>
  mapped.postedAt ?? firstText(['postedAt', 'datePosted', 'publishedAt', 'date', 'postedDate'], raw);

const resolveImageUrl = (mapped: SemanticMappedRecord, raw: Record<string, unknown>, resolvedUrl: string): string | null =>
  normalizeUrl(
    mapped.images[0] ?? firstText(['imageUrl', 'logo', 'companyLogo', 'image'], raw),
    resolvedUrl
  );

// ── Context ───────────────────────────────────────────────────────────────────

export type JobAdapterContext = {
  baseUrl: string;
};

// ── Adapter ───────────────────────────────────────────────────────────────────

export const toSemanticJobRecord = (
  extracted: SemanticExtractedRecord,
  context: JobAdapterContext
): SemanticJobRecord | null => {
  const { mapped, raw } = extracted;
  const { baseUrl } = context;

  const sourceUrl = resolveSourceUrl(mapped, raw, baseUrl);
  if (sourceUrl === null) return null;

  const title = resolveTitle(mapped, raw, sourceUrl);

  return {
    title,
    description: resolveDescription(mapped, raw),
    requirements: resolveRequirements(mapped, raw),
    company: resolveCompany(mapped, raw),
    location: resolveLocation(mapped, raw),
    salary: resolveSalary(mapped, raw),
    jobType: resolveJobType(mapped, raw),
    sourceUrl,
    applyUrl: resolveApplyUrl(mapped, raw, sourceUrl),
    postedAt: resolvePostedAt(mapped, raw),
    tags: mapped.tags,
    imageUrl: resolveImageUrl(mapped, raw, sourceUrl),
    raw,
  };
};

export const toSemanticJobRecords = (
  records: SemanticExtractedRecord[],
  context: JobAdapterContext,
  options: { skipWithErrors?: boolean } = {}
): { jobs: SemanticJobRecord[]; skipped: number } => {
  const filtered = options.skipWithErrors
    ? records.filter((r) => !r.issues.some((i) => i.severity === 'error'))
    : records;

  const jobs: SemanticJobRecord[] = [];
  let skipped = 0;

  for (const record of filtered) {
    const job = toSemanticJobRecord(record, context);
    if (job === null) { skipped++; continue; }
    jobs.push(job);
  }

  return { jobs, skipped };
};
