import {
  AiNode,
  Edge,
  RuntimeState,
  AiPathRunRecord,
  AiPathRunRepository,
} from '@/shared/contracts/ai-paths';
import { listBrainModels } from '@/shared/lib/ai-brain/server-model-catalog';
import { getBrainAssignmentForCapability } from '@/shared/lib/ai-brain/segments/api';
import { buildCompileWarningMessage } from '@/shared/lib/ai-paths/core/utils/compile-warning-message';
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


export async function runExecutorPreflight(input: {
  run: AiPathRunRecord;
  nodes: AiNode[];
  edges: Edge[];
  triggerNodeId: string | null;
  runtimeState: RuntimeState;
  repo: AiPathRunRepository;
  runStartedAt: string;
  traceId: string;
}): Promise<{
  validationConfig: import('@/shared/contracts/ai-paths-core/nodes-primitives').AiPathsValidationConfig;
  strictFlowMode: boolean;
  nodeValidationEnabled: boolean;
  blockedRunPolicy: 'fail_run' | 'complete_with_warning';
  requiredProcessingNodeIds: string[];
}> {
  const { run, nodes, edges, triggerNodeId, runtimeState, repo, runStartedAt, traceId } = input;
  const runMetaRecord = run.meta && typeof run.meta === 'object' ? run.meta : null;
  const strictFlowMode = runMetaRecord?.['strictFlowMode'] !== false;
  const blockedRunPolicy: 'fail_run' | 'complete_with_warning' =
    runMetaRecord?.['blockedRunPolicy'] === 'complete_with_warning'
      ? 'complete_with_warning'
      : 'fail_run';
  const validationConfig = normalizeAiPathsValidationConfig(
    runMetaRecord?.['aiPathsValidation'] as Record<string, unknown> | undefined
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

  const compileReport = runPreflight.compileReport;
  const validationReport = runPreflight.validationReport;
  const dataContractReport = runPreflight.dataContractReport;
  const assignment = await getBrainAssignmentForCapability('ai_paths.model');
  const catalog = await listBrainModels();
  const visionModelCapabilityIssues = collectVisionModelCapabilityIssues({
    nodes,
    defaultModelId: assignment.provider === 'model' ? assignment.modelId.trim() : '',
    descriptors: catalog.descriptors ?? {},
  });

  if (runPreflight.shouldBlock) {
    const blockedMessageByReason: Record<string, string> = {
      validation: 'Run blocked by AI Paths validation preflight.',
      compile: 'Run blocked by graph compile validation.',
      dependency: 'Run blocked by strict flow dependency validation.',
      data_contract: 'Run blocked by data-contract preflight validation.',
    };
    const blockedEventMessage =
      blockedMessageByReason[runPreflight.blockReason ?? ''] ??
      'Run blocked by preflight validation.';
    await repo.createRunEvent({
      runId: run.id,
      level: 'error',
      message: blockedEventMessage,
      metadata: {
        preflight: {
          reason: runPreflight.blockReason,
          message: runPreflight.blockMessage,
          validation: validationReport,
          compile: {
            errors: compileReport.errors,
            warnings: compileReport.warnings,
            findings: compileReport.findings.slice(0, 10),
          },
          dataContract: {
            errors: dataContractReport.errors,
            warnings: dataContractReport.warnings,
            issues: dataContractReport.issues.slice(0, 10),
          },
        },
        runStartedAt,
        traceId,
      },
    });
    throw new Error(runPreflight.blockMessage ?? blockedEventMessage);
  }

  if (visionModelCapabilityIssues.length > 0) {
    await repo.createRunEvent({
      runId: run.id,
      level: 'error',
      message: 'Run blocked by AI Brain model capability preflight.',
      metadata: {
        modelCapability: {
          issues: visionModelCapabilityIssues,
        },
        runStartedAt,
        traceId,
      },
    });
    throw new Error(buildVisionModelCapabilityErrorMessage(visionModelCapabilityIssues[0]!));
  }

  if (nodeValidationEnabled && compileReport.warnings > 0) {
    const warningMessage = buildCompileWarningMessage(compileReport);
    await repo.createRunEvent({
      runId: run.id,
      level: 'warn',
      message: warningMessage,
      metadata: {
        compile: {
          errors: compileReport.errors,
          warnings: compileReport.warnings,
          findings: compileReport.findings.slice(0, 10),
        },
        runStartedAt,
        traceId,
      },
    });
  }

  const policyReport = evaluateDisabledNodeTypesPolicy(nodes);
  if (policyReport.violations.length > 0) {
    await repo.createRunEvent({
      runId: run.id,
      level: 'error',
      message: 'Run blocked by node policy.',
      metadata: {
        traceId,
        runStartedAt,
        disabledNodeTypes: policyReport.disabledNodeTypes,
        blockedNodes: policyReport.violations.slice(0, 10),
      },
    });
    throw new Error(formatDisabledNodeTypesPolicyMessage(policyReport.violations));
  }

  if (validationReport.enabled && validationReport.shouldWarn) {
    await repo.createRunEvent({
      runId: run.id,
      level: 'warn',
      message: `Validation warning: score ${validationReport.score} with ${validationReport.failedRules} failed rule(s).`,
      metadata: {
        validation: {
          score: validationReport.score,
          policy: validationReport.policy,
          warnThreshold: validationReport.warnThreshold,
          blockThreshold: validationReport.blockThreshold,
          failedRules: validationReport.failedRules,
          findings: validationReport.findings.slice(0, 5),
        },
        runStartedAt,
        traceId,
      },
    });
  }

  return {
    validationConfig,
    strictFlowMode,
    nodeValidationEnabled,
    blockedRunPolicy: blockedRunPolicy,
    requiredProcessingNodeIds: compileReport.processingNodeIds,
  };
}
