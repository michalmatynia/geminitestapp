import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { POST } from '@/app/api/client-errors/route';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: vi.fn().mockResolvedValue(undefined),
    logWarning: vi.fn().mockResolvedValue(undefined),
    logInfo: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: vi.fn().mockResolvedValue(undefined),
  logSystemError: vi.fn().mockResolvedValue(undefined),
  getErrorFingerprint: vi.fn().mockResolvedValue('test-fingerprint'),
}));

describe('Client Errors API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /api/client-errors should capture client exception', async () => {
    const payload = {
      message: 'React Error',
      name: 'Error',
      url: 'http://localhost/test',
      context: { userId: '123' },
    };

    const req = new NextRequest('http://localhost/api/client-errors', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(ErrorSystem.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        service: 'client-error-reporter',
        url: 'http://localhost/test',
        userId: '123',
      })
    );
    expect(ErrorSystem.logWarning).not.toHaveBeenCalled();
    expect(ErrorSystem.logInfo).not.toHaveBeenCalled();
  });

  it('drops invalid payloads that do not contain meaningful client error data', async () => {
    const req = new NextRequest('http://localhost/api/client-errors', {
      method: 'POST',
      body: JSON.stringify({ name: 'Only name' }), // message missing
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({
      ok: true,
      success: true,
      dropped: true,
      reason: 'invalid_payload',
    });
    expect(ErrorSystem.captureException).not.toHaveBeenCalled();
    expect(ErrorSystem.logWarning).not.toHaveBeenCalled();
    expect(ErrorSystem.logInfo).not.toHaveBeenCalled();
  });

  it('drops legacy nested error payloads without lifting nested fields', async () => {
    const req = new NextRequest('http://localhost/api/client-errors', {
      method: 'POST',
      body: JSON.stringify({
        error: {
          message: 'Legacy validation failed',
          name: 'ValidationError',
          service: 'product-service',
          action: 'validateProductCreate',
        },
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({
      ok: true,
      success: true,
      dropped: true,
      reason: 'invalid_payload',
    });
    expect(ErrorSystem.captureException).not.toHaveBeenCalled();
    expect(ErrorSystem.logWarning).not.toHaveBeenCalled();
    expect(ErrorSystem.logInfo).not.toHaveBeenCalled();
  });

  it('routes warn-level client reports through warning logging', async () => {
    const req = new NextRequest('http://localhost/api/client-errors', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Slow query: products.paged',
        name: 'Error',
        context: {
          level: 'warn',
          source: 'PerformanceMiddleware',
        },
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(ErrorSystem.logWarning).toHaveBeenCalledWith(
      'Slow query: products.paged',
      expect.objectContaining({
        service: 'client-error-reporter',
        source: 'client.error.reporter',
        level: 'warn',
      })
    );
    expect(ErrorSystem.captureException).not.toHaveBeenCalled();
    expect(ErrorSystem.logInfo).not.toHaveBeenCalled();
  });

  it('routes info-level client reports through info logging', async () => {
    const req = new NextRequest('http://localhost/api/client-errors', {
      method: 'POST',
      body: JSON.stringify({
        message: 'AI Path started: Catalog Sync (run_123)',
        name: 'Error',
        context: {
          level: 'info',
          source: 'useAiPathTriggerEvent',
          action: 'fireSuccess',
        },
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(ErrorSystem.logInfo).toHaveBeenCalledWith(
      'AI Path started: Catalog Sync (run_123)',
      expect.objectContaining({
        service: 'client-error-reporter',
        source: 'client.error.reporter',
        level: 'info',
      })
    );
    expect(ErrorSystem.captureException).not.toHaveBeenCalled();
    expect(ErrorSystem.logWarning).not.toHaveBeenCalled();
  });

  it('drops noisy local API network fetch failures in non-production environments', async () => {
    const req = new NextRequest('http://localhost/api/client-errors', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Failed to fetch',
        name: 'Error',
        context: {
          endpoint: '/api/drafts',
          method: 'GET',
        },
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({
      ok: true,
      success: true,
      dropped: true,
      reason: 'network_fetch_failed',
    });
    expect(ErrorSystem.captureException).not.toHaveBeenCalled();
    expect(ErrorSystem.logWarning).not.toHaveBeenCalled();
    expect(ErrorSystem.logInfo).not.toHaveBeenCalled();
  });
});
