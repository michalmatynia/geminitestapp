import { promises as fs } from 'node:fs';
import path from 'node:path';

import { agenticRepoRoot } from './domain-manifests';
import type { AgentWorkOrder } from './work-order-execution';

export interface GeneratedArtifactStatus {
  artifactPath: string;
  exists: boolean;
  stagedPath: string | null;
}

function dedupe(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function listRequiredGeneratedArtifacts(workOrder: AgentWorkOrder): string[] {
  return dedupe(workOrder.requiredGeneratedArtifacts);
}

export async function stageGeneratedArtifacts(
  workOrder: AgentWorkOrder,
  outputDirectory: string,
): Promise<GeneratedArtifactStatus[]> {
  const requiredArtifacts = listRequiredGeneratedArtifacts(workOrder);
  const resolvedOutputDirectory = path.join(agenticRepoRoot, outputDirectory);
  await fs.mkdir(resolvedOutputDirectory, { recursive: true });

  const statuses: GeneratedArtifactStatus[] = [];

  for (const artifactPath of requiredArtifacts) {
    const sourcePath = path.join(agenticRepoRoot, artifactPath);
    const stagedPath = path.join(resolvedOutputDirectory, artifactPath);

    try {
      const sourceStat = await fs.stat(sourcePath);
      await fs.mkdir(path.dirname(stagedPath), { recursive: true });

      if (sourceStat.isDirectory()) {
        await fs.cp(sourcePath, stagedPath, { recursive: true });
      } else {
        await fs.copyFile(sourcePath, stagedPath);
      }

      statuses.push({
        artifactPath,
        exists: true,
        stagedPath: path.relative(agenticRepoRoot, stagedPath).replace(/\\/g, '/'),
      });
    } catch {
      statuses.push({
        artifactPath,
        exists: false,
        stagedPath: null,
      });
    }
  }

  return statuses;
}
