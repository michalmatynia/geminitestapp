import { z } from 'zod';

/**
 * Case Resolver Scan Slots
 */
export const caseResolverScanSlotSchema = z.object({
  id: z.string(),
  fileId: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  progress: z.number(),
  name: z.string().optional(),
  ocrText: z.string().optional(),
  filepath: z.string().optional(),
  sourceFileId: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  ocrError: z.string().nullable().optional(),
  error: z.string().optional(),
});

export interface CaseResolverScanSlot {
  id: string;
  fileId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  name?: string | undefined;
  ocrText?: string | undefined;
  filepath?: string | null | undefined;
  sourceFileId?: string | null | undefined;
  mimeType?: string | undefined;
  size?: number | undefined;
  ocrError?: string | null | undefined;
  error?: string | undefined;
}

/**
 * Case Resolver OCR DTOs
 */
export const caseResolverOcrJobStatusSchema = z.enum(['queued', 'running', 'completed', 'failed']);
export type CaseResolverOcrJobStatus = z.infer<typeof caseResolverOcrJobStatusSchema>;

export const caseResolverOcrJobDispatchModeSchema = z.enum(['queued', 'inline']);
export type CaseResolverOcrJobDispatchMode = z.infer<typeof caseResolverOcrJobDispatchModeSchema>;

export const caseResolverOcrErrorCategorySchema = z.enum([
  'timeout',
  'rate_limit',
  'network',
  'provider',
  'validation',
  'unknown',
]);
export type CaseResolverOcrErrorCategory = z.infer<typeof caseResolverOcrErrorCategorySchema>;

export const caseResolverOcrJobRecordSchema = z.object({
  id: z.string(),
  status: caseResolverOcrJobStatusSchema,
  filepath: z.string(),
  model: z.string().nullable(),
  prompt: z.string().nullable(),
  retryOfJobId: z.string().nullable(),
  correlationId: z.string().nullable(),
  dispatchMode: caseResolverOcrJobDispatchModeSchema.nullable(),
  attemptsMade: z.number(),
  maxAttempts: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  resultText: z.string().nullable(),
  errorMessage: z.string().nullable(),
  errorCategory: caseResolverOcrErrorCategorySchema.nullable(),
  retryableError: z.boolean().nullable(),
});

export type CaseResolverOcrJobRecord = z.infer<typeof caseResolverOcrJobRecordSchema>;

export type CaseResolverOcrFileKind = 'image' | 'pdf';

export type CaseResolverOcrPercentileSnapshot = {
  count: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
};

export type CaseResolverOcrObservabilitySnapshot = {
  generatedAt: string;
  sampleSize: number;
  statuses: Record<CaseResolverOcrJobStatus, number>;
  successRate: number;
  retryRate: number;
  retryableFailureRate: number;
  failureCategories: Record<CaseResolverOcrErrorCategory, number>;
  completionLatencyMs: CaseResolverOcrPercentileSnapshot;
  backlogAgeMs: CaseResolverOcrPercentileSnapshot;
  distinctCorrelationIds: number;
};

export const caseResolverOcrModelKeySourceSchema = z.literal('brain');
export type CaseResolverOcrModelKeySource = z.infer<typeof caseResolverOcrModelKeySourceSchema>;

export const caseResolverOcrModelsWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type CaseResolverOcrModelsWarning = z.infer<typeof caseResolverOcrModelsWarningSchema>;

export const caseResolverOcrModelsResponseSchema = z.object({
  models: z.array(z.string()),
  ollamaModels: z.array(z.string()),
  otherModels: z.array(z.string()),
  keySource: caseResolverOcrModelKeySourceSchema,
  warning: caseResolverOcrModelsWarningSchema.optional(),
});
export type CaseResolverOcrModelsResponse = z.infer<typeof caseResolverOcrModelsResponseSchema>;

export const createCaseResolverOcrJobSchema = z.object({
  filepath: z.string().trim().min(1),
  model: z.string().trim().optional(),
  prompt: z.string().trim().optional(),
  correlationId: z.string().trim().optional(),
});

export type CreateCaseResolverOcrJobDto = z.infer<typeof createCaseResolverOcrJobSchema>;

export const retryCaseResolverOcrJobSchema = z.object({
  action: z.literal('retry'),
  model: z.string().trim().optional(),
  prompt: z.string().trim().optional(),
  correlationId: z.string().trim().optional(),
});

export type RetryCaseResolverOcrJobDto = z.infer<typeof retryCaseResolverOcrJobSchema>;
