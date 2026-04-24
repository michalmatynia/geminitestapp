import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { getProductScanByIdWithSyncMock, readAmazonScanDiagnosticArtifactMock } = vi.hoisted(
  () => ({
    getProductScanByIdWithSyncMock: vi.fn(),
    readAmazonScanDiagnosticArtifactMock: vi.fn(),
  })
);

vi.mock('@/features/products/server/product-scans-service', () => ({
  getProductScanByIdWithSync: (...args: unknown[]) => getProductScanByIdWithSyncMock(...args),
}));

vi.mock('@/features/products/server/product-scan-amazon-diagnostics-reader', () => ({
  readAmazonScanDiagnosticArtifact: (...args: unknown[]) =>
    readAmazonScanDiagnosticArtifactMock(...args),
}));

import { getHandler, paramsSchema } from './handler';

describe('products/scans/[scanId]/diagnostics/[filename] handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the diagnostics artifact handler and params schema', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof paramsSchema.safeParse).toBe('function');
  });

  it('returns the recorded diagnostic artifact content', async () => {
    getProductScanByIdWithSyncMock.mockResolvedValue({
      id: 'scan-1',
      provider: 'amazon',
      status: 'failed',
    });
    readAmazonScanDiagnosticArtifactMock.mockResolvedValue({
      filename: 'stage-000-sync.enter.parsed.json',
      mimeType: 'application/json',
      content: Buffer.from('{"ok":true}'),
    });

    const response = await getHandler(
      new NextRequest(
        'http://localhost/api/v2/products/scans/scan-1/diagnostics/stage-000-sync.enter.parsed.json'
      ),
      {} as ApiHandlerContext,
      {
        scanId: 'scan-1',
        filename: 'stage-000-sync.enter.parsed.json',
      }
    );

    expect(getProductScanByIdWithSyncMock).toHaveBeenCalledWith('scan-1');
    expect(readAmazonScanDiagnosticArtifactMock).toHaveBeenCalledWith(
      'scan-1',
      'stage-000-sync.enter.parsed.json'
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(response.headers.get('content-disposition')).toBe(
      'inline; filename="stage-000-sync.enter.parsed.json"'
    );
    await expect(response.text()).resolves.toBe('{"ok":true}');
  });
});
