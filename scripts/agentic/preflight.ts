import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  agenticRepoRoot,
  classifyChangedFiles,
  loadDomainManifests,
  type ImpactBundle,
  type RiskLevel,
} from './domain-manifests';

interface AgentWorkOrder {
  kind: 'agentic-work-order';
  generatedAt: string;
  changedFiles: string[];
  impactedDomainIds: string[];
  highestRiskLevel: RiskLevel;
  requiredImpactBundles: ImpactBundle[];
  bundlePriorityByBundle: Record<ImpactBundle, RiskLevel>;
  recommendedBundleOrder: ImpactBundle[];
  recommendedValidationByBundle: Record<ImpactBundle, string[]>;
  requiredDocs: string[];
  requiredGeneratedArtifacts: string[];
  generatedOnlyPaths: string[];
  manualOnlyPaths: string[];
  requiredDocGenerators: string[];
  requiredScannerTargets: string[];
  requiredValidationTargets: string[];
}

function parseArguments(argv: readonly string[]): {
  outputPath: string;
  changedFiles: string[];
} {
  let outputPath = 'artifacts/agent-work-order.json';
  const changedFiles: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument) continue;

    if (argument === '--output') {
      outputPath = argv[index + 1] ?? outputPath;
      index += 1;
      continue;
    }

    changedFiles.push(argument);
  }

  return {
    outputPath,
    changedFiles,
  };
}

async function main(): Promise<void> {
  const { changedFiles, outputPath } = parseArguments(process.argv.slice(2));
  const manifests = await loadDomainManifests();
  const classification = classifyChangedFiles(changedFiles, manifests);

  const workOrder: AgentWorkOrder = {
    kind: 'agentic-work-order',
    generatedAt: classification.generatedAt,
    changedFiles: classification.changedFiles,
    impactedDomainIds: classification.impactedDomains.map((domain) => domain.id),
    highestRiskLevel: classification.highestRiskLevel,
    requiredImpactBundles: classification.requiredImpactBundles,
    bundlePriorityByBundle: classification.bundlePriorityByBundle,
    recommendedBundleOrder: classification.recommendedBundleOrder,
    recommendedValidationByBundle: classification.recommendedValidationByBundle,
    requiredDocs: classification.requiredDocs,
    requiredGeneratedArtifacts: classification.requiredGeneratedArtifacts,
    generatedOnlyPaths: classification.generatedOnlyPaths,
    manualOnlyPaths: classification.manualOnlyPaths,
    requiredDocGenerators: classification.requiredDocGenerators,
    requiredScannerTargets: classification.requiredScannerTargets,
    requiredValidationTargets: classification.requiredValidationTargets,
  };

  const resolvedOutputPath = path.join(agenticRepoRoot, outputPath);
  await fs.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
  await fs.writeFile(
    resolvedOutputPath,
    `${JSON.stringify(workOrder, null, 2)}\n`,
    'utf8',
  );

  process.stdout.write(`Agentic preflight wrote ${outputPath}\n`);
  process.stdout.write(
    `Impacted domains: ${workOrder.impactedDomainIds.join(', ') || 'none'}\n`,
  );
  process.stdout.write(
    `Impact bundles: ${workOrder.requiredImpactBundles.join(', ') || 'none'}\n`,
  );
  process.stdout.write(
    `Bundle order: ${workOrder.recommendedBundleOrder.join(', ') || 'none'}\n`,
  );
  process.stdout.write(
    `Bundle recommendations: ${Object.keys(workOrder.recommendedValidationByBundle).join(', ') || 'none'}\n`,
  );
  process.stdout.write(`Highest risk: ${workOrder.highestRiskLevel}\n`);
  process.stdout.write(
    `Validation targets: ${workOrder.requiredValidationTargets.join(', ') || 'none'}\n`,
  );
}

void main();
