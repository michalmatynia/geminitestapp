/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: mocks.getClientIp,
}));

vi.mock('resend', () => {
  class MockResend {
    emails = { send: mocks.sendEmail };
  }
  return { Resend: MockResend };
});

import { POST } from './route';

const ORIG_ENV = process.env;

function makeJsonRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

const VALID_BODY = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  subject: 'General enquiry',
  message: 'This is a test message that is long enough.',
};

describe('POST /api/contact', () => {
  beforeEach(() => {
    mocks.checkRateLimit.mockReturnValue({ allowed: true, retryAfterSec: 0 });
    mocks.getClientIp.mockReturnValue('127.0.0.1');
    mocks.sendEmail.mockResolvedValue({ id: 'email-id-1' });

    process.env = {
      ...ORIG_ENV,
      RESEND_API_KEY: 'test-api-key',
      RESEND_CONTACT_EMAIL: 'contact@example.com',
      RESEND_FROM_EMAIL: 'orders@example.com',
    };
  });

  afterEach(() => {
    process.env = ORIG_ENV;
    vi.clearAllMocks();
  });

  it('sends email and returns 200 on valid input', async () => {
    const res = await POST(makeJsonRequest(VALID_BODY));
    const body = await res.json() as { ok?: boolean };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.sendEmail).toHaveBeenCalledOnce();

    const call = mocks.sendEmail.mock.calls[0][0] as { to: string; replyTo: string; subject: string };
    expect(call.to).toBe('contact@example.com');
    expect(call.replyTo).toBe('jane@example.com');
    expect(call.subject).toContain('General enquiry');
  });

  it('returns 200 without sending email when RESEND_API_KEY is absent', async () => {
    delete process.env['RESEND_API_KEY'];

    const res = await POST(makeJsonRequest(VALID_BODY));
    const body = await res.json() as { ok?: boolean };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('returns 200 without sending email when RESEND_CONTACT_EMAIL is absent', async () => {
    delete process.env['RESEND_CONTACT_EMAIL'];
    delete process.env['RESEND_FROM_EMAIL'];

    const res = await POST(makeJsonRequest(VALID_BODY));
    expect(res.status).toBe(200);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('falls back to RESEND_FROM_EMAIL as recipient when RESEND_CONTACT_EMAIL is absent', async () => {
    delete process.env['RESEND_CONTACT_EMAIL'];

    const res = await POST(makeJsonRequest(VALID_BODY));
    expect(res.status).toBe(200);

    const call = mocks.sendEmail.mock.calls[0][0] as { to: string };
    expect(call.to).toBe('orders@example.com');
  });

  it('returns 400 when name is empty', async () => {
    const res = await POST(makeJsonRequest({ ...VALID_BODY, name: '' }));
    expect(res.status).toBe(400);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('returns 400 when email is invalid', async () => {
    const res = await POST(makeJsonRequest({ ...VALID_BODY, email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('returns 400 when subject is empty', async () => {
    const res = await POST(makeJsonRequest({ ...VALID_BODY, subject: '' }));
    expect(res.status).toBe(400);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('returns 400 when message is too short', async () => {
    const res = await POST(makeJsonRequest({ ...VALID_BODY, message: 'hi' }));
    expect(res.status).toBe(400);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('returns 400 for non-object body', async () => {
    const res = await POST(
      new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '"string"',
      }) as NextRequest,
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await POST(
      new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{bad json',
      }) as NextRequest,
    );
    expect(res.status).toBe(400);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mocks.checkRateLimit.mockReturnValue({ allowed: false, retryAfterSec: 3600 });

    const res = await POST(makeJsonRequest(VALID_BODY));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('3600');
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('returns 502 when Resend throws', async () => {
    mocks.sendEmail.mockRejectedValue(new Error('SMTP error'));

    const res = await POST(makeJsonRequest(VALID_BODY));
    expect(res.status).toBe(502);
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
  });

  it('truncates oversized fields instead of rejecting them', async () => {
    const longName = 'A'.repeat(500);
    const res = await POST(makeJsonRequest({ ...VALID_BODY, name: longName }));
    expect(res.status).toBe(200);
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
  });
});
