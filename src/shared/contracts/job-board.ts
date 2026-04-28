import { z } from 'zod';

const trimmed = z.string().trim();
const optStr = (max: number) => trimmed.max(max).nullable().default(null);

export const COMPANIES_COLLECTION = 'companies';
export const JOB_LISTINGS_COLLECTION = 'job_listings';
export const JOB_SCANS_COLLECTION = 'job_scans';

export const jobScanProviderSchema = z.enum(['pracuj_pl', 'justjoin_it', 'nofluffjobs']);
export type JobScanProvider = z.infer<typeof jobScanProviderSchema>;

export const jobScanStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'no_match',
  'failed',
]);
export type JobScanStatus = z.infer<typeof jobScanStatusSchema>;

export const isJobScanActiveStatus = (
  value: JobScanStatus | null | undefined
): boolean => value === 'queued' || value === 'running';

export const isJobScanTerminalStatus = (
  value: JobScanStatus | null | undefined
): boolean => !isJobScanActiveStatus(value);

export const companyEmailSchema = z.object({
  address: trimmed.min(3).max(320),
  source: optStr(2_000),
  isPrimary: z.boolean().default(false),
});
export type CompanyEmail = z.infer<typeof companyEmailSchema>;

export const companySchema = z.object({
  id: trimmed.min(1).max(160),
  name: trimmed.min(1).max(300),
  nip: optStr(40),
  domain: optStr(300),
  website: optStr(2_000),
  logoUrl: optStr(2_000),
  industry: optStr(200),
  size: optStr(80),
  description: optStr(8_000),
  addressLine: optStr(500),
  city: optStr(200),
  postalCode: optStr(40),
  country: optStr(120),
  emails: z.array(companyEmailSchema).max(20).default([]),
  emailsSearchedAt: z.string().datetime().nullable().default(null),
  sourceUrl: optStr(4_000),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type Company = z.infer<typeof companySchema>;
export type CompanyInput = z.input<typeof companySchema>;

export const jobContractTypeSchema = z.enum([
  'employment',
  'b2b',
  'mandate',
  'contract_of_specific_task',
  'internship',
  'unknown',
]);
export type JobContractType = z.infer<typeof jobContractTypeSchema>;

export const jobWorkModeSchema = z.enum(['onsite', 'remote', 'hybrid', 'unknown']);
export type JobWorkMode = z.infer<typeof jobWorkModeSchema>;

export const jobExperienceLevelSchema = z.enum([
  'intern',
  'junior',
  'mid',
  'senior',
  'expert',
  'manager',
  'unknown',
]);
export type JobExperienceLevel = z.infer<typeof jobExperienceLevelSchema>;

export const jobSalarySchema = z
  .object({
    min: z.number().nullable().default(null),
    max: z.number().nullable().default(null),
    currency: optStr(20),
    period: optStr(40),
    raw: optStr(300),
  })
  .nullable()
  .default(null);
export type JobSalary = z.infer<typeof jobSalarySchema>;

export const jobListingSchema = z.object({
  id: trimmed.min(1).max(160),
  companyId: trimmed.min(1).max(160),
  title: trimmed.min(1).max(500),
  description: optStr(20_000),
  contractType: jobContractTypeSchema.default('unknown'),
  workMode: jobWorkModeSchema.default('unknown'),
  experienceLevel: jobExperienceLevelSchema.default('unknown'),
  city: optStr(200),
  region: optStr(200),
  country: optStr(120),
  salary: jobSalarySchema,
  requirements: z.array(trimmed.max(2_000)).max(50).default([]),
  responsibilities: z.array(trimmed.max(2_000)).max(50).default([]),
  benefits: z.array(trimmed.max(2_000)).max(50).default([]),
  technologies: z.array(trimmed.max(120)).max(50).default([]),
  applyUrl: optStr(4_000),
  sourceUrl: trimmed.min(1).max(4_000),
  postedAt: z.string().datetime().nullable().default(null),
  expiresAt: z.string().datetime().nullable().default(null),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type JobListing = z.infer<typeof jobListingSchema>;
export type JobListingInput = z.input<typeof jobListingSchema>;

export const jobScanStepSchema = z.object({
  key: trimmed.min(1).max(120),
  label: trimmed.min(1).max(160),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
  message: optStr(2_000),
  startedAt: z.string().datetime().nullable().default(null),
  completedAt: z.string().datetime().nullable().default(null),
  durationMs: z.number().int().nonnegative().nullable().default(null),
});
export type JobScanStep = z.infer<typeof jobScanStepSchema>;

export const jobScanEvaluationSchema = z
  .object({
    company: z.record(z.string(), z.unknown()).nullable().default(null),
    listing: z.record(z.string(), z.unknown()).nullable().default(null),
    confidence: z.number().min(0).max(1).nullable().default(null),
    modelId: optStr(200),
    error: optStr(2_000),
    evaluatedAt: z.string().datetime().nullable().default(null),
  })
  .nullable()
  .default(null);
export type JobScanEvaluation = z.infer<typeof jobScanEvaluationSchema>;

export const jobScanRecordSchema = z.object({
  id: trimmed.min(1).max(160),
  provider: jobScanProviderSchema.default('pracuj_pl'),
  status: jobScanStatusSchema,
  sourceUrl: trimmed.min(1).max(4_000),
  engineRunId: optStr(160),
  evaluation: jobScanEvaluationSchema,
  companyId: optStr(160),
  jobListingId: optStr(160),
  steps: z.array(jobScanStepSchema).max(50).default([]),
  rawResult: z.unknown().nullable().default(null),
  error: optStr(2_000),
  createdBy: optStr(120),
  completedAt: z.string().datetime().nullable().default(null),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type JobScanRecord = z.infer<typeof jobScanRecordSchema>;
export type JobScanRecordInput = z.input<typeof jobScanRecordSchema>;

export const normalizeJobScanRecord = (value: JobScanRecordInput): JobScanRecord =>
  jobScanRecordSchema.parse(value);

export const normalizeCompany = (value: CompanyInput): Company => companySchema.parse(value);
export const normalizeJobListing = (value: JobListingInput): JobListing =>
  jobListingSchema.parse(value);

export const jobScanCreateRequestSchema = z.object({
  sourceUrl: trimmed.url().max(4_000),
  provider: jobScanProviderSchema.optional(),
});
export type JobScanCreateRequest = z.infer<typeof jobScanCreateRequestSchema>;

export const jobScanListResponseSchema = z.object({
  scans: z.array(jobScanRecordSchema).default([]),
});
export type JobScanListResponse = z.infer<typeof jobScanListResponseSchema>;

export const jobScanCreateResponseSchema = z.object({
  scan: jobScanRecordSchema,
});
export type JobScanCreateResponse = z.infer<typeof jobScanCreateResponseSchema>;

export const jobBoardRefreshCompanyEmailsRequestSchema = z.object({
  useVision: z.boolean().optional(),
  autoPromote: z.boolean().optional(),
  headless: z.boolean().optional(),
}).default({});
export type JobBoardRefreshCompanyEmailsRequest = z.infer<
  typeof jobBoardRefreshCompanyEmailsRequestSchema
>;

export const jobBoardRefreshCompanyEmailsResponseSchema = z.object({
  company: companySchema,
  steps: z.array(jobScanStepSchema).default([]),
  usedVision: z.boolean(),
});
export type JobBoardRefreshCompanyEmailsResponse = z.infer<
  typeof jobBoardRefreshCompanyEmailsResponseSchema
>;

export const companyListResponseSchema = z.object({
  companies: z.array(companySchema).default([]),
});
export type CompanyListResponse = z.infer<typeof companyListResponseSchema>;

export const jobListingListResponseSchema = z.object({
  listings: z.array(jobListingSchema).default([]),
});
export type JobListingListResponse = z.infer<typeof jobListingListResponseSchema>;

export const filemakerOrganisationHitSchema = z.object({
  id: trimmed.min(1).max(160),
  name: trimmed.min(1).max(500),
  taxId: optStr(40),
  krs: optStr(40),
  city: optStr(200),
  tradingName: optStr(300),
  cooperationStatus: optStr(80),
});
export type FilemakerOrganisationHit = z.infer<typeof filemakerOrganisationHitSchema>;

export const organisationSearchResponseSchema = z.object({
  hits: z.array(filemakerOrganisationHitSchema).default([]),
});
export type OrganisationSearchResponse = z.infer<typeof organisationSearchResponseSchema>;

export const promoteCompanyRequestSchema = z.object({
  organizationId: trimmed.min(1).max(160),
  addresses: z.array(trimmed.min(3).max(320)).max(20).optional(),
});
export type PromoteCompanyRequest = z.infer<typeof promoteCompanyRequestSchema>;

export const promotionItemSchema = z.object({
  address: trimmed.min(3).max(320),
  emailId: trimmed.min(1).max(160),
  linkId: trimmed.min(1).max(160),
  status: z.enum(['created', 'linked', 'already-linked']),
});
export type PromotionItem = z.infer<typeof promotionItemSchema>;

export const promoteCompanyResponseSchema = z.object({
  companyId: trimmed.min(1).max(160),
  organizationId: trimmed.min(1).max(160),
  organizationName: trimmed.min(1).max(500),
  promoted: z.array(promotionItemSchema).default([]),
  skipped: z.array(z.object({ address: trimmed.max(320), reason: trimmed.max(2_000) })).default([]),
});
export type PromoteCompanyResponse = z.infer<typeof promoteCompanyResponseSchema>;
