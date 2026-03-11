import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { agenticRepoRoot, type BazelTarget, type ImpactBundle, type RiskLevel } from './domain-manifests';
import { loadAgentWorkOrder, type AgentWorkOrder } from './work-order-execution';

export interface BundlePlanEntry {
  bundle: ImpactBundle;
  priority: RiskLevel;
  targets: BazelTarget[];
}

export interface AgenticBundlePlan {
  kind: 'agentic-bundle-plan';
  generatedAt: string;
  workOrderPath: string;
  bundles: BundlePlanEntry[];
}

export function buildAgenticBundlePlan(
  workOrder: AgentWorkOrder,
  workOrderPath = 'artifacts/agent-work-order.json',
): AgenticBundlePlan {
  return {
    kind: 'agentic-bundle-plan',
    generatedAt: new Date().toISOString(),
    workOrderPath,
    bundles: workOrder.recommendedBundleOrder.map((bundle) => ({
      bundle,
      priority: workOrder.bundlePriorityByBundle[bundle] ?? workOrder.highestRiskLevel,
      targets: workOrder.recommendedValidationByBundle[bundle] ?? [],
    })),
  };
}

function parseArguments(argv: readonly string[]): {
  workOrderPath: string;
  outputPath: string;
} {
  let workOrderPath = 'artifacts/agent-work-order.json';
  let outputPath = 'artifacts/agent-bundle-plan.json';

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--work-order') {
      workOrderPath = argv[index + 1] ?? workOrderPath;
      index += 1;
      continue;
    }

    if (argument === '--output') {
      outputPath = argv[index + 1] ?? outputPath;
      index += 1;
    }
  }

  return { workOrderPath, outputPath };
}

async function main(): Promise<void> {
  const { workOrderPath, outputPath } = parseArguments(process.argv.slice(2));
  const workOrder = await loadAgentWorkOrder(workOrderPath);
  const plan = buildAgenticBundlePlan(workOrder, workOrderPath);

  const resolvedOutputPath = path.join(agenticRepoRoot, outputPath);
  await fs.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await fs.writeFile(resolvedOutputPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

  process.stdout.write(`Agentic bundle plan wrote ${outputPath}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
