import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { agenticRepoRoot } from './domain-manifests';
import type { AgentWorkOrder, WorkOrderExecutionReport } from './work-order-execution';
import type { AgenticBundlePlan } from './bundle-plan';
import type { AgenticBundleSelection } from './select-bundles';

export interface AgenticBundleHistoryEntry {
  bundle: string;
  priority: string;
  recommendedTargets: string[];
  executedTargets: Array<{
    target: string;
    status: 'passed' | 'failed';
    durationMs: number;
  }>;
}

export interface AgenticHistorySnapshot {
  kind: 'agentic-history-snapshot';
  generatedAt: string;
  workOrder: Pick<
    AgentWorkOrder,
    | 'generatedAt'
    | 'changedFiles'
    | 'impactedDomainIds'
    | 'highestRiskLevel'
    | 'requiredImpactBundles'
    | 'recommendedBundleOrder'
    | 'recommendedValidationByBundle'
  >;
  executionReport: Pick<
    WorkOrderExecutionReport,
    | 'generatedAt'
    | 'validationDecision'
    | 'validationRiskThreshold'
    | 'guardrailViolations'
    | 'skippedValidationTargets'
  > | null;
  bundlePlan: AgenticBundlePlan['bundles'];
  bundleSelection: Pick<
    AgenticBundleSelection,
    'selectedBundles' | 'skippedBundles'
  > | null;
  bundleReports: AgenticBundleHistoryEntry[];
}

async function readJsonIfPresent<T>(relativePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(agenticRepoRoot, relativePath), 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function collectAgenticHistorySnapshot(
  options?: {
    workOrderPath?: string;
    executionReportPath?: string;
    bundlePlanPath?: string;
    bundleReportDirectory?: string;
  },
): Promise<AgenticHistorySnapshot> {
  const workOrderPath = options?.workOrderPath ?? 'artifacts/agent-work-order.json';
  const executionReportPath =
    options?.executionReportPath ?? 'artifacts/agent-execution-report.json';
  const bundlePlanPath = options?.bundlePlanPath ?? 'artifacts/agent-bundle-plan.json';
  const bundleReportDirectory =
    options?.bundleReportDirectory ?? 'artifacts/agent-bundle-reports';

  const workOrder = await readJsonIfPresent<AgentWorkOrder>(workOrderPath);
  if (!workOrder) {
    throw new Error(`Missing required work order at ${workOrderPath}`);
  }

  const executionReport =
    await readJsonIfPresent<WorkOrderExecutionReport>(executionReportPath);
  const bundlePlan = await readJsonIfPresent<AgenticBundlePlan>(bundlePlanPath);
  const bundleSelection =
    await readJsonIfPresent<AgenticBundleSelection>('artifacts/agent-bundle-selection.json');

  const resolvedBundleReportDirectory = path.join(agenticRepoRoot, bundleReportDirectory);
  let bundleReports: AgenticBundleHistoryEntry[] = [];

  try {
    const reportFiles = (await fs.readdir(resolvedBundleReportDirectory))
      .filter((fileName) => fileName.endsWith('.json'))
      .sort((left, right) => left.localeCompare(right));

    bundleReports = await Promise.all(
      reportFiles.map(async (fileName) => {
        const report = JSON.parse(
          await fs.readFile(path.join(resolvedBundleReportDirectory, fileName), 'utf8'),
        ) as {
          bundle: string;
          priority: string;
          targets: Array<{
            target: string;
            status: 'passed' | 'failed';
            durationMs: number;
          }>;
        };

        return {
          bundle: report.bundle,
          priority: report.priority,
          recommendedTargets:
            bundlePlan?.bundles.find((entry) => entry.bundle === report.bundle)?.targets ?? [],
          executedTargets: report.targets,
        };
      }),
    );
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      throw error;
    }
  }

  return {
    kind: 'agentic-history-snapshot',
    generatedAt: new Date().toISOString(),
    workOrder: {
      generatedAt: workOrder.generatedAt,
      changedFiles: workOrder.changedFiles,
      impactedDomainIds: workOrder.impactedDomainIds,
      highestRiskLevel: workOrder.highestRiskLevel,
      requiredImpactBundles: workOrder.requiredImpactBundles,
      recommendedBundleOrder: workOrder.recommendedBundleOrder,
      recommendedValidationByBundle: workOrder.recommendedValidationByBundle,
    },
    executionReport: executionReport
      ? {
          generatedAt: executionReport.generatedAt,
          validationDecision: executionReport.validationDecision,
          validationRiskThreshold: executionReport.validationRiskThreshold,
          guardrailViolations: executionReport.guardrailViolations,
          skippedValidationTargets: executionReport.skippedValidationTargets,
        }
      : null,
    bundlePlan: bundlePlan?.bundles ?? [],
    bundleSelection: bundleSelection
      ? {
          selectedBundles: bundleSelection.selectedBundles,
          skippedBundles: bundleSelection.skippedBundles,
        }
      : bundlePlan
        ? {
            selectedBundles: bundlePlan.bundles.map((entry) => entry.bundle),
            skippedBundles: [],
          }
        : null,
    bundleReports,
  };
}

function parseArguments(argv: readonly string[]): {
  outputPath: string;
} {
  let outputPath = 'artifacts/agent-history/latest.json';

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--output') {
      outputPath = argv[index + 1] ?? outputPath;
      index += 1;
    }
  }

  return { outputPath };
}

async function main(): Promise<void> {
  const { outputPath } = parseArguments(process.argv.slice(2));
  const snapshot = await collectAgenticHistorySnapshot();
  const resolvedOutputPath = path.join(agenticRepoRoot, outputPath);

  await fs.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await fs.writeFile(resolvedOutputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  process.stdout.write(`Agentic history wrote ${outputPath}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
