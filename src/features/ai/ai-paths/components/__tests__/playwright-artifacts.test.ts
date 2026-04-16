import { describe, expect, it } from 'vitest';

import type { AiPathRunNodeRecord } from '@/shared/contracts/ai-paths';

import {
  collectPlaywrightArtifacts,
  collectPlaywrightRuntimePostures,
  extractPlaywrightArtifactsFromNode,
  extractPlaywrightRuntimePostureFromNode,
  formatPlaywrightRuntimePostureBrowser,
  formatPlaywrightRuntimePostureIdentity,
  formatPlaywrightRuntimePostureProxy,
  formatPlaywrightRuntimePostureStickyState,
  resolvePlaywrightArtifactDisplayName,
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
    expect(artifacts[0]?.url).toBe('/api/ai-paths/playwright/run-1/artifacts/trace-1.zip');
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

  it('extracts runtime posture from the bundled Playwright result payload', () => {
    const node = buildNode({
      outputs: {
        bundle: {
          result: {
            runtimePosture: {
              browser: {
                engine: 'chromium',
                label: 'Chrome',
                headless: false,
              },
              antiDetection: {
                identityProfile: 'search',
                locale: 'en-US',
                timezoneId: 'America/New_York',
                stickyStorageState: {
                  enabled: true,
                  loaded: true,
                },
                proxy: {
                  enabled: true,
                  providerPreset: 'brightdata',
                  sessionMode: 'sticky',
                  reason: 'applied',
                  serverHost: 'proxy.local:8080',
                },
              },
            },
          },
        },
      },
    });

    const runtimePosture = extractPlaywrightRuntimePostureFromNode(node);

    expect(runtimePosture).toMatchObject({
      nodeId: 'node-playwright',
      browserLabel: 'Chrome',
      headless: false,
      identityProfile: 'search',
      locale: 'en-US',
      timezoneId: 'America/New_York',
      proxyProviderPreset: 'brightdata',
      proxySessionMode: 'sticky',
      proxyReason: 'applied',
      proxyServerHost: 'proxy.local:8080',
      stickyStorageEnabled: true,
      stickyStorageLoaded: true,
    });
    expect(formatPlaywrightRuntimePostureBrowser(runtimePosture!)).toBe('Chrome · Headed');
    expect(formatPlaywrightRuntimePostureIdentity(runtimePosture!)).toBe(
      'Search profile · en-US · America/New_York'
    );
    expect(formatPlaywrightRuntimePostureProxy(runtimePosture!)).toBe(
      'Brightdata · Sticky · Applied · proxy.local:8080'
    );
    expect(formatPlaywrightRuntimePostureStickyState(runtimePosture!)).toBe(
      'Loaded sticky state'
    );
  });

  it('collects runtime posture summaries across multiple nodes', () => {
    const nodes = [
      buildNode({
        id: 'a',
        outputs: {
          bundle: {
            result: {
              runtimePosture: {
                browser: { label: 'Chrome' },
              },
            },
          },
        },
      }),
      buildNode({
        id: 'b',
        nodeId: 'node-no-runtime',
        outputs: {},
      }),
    ];

    const runtimePostures = collectPlaywrightRuntimePostures(nodes);

    expect(runtimePostures).toHaveLength(1);
    expect(runtimePostures[0]?.nodeId).toBe('node-playwright');
  });

  it('renames runtime-posture artifacts for display', () => {
    expect(
      resolvePlaywrightArtifactDisplayName({
        name: 'runtime-posture',
        path: 'run-1/runtime-posture.json',
      })
    ).toBe('Runtime posture');
    expect(
      resolvePlaywrightArtifactDisplayName({
        name: 'final',
        path: 'run-1/final.png',
      })
    ).toBe('final');
  });
});
