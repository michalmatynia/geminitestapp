import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  classifyAmazonScanFailureMock,
  getProductScanByIdWithSyncMock,
  listAmazonScanDiagnosticArtifactsMock,
} = vi.hoisted(() => ({
  classifyAmazonScanFailureMock: vi.fn(),
  getProductScanByIdWithSyncMock: vi.fn(),
  listAmazonScanDiagnosticArtifactsMock: vi.fn(),
}));

vi.mock('@/features/products/server/product-scan-amazon-classifier', () => ({
  classifyAmazonScanFailure: (...args: unknown[]) => classifyAmazonScanFailureMock(...args),
}));

vi.mock('@/features/products/server/product-scans-service', () => ({
  getProductScanByIdWithSync: (...args: unknown[]) => getProductScanByIdWithSyncMock(...args),
}));

vi.mock('@/features/products/server/product-scan-amazon-diagnostics-reader', () => ({
  listAmazonScanDiagnosticArtifacts: (...args: unknown[]) =>
    listAmazonScanDiagnosticArtifactsMock(...args),
}));

import { getHandler, paramsSchema } from './handler';

describe('products/scans/[scanId]/diagnostics handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the diagnostics handler and params schema', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof paramsSchema.safeParse).toBe('function');
  });

  it('returns classification and artifact listing for the scan', async () => {
    getProductScanByIdWithSyncMock.mockResolvedValue({
      id: 'scan-1',
      provider: 'amazon',
      status: 'failed',
    });
    classifyAmazonScanFailureMock.mockReturnValue({
      kind: 'selector_rot',
      details: { reason: 'Selectors failed.', evidence: {} },
    });
    listAmazonScanDiagnosticArtifactsMock.mockResolvedValue([
      {
        filename: 'stage-000-sync.enter.parsed.json',
        sizeBytes: 128,
        mtime: '2026-04-24T10:00:00.000Z',
        mimeType: 'application/json',
      },
    ]);

    const response = await getHandler(
      new NextRequest('http://localhost/api/v2/products/scans/scan-1/diagnostics'),
      {} as ApiHandlerContext,
      { scanId: 'scan-1' }
    );

    expect(getProductScanByIdWithSyncMock).toHaveBeenCalledWith('scan-1');
    expect(listAmazonScanDiagnosticArtifactsMock).toHaveBeenCalledWith('scan-1');
    expect(classifyAmazonScanFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'scan-1' })
    );
    await expect(response.json()).resolves.toEqual({
      scanId: 'scan-1',
      provider: 'amazon',
      status: 'failed',
      classification: {
        kind: 'selector_rot',
        details: { reason: 'Selectors failed.', evidence: {} },
      },
      artifacts: [
        {
          filename: 'stage-000-sync.enter.parsed.json',
          sizeBytes: 128,
          mtime: '2026-04-24T10:00:00.000Z',
          mimeType: 'application/json',
        },
      ],
    });
  });
});
