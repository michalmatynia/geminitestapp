import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { POST } from '@/app/api/client-errors/route';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: vi.fn().mockResolvedValue(undefined),
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
        extra: { userId: '123' },
      })
    );
  });

  it('should handle invalid payload by falling back to unknown error', async () => {
    const req = new NextRequest('http://localhost/api/client-errors', {
      method: 'POST',
      body: JSON.stringify({ name: 'Only name' }), // message missing
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(ErrorSystem.captureException).toHaveBeenCalled();
  });

  it('should ignore legacy nested error payload shape', async () => {
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
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    expect(ErrorSystem.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Unknown client error',
        name: 'ClientError',
      }),
      expect.objectContaining({
        service: 'client-error-reporter',
        extra: {},
      })
    );
  });
});
