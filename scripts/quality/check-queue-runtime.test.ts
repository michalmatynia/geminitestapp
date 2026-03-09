import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { analyzeQueueRuntime } from './lib/check-queue-runtime.mjs';

const tempRoots = [];

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'queue-runtime-'));
  tempRoots.push(root);
  return root;
};

const writeSource = (root, relativeFile, contents) => {
  const filePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
};

describe('analyzeQueueRuntime', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('accepts queue modules that are reached transitively from queue-init imports', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/jobs/queue-init.ts',
      'const STARTUP_GATED_QUEUE_NAMES = [] as const;\nexport const initializeQueues = (): void => { void Promise.all([import(\'@/features/example/workers/exampleQueue\')]); };\n'
    );
    writeSource(
      root,
      'src/features/example/workers/exampleQueue.ts',
      'import { startWrappedQueue } from \'./wrappedQueue\';\nexport const startExampleQueue = startWrappedQueue;\n'
    );
    writeSource(
      root,
      'src/features/example/workers/wrappedQueue.ts',
      'import { createManagedQueue } from \'@/shared/lib/queue\';\nconst QUEUE_NAME = \'example\';\nexport const queue = createManagedQueue({ name: QUEUE_NAME, concurrency: 1, processor: async () => null });\nexport const startWrappedQueue = (): void => { queue.startWorker(); };\n'
    );

    const report = analyzeQueueRuntime({ root });

    expect(report.summary.errorCount).toBe(0);
    expect(report.summary.warningCount).toBe(0);
  });

  it('fails queues that are not imported through queue-init', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/jobs/queue-init.ts',
      'const STARTUP_GATED_QUEUE_NAMES = [] as const;\nexport const initializeQueues = (): void => {};\n'
    );
    writeSource(
      root,
      'src/features/example/workers/exampleQueue.ts',
      'import { createManagedQueue } from \'@/shared/lib/queue\';\nexport const queue = createManagedQueue({ name: \'orphaned\', concurrency: 1, processor: async () => null });\n'
    );

    const report = analyzeQueueRuntime({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'queue-not-imported-by-init',
          file: 'src/features/example/workers/exampleQueue.ts',
        }),
      ])
    );
  });

  it('fails repeat-managed queues that are imported but never explicitly started', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/jobs/queue-init.ts',
      'const STARTUP_GATED_QUEUE_NAMES = [] as const;\nexport const initializeQueues = (): void => { void Promise.all([import(\'@/features/example/workers/exampleQueue\')]); };\n'
    );
    writeSource(
      root,
      'src/features/example/workers/exampleQueue.ts',
      'import { createManagedQueue } from \'@/shared/lib/queue\';\nconst queue = createManagedQueue({ name: \'repeat-queue\', concurrency: 1, processor: async () => null });\nexport const startExampleQueue = (): void => {\n  queue.startWorker();\n  void queue.enqueue({ type: \'tick\' }, { repeat: { every: 60_000 }, jobId: \'repeat-tick\' });\n};\n'
    );

    const report = analyzeQueueRuntime({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'queue-repeat-not-explicitly-started',
        }),
      ])
    );
  });

  it('fails gated queues that are not explicitly started from queue-init', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/jobs/queue-init.ts',
      'const STARTUP_GATED_QUEUE_NAMES = [\'gated-queue\'] as const;\nexport const initializeQueues = (): void => { void Promise.all([import(\'@/features/example/workers/exampleQueue\')]); };\n'
    );
    writeSource(
      root,
      'src/features/example/workers/exampleQueue.ts',
      'import { createManagedQueue } from \'@/shared/lib/queue\';\nconst queue = createManagedQueue({ name: \'gated-queue\', concurrency: 1, processor: async () => null });\nexport const startExampleQueue = (): void => { queue.startWorker(); };\n'
    );

    const report = analyzeQueueRuntime({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'queue-gated-not-explicitly-started',
        }),
      ])
    );
  });

  it('fails repeatable jobs without stable job ids', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/jobs/queue-init.ts',
      'const STARTUP_GATED_QUEUE_NAMES = [] as const;\nexport const initializeQueues = (): void => { void Promise.all([import(\'@/features/example/workers/exampleQueue\')]); };\n'
    );
    writeSource(
      root,
      'src/features/example/workers/exampleQueue.ts',
      'import { createManagedQueue } from \'@/shared/lib/queue\';\nconst queue = createManagedQueue({ name: \'repeat-queue\', concurrency: 1, processor: async () => null });\nexport const startExampleQueue = (): void => {\n  queue.startWorker();\n  void queue.enqueue({ type: \'tick\' }, { repeat: { every: 60_000 } });\n};\n'
    );

    const report = analyzeQueueRuntime({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'queue-repeat-missing-jobid',
        }),
      ])
    );
  });
});
