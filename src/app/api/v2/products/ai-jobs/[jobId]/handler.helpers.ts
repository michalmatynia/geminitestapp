import { z } from 'zod';

import { badRequestError } from '@/shared/errors/app-error';

export const actionSchema = z.object({
  action: z.string().trim().min(1),
});

export type ProductAiJobActionPayload = z.infer<typeof actionSchema>;

export const requireProductAiJobId = (params: { jobId: string }): string => {
  const jobId = params.jobId.trim();
  if (!jobId) {
    throw badRequestError('Job id is required');
  }
  return jobId;
};

export const resolveProductAiJobAction = (payload: ProductAiJobActionPayload): 'cancel' => {
  if (payload.action === 'cancel') {
    return payload.action;
  }
  throw badRequestError('Invalid action');
};

export const buildProductAiJobResponse = <TJob>(job: TJob): { job: TJob } => ({ job });

export const buildProductAiJobMutationResponse = <TJob>(
  job: TJob
): { success: true; job: TJob } => ({
  success: true,
  job,
});

export const buildProductAiJobDeleteResponse = (): { success: true } => ({
  success: true,
});
