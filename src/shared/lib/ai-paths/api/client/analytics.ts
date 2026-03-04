import { apiFetch, ApiResponse } from './base';
import type { AiPathRuntimeAnalyticsSummary } from '..';

export async function fetchRuntimeAnalyticsSummary(
  range: string
): Promise<ApiResponse<AiPathRuntimeAnalyticsSummary>> {
  return apiFetch<AiPathRuntimeAnalyticsSummary>(
    `/api/ai/ai-paths/analytics/summary?range=${range}`
  );
}
