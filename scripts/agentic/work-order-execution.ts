import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  agenticRepoRoot,
  type BazelTarget,
  type ImpactBundle,
  type RiskLevel,
} from './domain-manifests';

export interface AgentWorkOrder {
  kind: 'agentic-work-order';
  generatedAt: string;
  changedFiles: string[];
  impactedDomainIds: string[];
  highestRiskLevel: RiskLevel;
  requiredImpactBundles: ImpactBundle[];
  bundlePriorityByBundle: Record<ImpactBundle, RiskLevel>;
  recommendedBundleOrder: ImpactBundle[];
  recommendedValidationByBundle: Record<ImpactBundle, BazelTarget[]>;
  requiredDocs: string[];
  requiredGeneratedArtifacts: string[];
  generatedOnlyPaths: string[];
  manualOnlyPaths: string[];
  requiredDocGenerators: BazelTarget[];
  requiredScannerTargets: BazelTarget[];
  requiredValidationTargets: BazelTarget[];
}

export interface WorkOrderExecutionPlan {
  highestRiskLevel: RiskLevel;
  requiredImpactBundles: ImpactBundle[];
  bundlePriorityByBundle: Record<ImpactBundle, RiskLevel>;
  recommendedBundleOrder: ImpactBundle[];
  validationDecision:
    | 'included'
    | 'skipped-by-default'
    | 'skipped-by-policy'
    | 'skipped-by-risk';
  validationRiskThreshold: RiskLevel | null;
  docGenerators: BazelTarget[];
  scannerTargets: BazelTarget[];
  validationTargets: BazelTarget[];
  guardrailViolations: string[];
}

export interface WorkOrderExecutionResult {
  kind: 'doc-generator' | 'scanner' | 'validation';
  target: BazelTarget;
  status: 'passed' | 'failed';
  durationMs: number;
}

export interface WorkOrderExecutionReport {
  kind: 'agentic-execution-report';
  generatedAt: string;
  workOrderPath: string;
  highestRiskLevel: RiskLevel;
  requiredImpactBundles: ImpactBundle[];
  bundlePriorityByBundle: Record<ImpactBundle, RiskLevel>;
  recommendedBundleOrder: ImpactBundle[];
  recommendedValidationByBundle: Record<ImpactBundle, BazelTarget[]>;
  validationDecision:
    | 'included'
    | 'skipped-by-default'
    | 'skipped-by-policy'
    | 'skipped-by-risk';
  validationRiskThreshold: RiskLevel | null;
  changedFiles: string[];
  impactedDomainIds: string[];
  executedTargets: WorkOrderExecutionResult[];
  skippedValidationTargets: BazelTarget[];
  guardrailViolations: string[];
  requiredDocs: string[];
  requiredGeneratedArtifacts: string[];
}

const riskOrder: Record<RiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function dedupe<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values.filter(Boolean))];
}

function normalizeRepoPath(input: string): string {
  return input.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

function matchesPathPrefix(candidatePath: string, prefix: string): boolean {
  const normalizedCandidatePath = normalizeRepoPath(candidatePath);
  const normalizedPrefix = normalizeRepoPath(prefix);
  return (
    normalizedCandidatePath === normalizedPrefix ||
    normalizedCandidatePath.startsWith(`${normalizedPrefix}/`)
  );
}

function shouldIncludeValidationTargets(
  highestRiskLevel: RiskLevel,
  options?: {
    includeValidation?: boolean;
    validationRiskThreshold?: RiskLevel;
    forceValidation?: boolean;
  },
): {
  validationDecision: WorkOrderExecutionPlan['validationDecision'];
  validationRiskThreshold: RiskLevel | null;
} {
  if (!options?.includeValidation) {
    return {
      validationDecision: 'skipped-by-default',
      validationRiskThreshold: null,
    };
  }

  if (highestRiskLevel === 'low' && !options.forceValidation) {
    return {
      validationDecision: 'skipped-by-policy',
      validationRiskThreshold: options.validationRiskThreshold ?? null,
    };
  }

  const validationRiskThreshold = options.validationRiskThreshold ?? 'low';
  if (riskOrder[highestRiskLevel] < riskOrder[validationRiskThreshold]) {
    return {
      validationDecision: 'skipped-by-risk',
      validationRiskThreshold,
    };
  }

  return {
    validationDecision: 'included',
    validationRiskThreshold,
  };
}

export function detectWorkOrderGuardrailViolations(
  workOrder: AgentWorkOrder,
): string[] {
  const violations: string[] = [];

  for (const generatedArtifact of dedupe(workOrder.requiredGeneratedArtifacts)) {
    if (
      workOrder.manualOnlyPaths.some((manualOnlyPath) =>
        matchesPathPrefix(generatedArtifact, manualOnlyPath),
      )
    ) {
      violations.push(
        `Generated artifact ${generatedArtifact} falls under a manual-only path.`,
      );
    }
  }

  for (const requiredDoc of dedupe(workOrder.requiredDocs)) {
    if (
      workOrder.generatedOnlyPaths.some((generatedOnlyPath) =>
        matchesPathPrefix(requiredDoc, generatedOnlyPath),
      )
    ) {
      violations.push(
        `Required doc ${requiredDoc} falls under a generated-only path.`,
      );
    }
  }

  return violations;
}

export function buildWorkOrderExecutionPlan(
  workOrder: AgentWorkOrder,
  options?: {
    includeValidation?: boolean;
    validationRiskThreshold?: RiskLevel;
    forceValidation?: boolean;
  },
): WorkOrderExecutionPlan {
  const validationPolicy = shouldIncludeValidationTargets(
    workOrder.highestRiskLevel,
    options,
  );

  return {
    highestRiskLevel: workOrder.highestRiskLevel,
    requiredImpactBundles: dedupe(workOrder.requiredImpactBundles),
    bundlePriorityByBundle: workOrder.bundlePriorityByBundle,
    recommendedBundleOrder: dedupe(workOrder.recommendedBundleOrder),
    validationDecision: validationPolicy.validationDecision,
    validationRiskThreshold: validationPolicy.validationRiskThreshold,
    docGenerators: dedupe(workOrder.requiredDocGenerators),
    scannerTargets: dedupe(workOrder.requiredScannerTargets),
    validationTargets:
      validationPolicy.validationDecision === 'included'
        ? dedupe(workOrder.requiredValidationTargets)
        : [],
    guardrailViolations: detectWorkOrderGuardrailViolations(workOrder),
  };
}

export async function loadAgentWorkOrder(workOrderPath: string): Promise<AgentWorkOrder> {
  const resolvedWorkOrderPath = path.join(agenticRepoRoot, workOrderPath);
  const rawWorkOrder = await fs.readFile(resolvedWorkOrderPath, 'utf8');
  return JSON.parse(rawWorkOrder) as AgentWorkOrder;
}
