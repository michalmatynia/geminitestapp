import { type AiNode, type Edge } from '@/shared/contracts/ai-paths';
import { type NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';
import { type EngineStateManager } from '../engine-state-manager';
import { type EvaluateGraphOptions, type RuntimeNodeResolutionTelemetry } from '../engine-types';

export type RunNodeArgs = {
  node: AiNode;
  iteration: number;
  state: EngineStateManager;
  options: EvaluateGraphOptions;
  resolvedRunId: string;
  resolvedRunStartedAt: string;
  triggerContext: Record<string, unknown> | null;
  internalCheckTriggerProvenance: () => boolean;
  telemetryResolver: { resolve: (type: string) => RuntimeNodeResolutionTelemetry | null };
  seedHashes: Record<string, string>;
  nodes: AiNode[];
  sanitizedEdges: Edge[];
  outgoingEdgesByNode: Map<string, Edge[]>;
  nodeById: Map<string, AiNode>;
  executed: NodeHandlerContext['executed'];
};
