import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { getProductScanByIdWithSyncMock, readPlaywrightEngineArtifactMock } = vi.hoisted(() => ({
  getProductScanByIdWithSyncMock: vi.fn(),
  readPlaywrightEngineArtifactMock: vi.fn(),
}));

vi.mock('@/features/products/server/product-scans-service', () => ({
  getProductScanByIdWithSync: (...args: unknown[]) => getProductScanByIdWithSyncMock(...args),
}));

vi.mock('@/features/playwright/server', () => ({
  readPlaywrightEngineArtifact: (...args: unknown[]) => readPlaywrightEngineArtifactMock(...args),
}));

import { GET_handler, paramsSchema } from './handler';

describe('products/scans/[scanId]/artifacts/[artifactName] handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the artifact handler and params schema', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof paramsSchema.safeParse).toBe('function');
  });

  it('returns the artifact content for the scan engine run', async () => {
    getProductScanByIdWithSyncMock.mockResolvedValue({
      id: 'scan-1',
      engineRunId: 'run-1',
    });
    readPlaywrightEngineArtifactMock.mockResolvedValue({
      artifact: {
        name: 'amazon-scan-stage',
        path: 'run-1/amazon-scan-stage.png',
        mimeType: 'image/png',
        kind: 'screenshot',
      },
      content: Buffer.from('png-bytes'),
    });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/v2/products/scans/scan-1/artifacts/amazon-scan-stage.png'),
      {} as ApiHandlerContext,
      {
        scanId: 'scan-1',
        artifactName: 'amazon-scan-stage.png',
      }
    );

    expect(getProductScanByIdWithSyncMock).toHaveBeenCalledWith('scan-1');
    expect(readPlaywrightEngineArtifactMock).toHaveBeenCalledWith({
      runId: 'run-1',
      fileName: 'amazon-scan-stage.png',
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('content-disposition')).toBe(
      'inline; filename="amazon-scan-stage.png"'
    );
    await expect(response.text()).resolves.toBe('png-bytes');
  });

  it('throws when the scan is missing an engine run id', async () => {
    getProductScanByIdWithSyncMock.mockResolvedValue({
      id: 'scan-1',
      engineRunId: null,
    });

    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/v2/products/scans/scan-1/artifacts/amazon-scan-stage.png'),
        {} as ApiHandlerContext,
        {
          scanId: 'scan-1',
          artifactName: 'amazon-scan-stage.png',
        }
      )
    ).rejects.toMatchObject({
      message: 'Product scan artifact not found.',
    });
    expect(readPlaywrightEngineArtifactMock).not.toHaveBeenCalled();
  });
});
