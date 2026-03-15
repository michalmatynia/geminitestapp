import type { HttpResult } from '@/shared/contracts/http';
import { apiFetch } from './base';

import type { AiPathRuntimeAnalyticsSummary } from '..';

export async function fetchRuntimeAnalyticsSummary(
  range: string
): Promise<HttpResult<AiPathRuntimeAnalyticsSummary>> {
  return apiFetch<AiPathRuntimeAnalyticsSummary>(
    `/api/ai/ai-paths/analytics/summary?range=${range}`
  );
}
