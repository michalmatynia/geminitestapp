import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, logSystemEventMock, getErrorFingerprintMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  logSystemEventMock: vi.fn(),
  getErrorFingerprintMock: vi.fn(),
}));

const loadRoute = async () => {
  vi.resetModules();
  vi.doMock('@/shared/lib/api/api-handler', async () => {
    const { NextResponse } = await import('next/server');
    return {
      apiHandler:
        (
          handler: (req: NextRequest, ctx: { requestId: string; body?: unknown }) => Promise<Response>,
          options: { parseJsonBody?: boolean; bodySchema?: { safeParse: (value: unknown) => { success: boolean; data?: unknown } } }
        ) =>
        async (req: NextRequest): Promise<Response> => {
          const ctx: { requestId: string; body?: unknown } = { requestId: 'test-request-id' };

          if (options.parseJsonBody) {
            let parsed: unknown;
            try {
              const raw = await req.text();
              parsed = raw.trim() ? JSON.parse(raw) : undefined;
            } catch {
              return NextResponse.json(
                {
                  error: 'Invalid JSON payload',
                  code: 'BAD_REQUEST',
                },
                { status: 400 }
              );
            }

            if (options.bodySchema && parsed !== undefined) {
              const validation = options.bodySchema.safeParse(parsed);
              if (!validation.success) {
                return NextResponse.json(
                  {
                    error: 'Please review the highlighted fields and try again.',
                    code: 'VALIDATION_ERROR',
                  },
                  { status: 400 }
                );
              }
              ctx.body = validation.data;
            } else {
              ctx.body = parsed;
            }
          }

          return handler(req, ctx);
        },
    };
  });
  vi.doMock('@/features/auth/auth', () => ({
    auth: authMock,
  }));
  vi.doMock('@/features/auth/server', () => ({
    auth: authMock,
  }));
  vi.doMock('@/shared/lib/observability/system-logger', () => ({
    logSystemEvent: logSystemEventMock,
    getErrorFingerprint: getErrorFingerprintMock,
  }));
  const { PATCH } = await import('./route');
  return { PATCH };
};

describe('auth roles route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
      user: {
        id: 'user-1',
        isElevated: true,
        permissions: ['auth.users.write'],
      },
    });
    logSystemEventMock.mockResolvedValue(undefined);
    getErrorFingerprintMock.mockResolvedValue('fingerprint-1');
  });

  it('returns validation error when payload schema is invalid', async () => {
    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new NextRequest('http://localhost/api/auth/roles', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userRoles: 'invalid' }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Please review the highlighted fields and try again.',
      code: 'VALIDATION_ERROR',
    });
  });

  it('returns bad request for invalid JSON payloads', async () => {
    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new NextRequest('http://localhost/api/auth/roles', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: '{',
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid JSON payload',
      code: 'BAD_REQUEST',
    });
  });
});
