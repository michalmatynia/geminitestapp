import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import {
  agenticRepoRoot,
  type BazelTarget,
  type RiskLevel,
} from './domain-manifests';
import {
  buildWorkOrderExecutionPlan,
  loadAgentWorkOrder,
  type WorkOrderExecutionReport,
  type WorkOrderExecutionResult,
} from './work-order-execution';

function parseArguments(argv: readonly string[]): {
  workOrderPath: string;
  reportPath: string;
  includeValidation: boolean;
  forceValidation: boolean;
  validationRiskThreshold?: RiskLevel;
} {
  let workOrderPath = 'artifacts/agent-work-order.json';
  let reportPath = 'artifacts/agent-execution-report.json';
  let includeValidation = false;
  let forceValidation = false;
  let validationRiskThreshold: RiskLevel | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--work-order') {
      workOrderPath = argv[index + 1] ?? workOrderPath;
      index += 1;
      continue;
    }

    if (argument === '--report') {
      reportPath = argv[index + 1] ?? reportPath;
      index += 1;
      continue;
    }

    if (argument === '--include-validation') {
      includeValidation = true;
      continue;
    }

    if (argument === '--force-validation') {
      forceValidation = true;
      continue;
    }

    if (argument === '--validation-risk-threshold') {
      const threshold = argv[index + 1];
      if (threshold === 'low' || threshold === 'medium' || threshold === 'high') {
        validationRiskThreshold = threshold;
      }
      index += 1;
    }
  }

  return {
    workOrderPath,
    reportPath,
    includeValidation,
    forceValidation,
    validationRiskThreshold,
  };
}

function runBazelTarget(target: BazelTarget): Promise<WorkOrderExecutionResult> {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn(npmCommand, ['run', 'bazel', '--', 'run', target], {
      cwd: agenticRepoRoot,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('close', (code) => {
      resolve({
        kind: 'validation',
        target,
        status: code === 0 ? 'passed' : 'failed',
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

async function writeExecutionReport(
  reportPath: string,
  report: WorkOrderExecutionReport,
): Promise<void> {
  const resolvedReportPath = path.join(agenticRepoRoot, reportPath);
  await fs.mkdir(path.dirname(resolvedReportPath), { recursive: true });
  await fs.writeFile(
    resolvedReportPath,
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
}

async function main(): Promise<void> {
  const {
    workOrderPath,
    reportPath,
    includeValidation,
    forceValidation,
    validationRiskThreshold,
  } = parseArguments(process.argv.slice(2));
  const workOrder = await loadAgentWorkOrder(workOrderPath);
  const plan = buildWorkOrderExecutionPlan(workOrder, {
    includeValidation,
    forceValidation,
    validationRiskThreshold,
  });
  const executedTargets: WorkOrderExecutionResult[] = [];

  const reportBase: Omit<
    WorkOrderExecutionReport,
    'executedTargets' | 'skippedValidationTargets'
  > = {
    kind: 'agentic-execution-report',
    generatedAt: new Date().toISOString(),
    workOrderPath,
    highestRiskLevel: plan.highestRiskLevel,
    requiredImpactBundles: plan.requiredImpactBundles,
    bundlePriorityByBundle: plan.bundlePriorityByBundle,
    recommendedBundleOrder: plan.recommendedBundleOrder,
    recommendedValidationByBundle: workOrder.recommendedValidationByBundle,
    validationDecision: plan.validationDecision,
    validationRiskThreshold: plan.validationRiskThreshold,
    changedFiles: workOrder.changedFiles,
    impactedDomainIds: workOrder.impactedDomainIds,
    guardrailViolations: plan.guardrailViolations,
    requiredDocs: workOrder.requiredDocs,
    requiredGeneratedArtifacts: workOrder.requiredGeneratedArtifacts,
  };

  if (plan.guardrailViolations.length > 0) {
    await writeExecutionReport(reportPath, {
      ...reportBase,
      executedTargets,
      skippedValidationTargets:
        plan.validationDecision === 'included'
          ? []
          : workOrder.requiredValidationTargets,
    });

    process.stderr.write(
      `Agentic execution blocked by guardrails:\n - ${plan.guardrailViolations.join('\n - ')}\n`,
    );
    process.exitCode = 1;
    return;
  }

  const targetRuns: Array<{
    kind: WorkOrderExecutionResult['kind'];
    target: BazelTarget;
  }> = [
    ...plan.docGenerators.map((target) => ({
      kind: 'doc-generator' as const,
      target,
    })),
    ...plan.scannerTargets.map((target) => ({
      kind: 'scanner' as const,
      target,
    })),
    ...plan.validationTargets.map((target) => ({
      kind: 'validation' as const,
      target,
    })),
  ];

  let hasFailure = false;

  for (const targetRun of targetRuns) {
    process.stdout.write(`Executing ${targetRun.kind}: ${targetRun.target}\n`);
    const result = await runBazelTarget(targetRun.target);
    executedTargets.push({
      ...result,
      kind: targetRun.kind,
    });

    if (result.status === 'failed') {
      hasFailure = true;
    }
  }

  await writeExecutionReport(reportPath, {
    ...reportBase,
    executedTargets,
    skippedValidationTargets:
      plan.validationDecision === 'included'
        ? []
        : workOrder.requiredValidationTargets,
  });

  process.stdout.write(`Agentic execution wrote ${reportPath}\n`);
  if (hasFailure) {
    process.exitCode = 1;
  }
}

void main();
