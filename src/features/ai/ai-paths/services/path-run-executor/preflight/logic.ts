import { type PreflightInput, type PreflightResult } from './types';
import { listBrainModels } from '@/shared/lib/ai-brain/server-model-catalog';
import { getBrainAssignmentForCapability } from '@/shared/lib/ai-brain/segments/api';
import {
  buildVisionModelCapabilityErrorMessage,
  collectVisionModelCapabilityIssues,
} from '@/shared/lib/ai-paths/core/utils/model-capability-preflight';
import { evaluateRunPreflight } from '@/shared/lib/ai-paths/core/utils/run-preflight';
import { normalizeAiPathsValidationConfig } from '@/shared/lib/ai-paths/core/validation-engine/defaults';
import {
  evaluateDisabledNodeTypesPolicy,
  formatDisabledNodeTypesPolicyMessage,
} from '../path-run-policy';

export const runExecutorPreflight = async (input: PreflightInput): Promise<PreflightResult> => {
  const { run, nodes, edges, triggerNodeId, runtimeState, repo, runStartedAt, traceId } = input;
  const runMetaRecord = run.meta && typeof run.meta === 'object' ? run.meta : null;
  const strictFlowMode = (runMetaRecord as any)?.['strictFlowMode'] !== false;
  const blockedRunPolicy: 'fail_run' | 'complete_with_warning' =
    (runMetaRecord as any)?.['blockedRunPolicy'] === 'complete_with_warning'
      ? 'complete_with_warning'
      : 'fail_run';
  const validationConfig = normalizeAiPathsValidationConfig(
    (runMetaRecord as any)?.['aiPathsValidation'] as Record<string, unknown> | undefined
  );
  const nodeValidationEnabled = validationConfig.enabled !== false;

  const runPreflight = evaluateRunPreflight({
    nodes,
    edges,
    aiPathsValidation: validationConfig,
    strictFlowMode,
    triggerNodeId: triggerNodeId ?? undefined,
    runtimeState,
    mode: 'full',
  });

  const assignment = await getBrainAssignmentForCapability('ai_paths.model');
  const catalog = await listBrainModels();
  const visionModelCapabilityIssues = collectVisionModelCapabilityIssues({
    nodes,
    defaultModelId: assignment.provider === 'model' ? assignment.modelId.trim() : '',
    descriptors: catalog.descriptors ?? {},
  });

  if (runPreflight.shouldBlock) {
    const message = runPreflight.blockMessage ?? 'Run blocked by preflight validation.';
    await repo.createRunEvent({
      runId: run.id,
      level: 'error',
      message,
      metadata: {
        preflight: {
          reason: runPreflight.blockReason,
          message: runPreflight.blockMessage,
          validation: runPreflight.validationReport,
        },
        runStartedAt,
        traceId,
      },
    });
    throw new Error(message);
  }

  if (visionModelCapabilityIssues.length > 0) {
    await repo.createRunEvent({
      runId: run.id,
      level: 'error',
      message: 'Run blocked by AI Brain model capability preflight.',
      metadata: { modelCapability: { issues: visionModelCapabilityIssues }, runStartedAt, traceId },
    });
    throw new Error(buildVisionModelCapabilityErrorMessage(visionModelCapabilityIssues[0]!));
  }

  const policyReport = evaluateDisabledNodeTypesPolicy(nodes);
  if (policyReport.violations.length > 0) {
    await repo.createRunEvent({
      runId: run.id,
      level: 'error',
      message: 'Run blocked by node policy.',
      metadata: { traceId, runStartedAt, disabledNodeTypes: policyReport.disabledNodeTypes, blockedNodes: policyReport.violations.slice(0, 10) },
    });
    throw new Error(formatDisabledNodeTypesPolicyMessage(policyReport.violations));
  }

  return {
    validationConfig,
    strictFlowMode,
    nodeValidationEnabled,
    blockedRunPolicy,
    requiredProcessingNodeIds: runPreflight.compileReport.processingNodeIds,
  };
};
