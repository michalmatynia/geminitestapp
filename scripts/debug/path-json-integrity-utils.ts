import type {
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from '@/shared/contracts/ai-paths';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';

export type JsonIntegrityFinding = {
  runId: string;
  pathId: string | null | undefined;
  pathName: string | null | undefined;
  nodeId: string;
  nodeTitle: string | null | undefined;
  nodeType: string;
  nodeStatus: string;
  source: 'guardrail' | 'node_output';
  token: string | null;
  port: string | null;
  parseState: string;
  repairApplied: boolean;
  rawType: string | null;
};

export type CollectJsonIntegrityFindingsOptions = {
  runId?: string;
  pathId?: string;
  limit?: number;
};

export type CollectJsonIntegrityFindingsResult = {
  scannedRuns: number;
  scannedNodes: number;
  findings: JsonIntegrityFinding[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeBoolean = (value: unknown): boolean => value === true;

const collectNodeDiagnostics = (
  run: AiPathRunRecord,
  node: AiPathRunNodeRecord
): JsonIntegrityFinding[] => {
  if (!isRecord(node.outputs)) return [];
  const outputs = node.outputs as Record<string, unknown>;
  const findings: JsonIntegrityFinding[] = [];

  const diagnosticsFromGuardrailRaw = (() => {
    const guardrailMeta = isRecord(outputs['guardrailMeta'])
      ? (outputs['guardrailMeta'] as Record<string, unknown>)
      : isRecord(outputs['bundle']) &&
          isRecord((outputs['bundle'] as Record<string, unknown>)['guardrailMeta'])
        ? ((outputs['bundle'] as Record<string, unknown>)['guardrailMeta'] as Record<string, unknown>)
        : null;
    if (!guardrailMeta) return [];
    const parseDiagnostics = guardrailMeta['parseDiagnostics'];
    return Array.isArray(parseDiagnostics) ? parseDiagnostics : [];
  })();

  diagnosticsFromGuardrailRaw.forEach((entry: unknown): void => {
    if (!isRecord(entry)) return;
    const parseState = normalizeString(entry['parseState']) ?? 'unknown';
    if (parseState !== 'unparseable' && parseState !== 'repaired') return;
    findings.push({
      runId: run.id,
      pathId: run.pathId,
      pathName: run.pathName,
      nodeId: node.nodeId,
      nodeTitle: node.nodeTitle,
      nodeType: node.nodeType,
      nodeStatus: node.status,
      source: 'guardrail',
      token: normalizeString(entry['token']),
      port: normalizeString(entry['port']),
      parseState,
      repairApplied: normalizeBoolean(entry['repairApplied']),
      rawType: normalizeString(entry['rawType']),
    });
  });

  const jsonIntegrityOutput = outputs['jsonIntegrity'];
  if (Array.isArray(jsonIntegrityOutput)) {
    jsonIntegrityOutput.forEach((entry: unknown): void => {
      if (!isRecord(entry)) return;
      const parseState = normalizeString(entry['parseState']) ?? 'unknown';
      if (parseState !== 'unparseable' && parseState !== 'repaired') return;
      findings.push({
        runId: run.id,
        pathId: run.pathId,
        pathName: run.pathName,
        nodeId: node.nodeId,
        nodeTitle: node.nodeTitle,
        nodeType: node.nodeType,
        nodeStatus: node.status,
        source: 'node_output',
        token: normalizeString(entry['token']),
        port: normalizeString(entry['port']),
        parseState,
        repairApplied: normalizeBoolean(entry['repairApplied']),
        rawType: normalizeString(entry['rawType']),
      });
    });
  }

  return findings;
};

export async function collectJsonIntegrityFindings(
  options: CollectJsonIntegrityFindingsOptions = {}
): Promise<CollectJsonIntegrityFindingsResult> {
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
      ...(options.pathId ? { pathId: options.pathId } : {}),
      limit,
      offset: 0,
    });
    runs.push(...listed.runs);
  }

  const findings: JsonIntegrityFinding[] = [];
  let scannedNodes = 0;
  for (const run of runs) {
    const nodes = await repo.listRunNodes(run.id);
    scannedNodes += nodes.length;
    nodes.forEach((node: AiPathRunNodeRecord): void => {
      findings.push(...collectNodeDiagnostics(run, node));
    });
  }

  return {
    scannedRuns: runs.length,
    scannedNodes,
    findings,
  };
}

export const dedupeRunIdsFromJsonIntegrityFindings = (
  findings: JsonIntegrityFinding[]
): string[] =>
  Array.from(
    new Set(findings.map((finding: JsonIntegrityFinding): string => finding.runId))
  );
