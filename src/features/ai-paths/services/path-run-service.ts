import "server-only";

import type { AiNode, Edge, AiPathRunRecord } from "@/shared/types/ai-paths";
import { normalizeNodes, sanitizeEdges } from "@/features/ai-paths/lib";
import { getPathRunRepository } from "@/features/ai-paths/services/path-run-repository";

type EnqueueRunInput = {
  userId?: string | null;
  pathId: string;
  pathName?: string | null;
  nodes: AiNode[];
  edges: Edge[];
  triggerEvent?: string | null;
  triggerNodeId?: string | null;
  triggerContext?: Record<string, unknown> | null;
  entityId?: string | null;
  entityType?: string | null;
  maxAttempts?: number | null;
  backoffMs?: number | null;
  backoffMaxMs?: number | null;
  meta?: Record<string, unknown> | null;
};

export const enqueuePathRun = async (input: EnqueueRunInput): Promise<AiPathRunRecord> => {
  const repo = await getPathRunRepository();
  const nodes = normalizeNodes(input.nodes ?? []);
  const edges = sanitizeEdges(nodes, input.edges ?? []);
  const meta = {
    ...(input.meta ?? {}),
    backoffMs: input.backoffMs ?? undefined,
    backoffMaxMs: input.backoffMaxMs ?? undefined,
  };
  const run = await repo.createRun({
    userId: input.userId ?? null,
    pathId: input.pathId,
    pathName: input.pathName ?? null,
    triggerEvent: input.triggerEvent ?? null,
    triggerNodeId: input.triggerNodeId ?? null,
    triggerContext: input.triggerContext ?? null,
    graph: { nodes, edges },
    entityId: input.entityId ?? null,
    entityType: input.entityType ?? null,
    meta,
    maxAttempts: input.maxAttempts ?? null,
  });
  await repo.createRunNodes(run.id, nodes);
  await repo.createRunEvent({
    runId: run.id,
    level: "info",
    message: "Run queued.",
    metadata: { pathId: run.pathId },
  });
  return run;
};

export const resumePathRun = async (
  runId: string,
  mode: "resume" | "replay" = "resume"
): Promise<AiPathRunRecord> => {
  const repo = await getPathRunRepository();
  const run = await repo.findRunById(runId);
  if (!run) throw new Error("Run not found");
  const meta = {
    ...(run.meta ?? {}),
    resumeMode: mode,
    retryNodeIds: [],
  };
  const updated = await repo.updateRun(runId, {
    status: "queued",
    errorMessage: null,
    retryCount: 0,
    nextRetryAt: null,
    deadLetteredAt: null,
    meta,
  });
  await repo.createRunEvent({
    runId,
    level: "info",
    message: `Run resumed (${mode}).`,
  });
  return updated;
};

export const retryPathRunNode = async (runId: string, nodeId: string): Promise<AiPathRunRecord> => {
  const repo = await getPathRunRepository();
  const run = await repo.findRunById(runId);
  if (!run) throw new Error("Run not found");
  const nodeInfo =
    run.graph?.nodes?.find((node: AiNode) => node.id === nodeId) ?? null;
  await repo.upsertRunNode(runId, nodeId, {
    nodeType: nodeInfo?.type ?? "unknown",
    nodeTitle: nodeInfo?.title ?? null,
    status: "pending",
    attempt: 0,
    inputs: null,
    outputs: null,
    errorMessage: null,
    startedAt: null,
    finishedAt: null,
  });
  const meta = {
    ...(run.meta ?? {}),
    resumeMode: "retry",
    retryNodeIds: [nodeId],
  };
  const updated = await repo.updateRun(runId, {
    status: "queued",
    errorMessage: null,
    retryCount: 0,
    nextRetryAt: null,
    deadLetteredAt: null,
    meta,
  });
  await repo.createRunEvent({
    runId,
    level: "info",
    message: `Retry node ${nodeId}.`,
  });
  return updated;
};

export const cancelPathRun = async (runId: string): Promise<AiPathRunRecord> => {
  const repo = await getPathRunRepository();
  const run = await repo.findRunById(runId);
  if (!run) throw new Error("Run not found");
  const updated = await repo.updateRun(runId, {
    status: "canceled",
    finishedAt: new Date(),
  });
  await repo.createRunEvent({
    runId,
    level: "warning",
    message: "Run canceled.",
  });
  return updated;
};
