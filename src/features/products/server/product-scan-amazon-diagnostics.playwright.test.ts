import { beforeEach, describe, expect, it, vi } from 'vitest';

const { readPlaywrightEngineArtifactMock } = vi.hoisted(() => ({
  readPlaywrightEngineArtifactMock: vi.fn(),
}));

vi.mock('@/features/playwright/server', () => ({
  readPlaywrightEngineArtifact: (...args: unknown[]) =>
    readPlaywrightEngineArtifactMock(...args),
}));

import {
  collectAmazonScanRunDiagnosticArtifacts,
  resolveAmazonScanDiagnosticCapture,
} from './product-scan-amazon-diagnostics';

describe('product-scan-amazon-diagnostics playwright artifacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enables trace capture only when recordDiagnostics is true', () => {
    expect(resolveAmazonScanDiagnosticCapture({})).toEqual({
      screenshot: true,
      html: true,
    });
    expect(resolveAmazonScanDiagnosticCapture({ recordDiagnostics: true })).toEqual({
      screenshot: true,
      html: true,
      trace: true,
    });
  });

  it('collects Playwright run artifacts as binary diagnostics', async () => {
    readPlaywrightEngineArtifactMock
      .mockResolvedValueOnce({
        artifact: {
          name: 'failure',
          path: 'run-1/failure-111.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
        content: Buffer.from([1, 2, 3]),
      })
      .mockResolvedValueOnce({
        artifact: {
          name: 'trace',
          path: 'run-1/trace-222.zip',
          mimeType: 'application/zip',
          kind: 'trace',
        },
        content: Buffer.from([4, 5, 6]),
      });

    const artifacts = await collectAmazonScanRunDiagnosticArtifacts({
      runId: 'run-1',
      artifacts: [
        {
          name: 'failure',
          path: 'run-1/failure-111.png',
          mimeType: 'image/png',
          kind: 'screenshot',
        },
        {
          name: 'trace',
          path: 'run-1/trace-222.zip',
          mimeType: 'application/zip',
          kind: 'trace',
        },
      ],
    });

    expect(readPlaywrightEngineArtifactMock).toHaveBeenNthCalledWith(1, {
      runId: 'run-1',
      fileName: 'failure-111.png',
    });
    expect(readPlaywrightEngineArtifactMock).toHaveBeenNthCalledWith(2, {
      runId: 'run-1',
      fileName: 'trace-222.zip',
    });
    expect(artifacts).toEqual({
      '00-screenshot-failure-111': {
        kind: 'binary',
        content: new Uint8Array([1, 2, 3]),
        extension: 'png',
      },
      '01-trace-trace-222': {
        kind: 'binary',
        content: new Uint8Array([4, 5, 6]),
        extension: 'zip',
      },
    });
  });
});
