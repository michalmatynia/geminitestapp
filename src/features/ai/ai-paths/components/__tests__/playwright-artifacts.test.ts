import { describe, expect, it } from 'vitest';

import type { AiPathRunNodeRecord } from '@/shared/contracts/ai-paths';

import {
  collectPlaywrightArtifacts,
  extractPlaywrightArtifactsFromNode,
} from '../playwright-artifacts';

const buildNode = (patch: Partial<AiPathRunNodeRecord> = {}): AiPathRunNodeRecord => ({
  id: 'run-node-1',
  runId: 'run-1',
  nodeId: 'node-playwright',
  nodeType: 'playwright',
  nodeTitle: 'Playwright',
  status: 'completed',
  attempt: 1,
  inputs: {},
  outputs: {},
  createdAt: '2026-02-21T00:00:00.000Z',
  updatedAt: '2026-02-21T00:00:01.000Z',
  ...patch,
});

describe('playwright-artifacts helpers', () => {
  it('extracts artifacts from bundle and preserves explicit url', () => {
    const node = buildNode({
      outputs: {
        bundle: {
          artifacts: [
            {
              name: 'final',
              path: 'run-1/final.png',
              url: '/custom/final-link',
              mimeType: 'image/png',
              kind: 'screenshot',
            },
          ],
        },
      },
    });

    const artifacts = extractPlaywrightArtifactsFromNode(node);

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]).toEqual(
      expect.objectContaining({
        name: 'final',
        path: 'run-1/final.png',
        url: '/custom/final-link',
        kind: 'screenshot',
      })
    );
  });

  it('builds fallback artifact url from relative run path', () => {
    const node = buildNode({
      outputs: {
        bundle: {
          artifacts: [
            {
              name: 'trace',
              path: 'run-1/trace-1.zip',
              mimeType: 'application/zip',
            },
          ],
        },
      },
    });

    const artifacts = extractPlaywrightArtifactsFromNode(node);

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]?.url).toBe(
      '/api/ai-paths/playwright/run-1/artifacts/trace-1.zip'
    );
  });

  it('does not create fallback url when artifact path uses nested file segments', () => {
    const node = buildNode({
      outputs: {
        bundle: {
          artifacts: [
            {
              name: 'bad',
              path: 'run-1/nested/final.png',
            },
          ],
        },
      },
    });

    const artifacts = extractPlaywrightArtifactsFromNode(node);

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]?.url).toBeNull();
  });

  it('collects artifacts across multiple nodes', () => {
    const nodeA = buildNode({
      id: 'a',
      outputs: {
        bundle: {
          artifacts: [{ name: 'a', path: 'run-1/a.png' }],
        },
      },
    });
    const nodeB = buildNode({
      id: 'b',
      nodeId: 'node-other',
      outputs: {
        artifacts: [{ name: 'b', path: 'run-1/b.png' }],
      },
    });

    const artifacts = collectPlaywrightArtifacts([nodeA, nodeB]);

    expect(artifacts).toHaveLength(2);
    expect(artifacts.map((artifact) => artifact.name)).toEqual(['a', 'b']);
  });
});
