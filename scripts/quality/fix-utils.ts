import fs from 'node:fs';
import path from 'node:path';

const UTILS_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.utils.ts');
const RUNNER_FILE = path.resolve('src/features/ai/ai-paths/services/playwright-node-runner.ts');

const utilsContent = `// Stateless numeric utils for Playwright Runner
export type PlaywrightHelperTarget = {
  scrollIntoViewIfNeeded?: (() => Promise<unknown> | unknown) | undefined;
  click?: ((options?: Record<string, unknown>) => Promise<unknown> | unknown) | undefined;
  boundingBox?:
    | (() =>
        | Promise<{ x: number; y: number; width: number; height: number } | null>
        | { x: number; y: number; width: number; height: number }
        | null)
    | undefined;
};

export const normalizeDelayRange = (min: number, max: number): { min: number; max: number } => {
  const safeMin = Math.max(0, Math.trunc(Number.isFinite(min) ? min : 0));
  const safeMax = Math.max(0, Math.trunc(Number.isFinite(max) ? max : 0));
  return {
    min: Math.min(safeMin, safeMax),
    max: Math.max(safeMin, safeMax),
  };
};

export const pickDelayInRange = (min: number, max: number): number => {
  const normalized = normalizeDelayRange(min, max);
  if (normalized.min === normalized.max) {
    return normalized.min;
  }
  return normalized.min + Math.floor(Math.random() * (normalized.max - normalized.min + 1));
};

export const pickSignedOffset = (magnitude: number): number => {
  const safeMagnitude = Math.max(0, Math.trunc(Number.isFinite(magnitude) ? magnitude : 0));
  if (safeMagnitude === 0) {
    return 0;
  }
  return Math.floor(Math.random() * (safeMagnitude * 2 + 1)) - safeMagnitude;
};

export const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
`;

fs.writeFileSync(UTILS_FILE, utilsContent);

// Add missing exports back into playright-node-runner.ts
let runnerContent = fs.readFileSync(RUNNER_FILE, 'utf8');

const missingImports = `import {
  resolveRelativeArtifactPath,
  saveFileArtifact,
  createLiveRunStateCoordinator,
  captureFinalRunArtifacts,
  buildCompletedRunState,
  captureFailureArtifacts,
  buildFailedRunState,
  persistVideoArtifact
} from './playwright-node-runner.artifacts';\n`;

// Put it right among the local imports
const injectPoint = `import {
  normalizeDelayRange,
  pickDelayInRange,
  pickSignedOffset,
  clampNumber,
} from './playwright-node-runner.utils';`;

runnerContent = runnerContent.replace(injectPoint, missingImports + injectPoint);

fs.writeFileSync(RUNNER_FILE, runnerContent);

console.log('Fixed typescript in utils and runner!');
