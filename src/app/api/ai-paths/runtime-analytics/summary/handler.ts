import { NextRequest, NextResponse } from 'next/server';

import { startAiPathRunQueue } from '@/features/ai/ai-paths/workers/aiPathRunQueue';
import { startAiInsightsQueue } from '@/features/ai/insights/workers/aiInsightsQueue';
import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import {
  getRuntimeAnalyticsSummary,
  resolveRuntimeAnalyticsRangeWindow,
} from '@/features/ai/ai-paths/server';
import type {
  AiPathRuntimeAnalyticsRange,
  AiPathRuntimeAnalyticsSummaryResponse,
} from '@/shared/contracts/ai-paths';
import {
  aiPathRuntimeAnalyticsRangeQuerySchema,
  aiPathRuntimeAnalyticsRangeSchema,
} from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { AppErrorCodes, isAppError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export { aiPathRuntimeAnalyticsRangeQuerySchema as querySchema };

const resolveRuntimeAnalyticsQueryInput = (
  req: Request,
  ctx: ApiHandlerContext
): Record<string, unknown> => ({
  ...Object.fromEntries(new URL(req.url).searchParams.entries()),
  ...((ctx.query ?? {}) as Record<string, unknown>),
});

const parseRuntimeAnalyticsRange = (
  input: Record<string, unknown>
): AiPathRuntimeAnalyticsRange => {
  const parsed = aiPathRuntimeAnalyticsRangeQuerySchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Invalid range.');
  }
  if (parsed.data.range === undefined) {
    return '24h';
  }

  const range = aiPathRuntimeAnalyticsRangeSchema.safeParse(parsed.data.range);
  if (range.success) {
    return range.data;
  }

  throw new Error('Invalid range.');
};

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = resolveRuntimeAnalyticsQueryInput(req, _ctx);
  const rangeRaw = parseRuntimeAnalyticsRange(query);
  const { from, to } = resolveRuntimeAnalyticsRangeWindow(rangeRaw);
  try {
    await requireAiPathsAccess();
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (
      isAppError(error) &&
      (error.code === AppErrorCodes.unauthorized || error.code === AppErrorCodes.forbidden)
    ) {
      const response: AiPathRuntimeAnalyticsSummaryResponse = {
        summary: {
          from: from.toISOString(),
          to: to.toISOString(),
          range: rangeRaw,
          storage: 'disabled',
          runs: {
            total: 0,
            queued: 0,
            started: 0,
            completed: 0,
            failed: 0,
            canceled: 0,
            deadLettered: 0,
            blockedOnLease: 0,
            handoffReady: 0,
            successRate: 0,
            failureRate: 0,
            deadLetterRate: 0,
            avgDurationMs: null,
            p95DurationMs: null,
          },
          nodes: {
            started: 0,
            completed: 0,
            failed: 0,
            queued: 0,
            running: 0,
            polling: 0,
            cached: 0,
            waitingCallback: 0,
          },
          brain: {
            analyticsReports: 0,
            logReports: 0,
            totalReports: 0,
            warningReports: 0,
            errorReports: 0,
          },
          traces: {
            source: 'none',
            sampledRuns: 0,
            sampledSpans: 0,
            completedSpans: 0,
            failedSpans: 0,
            cachedSpans: 0,
            avgDurationMs: null,
            p95DurationMs: null,
            slowestSpan: null,
            topSlowNodes: [],
            topFailedNodes: [],
            kernelParity: {
              sampledRuns: 0,
              runsWithKernelParity: 0,
              sampledHistoryEntries: 0,
              strategyCounts: {
                compatibility: 0,
                code_object_v3: 0,
                unknown: 0,
              },
              resolutionSourceCounts: {
                override: 0,
                registry: 0,
                missing: 0,
                unknown: 0,
              },
              codeObjectIds: [],
            },
            truncated: false,
          },
          portableEngine: {
            source: 'unavailable',
            totals: {
              attempts: 0,
              successes: 0,
              failures: 0,
              successRate: 0,
              failureRate: 0,
            },
            byRunner: {
              client: { attempts: 0, successes: 0, failures: 0 },
              server: { attempts: 0, successes: 0, failures: 0 },
            },
            bySurface: {
              canvas: { attempts: 0, successes: 0, failures: 0 },
              product: { attempts: 0, successes: 0, failures: 0 },
              api: { attempts: 0, successes: 0, failures: 0 },
            },
            byInputSource: {
              portable_package: { attempts: 0, successes: 0, failures: 0 },
              portable_envelope: { attempts: 0, successes: 0, failures: 0 },
              semantic_canvas: { attempts: 0, successes: 0, failures: 0 },
              path_config: { attempts: 0, successes: 0, failures: 0 },
            },
            failureStageCounts: {
              resolve: 0,
              validation: 0,
              runtime: 0,
            },
            recentFailures: [],
          },
          generatedAt: new Date().toISOString(),
        },
      };
      return NextResponse.json(response);
    }
    throw error;
  }
  startAiPathRunQueue();
  startAiInsightsQueue();
  const summary = await getRuntimeAnalyticsSummary({
    from,
    to,
    range: rangeRaw,
  });
  const response: AiPathRuntimeAnalyticsSummaryResponse = { summary };
  return NextResponse.json(response);
}
