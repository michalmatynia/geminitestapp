import { promises as fs } from 'node:fs';
import path from 'node:path';

import { agenticRepoRoot } from './domain-manifests';
import { loadAgentWorkOrder } from './work-order-execution';
import { stageGeneratedArtifacts } from './work-order-artifacts';

interface GeneratedArtifactManifest {
  kind: 'agentic-generated-artifacts';
  generatedAt: string;
  workOrderPath: string;
  outputDirectory: string;
  artifacts: Array<{
    artifactPath: string;
    exists: boolean;
    stagedPath: string | null;
  }>;
}

function parseArguments(argv: readonly string[]): {
  workOrderPath: string;
  outputDirectory: string;
  manifestPath: string;
} {
  let workOrderPath = 'artifacts/agent-work-order.json';
  let outputDirectory = 'artifacts/generated-outputs';
  let manifestPath = 'artifacts/generated-outputs-manifest.json';

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--work-order') {
      workOrderPath = argv[index + 1] ?? workOrderPath;
      index += 1;
      continue;
    }

    if (argument === '--output') {
      outputDirectory = argv[index + 1] ?? outputDirectory;
      index += 1;
      continue;
    }

    if (argument === '--manifest') {
      manifestPath = argv[index + 1] ?? manifestPath;
      index += 1;
    }
  }

  return {
    workOrderPath,
    outputDirectory,
    manifestPath,
  };
}

async function main(): Promise<void> {
  const { workOrderPath, outputDirectory, manifestPath } = parseArguments(
    process.argv.slice(2),
  );
  const workOrder = await loadAgentWorkOrder(workOrderPath);
  const statuses = await stageGeneratedArtifacts(workOrder, outputDirectory);

  const manifest: GeneratedArtifactManifest = {
    kind: 'agentic-generated-artifacts',
    generatedAt: new Date().toISOString(),
    workOrderPath,
    outputDirectory,
    artifacts: statuses,
  };

  const resolvedManifestPath = path.join(agenticRepoRoot, manifestPath);
  await fs.mkdir(path.dirname(resolvedManifestPath), { recursive: true });
  await fs.writeFile(
    resolvedManifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  process.stdout.write(`Collected generated artifacts into ${outputDirectory}\n`);

  const missingArtifacts = statuses.filter((status) => !status.exists);
  if (missingArtifacts.length > 0) {
    process.stderr.write(
      `Missing generated artifacts: ${missingArtifacts
        .map((artifact) => artifact.artifactPath)
        .join(', ')}\n`,
    );
    process.exitCode = 1;
  }
}

void main();
