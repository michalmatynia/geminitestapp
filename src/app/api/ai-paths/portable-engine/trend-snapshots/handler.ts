import { type NextRequest, NextResponse } from 'next/server';

import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import { portablePathTrendSnapshotsQuerySchema } from '@/shared/contracts/ai-paths-portable-engine';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION } from '@/shared/lib/ai-paths/portable-engine';
import { loadPortablePathSigningPolicyTrendSnapshots } from '@/shared/lib/ai-paths/portable-engine/server';
import {
  buildTrendSnapshotPaging,
  resolveTrendSnapshotQuery,
  resolveTrendSnapshotsQueryInput,
} from './handler-helpers';
import {
  buildTrendSnapshotResponse,
  sumSnapshotTotals,
} from './handler-pagination';
import { buildRunExecutionSummary } from './handler-run-execution-summary';


export const querySchema = portablePathTrendSnapshotsQuerySchema;

const buildSnapshotPage = async (
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<{ query: ReturnType<typeof resolveTrendSnapshotQuery>; payload: ReturnType<typeof buildTrendSnapshotResponse> }> => {
  const query = resolveTrendSnapshotQuery(querySchema.parse(resolveTrendSnapshotsQueryInput(req, ctx)));
  const { loadLimit } = buildTrendSnapshotPaging({
    limit: query.limit,
    trigger: query.trigger,
    cursor: query.cursor,
    from: query.from,
    to: query.to,
  });
  const snapshots = await loadPortablePathSigningPolicyTrendSnapshots({ maxSnapshots: loadLimit });
  const payload = buildTrendSnapshotResponse(snapshots, query, loadLimit);
  return { query, payload };
};

export async function getHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();
  const { query, payload: responsePayload } = await buildSnapshotPage(req, ctx);
  const { driftAlertsTotal, sinkWritesFailedTotal } = sumSnapshotTotals(responsePayload.pageSnapshots);

  return NextResponse.json({
    specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
    kind: 'portable_signing_policy_trend_snapshots',
    limit: query.limit,
    matchedSnapshotCount: responsePayload.matchedSnapshotCount,
    snapshotCount: responsePayload.snapshotCount,
    pagination: {
      hasMore: responsePayload.hasMore,
      nextCursor: responsePayload.nextCursor,
      cursor: query.cursor,
    },
    filters: {
      trigger: query.trigger,
      from: query.from?.toISOString() ?? null,
      to: query.to?.toISOString() ?? null,
    },
    summary: {
      latestSnapshotAt: responsePayload.latestSnapshotAt,
      driftAlertsTotal,
      sinkWritesFailedTotal,
    },
    runExecution: buildRunExecutionSummary(),
    snapshots: responsePayload.pageSnapshots,
  });
}
