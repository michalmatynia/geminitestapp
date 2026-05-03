import type { AiPathRunNodeRecord, AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';

type ReadCountsResult = {
  matchedCount: number | null;
  modifiedCount: number | null;
  deletedCount: number | null;
  insertedCount: number | null;
  count: number | null;
};

export type NoopWriteFinding = {
  runId: string;
  pathId: string | null | undefined;
  pathName: string | null | undefined;
  nodeId: string;
  nodeTitle: string | null | undefined;
  nodeStatus: string;
  operation: string;
  action: string | null;
  counts: ReadCountsResult;
  reason: string;
};

export type CollectNoopWriteFindingsOptions = {
  runId?: string;
  pathId?: string;
  limit?: number;
};

export type CollectNoopWriteFindingsResult = {
  scannedRuns: number;
  scannedNodes: number;
  findings: NoopWriteFinding[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const readWriteCounts = (payload: Record<string, unknown>): ReadCountsResult => ({
  matchedCount: readNumber(payload['matchedCount']),
  modifiedCount: readNumber(payload['modifiedCount']),
  deletedCount: readNumber(payload['deletedCount']),
  insertedCount: readNumber(payload['insertedCount']),
  count: readNumber(payload['count']),
});

const inferOperation = (
  outputs: Record<string, unknown>,
  counts: ReadCountsResult
): { operation: string; action: string | null; isWrite: boolean } => {
  const writeOutcome = isRecord(outputs['writeOutcome'])
    ? (outputs['writeOutcome'] as Record<string, unknown>)
    : null;
  const directDebug = isRecord(outputs['debugPayload'])
    ? (outputs['debugPayload'] as Record<string, unknown>)
    : null;
  const bundle = isRecord(outputs['bundle'])
    ? (outputs['bundle'] as Record<string, unknown>)
    : null;

  const actionFromOutcome =
    typeof writeOutcome?.['action'] === 'string' ? (writeOutcome['action'] as string) : null;
  const actionFromDebug =
    typeof directDebug?.['action'] === 'string' ? (directDebug['action'] as string) : null;
  const actionFromBundle =
    typeof bundle?.['action'] === 'string' ? (bundle['action'] as string) : null;
  const action = actionFromOutcome ?? actionFromDebug ?? actionFromBundle;

  const operationFromOutcome =
    typeof writeOutcome?.['operation'] === 'string' ? (writeOutcome['operation'] as string) : null;
  const categoryFromDebug =
    typeof directDebug?.['actionCategory'] === 'string'
      ? (directDebug['actionCategory'] as string)
      : null;

  const hasWriteCounters =
    counts.matchedCount !== null ||
    counts.modifiedCount !== null ||
    counts.deletedCount !== null ||
    counts.insertedCount !== null;
  const inferredOperation =
    operationFromOutcome ??
    categoryFromDebug ??
    (action?.toLowerCase().includes('insert') || action?.toLowerCase().includes('create')
      ? 'insert'
      : action?.toLowerCase().includes('delete')
        ? 'delete'
        : action?.toLowerCase().includes('update') || action?.toLowerCase().includes('replace')
          ? 'update'
          : hasWriteCounters
            ? 'write'
            : 'unknown');
  const isWrite =
    inferredOperation === 'insert' ||
    inferredOperation === 'update' ||
    inferredOperation === 'delete' ||
    inferredOperation === 'write';

  return {
    operation: inferredOperation,
    action,
    isWrite,
  };
};

const detectNoopWriteFinding = (
  run: AiPathRunRecord,
  node: AiPathRunNodeRecord
): NoopWriteFinding | null => {
  if (node.nodeType !== 'database') return null;
  if (node.status !== 'completed') return null;
  if (!isRecord(node.outputs)) return null;

  const outputs = node.outputs as Record<string, unknown>;
  const bundle = isRecord(outputs['bundle']) ? (outputs['bundle'] as Record<string, unknown>) : {};
  const result = isRecord(outputs['result']) ? (outputs['result'] as Record<string, unknown>) : {};
  const merged = {
    ...bundle,
    ...result,
  };
  const counts = readWriteCounts(merged);
  const operationInfo = inferOperation(outputs, counts);
  if (!operationInfo.isWrite) return null;

  const writeOutcome = isRecord(outputs['writeOutcome'])
    ? (outputs['writeOutcome'] as Record<string, unknown>)
    : null;
  const zeroAffectedByOutcome = writeOutcome?.['zeroAffected'] === true;
  const zeroAffectedByCounters =
    counts.modifiedCount === 0 ||
    counts.matchedCount === 0 ||
    counts.deletedCount === 0 ||
    counts.insertedCount === 0;

  if (!zeroAffectedByOutcome && !zeroAffectedByCounters) {
    return null;
  }

  return {
    runId: run.id,
    pathId: run.pathId,
    pathName: run.pathName,
    nodeId: node.nodeId,
    nodeTitle: node.nodeTitle,
    nodeStatus: node.status,
    operation: operationInfo.operation,
    action: operationInfo.action,
    counts,
    reason: zeroAffectedByOutcome ? 'write_outcome_zero_affected' : 'counter_zero_affected',
  };
};

export async function collectNoopWriteFindings(
  options: CollectNoopWriteFindingsOptions = {}
): Promise<CollectNoopWriteFindingsResult> {
  const repo = await getPathRunRepository();
  const limit = options.limit ?? 200;
  const runs: AiPathRunRecord[] = [];

  if (options.runId) {
    const run = await repo.findRunById(options.runId);
    if (run) {
      runs.push(run);
    }
  } else {
    const listed = await repo.listRuns({
      status: 'completed',
      ...(options.pathId ? { pathId: options.pathId } : {}),
      limit,
      offset: 0,
    });
    runs.push(...listed.runs);
  }

  const findings: NoopWriteFinding[] = [];
  let scannedNodes = 0;
  for (const run of runs) {
    const nodes = await repo.listRunNodes(run.id);
    scannedNodes += nodes.length;
    nodes.forEach((node: AiPathRunNodeRecord): void => {
      const finding = detectNoopWriteFinding(run, node);
      if (finding) {
        findings.push(finding);
      }
    });
  }

  return {
    scannedRuns: runs.length,
    scannedNodes,
    findings,
  };
}

export const dedupeRunIds = (findings: NoopWriteFinding[]): string[] =>
  Array.from(new Set(findings.map((finding: NoopWriteFinding): string => finding.runId)));
