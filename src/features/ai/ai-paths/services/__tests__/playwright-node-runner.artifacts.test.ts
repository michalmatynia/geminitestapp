import { promises as fs } from 'fs';
import path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import { readPlaywrightNodeArtifact } from '@/features/ai/ai-paths/services/playwright-node-runner';

const RUN_ROOT_DIR = path.join(process.cwd(), 'tmp', 'ai-paths-playwright-runs');

const createRunFixture = async (input: {
  runId: string;
  artifacts: Array<{ name: string; path: string; mimeType?: string | null; kind?: string | null }>;
  files?: Array<{ relativePath: string; content: string }>;
}): Promise<void> => {
  await fs.mkdir(RUN_ROOT_DIR, { recursive: true });
  for (const file of input.files ?? []) {
    const absolutePath = path.join(RUN_ROOT_DIR, file.relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, file.content, 'utf8');
  }

  const runStatePath = path.join(RUN_ROOT_DIR, `${input.runId}.json`);
  const now = new Date().toISOString();
  await fs.writeFile(
    runStatePath,
    JSON.stringify(
      {
        runId: input.runId,
        ownerUserId: 'test-user',
        status: 'completed',
        startedAt: now,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
        artifacts: input.artifacts,
        logs: [],
      },
      null,
      2
    ),
    'utf8'
  );
};

afterEach(async () => {
  await fs.rm(RUN_ROOT_DIR, { recursive: true, force: true });
});

describe('readPlaywrightNodeArtifact', () => {
  it('returns artifact content for a valid run + file', async () => {
    const runId = 'test-run-artifact-ok';
    await createRunFixture({
      runId,
      artifacts: [
        {
          name: 'final',
          path: `${runId}/final.png`,
          mimeType: 'image/png',
          kind: 'screenshot',
        },
      ],
      files: [
        {
          relativePath: `${runId}/final.png`,
          content: 'image-bytes',
        },
      ],
    });

    const result = await readPlaywrightNodeArtifact({
      runId,
      fileName: 'final.png',
    });

    expect(result).not.toBeNull();
    expect(result?.artifact.path).toBe(`${runId}/final.png`);
    expect(result?.content.toString('utf8')).toBe('image-bytes');
  });

  it('returns null when requested filename is not part of run artifacts', async () => {
    const runId = 'test-run-artifact-miss';
    await createRunFixture({
      runId,
      artifacts: [],
      files: [
        {
          relativePath: `${runId}/orphan.png`,
          content: 'orphan',
        },
      ],
    });

    const result = await readPlaywrightNodeArtifact({
      runId,
      fileName: 'orphan.png',
    });

    expect(result).toBeNull();
  });

  it('returns null for traversal-style filenames', async () => {
    const runId = 'test-run-artifact-traversal';
    await createRunFixture({
      runId,
      artifacts: [
        {
          name: 'final',
          path: `${runId}/final.png`,
          mimeType: 'image/png',
          kind: 'screenshot',
        },
      ],
      files: [
        {
          relativePath: `${runId}/final.png`,
          content: 'image',
        },
      ],
    });

    const result = await readPlaywrightNodeArtifact({
      runId,
      fileName: '../final.png',
    });

    expect(result).toBeNull();
  });

  it('returns null when artifact path escapes run directory', async () => {
    const runId = 'test-run-artifact-escape';
    await createRunFixture({
      runId,
      artifacts: [
        {
          name: 'evil',
          path: `${runId}/../../outside.txt`,
          mimeType: 'text/plain',
          kind: 'text',
        },
      ],
      files: [
        {
          relativePath: 'outside.txt',
          content: 'outside',
        },
      ],
    });

    const result = await readPlaywrightNodeArtifact({
      runId,
      fileName: 'outside.txt',
    });

    expect(result).toBeNull();
  });
});
