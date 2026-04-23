import {
  type AiNode,
  type Edge,
  type RuntimeState,
  type AiPathRunRecord,
  type AiPathRunRepository,
} from '@/shared/contracts/ai-paths';
import { type AiPathsValidationConfig } from '@/shared/contracts/ai-paths-core/nodes-primitives';

export interface PreflightInput {
  run: AiPathRunRecord;
  nodes: AiNode[];
  edges: Edge[];
  triggerNodeId: string | null;
  runtimeState: RuntimeState;
  repo: AiPathRunRepository;
  runStartedAt: string;
  traceId: string;
}

export interface PreflightResult {
  validationConfig: AiPathsValidationConfig;
  strictFlowMode: boolean;
  nodeValidationEnabled: boolean;
  blockedRunPolicy: 'fail_run' | 'complete_with_warning';
  requiredProcessingNodeIds: string[];
}
