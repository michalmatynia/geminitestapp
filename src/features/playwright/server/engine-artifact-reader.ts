import 'server-only';

import os from 'node:os';
import path from 'node:path';

import { getFsPromises } from '@/shared/lib/files/runtime-fs';
import type {
  PlaywrightNodeArtifactReadResult as PlaywrightEngineArtifactReadResult,
  PlaywrightNodeRunRecord as PlaywrightEngineRunRecord,
} from '@/features/ai/ai-paths/services/playwright-node-runner.types';

const PLAYWRIGHT_RUN_ROOT_DIR = path.join(os.tmpdir(), 'ai-paths-playwright-runs');
const nodeFs = getFsPromises();

const sanitizeRunId = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (path.basename(trimmed) !== trimmed) return null;
  if (trimmed.includes('/') || trimmed.includes('\\')) return null;
  return trimmed;
};

const sanitizeArtifactFileName = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (path.basename(trimmed) !== trimmed) return null;
  if (trimmed.includes('/') || trimmed.includes('\\')) return null;
  return trimmed;
};

const readPlaywrightEngineRun = async (
  runId: string
): Promise<PlaywrightEngineRunRecord | null> => {
  const safeRunId = sanitizeRunId(runId);
  if (!safeRunId) return null;

  const statePath = path.join(PLAYWRIGHT_RUN_ROOT_DIR, `${safeRunId}.json`);
  try {
    const content = await nodeFs.readFile(statePath, 'utf8');
    const parsed = JSON.parse(content);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    return parsed as PlaywrightEngineRunRecord;
  } catch {
    return null;
  }
};

export const readPlaywrightEngineArtifact = async (input: {
  runId: string;
  fileName: string;
}): Promise<PlaywrightEngineArtifactReadResult | null> => {
  const runId = sanitizeRunId(input.runId);
  const fileName = sanitizeArtifactFileName(input.fileName);
  if (!runId || !fileName) return null;

  const run = await readPlaywrightEngineRun(runId);
  if (!run) return null;

  const relativeArtifactPath = `${runId}/${fileName}`;
  const artifact =
    run.artifacts.find((candidate) => candidate.path === relativeArtifactPath) ?? null;
  if (!artifact) return null;

  const runRootDir = path.join(PLAYWRIGHT_RUN_ROOT_DIR, runId);
  const absoluteArtifactPath = path.resolve(PLAYWRIGHT_RUN_ROOT_DIR, artifact.path);
  if (
    absoluteArtifactPath !== runRootDir &&
    !absoluteArtifactPath.startsWith(`${runRootDir}${path.sep}`)
  ) {
    return null;
  }

  try {
    const stat = await nodeFs.stat(absoluteArtifactPath);
    if (!stat.isFile()) return null;
    const content = await nodeFs.readFile(absoluteArtifactPath);
    return {
      artifact,
      content,
    };
  } catch {
    return null;
  }
};

export type { PlaywrightEngineArtifactReadResult, PlaywrightEngineRunRecord };
