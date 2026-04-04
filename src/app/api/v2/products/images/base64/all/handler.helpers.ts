import type { ProductAiJobTypeDto as ProductAiJobType } from '@/shared/contracts/jobs';

export const BASE64_ALL_JOB_TYPE = 'base64_all' as ProductAiJobType;
export const BASE64_ALL_JOB_SOURCE = 'base64_all';

export const resolveBase64AllJobMode = (
  env: NodeJS.ProcessEnv
): 'inline' | 'queued' => {
  return env['AI_JOBS_INLINE'] === 'true' || env['NODE_ENV'] !== 'production'
    ? 'inline'
    : 'queued';
};

export const buildBase64AllJobPayload = (): {
  source: string;
} => ({
  source: BASE64_ALL_JOB_SOURCE,
});

export const buildBase64AllFailureLogInput = (
  jobId: string,
  error: unknown
): {
  message: string;
  error: unknown;
  source: string;
  context: { jobId: string };
} => ({
  message: '[products.images.base64.all] Failed to run base64 job',
  error,
  source: 'api/products/images/base64/all',
  context: { jobId },
});

export const buildBase64AllResponse = (
  jobId: string
): {
  status: 'ok';
  jobId: string;
} => ({
  status: 'ok',
  jobId,
});
