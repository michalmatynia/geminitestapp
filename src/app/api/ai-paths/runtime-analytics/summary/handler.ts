import { NextRequest, NextResponse } from 'next/server';

import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import {
  getRuntimeAnalyticsSummary,
  resolveRuntimeAnalyticsRangeWindow,
} from '@/features/ai/ai-paths/server';
import { startAiInsightsQueue, startAiPathRunQueue } from '@/features/jobs/server';
import type { AiPathRuntimeAnalyticsRange } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { AppErrorCodes, badRequestError, isAppError } from '@/shared/errors/app-error';
import { getQueryParams } from '@/shared/lib/api/api-handler';

const RANGE_VALUES: readonly AiPathRuntimeAnalyticsRange[] = ['1h', '24h', '7d', '30d'];

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const searchParams = getQueryParams(req);
  const rangeRaw = (searchParams.get('range') ?? '24h') as AiPathRuntimeAnalyticsRange;
  if (!RANGE_VALUES.includes(rangeRaw)) {
    throw badRequestError('Invalid range.');
  }
  const { from, to } = resolveRuntimeAnalyticsRangeWindow(rangeRaw);
  try {
    await requireAiPathsAccess();
  } catch (error) {
    if (
      isAppError(error) &&
      (error.code === AppErrorCodes.unauthorized || error.code === AppErrorCodes.forbidden)
    ) {
      return NextResponse.json({
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
      });
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
  return NextResponse.json({ summary });
}
