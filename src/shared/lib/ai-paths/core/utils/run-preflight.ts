 
import type {
  RunPreflightBlockReason,
  RunPreflightWarning,
  RunPreflightReport,
  EvaluateRunPreflightArgs,
} from '@/shared/contracts/ai-paths';

import { normalizeAiPathsValidationConfig } from '../validation-engine/defaults';
import { evaluateAiPathsValidationPreflight } from '../validation-engine/evaluator';
import { evaluateDataContractPreflight } from './data-contract-preflight';
import { inspectPathDependencies } from './dependency-inspector';
import { compileGraph } from './graph';

export type {
  RunPreflightBlockReason,
  RunPreflightWarning,
  RunPreflightReport,
  EvaluateRunPreflightArgs,
};

export const evaluateRunPreflight = (args: EvaluateRunPreflightArgs): RunPreflightReport => {
  const validationConfig = normalizeAiPathsValidationConfig(args.aiPathsValidation);
  const nodeValidationEnabled = validationConfig.enabled !== false;
  const strictFlowMode = args.strictFlowMode !== false;
  const scopeMode = nodeValidationEnabled ? 'full' : 'reachable_from_roots';
  const scopeRootNodeIds =
    !nodeValidationEnabled && args.triggerNodeId ? [args.triggerNodeId] : undefined;

  const validationReport = evaluateAiPathsValidationPreflight({
    nodes: args.nodes,
    edges: args.edges,
    config: validationConfig,
  });

  const compileReport = nodeValidationEnabled
    ? compileGraph(args.nodes, args.edges)
    : compileGraph(args.nodes, args.edges, {
      scopeMode,
      ...(scopeRootNodeIds ? { scopeRootNodeIds } : {}),
    });

  const dependencyReport = strictFlowMode
    ? inspectPathDependencies(args.nodes, args.edges, {
      scopeMode,
      ...(scopeRootNodeIds ? { scopeRootNodeIds } : {}),
    })
    : null;

  const dataContractReport = evaluateDataContractPreflight({
    nodes: args.nodes,
    edges: args.edges,
    runtimeState: args.runtimeState,
    parserSamples: args.parserSamples,
    updaterSamples: args.updaterSamples,
    mode: args.mode ?? 'full',
    scopeMode,
    ...(scopeRootNodeIds ? { scopeRootNodeIds } : {}),
  });

  let shouldBlock = false;
  let blockReason: RunPreflightBlockReason = null;
  let blockMessage: string | null = null;

  if (nodeValidationEnabled && validationReport.blocked) {
    shouldBlock = true;
    blockReason = 'validation';
    const primaryFinding = validationReport.findings[0];
    blockMessage = primaryFinding
      ? `Validation blocked run: ${primaryFinding.ruleTitle}.`
      : `Validation blocked run: score ${validationReport.score} below threshold ${validationReport.blockThreshold}.`;
  }

  if (!shouldBlock && nodeValidationEnabled && !compileReport.ok) {
    shouldBlock = true;
    blockReason = 'compile';
    const primaryError = compileReport.findings.find(
      (finding): boolean => finding.severity === 'error'
    );
    blockMessage =
      primaryError?.message ??
      `Graph compile blocked run: ${compileReport.errors} issue(s) require fixes.`;
  }

  if (
    !shouldBlock &&
    nodeValidationEnabled &&
    strictFlowMode &&
    dependencyReport &&
    dependencyReport.errors > 0
  ) {
    shouldBlock = true;
    blockReason = 'dependency';
    blockMessage = `Strict flow blocked run: ${dependencyReport.errors} dependency error(s) detected.`;
  }

  if (!shouldBlock && nodeValidationEnabled && dataContractReport.errors > 0) {
    shouldBlock = true;
    blockReason = 'data_contract';
    const firstErrorIssue = dataContractReport.issues.find((issue) => issue.severity === 'error');
    blockMessage =
      firstErrorIssue?.message ??
      `Data contract preflight blocked run: ${dataContractReport.errors} issue(s) detected.`;
  }

  const warnings: RunPreflightWarning[] = [];

  if (validationReport.enabled && validationReport.shouldWarn) {
    warnings.push({
      source: 'validation',
      code: 'validation_warning',
      message: `Validation warning: score ${validationReport.score} with ${validationReport.failedRules} failed rule(s).`,
    });
  }

  if (compileReport.warnings > 0) {
    warnings.push({
      source: 'compile',
      code: 'compile_warning',
      message: `Graph compile reported ${compileReport.warnings} warning(s).`,
    });
  }

  if (!nodeValidationEnabled && compileReport.errors > 0) {
    warnings.push({
      source: 'compile',
      code: 'compile_errors_non_blocking',
      message: `Node Validation is disabled: ${compileReport.errors} compile error(s) are non-blocking for this run scope.`,
    });
  }

  if (dependencyReport && dependencyReport.warnings > 0) {
    warnings.push({
      source: 'dependency',
      code: 'dependency_warning',
      message: `Dependency inspector reported ${dependencyReport.warnings} warning(s).`,
    });
  }

  if (!nodeValidationEnabled && dependencyReport && dependencyReport.errors > 0) {
    warnings.push({
      source: 'dependency',
      code: 'dependency_errors_non_blocking',
      message: `Node Validation is disabled: ${dependencyReport.errors} strict-flow dependency error(s) are non-blocking for this run scope.`,
    });
  }

  if (dataContractReport.warnings > 0) {
    warnings.push({
      source: 'data_contract',
      code: 'data_contract_warning',
      message: `Data contract preflight reported ${dataContractReport.warnings} warning(s).`,
    });
  }

  if (!nodeValidationEnabled && dataContractReport.errors > 0) {
    warnings.push({
      source: 'data_contract',
      code: 'data_contract_errors_non_blocking',
      message: `Node Validation is disabled: ${dataContractReport.errors} data contract error(s) are non-blocking for this run scope.`,
    });
  }

  return {
    nodeValidationEnabled,
    shouldBlock,
    blockReason,
    blockMessage,
    validationReport,
    compileReport,
    dependencyReport,
    dataContractReport,
    warnings,
  };
};
